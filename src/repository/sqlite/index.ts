import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import type {
  Repository, CampaignMeta, VectorSearchOpts, EntityWithScore, FactQuery
} from "../interface.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import type { CampaignId, EntityID, FactId } from "../../domain/ids.js";
import { asCampaignId, asFactId } from "../../domain/ids.js";
import { runMigrations } from "./migrations.js";
import { loadVec, ensureVecTable, upsertVec, searchVec, deleteVecForCampaign } from "./vec.js";
import { normalizeAlias } from "../../resolver/normalize.js";
import {
  entityToRow, rowToEntity, type EntityRow,
  figedToRow, rowToFiged, type FigedRow,
  potentialiteToRow, rowToPotentialite, type PotentialiteRow,
  nodeToRow, rowToNode, type NodeRow,
  edgeToRow, rowToEdge, type EdgeRow
} from "./serialization.js";

export interface SqliteRepositoryOptions {
  path: string;
  embeddingDim: number;
  readonly?: boolean;
}

export class SqliteRepository implements Repository {
  private readonly db: BetterSqlite3.Database;
  private readonly dim: number;
  private txChain: Promise<unknown> = Promise.resolve();

  constructor(opts: SqliteRepositoryOptions) {
    this.db = new Database(opts.path, { readonly: opts.readonly ?? false });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    runMigrations(this.db);
    loadVec(this.db);
    ensureVecTable(this.db, opts.embeddingDim);
    this.dim = opts.embeddingDim;
  }

  async listCampaigns(): Promise<CampaignMeta[]> {
    const rows = this.db.prepare(
      `SELECT id, name, created_at, embedding_dim FROM campaigns`
    ).all() as Array<{ id: string; name: string; created_at: number; embedding_dim: number }>;
    return rows.map(r => ({
      id: asCampaignId(r.id), name: r.name, createdAt: r.created_at, embeddingDim: r.embedding_dim
    }));
  }

