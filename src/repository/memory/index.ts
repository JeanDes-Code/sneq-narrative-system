import type {
  Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore
} from "../interface.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import { AsyncLocalStorage } from "node:async_hooks";
import type { CampaignId, EntityID, FactId } from "../../domain/ids.js";
import { asFactId } from "../../domain/ids.js";
import { normalizeAlias, normalizeText } from "../../resolver/normalize.js";
import { SneqCampaignNotFoundError } from "../../errors.js";

export interface MemoryState {
  campaigns: Map<string, CampaignMeta>;
  entityRevisions: Map<string, number>;
  entities: Map<string, Map<string, Entity>>;
  facts: Map<string, Map<string, AttributFige & { campaignId: CampaignId }>>;
  potentialites: Map<string, Map<string, Potentialite>>;
  nodes: Map<string, Map<string, NoeudGCN>>;
  edges: Map<string, Map<string, AreteGCN>>;
  turns: Map<string, Map<number, Turn>>;
  scenes: Map<string, Map<string, Scene>>;
}

export function emptyMemoryState(): MemoryState {
  return {
    campaigns: new Map(), entityRevisions: new Map(), entities: new Map(), facts: new Map(),
    potentialites: new Map(), nodes: new Map(), edges: new Map(), turns: new Map(), scenes: new Map()
  };
}

export interface InMemoryRepositoryOptions {
  /** Vector dimension; omit to adopt from the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
}

/**
 * Zero-dependency reference Repository: plain Maps, brute-force cosine vector
 * search, snapshot/rollback transactions. Intended for tests, demos, prototypes
 * and as the base of the JSON-file adapter. Single-process, not shared-memory safe.
 */
export class InMemoryRepository implements Repository {
  protected state: MemoryState = emptyMemoryState();
  protected dim: number | null;
  protected txDepth = 0;
  private txChain: Promise<unknown> = Promise.resolve();
  /** Set only while this instance's own transaction callback is on the async call stack. */
  private readonly inTransaction = new AsyncLocalStorage<boolean>();

  constructor(opts: InMemoryRepositoryOptions = {}) {
    this.dim = opts.embeddingDim ?? null;
  }

  private assertCampaignExists(campaignId: CampaignId): void {
    if (!this.state.campaigns.has(campaignId)) {
      throw new SneqCampaignNotFoundError(campaignId);
    }
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.txChain.then(fn);
    this.txChain = result.catch(() => undefined);
    return result;
  }

  // -- campaigns --------------------------------------------------------------

  async listCampaigns(): Promise<CampaignMeta[]> {
    return [...this.state.campaigns.values()].map(c => ({ ...c }));
  }

