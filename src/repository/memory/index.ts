import type {
  Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore, CarriageQuery
} from "../interface.js";
import { OPERATION_RETENTION } from "../interface.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import type { NarrativeEvent } from "../../domain/event.js";
import type { OfficialRecord } from "../../domain/record.js";
import type { Holder } from "../../domain/holder.js";
import type { Carriage, CarriageEffect, DispatchPolicy } from "../../domain/carriage.js";
import type { ProvisionalInvention, InventionTransition, InventionStatus } from "../../domain/invention.js";
import { AsyncLocalStorage } from "node:async_hooks";
import type { CampaignId, CarriageId, EntityID, FactId, InventionId } from "../../domain/ids.js";
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
  // Ledger (0.5.0). Events/records/effects/transitions are APPEND-ONLY.
  events: Map<string, Map<string, NarrativeEvent>>;
  records: Map<string, Map<string, OfficialRecord>>;
  holders: Map<string, Map<string, Holder>>;
  carriages: Map<string, Map<string, Carriage>>;
  carriageEffects: Map<string, CarriageEffect[]>;
  inventions: Map<string, Map<string, ProvisionalInvention>>;
  inventionTransitions: Map<string, InventionTransition[]>;
  worldDays: Map<string, number>;
  /** Bounded dedup ring (#29): insertion-ordered Map, oldest evicted past OPERATION_RETENTION. */
  operations: Map<string, Map<string, unknown>>;
  dispatchPolicies: Map<string, DispatchPolicy>;
}

