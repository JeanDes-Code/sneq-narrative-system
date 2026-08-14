import { AsyncLocalStorage } from "node:async_hooks";
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import type {
  Repository, CampaignMeta, VectorSearchOpts, EntityWithScore, FactQuery, CarriageQuery
} from "../interface.js";
import { OPERATION_RETENTION } from "../interface.js";
import type { NarrativeEvent } from "../../domain/event.js";
import type { OfficialRecord } from "../../domain/record.js";
import type { Holder } from "../../domain/holder.js";
import type { Carriage, CarriageEffect, DispatchPolicy } from "../../domain/carriage.js";
import type { ProvisionalInvention, InventionTransition, InventionStatus } from "../../domain/invention.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige, CanonicalAttribute } from "../../domain/attribute.js";
import type { MigrationFinding } from "../../domain/migration.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import type { CampaignId, EntityID, EventId, FactId } from "../../domain/ids.js";
import { asCampaignId, asFactId } from "../../domain/ids.js";
import { runMigrations } from "./migrations.js";
import { loadVec, ensureVecTable, upsertVec, searchVec, deleteVecForCampaign, deleteVecForEntity } from "./vec.js";
import { normalizeAlias, normalizeText } from "../../resolver/normalize.js";
import { SneqCampaignNotFoundError } from "../../errors.js";
import {
  entityToRow, rowToEntity, type EntityRow,
  figedToRow, rowToFiged, type FigedRow,
  potentialiteToRow, rowToPotentialite, type PotentialiteRow,
  nodeToRow, rowToNode, type NodeRow,
  edgeToRow, rowToEdge, type EdgeRow
} from "./serialization.js";

export interface SqliteRepositoryOptions {
  path: string;
  /** Vector dimension. Omit to adopt the dim already stored in the DB (existing DBs);
   *  for a fresh DB the dim is taken from the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
  readonly?: boolean;
}

export class SqliteRepository implements Repository {
  private readonly db: BetterSqlite3.Database;
  private dim: number | null;
  private txDepth = 0;
  private txChain: Promise<unknown> = Promise.resolve();
  /** Set only while this instance's own transaction callback is on the async call stack. */
  private readonly inTransaction = new AsyncLocalStorage<boolean>();

  constructor(opts: SqliteRepositoryOptions) {
    this.db = new Database(opts.path, { readonly: opts.readonly ?? false });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("foreign_keys = ON");
    runMigrations(this.db);
    const row = this.db.prepare(`SELECT value FROM meta WHERE key = 'embedding_dim'`).get() as { value: string } | undefined;
    const stored = row ? Number(row.value) : null;
    if (stored !== null && opts.embeddingDim !== undefined && opts.embeddingDim !== stored) {
      throw new Error(`Embedding dim mismatch: stored=${stored}, configured=${opts.embeddingDim}. Use a fresh database file or a matching --embedding-dim.`);
    }
    this.dim = stored ?? opts.embeddingDim ?? null;
    if (this.dim !== null && this.dim > 0) {
      loadVec(this.db);
      ensureVecTable(this.db, this.dim);
    }
  }