  async createCampaign(meta: CampaignMeta): Promise<void> {
    // "create" means create: recreating an existing campaign would reset its
    // entity revision to 0 while leaving canon in place, letting a stale-revision
    // creator commit a duplicate. Recreation must go through deleteCampaign first.
    if (this.state.campaigns.has(meta.id)) {
      throw new Error(`campaign "${meta.id}" already exists`);
    }
    if (this.dim === null) this.dim = meta.embeddingDim;
    else if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim} (one repository = one dimension)`);
    }
    this.state.campaigns.set(meta.id, { ...meta });
    this.state.entityRevisions.set(meta.id, 0);
    await this.mutated();
  }

  private async deleteCampaignNow(id: CampaignId): Promise<void> {
    this.state.campaigns.delete(id);
    for (const bucket of [this.state.entities, this.state.facts, this.state.potentialites,
                          this.state.nodes, this.state.edges, this.state.turns, this.state.scenes]) {
      bucket.delete(id);
    }
    this.state.entityRevisions.delete(id);
    await this.mutated();
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    // Invoked through a transaction handle (tx.deleteCampaign), we already hold the
    // txChain slot; enqueue()-ing would wait forever on the transaction that is
    // waiting for us. Run inline in that case, like every other in-transaction write.
    // A merely concurrent standalone call is on a different async context and still
    // enqueues, so it stays ordered after the running transaction.
    if (this.inTransaction.getStore()) return this.deleteCampaignNow(id);
    return this.enqueue(() => this.deleteCampaignNow(id));
  }

  async entityRevision(campaignId: CampaignId): Promise<number> {
    this.assertCampaignExists(campaignId);
    return this.state.entityRevisions.get(campaignId) ?? 0;
  }

  // -- entities ---------------------------------------------------------------

  private entitiesOf(cid: CampaignId): Map<string, Entity> {
    let m = this.state.entities.get(cid);
    if (!m) { m = new Map(); this.state.entities.set(cid, m); }
    return m;
  }

  async upsertEntity(e: Entity): Promise<void> {
    this.assertCampaignExists(e.campaignId);
    if (e.embedding) {
      if (this.dim === null || this.dim === 0) {
        throw new Error(`entity "${e.id}" has an embedding but this repository has no vector store (embeddingDim=${this.dim ?? "unset"})`);
      }
      if (e.embedding.length !== this.dim) {
        throw new Error(`embedding dim mismatch for entity "${e.id}": got ${e.embedding.length}, repository stores ${this.dim}. Did the embedding model change? Keep one model per database.`);
      }
    }
    this.entitiesOf(e.campaignId).set(e.id, structuredClone(e));
    this.state.entityRevisions.set(
      e.campaignId,
      (this.state.entityRevisions.get(e.campaignId) ?? 0) + 1,
    );
    await this.mutated();
  }

  async getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null> {
    const e = this.state.entities.get(campaignId)?.get(entityId);
    return e ? structuredClone(e) : null;
  }

  async findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: EntityType): Promise<Entity[]> {
    const needle = normalizeText(aliasNormalized);
    const out: Entity[] = [];
    for (const e of this.state.entities.get(campaignId)?.values() ?? []) {
      if (type && e.type !== type) continue;
      const keys = new Set<string>();
      for (const text of [e.name, ...e.aliases.map(a => a.text)]) {
        keys.add(normalizeText(text));
        keys.add(normalizeAlias(text));
      }
      if (keys.has(needle)) out.push(structuredClone(e));
    }
    return out;
  }

  async searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]> {
    if (this.dim === null || this.dim === 0) return [];
    if (vec.length !== this.dim) {
      throw new Error(`embedding dim mismatch: query has ${vec.length}, repository stores ${this.dim}`);
    }
    const hits: EntityWithScore[] = [];
    for (const e of this.state.entities.get(campaignId)?.values() ?? []) {
      if (!e.embedding) continue;
      if (opts.filterType && e.type !== opts.filterType) continue;
      if (opts.excludeEntityIds?.includes(e.id)) continue;
      hits.push({ entity: structuredClone(e), score: cosine(vec, e.embedding) });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, opts.topK);
  }

  async topEntities(campaignId: CampaignId, k: number): Promise<Entity[]> {
    return [...(this.state.entities.get(campaignId)?.values() ?? [])]
      .sort((a, b) => (b.embeddingRefreshedAt ?? -1) - (a.embeddingRefreshedAt ?? -1))
      .slice(0, k)
      .map(e => structuredClone(e));
  }

  // -- facts --------------------------------------------------------------------

  private factsOf(cid: CampaignId): Map<string, AttributFige & { campaignId: CampaignId }> {
    let m = this.state.facts.get(cid);
    if (!m) { m = new Map(); this.state.facts.set(cid, m); }
    return m;
  }

  async appendFact(f: AttributFige & { campaignId: CampaignId }): Promise<{ factId: FactId }> {
    this.assertCampaignExists(f.campaignId);
    this.factsOf(f.campaignId).set(`${f.entityId}|${f.key}`, structuredClone(f));
    await this.mutated();
    return { factId: asFactId(f.factId) };
  }

  async getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]> {
    return [...(this.state.facts.get(campaignId)?.values() ?? [])]
      .filter(f => f.entityId === entityId)
      .sort((a, b) => a.turn - b.turn)
      .map(f => structuredClone(f));
  }

  async queryFacts(campaignId: CampaignId, q: FactQuery): Promise<AttributFige[]> {
    return [...(this.state.facts.get(campaignId)?.values() ?? [])]
      .filter(f =>
        (q.entityId === undefined || f.entityId === q.entityId) &&
        (q.attributeKey === undefined || f.key === q.attributeKey) &&
        (q.category === undefined || f.category === q.category) &&
        (q.minTurn === undefined || f.turn >= q.minTurn) &&
        (q.maxTurn === undefined || f.turn <= q.maxTurn))
      .sort((a, b) => a.turn - b.turn)
      .map(f => structuredClone(f));
  }

  // -- potentialites --------------------------------------------------------------

  async upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void> {
    this.assertCampaignExists(campaignId);
    let m = this.state.potentialites.get(campaignId);
    if (!m) { m = new Map(); this.state.potentialites.set(campaignId, m); }
    m.set(`${p.entiteId}|${p.attribut}`, structuredClone(p));
    await this.mutated();
  }

  async removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void> {
    this.state.potentialites.get(campaignId)?.delete(`${entityId}|${attribut}`);
    await this.mutated();
  }

  async getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null> {
    const p = this.state.potentialites.get(campaignId)?.get(`${entityId}|${attribut}`);
    return p ? structuredClone(p) : null;
  }

  // -- GCN --------------------------------------------------------------------

  async upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void> {
    this.assertCampaignExists(campaignId);
    let m = this.state.nodes.get(campaignId);
    if (!m) { m = new Map(); this.state.nodes.set(campaignId, m); }
    m.set(n.entityId, structuredClone(n));
    await this.mutated();
  }

  async upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void> {
    this.assertCampaignExists(campaignId);
    let m = this.state.edges.get(campaignId);
    if (!m) { m = new Map(); this.state.edges.set(campaignId, m); }
    m.set(a.key, structuredClone(a));
    await this.mutated();
  }

  async neighbors(campaignId: CampaignId, entityId: EntityID): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>> {
    const out: Array<{ node: NoeudGCN; edge: AreteGCN }> = [];
    for (const edge of this.state.edges.get(campaignId)?.values() ?? []) {
      if (edge.source !== entityId && edge.cible !== entityId) continue;
      const otherId = edge.source === entityId ? edge.cible : edge.source;
      const node = this.state.nodes.get(campaignId)?.get(otherId);
      if (node) out.push({ node: structuredClone(node), edge: structuredClone(edge) });
    }
    return out;
  }

  // -- turns / scenes -------------------------------------------------------------

  async appendTurn(t: Turn): Promise<void> {
    this.assertCampaignExists(t.campaignId);
    let m = this.state.turns.get(t.campaignId);
    if (!m) { m = new Map(); this.state.turns.set(t.campaignId, m); }
    m.set(t.turnNumber, structuredClone(t));
    await this.mutated();
  }

  async latestTurn(campaignId: CampaignId): Promise<Turn | null> {
    const turns = [...(this.state.turns.get(campaignId)?.values() ?? [])];
    if (turns.length === 0) return null;
    return structuredClone(turns.reduce((a, b) => (b.turnNumber > a.turnNumber ? b : a)));
  }

  async upsertScene(s: Scene): Promise<void> {
    this.assertCampaignExists(s.campaignId);
    let m = this.state.scenes.get(s.campaignId);
    if (!m) { m = new Map(); this.state.scenes.set(s.campaignId, m); }
    m.set(s.id, structuredClone(s));
    await this.mutated();
  }

  async currentScene(campaignId: CampaignId): Promise<Scene | null> {
    const withScene = [...(this.state.turns.get(campaignId)?.values() ?? [])]
      .filter(t => t.sceneId !== null)
      .sort((a, b) => b.turnNumber - a.turnNumber);
    const sceneId = withScene[0]?.sceneId;
    if (!sceneId) return null;
    const s = this.state.scenes.get(campaignId)?.get(sceneId);
    return s ? structuredClone(s) : null;
  }

  // -- transaction ------------------------------------------------------------------

  async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    return this.enqueue(async () => {
      const snapshot = structuredClone(this.state);
      this.txDepth++;
      try {
        const result = await this.inTransaction.run(true, () => fn(this));
        this.txDepth--;
        await this.mutated();
        return result;
      } catch (error) {
        if (this.txDepth > 0) this.txDepth--;
        this.state = snapshot;
        throw error;
      }
    });
  }

  async close(): Promise<void> {
    await this.txChain;
  }

  /** Persistence hook for subclasses (JSON adapter). No-op in memory. */
  protected async mutated(): Promise<void> { /* no-op */ }
}

export function memoryRepository(opts: InMemoryRepositoryOptions = {}): InMemoryRepository {
  return new InMemoryRepository(opts);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