export function emptyMemoryState(): MemoryState {
  return {
    campaigns: new Map(), entityRevisions: new Map(), entities: new Map(), facts: new Map(),
    potentialites: new Map(), nodes: new Map(), edges: new Map(), turns: new Map(), scenes: new Map(),
    events: new Map(), records: new Map(), holders: new Map(), carriages: new Map(),
    carriageEffects: new Map(), inventions: new Map(), inventionTransitions: new Map(),
    worldDays: new Map(), operations: new Map(), dispatchPolicies: new Map()
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
                          this.state.nodes, this.state.edges, this.state.turns, this.state.scenes,
                          this.state.events, this.state.records, this.state.holders,
                          this.state.carriages, this.state.carriageEffects, this.state.inventions,
                          this.state.inventionTransitions, this.state.worldDays,
                          this.state.operations, this.state.dispatchPolicies] as Array<Map<string, unknown>>) {
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

  // -- ledger (0.5.0) ---------------------------------------------------------------

  private bucket<V>(store: Map<string, Map<string, V>>, cid: CampaignId): Map<string, V> {
    let m = store.get(cid);
    if (!m) { m = new Map(); store.set(cid, m); }
    return m;
  }

  async appendEvent(e: NarrativeEvent): Promise<void> {
    this.assertCampaignExists(e.campaignId);
    const events = this.bucket(this.state.events, e.campaignId);
    if (events.has(e.eventId)) {
      throw new Error(`event "${e.eventId}" already exists — the ledger is append-only`);
    }
    events.set(e.eventId, structuredClone(e));
    await this.mutated();
  }

  async getEvents(campaignId: CampaignId): Promise<NarrativeEvent[]> {
    // Maps preserve insertion order; a stable sort by (day, turn) keeps ledger
    // sequence as the tie-breaker — the fold's ordering contract (#27).
    return [...(this.state.events.get(campaignId)?.values() ?? [])]
      .sort((a, b) => a.day - b.day || a.turn - b.turn)
      .map(e => structuredClone(e));
  }

  async appendRecord(r: OfficialRecord): Promise<void> {
    this.assertCampaignExists(r.campaignId);
    const records = this.bucket(this.state.records, r.campaignId);
    if (records.has(r.recordId)) {
      throw new Error(`record "${r.recordId}" already exists — records accumulate, never replace`);
    }
    records.set(r.recordId, structuredClone(r));
    await this.mutated();
  }

  async getRecords(campaignId: CampaignId): Promise<OfficialRecord[]> {
    return [...(this.state.records.get(campaignId)?.values() ?? [])]
      .sort((a, b) => a.day - b.day || a.turn - b.turn)
      .map(r => structuredClone(r));
  }

  async upsertHolder(h: Holder): Promise<void> {
    this.assertCampaignExists(h.campaignId);
    this.bucket(this.state.holders, h.campaignId).set(h.holderId, structuredClone(h));
    await this.mutated();
  }

  async listHolders(campaignId: CampaignId): Promise<Holder[]> {
    return [...(this.state.holders.get(campaignId)?.values() ?? [])].map(h => structuredClone(h));
  }

  /** Derived arrival: departedDay + travelDays + Σ DELAY; null = CANCELled, never arrives. */
  private arrivalDay(c: Carriage): number | null {
    let day = c.departedDay + c.travelDays;
    for (const fx of this.state.carriageEffects.get(c.campaignId) ?? []) {
      if (fx.carriageId !== c.carriageId) continue;
      if (fx.effect.kind === "CANCEL") return null;
      if (fx.effect.kind === "DELAY") day += fx.effect.days;
    }
    return day;
  }

  async appendCarriage(c: Carriage): Promise<void> {
    this.assertCampaignExists(c.campaignId);
    const carriages = this.bucket(this.state.carriages, c.campaignId);
    if (carriages.has(c.carriageId)) {
      throw new Error(`carriage "${c.carriageId}" already exists — append effects, not rewrites`);
    }
    carriages.set(c.carriageId, structuredClone(c));
    await this.mutated();
  }

  async listCarriages(campaignId: CampaignId, q: CarriageQuery): Promise<Carriage[]> {
    return [...(this.state.carriages.get(campaignId)?.values() ?? [])]
      .filter(c => {
        if (q.toPlaceId !== undefined && c.toPlaceId !== q.toPlaceId) return false;
        if (q.arrivedBy !== undefined) {
          const arrival = this.arrivalDay(c);
          if (arrival === null || arrival > q.arrivedBy) return false;
        }
        return true;
      })
      .map(c => structuredClone(c));
  }

  async appendCarriageEffect(fx: CarriageEffect): Promise<void> {
    this.assertCampaignExists(fx.campaignId);
    let list = this.state.carriageEffects.get(fx.campaignId);
    if (!list) { list = []; this.state.carriageEffects.set(fx.campaignId, list); }
    list.push(structuredClone(fx));
    await this.mutated();
  }

  async listCarriageEffects(campaignId: CampaignId, carriageId?: CarriageId): Promise<CarriageEffect[]> {
    return (this.state.carriageEffects.get(campaignId) ?? [])
      .filter(fx => carriageId === undefined || fx.carriageId === carriageId)
      .map(fx => structuredClone(fx));
  }

  async appendInvention(i: ProvisionalInvention): Promise<void> {
    this.assertCampaignExists(i.campaignId);
    const inventions = this.bucket(this.state.inventions, i.campaignId);
    if (inventions.has(i.inventionId)) {
      throw new Error(`invention "${i.inventionId}" already exists`);
    }
    inventions.set(i.inventionId, structuredClone(i));
    await this.mutated();
  }

  async appendInventionTransition(t: InventionTransition): Promise<void> {
    this.assertCampaignExists(t.campaignId);
    const invention = this.state.inventions.get(t.campaignId)?.get(t.inventionId);
    if (!invention) throw new Error(`invention "${t.inventionId}" not found`);
    let list = this.state.inventionTransitions.get(t.campaignId);
    if (!list) { list = []; this.state.inventionTransitions.set(t.campaignId, list); }
    list.push(structuredClone(t));
    invention.status = t.to; // transitions are the only status writer
    await this.mutated();
  }

  async listInventions(campaignId: CampaignId, status?: InventionStatus): Promise<ProvisionalInvention[]> {
    return [...(this.state.inventions.get(campaignId)?.values() ?? [])]
      .filter(i => status === undefined || i.status === status)
      .map(i => structuredClone(i));
  }

  async listInventionTransitions(campaignId: CampaignId, inventionId?: InventionId): Promise<InventionTransition[]> {
    return (this.state.inventionTransitions.get(campaignId) ?? [])
      .filter(t => inventionId === undefined || t.inventionId === inventionId)
      .map(t => structuredClone(t));
  }

  async getWorldDay(campaignId: CampaignId): Promise<number> {
    this.assertCampaignExists(campaignId);
    return this.state.worldDays.get(campaignId) ?? 0;
  }

  async setWorldDay(campaignId: CampaignId, day: number): Promise<void> {
    this.assertCampaignExists(campaignId);
    const current = this.state.worldDays.get(campaignId) ?? 0;
    if (day < current) {
      throw new Error(`world day cannot run backward: ${current} → ${day}`);
    }
    this.state.worldDays.set(campaignId, day);
    await this.mutated();
  }

  async recordOperation(campaignId: CampaignId, operationId: string, result: unknown): Promise<void> {
    this.assertCampaignExists(campaignId);
    const ring = this.bucket(this.state.operations, campaignId);
    ring.delete(operationId); // re-record refreshes recency
    ring.set(operationId, structuredClone(result));
    while (ring.size > OPERATION_RETENTION) {
      ring.delete(ring.keys().next().value as string);
    }
    await this.mutated();
  }

  async findOperation(campaignId: CampaignId, operationId: string): Promise<unknown | null> {
    const ring = this.state.operations.get(campaignId);
    if (!ring || !ring.has(operationId)) return null;
    return structuredClone(ring.get(operationId));
  }

  async getDispatchPolicy(campaignId: CampaignId): Promise<DispatchPolicy> {
    this.assertCampaignExists(campaignId);
    const p = this.state.dispatchPolicies.get(campaignId);
    return p ? structuredClone(p) : { routes: [], rules: [] };
  }

  async setDispatchPolicy(campaignId: CampaignId, p: DispatchPolicy): Promise<void> {
    this.assertCampaignExists(campaignId);
    this.state.dispatchPolicies.set(campaignId, structuredClone(p));
    await this.mutated();
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