  private assertCampaignExists(campaignId: CampaignId): void {
    const row = this.db.prepare(`SELECT 1 FROM campaigns WHERE id = ?`).get(campaignId);
    if (!row) throw new SneqCampaignNotFoundError(campaignId);
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.txChain.then(fn);
    this.txChain = result.catch(() => undefined);
    return result;
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
    // "create" means create: an INSERT OR REPLACE here would reset entity_revision
    // to 0 while leaving entities/aliases/vectors in place, letting a stale-revision
    // creator commit a duplicate. Recreation must go through deleteCampaign first.
    if (this.db.prepare(`SELECT 1 FROM campaigns WHERE id = ?`).get(meta.id)) {
      throw new Error(`campaign "${meta.id}" already exists`);
    }
    if (this.dim === null) {
      this.dim = meta.embeddingDim;
      if (this.dim > 0) {
        loadVec(this.db);
        ensureVecTable(this.db, this.dim);
      } else {
        this.db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(this.dim));
      }
    } else if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim} (one repository = one dimension)`);
    }
    this.db.prepare(
      `INSERT INTO campaigns (id, name, created_at, embedding_dim, entity_revision) VALUES (?, ?, ?, ?, 0)`
    ).run(meta.id, meta.name, meta.createdAt, meta.embeddingDim);
  }

  private deleteCampaignNow(id: CampaignId): void {
    const tx = this.db.transaction(() => {
      for (const t of ["entities", "aliases_norm", "figed", "potentialites", "nodes", "edges", "turns", "scenes",
                       "events", "records", "holders", "carriages", "carriage_effects", "inventions",
                       "invention_transitions", "operations", "dispatch_policies",
                       "canonical_attributes", "migration_findings"]) {
        this.db.prepare(`DELETE FROM ${t} WHERE campaign_id = ?`).run(id);
      }
      this.db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(id);
      if (this.dim !== null && this.dim > 0) deleteVecForCampaign(this.db, id);
    });
    tx();
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    // Invoked through a transaction handle we already hold the txChain slot;
    // enqueue()-ing would deadlock against the transaction awaiting us. Run inline
    // (better-sqlite3 nests it as a SAVEPOINT within the open BEGIN). A merely
    // concurrent standalone call is on a different async context and still enqueues,
    // so it stays ordered after the running transaction.
    if (this.inTransaction.getStore()) { this.deleteCampaignNow(id); return; }
    return this.enqueue(async () => { this.deleteCampaignNow(id); });
  }

  async entityRevision(campaignId: CampaignId): Promise<number> {
    const row = this.db.prepare(
      `SELECT entity_revision FROM campaigns WHERE id = ?`,
    ).get(campaignId) as { entity_revision: number } | undefined;
    if (!row) throw new SneqCampaignNotFoundError(campaignId);
    return row.entity_revision;
  }

  async upsertEntity(e: Entity): Promise<void> {
    this.assertCampaignExists(e.campaignId);
    const r = entityToRow(e);
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO entities
          (campaign_id, id, type, name, description, realm_id, nom_connu, aliases, tags, created_at, embedding_refreshed_at)
        VALUES (@campaign_id, @id, @type, @name, @description, @realm_id, @nom_connu, @aliases, @tags, @created_at, @embedding_refreshed_at)
      `).run({
        campaign_id: r.campaign_id, id: r.id, type: r.type, name: r.name,
        description: r.description,
        realm_id: r.realm_id,
        nom_connu: r.nom_connu, aliases: r.aliases, tags: r.tags,
        created_at: r.created_at, embedding_refreshed_at: r.embedding_refreshed_at
      });

      this.db.prepare(`DELETE FROM aliases_norm WHERE campaign_id = ? AND entity_id = ?`).run(e.campaignId, e.id);
      const ins = this.db.prepare(`INSERT OR IGNORE INTO aliases_norm (campaign_id, entity_id, normalized) VALUES (?, ?, ?)`);
      const insertAlias = (text: string) => {
        ins.run(e.campaignId, e.id, normalizeText(text));
        const stripped = normalizeAlias(text);
        if (stripped !== normalizeText(text)) ins.run(e.campaignId, e.id, stripped);
      };
      insertAlias(e.name);
      for (const a of e.aliases) insertAlias(a.text);

      if (r._embedding) {
        if (this.dim === null || this.dim === 0) {
          throw new Error(`entity "${e.id}" has an embedding but this repository has no vector store (embeddingDim=${this.dim ?? "unset"})`);
        }
        if (e.embedding!.length !== this.dim) {
          throw new Error(`embedding dim mismatch for entity "${e.id}": got ${e.embedding!.length}, repository stores ${this.dim}. Did the embedding model change? Keep one model per database.`);
        }
        upsertVec(this.db, e.campaignId, e.id, e.embedding!);
      } else if (this.dim !== null && this.dim > 0) {
        // Clearing an entity's embedding must drop its old vector; otherwise a
        // stale row keeps resolving mentions to an entity that reports no embedding.
        deleteVecForEntity(this.db, e.campaignId, e.id);
      }

      this.db.prepare(
        `UPDATE campaigns SET entity_revision = entity_revision + 1 WHERE id = ?`,
      ).run(e.campaignId);
    });
    tx();
  }

  async getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null> {
    const row = this.db.prepare(
      `SELECT * FROM entities WHERE campaign_id = ? AND id = ?`
    ).get(campaignId, entityId) as EntityRow | undefined;
    if (!row) return null;
    const vec = this.dim !== null && this.dim > 0
      ? this.db.prepare(`SELECT embedding FROM entity_vec WHERE entity_id = ?`)
          .get(`${campaignId}|${entityId}`) as { embedding: Buffer } | undefined
      : undefined;
    return rowToEntity(row, vec?.embedding ?? null);
  }

  async findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: EntityType): Promise<Entity[]> {
    const norm = normalizeText(aliasNormalized);
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
    if (this.dim === null || this.dim === 0) return [];
    if (vec.length !== this.dim) {
      throw new Error(`embedding dim mismatch: query has ${vec.length}, repository stores ${this.dim}`);
    }
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
    this.assertCampaignExists(f.campaignId);
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
    this.assertCampaignExists(campaignId);
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
    this.assertCampaignExists(campaignId);
    const r = nodeToRow(n, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO nodes
        (campaign_id, entity_id, type, etat_actuel, poids_narratif, tags)
      VALUES (@campaign_id, @entity_id, @type, @etat_actuel, @poids_narratif, @tags)
    `).run(r);
  }

  async upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void> {
    this.assertCampaignExists(campaignId);
    const r = edgeToRow(a, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO edges
        (campaign_id, key, source, cible, type_relation, directionnalite, force_propagation, etat_arete, attributs)
      VALUES (@campaign_id, @key, @source, @cible, @type_relation, @directionnalite, @force_propagation, @etat_arete, @attributs)
    `).run(r);
  }

  async neighbors(campaignId: CampaignId, entityId: EntityID): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>> {
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
    this.assertCampaignExists(t.campaignId);
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
    this.assertCampaignExists(s.campaignId);
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
  // BEGIN IMMEDIATE acquires the write lock up front so a second process waits
  // (up to busy_timeout) instead of failing with SQLITE_BUSY when it tries to
  // upgrade a stale deferred read — the optimistic revision check then reads the
  // latest committed state and converges via a "stale" retry rather than throwing.
  // -- ledger (0.5.0) ---------------------------------------------------------------
  // Append-only tables get INSERTs only; the single UPDATE below maintains the
  // arrival_day projection column, never a ledger row's content.

  async appendEvent(e: NarrativeEvent): Promise<void> {
    this.assertCampaignExists(e.campaignId);
    if (this.db.prepare(`SELECT 1 FROM events WHERE campaign_id = ? AND event_id = ?`).get(e.campaignId, e.eventId)) {
      throw new Error(`event "${e.eventId}" already exists — the ledger is append-only`);
    }
    this.db.prepare(
      `INSERT INTO events (campaign_id, event_id, day, turn, place_id, gravity, acts, circumstance, participants, surface_tokens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(e.campaignId, e.eventId, e.day, e.turn, e.placeId ?? null, e.gravity,
          JSON.stringify(e.acts), e.circumstance, JSON.stringify(e.participants), JSON.stringify(e.surfaceTokens));
  }

  async getEvents(campaignId: CampaignId): Promise<NarrativeEvent[]> {
    const rows = this.db.prepare(
      `SELECT * FROM events WHERE campaign_id = ? ORDER BY day, turn, seq`
    ).all(campaignId) as Array<{
      campaign_id: string; event_id: string; day: number; turn: number;
      place_id: string | null; gravity: number; acts: string;
      circumstance: string; participants: string; surface_tokens: string;
    }>;
    return rows.map(r => ({
      eventId: r.event_id as EventId, campaignId: asCampaignId(r.campaign_id),
      day: r.day, turn: r.turn,
      ...(r.place_id !== null ? { placeId: r.place_id as EntityID } : {}),
      gravity: r.gravity as 0 | 1 | 2 | 3,
      acts: JSON.parse(r.acts) as NarrativeEvent["acts"],
      circumstance: r.circumstance,
      participants: JSON.parse(r.participants) as EntityID[],
      surfaceTokens: JSON.parse(r.surface_tokens) as string[],
    }));
  }

  async appendRecord(r: OfficialRecord): Promise<void> {
    this.assertCampaignExists(r.campaignId);
    if (this.db.prepare(`SELECT 1 FROM records WHERE campaign_id = ? AND record_id = ?`).get(r.campaignId, r.recordId)) {
      throw new Error(`record "${r.recordId}" already exists — records accumulate, never replace`);
    }
    this.db.prepare(
      `INSERT INTO records (campaign_id, record_id, entity_id, day, turn, payload) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(r.campaignId, r.recordId, r.entityId, r.day, r.turn, JSON.stringify(r));
  }

  async getRecords(campaignId: CampaignId): Promise<OfficialRecord[]> {
    const rows = this.db.prepare(
      `SELECT payload FROM records WHERE campaign_id = ? ORDER BY day, turn, seq`
    ).all(campaignId) as Array<{ payload: string }>;
    return rows.map(r => JSON.parse(r.payload) as OfficialRecord);
  }

  async upsertHolder(h: Holder): Promise<void> {
    this.assertCampaignExists(h.campaignId);
    this.db.prepare(
      `INSERT OR REPLACE INTO holders (campaign_id, holder_id, kind, payload) VALUES (?, ?, ?, ?)`
    ).run(h.campaignId, h.holderId, h.kind, JSON.stringify(h));
  }

  async listHolders(campaignId: CampaignId): Promise<Holder[]> {
    const rows = this.db.prepare(`SELECT payload FROM holders WHERE campaign_id = ?`).all(campaignId) as Array<{ payload: string }>;
    return rows.map(r => JSON.parse(r.payload) as Holder);
  }

  private recomputeArrival(campaignId: CampaignId, carriageId: string): void {
    const row = this.db.prepare(
      `SELECT payload FROM carriages WHERE campaign_id = ? AND carriage_id = ?`
    ).get(campaignId, carriageId) as { payload: string } | undefined;
    if (!row) throw new Error(`carriage "${carriageId}" not found`);
    const c = JSON.parse(row.payload) as Carriage;
    let arrival: number | null = c.departedDay + c.travelDays;
    const fxRows = this.db.prepare(
      `SELECT payload FROM carriage_effects WHERE campaign_id = ? AND carriage_id = ? ORDER BY seq`
    ).all(campaignId, carriageId) as Array<{ payload: string }>;
    for (const fxRow of fxRows) {
      const fx = JSON.parse(fxRow.payload) as CarriageEffect;
      if (fx.effect.kind === "CANCEL") { arrival = null; break; }
      if (fx.effect.kind === "DELAY") arrival! += fx.effect.days;
    }
    // Projection maintenance only — the carriage payload itself never changes.
    this.db.prepare(`UPDATE carriages SET arrival_day = ? WHERE campaign_id = ? AND carriage_id = ?`)
      .run(arrival, campaignId, carriageId);
  }

  async appendCarriage(c: Carriage): Promise<void> {
    this.assertCampaignExists(c.campaignId);
    if (this.db.prepare(`SELECT 1 FROM carriages WHERE campaign_id = ? AND carriage_id = ?`).get(c.campaignId, c.carriageId)) {
      throw new Error(`carriage "${c.carriageId}" already exists — append effects, not rewrites`);
    }
    this.db.prepare(
      `INSERT INTO carriages (campaign_id, carriage_id, to_place_id, arrival_day, payload) VALUES (?, ?, ?, ?, ?)`
    ).run(c.campaignId, c.carriageId, c.toPlaceId, c.departedDay + c.travelDays, JSON.stringify(c));
  }

  async listCarriages(campaignId: CampaignId, q: CarriageQuery): Promise<Carriage[]> {
    const conds = [`campaign_id = ?`];
    const params: unknown[] = [campaignId];
    if (q.toPlaceId !== undefined) { conds.push(`to_place_id = ?`); params.push(q.toPlaceId); }
    if (q.arrivedBy !== undefined) { conds.push(`arrival_day IS NOT NULL AND arrival_day <= ?`); params.push(q.arrivedBy); }
    const rows = this.db.prepare(
      `SELECT payload FROM carriages WHERE ${conds.join(" AND ")}`
    ).all(...params) as Array<{ payload: string }>;
    return rows.map(r => JSON.parse(r.payload) as Carriage);
  }

  async appendCarriageEffect(fx: CarriageEffect): Promise<void> {
    this.assertCampaignExists(fx.campaignId);
    this.db.prepare(
      `INSERT INTO carriage_effects (campaign_id, carriage_id, payload) VALUES (?, ?, ?)`
    ).run(fx.campaignId, fx.carriageId, JSON.stringify(fx));
    this.recomputeArrival(fx.campaignId, fx.carriageId);
  }

  async listCarriageEffects(campaignId: CampaignId, carriageId?: string): Promise<CarriageEffect[]> {
    const rows = carriageId === undefined
      ? this.db.prepare(`SELECT payload FROM carriage_effects WHERE campaign_id = ? ORDER BY seq`).all(campaignId)
      : this.db.prepare(`SELECT payload FROM carriage_effects WHERE campaign_id = ? AND carriage_id = ? ORDER BY seq`).all(campaignId, carriageId);
    return (rows as Array<{ payload: string }>).map(r => JSON.parse(r.payload) as CarriageEffect);
  }

  async appendInvention(i: ProvisionalInvention): Promise<void> {
    this.assertCampaignExists(i.campaignId);
    if (this.db.prepare(`SELECT 1 FROM inventions WHERE campaign_id = ? AND invention_id = ?`).get(i.campaignId, i.inventionId)) {
      throw new Error(`invention "${i.inventionId}" already exists`);
    }
    this.db.prepare(
      `INSERT INTO inventions (campaign_id, invention_id, status, payload) VALUES (?, ?, ?, ?)`
    ).run(i.campaignId, i.inventionId, i.status, JSON.stringify(i));
  }

  async appendInventionTransition(t: InventionTransition): Promise<void> {
    this.assertCampaignExists(t.campaignId);
    const row = this.db.prepare(
      `SELECT payload FROM inventions WHERE campaign_id = ? AND invention_id = ?`
    ).get(t.campaignId, t.inventionId) as { payload: string } | undefined;
    if (!row) throw new Error(`invention "${t.inventionId}" not found`);
    this.db.prepare(
      `INSERT INTO invention_transitions (campaign_id, invention_id, payload) VALUES (?, ?, ?)`
    ).run(t.campaignId, t.inventionId, JSON.stringify(t));
    const invention = JSON.parse(row.payload) as ProvisionalInvention;
    invention.status = t.to; // transitions are the only status writer
    this.db.prepare(`INSERT OR REPLACE INTO inventions (campaign_id, invention_id, status, payload) VALUES (?, ?, ?, ?)`)
      .run(t.campaignId, t.inventionId, t.to, JSON.stringify(invention));
  }

  async listInventions(campaignId: CampaignId, status?: InventionStatus): Promise<ProvisionalInvention[]> {
    const rows = status === undefined
      ? this.db.prepare(`SELECT payload FROM inventions WHERE campaign_id = ?`).all(campaignId)
      : this.db.prepare(`SELECT payload FROM inventions WHERE campaign_id = ? AND status = ?`).all(campaignId, status);
    return (rows as Array<{ payload: string }>).map(r => JSON.parse(r.payload) as ProvisionalInvention);
  }

  async listInventionTransitions(campaignId: CampaignId, inventionId?: string): Promise<InventionTransition[]> {
    const rows = inventionId === undefined
      ? this.db.prepare(`SELECT payload FROM invention_transitions WHERE campaign_id = ? ORDER BY seq`).all(campaignId)
      : this.db.prepare(`SELECT payload FROM invention_transitions WHERE campaign_id = ? AND invention_id = ? ORDER BY seq`).all(campaignId, inventionId);
    return (rows as Array<{ payload: string }>).map(r => JSON.parse(r.payload) as InventionTransition);
  }

  async upsertCanonicalAttribute(campaignId: CampaignId, row: CanonicalAttribute): Promise<void> {
    this.assertCampaignExists(campaignId);
    this.db.prepare(
      `INSERT OR REPLACE INTO canonical_attributes (campaign_id, entity_id, attribute_key, payload) VALUES (?, ?, ?, ?)`
    ).run(campaignId, row.entityId, row.key, JSON.stringify(row));
  }

  async getCanonicalAttributes(campaignId: CampaignId, entityId?: EntityID): Promise<CanonicalAttribute[]> {
    const rows = entityId === undefined
      ? this.db.prepare(`SELECT payload FROM canonical_attributes WHERE campaign_id = ?`).all(campaignId)
      : this.db.prepare(`SELECT payload FROM canonical_attributes WHERE campaign_id = ? AND entity_id = ?`).all(campaignId, entityId);
    return (rows as Array<{ payload: string }>).map(r => JSON.parse(r.payload) as CanonicalAttribute);
  }

  async appendMigrationFindings(findings: MigrationFinding[]): Promise<void> {
    const insert = this.db.prepare(`INSERT INTO migration_findings (campaign_id, payload) VALUES (?, ?)`);
    for (const f of findings) {
      this.assertCampaignExists(f.campaignId);
      insert.run(f.campaignId, JSON.stringify(f));
    }
  }

  async listMigrationFindings(campaignId: CampaignId): Promise<MigrationFinding[]> {
    const rows = this.db.prepare(
      `SELECT payload FROM migration_findings WHERE campaign_id = ? ORDER BY seq`
    ).all(campaignId) as Array<{ payload: string }>;
    return rows.map(r => JSON.parse(r.payload) as MigrationFinding);
  }

  async getWorldDay(campaignId: CampaignId): Promise<number> {
    const row = this.db.prepare(`SELECT world_day FROM campaigns WHERE id = ?`).get(campaignId) as { world_day: number } | undefined;
    if (!row) throw new SneqCampaignNotFoundError(campaignId);
    return row.world_day;
  }

  async setWorldDay(campaignId: CampaignId, day: number): Promise<void> {
    const current = await this.getWorldDay(campaignId);
    if (day < current) throw new Error(`world day cannot run backward: ${current} → ${day}`);
    this.db.prepare(`UPDATE campaigns SET world_day = ? WHERE id = ?`).run(day, campaignId);
  }

  async recordOperation(campaignId: CampaignId, operationId: string, result: unknown): Promise<void> {
    this.assertCampaignExists(campaignId);
    this.db.prepare(`DELETE FROM operations WHERE campaign_id = ? AND operation_id = ?`).run(campaignId, operationId);
    this.db.prepare(`INSERT INTO operations (campaign_id, operation_id, result) VALUES (?, ?, ?)`)
      .run(campaignId, operationId, JSON.stringify(result ?? null));
    // Bounded ring (#29): evict oldest past retention.
    this.db.prepare(
      `DELETE FROM operations WHERE campaign_id = ? AND seq NOT IN (
         SELECT seq FROM operations WHERE campaign_id = ? ORDER BY seq DESC LIMIT ?)`
    ).run(campaignId, campaignId, OPERATION_RETENTION);
  }

  async findOperation(campaignId: CampaignId, operationId: string): Promise<unknown | null> {
    const row = this.db.prepare(
      `SELECT result FROM operations WHERE campaign_id = ? AND operation_id = ?`
    ).get(campaignId, operationId) as { result: string } | undefined;
    return row ? (JSON.parse(row.result) as unknown) : null;
  }

  async getDispatchPolicy(campaignId: CampaignId): Promise<DispatchPolicy> {
    this.assertCampaignExists(campaignId);
    const row = this.db.prepare(`SELECT policy FROM dispatch_policies WHERE campaign_id = ?`).get(campaignId) as { policy: string } | undefined;
    return row ? (JSON.parse(row.policy) as DispatchPolicy) : { routes: [], rules: [] };
  }

  async setDispatchPolicy(campaignId: CampaignId, p: DispatchPolicy): Promise<void> {
    this.assertCampaignExists(campaignId);
    this.db.prepare(`INSERT OR REPLACE INTO dispatch_policies (campaign_id, policy) VALUES (?, ?)`)
      .run(campaignId, JSON.stringify(p));
  }

  async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      this.db.exec("BEGIN IMMEDIATE");
      this.txDepth++;
      try {
        const result = await this.inTransaction.run(true, () => fn(this));
        this.db.exec("COMMIT");
        return result;
      } catch (error) {
        this.db.exec("ROLLBACK");
        throw error;
      } finally {
        this.txDepth--;
      }
    });
  }

  async close(): Promise<void> {
    await this.txChain;
    this.db.close();
  }
}