  async createCampaign(meta: CampaignMeta): Promise<void> {
    if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim}`);
    }
    this.db.prepare(
      `INSERT OR REPLACE INTO campaigns (id, name, created_at, embedding_dim) VALUES (?, ?, ?, ?)`
    ).run(meta.id, meta.name, meta.createdAt, meta.embeddingDim);
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    const tx = this.db.transaction(() => {
      for (const t of ["entities", "aliases_norm", "figed", "potentialites", "nodes", "edges", "turns", "scenes"]) {
        this.db.prepare(`DELETE FROM ${t} WHERE campaign_id = ?`).run(id);
      }
      this.db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(id);
      deleteVecForCampaign(this.db, id);
    });
    tx();
  }

  async upsertEntity(e: Entity): Promise<void> {
    const r = entityToRow(e);
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO entities
          (campaign_id, id, type, name, nom_connu, aliases, tags, created_at, embedding_refreshed_at)
        VALUES (@campaign_id, @id, @type, @name, @nom_connu, @aliases, @tags, @created_at, @embedding_refreshed_at)
      `).run({
        campaign_id: r.campaign_id, id: r.id, type: r.type, name: r.name,
        nom_connu: r.nom_connu, aliases: r.aliases, tags: r.tags,
        created_at: r.created_at, embedding_refreshed_at: r.embedding_refreshed_at
      });

      this.db.prepare(`DELETE FROM aliases_norm WHERE campaign_id = ? AND entity_id = ?`).run(e.campaignId, e.id);
      const ins = this.db.prepare(`INSERT OR IGNORE INTO aliases_norm (campaign_id, entity_id, normalized) VALUES (?, ?, ?)`);
      const insertAlias = (text: string) => {
        ins.run(e.campaignId, e.id, normalize(text));
        const stripped = normalizeAlias(text);
        if (stripped !== normalize(text)) ins.run(e.campaignId, e.id, stripped);
      };
      insertAlias(e.name);
      for (const a of e.aliases) insertAlias(a.text);

      if (r._embedding) {
        upsertVec(this.db, e.campaignId, e.id, e.embedding!);
      }
    });
    tx();
  }

  async getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null> {
    const row = this.db.prepare(
      `SELECT * FROM entities WHERE campaign_id = ? AND id = ?`
    ).get(campaignId, entityId) as EntityRow | undefined;
    if (!row) return null;
    const vec = this.db.prepare(`SELECT embedding FROM entity_vec WHERE entity_id = ?`)
      .get(`${campaignId}|${entityId}`) as { embedding: Buffer } | undefined;
    return rowToEntity(row, vec?.embedding ?? null);
  }

  async findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: EntityType): Promise<Entity[]> {
    const norm = normalize(aliasNormalized);
    const sql = type
      ? `SELECT e.* FROM entities e
         JOIN aliases_norm a ON a.campaign_id = e.campaign_id AND a.entity_id = e.id
         WHERE a.campaign_id = ? AND a.normalized = ? AND e.type = ?`
      : `SELECT e.* FROM entities e
         JOIN aliases_norm a ON a.campaign_id = e.campaign_id AND a.entity_id = e.id
         WHERE a.campaign_id = ? AND a.normalized = ?`;
    const rows = type
      ? this.db.prepare(sql).all(campaignId, norm, type) as EntityRow[]
      : this.db.prepare(sql).all(campaignId, norm) as EntityRow[];
    return rows.map(r => rowToEntity(r, null));
  }

  async topEntities(campaignId: CampaignId, k: number): Promise<Entity[]> {
    const rows = this.db.prepare(
      `SELECT * FROM entities WHERE campaign_id = ? ORDER BY embedding_refreshed_at DESC LIMIT ?`
    ).all(campaignId, k) as EntityRow[];
    return rows.map(r => rowToEntity(r, null));
  }

  async searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]> {
    // searchVec already scopes by campaignId via compound key and returns plain entity IDs
    const hits = searchVec(this.db, campaignId, vec, opts.topK * 3);
    const result: EntityWithScore[] = [];
    for (const h of hits) {
      const row = this.db.prepare(
        `SELECT * FROM entities WHERE campaign_id = ? AND id = ?`
      ).get(campaignId, h.entity_id) as EntityRow | undefined;
      if (!row) continue;
      if (opts.filterType && row.type !== opts.filterType) continue;
      if (opts.excludeEntityIds?.some(x => x === h.entity_id)) continue;
      result.push({ entity: rowToEntity(row, null), score: 1 - h.distance });
      if (result.length >= opts.topK) break;
    }
    return result;
  }

  async appendFact(f: AttributFige & { campaignId: CampaignId }): Promise<{ factId: FactId }> {
    const row = figedToRow(f);
    this.db.prepare(`
      INSERT OR REPLACE INTO figed
        (campaign_id, entity_id, attribute_key, fact_id, value, category, observation, turn)
      VALUES (@campaign_id, @entity_id, @attribute_key, @fact_id, @value, @category, @observation, @turn)
    `).run(row);
    return { factId: asFactId(row.fact_id) };
  }

  async getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]> {
    const rows = this.db.prepare(
      `SELECT * FROM figed WHERE campaign_id = ? AND entity_id = ? ORDER BY turn`
    ).all(campaignId, entityId) as FigedRow[];
    return rows.map(rowToFiged);
  }

  async queryFacts(campaignId: CampaignId, query: FactQuery): Promise<AttributFige[]> {
    const clauses: string[] = ["campaign_id = ?"];
    const params: unknown[] = [campaignId];
    if (query.entityId)     { clauses.push("entity_id = ?");     params.push(query.entityId); }
    if (query.attributeKey) { clauses.push("attribute_key = ?"); params.push(query.attributeKey); }
    if (query.category)     { clauses.push("category = ?");      params.push(query.category); }
    if (query.minTurn !== undefined) { clauses.push("turn >= ?"); params.push(query.minTurn); }
    if (query.maxTurn !== undefined) { clauses.push("turn <= ?"); params.push(query.maxTurn); }
    const rows = this.db.prepare(
      `SELECT * FROM figed WHERE ${clauses.join(" AND ")} ORDER BY turn`
    ).all(...params) as FigedRow[];
    return rows.map(rowToFiged);
  }

  async upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void> {
    const r = potentialiteToRow(p, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO potentialites
        (campaign_id, entity_id, attribute_key, etat, contraintes, contexte_generatif)
      VALUES (@campaign_id, @entity_id, @attribute_key, @etat, @contraintes, @contexte_generatif)
    `).run(r);
  }

  async removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void> {
    this.db.prepare(
      `DELETE FROM potentialites WHERE campaign_id = ? AND entity_id = ? AND attribute_key = ?`
    ).run(campaignId, entityId, attribut);
  }

  async getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null> {
    const row = this.db.prepare(
      `SELECT * FROM potentialites WHERE campaign_id = ? AND entity_id = ? AND attribute_key = ?`
    ).get(campaignId, entityId, attribut) as PotentialiteRow | undefined;
    return row ? rowToPotentialite(row) : null;
  }

  async upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void> {
    const r = nodeToRow(n, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO nodes
        (campaign_id, entity_id, type, etat_actuel, poids_narratif, tags)
      VALUES (@campaign_id, @entity_id, @type, @etat_actuel, @poids_narratif, @tags)
    `).run(r);
  }

  async upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void> {
    const r = edgeToRow(a, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO edges
        (campaign_id, key, source, cible, type_relation, directionnalite, force_propagation, etat_arete, attributs)
      VALUES (@campaign_id, @key, @source, @cible, @type_relation, @directionnalite, @force_propagation, @etat_arete, @attributs)
    `).run(r);
  }

  async neighbors(campaignId: CampaignId, entityId: EntityID, _depth: number): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>> {
    const edgeRows = this.db.prepare(`
      SELECT * FROM edges WHERE campaign_id = ? AND (source = ? OR cible = ?)
    `).all(campaignId, entityId, entityId) as EdgeRow[];

    const result: Array<{ node: NoeudGCN; edge: AreteGCN }> = [];
    for (const er of edgeRows) {
      const otherId = er.source === entityId ? er.cible : er.source;
      const nodeRow = this.db.prepare(
        `SELECT * FROM nodes WHERE campaign_id = ? AND entity_id = ?`
      ).get(campaignId, otherId) as NodeRow | undefined;
      if (!nodeRow) continue;
      result.push({ node: rowToNode(nodeRow), edge: rowToEdge(er) });
    }
    return result;
  }

  async appendTurn(t: Turn): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO turns (campaign_id, turn_number, summary, scene_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(t.campaignId, t.turnNumber, t.summary, t.sceneId, t.createdAt);
  }

  async latestTurn(campaignId: CampaignId): Promise<Turn | null> {
    const row = this.db.prepare(
      `SELECT * FROM turns WHERE campaign_id = ? ORDER BY turn_number DESC LIMIT 1`
    ).get(campaignId) as
      { campaign_id: string; turn_number: number; summary: string | null; scene_id: string | null; created_at: number } | undefined;
    if (!row) return null;
    return {
      campaignId: asCampaignId(row.campaign_id),
      turnNumber: row.turn_number,
      summary: row.summary,
      sceneId: row.scene_id as Turn["sceneId"],
      createdAt: row.created_at
    };
  }

  async upsertScene(s: Scene): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO scenes (campaign_id, id, location_id, present_entity_ids, description, created_at_turn)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(s.campaignId, s.id, s.locationId, JSON.stringify(s.presentEntityIds), s.description, s.createdAtTurn);
  }

  async currentScene(campaignId: CampaignId): Promise<Scene | null> {
    const row = this.db.prepare(`
      SELECT s.* FROM scenes s
      JOIN turns t ON t.campaign_id = s.campaign_id AND t.scene_id = s.id
      WHERE s.campaign_id = ?
      ORDER BY t.turn_number DESC LIMIT 1
    `).get(campaignId) as
      { campaign_id: string; id: string; location_id: string; present_entity_ids: string; description: string; created_at_turn: number } | undefined;
    if (!row) return null;
    return {
      campaignId: asCampaignId(row.campaign_id),
      id: row.id as Scene["id"],
      locationId: row.location_id as Scene["locationId"],
      presentEntityIds: JSON.parse(row.present_entity_ids) as Scene["presentEntityIds"],
      description: row.description,
      createdAtTurn: row.created_at_turn
    };
  }

  // Manual BEGIN/COMMIT so the transaction lifetime matches the async fn's await.
  // better-sqlite3's .transaction() wrapper is sync-only and would commit before fn resolves.
  // A promise-chain mutex (txChain) serializes concurrent callers to prevent
  // "cannot start a transaction within a transaction" errors.
  async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    const result = this.txChain.then(async () => {
      this.db.exec("BEGIN");
      try {
        const r = await fn(this);
        this.db.exec("COMMIT");
        return r;
      } catch (e) {
        this.db.exec("ROLLBACK");
        throw e;
      }
    });
    // Chain advances even if the inner promise rejects
    this.txChain = result.catch(() => undefined);
    return result;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
