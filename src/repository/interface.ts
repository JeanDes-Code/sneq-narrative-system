import type { Entity } from "../domain/entity.js";
import type { AttributFige } from "../domain/attribute.js";
import type { Potentialite } from "../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../domain/gcn.js";
import type { Scene } from "../domain/scene.js";
import type { Turn } from "../domain/turn.js";
import type { NarrativeEvent } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Holder } from "../domain/holder.js";
import type { Carriage, CarriageEffect, DispatchPolicy } from "../domain/carriage.js";
import type { ProvisionalInvention, InventionTransition, InventionStatus } from "../domain/invention.js";
import type { CampaignId, CarriageId, EntityID, FactId, InventionId } from "../domain/ids.js";

export interface EntityWithScore { entity: Entity; score: number; }

export interface FactQuery {
  entityId?: EntityID;
  attributeKey?: string;
  category?: import("../domain/attribute.js").CategorieAttribut;
  minTurn?: number;
  maxTurn?: number;
}

export interface VectorSearchOpts {
  topK: number;
  filterType?: import("../domain/entity.js").EntityType;
  excludeEntityIds?: EntityID[];
}

export interface CampaignMeta {
  id: CampaignId;
  name: string;
  createdAt: number;
  embeddingDim: number;
}

export interface CarriageQuery {
  toPlaceId?: EntityID;
  /** Derived arrival ≤ this day: departedDay + travelDays + Σ DELAY; CANCEL never arrives. */
  arrivedBy?: number;
}

/**
 * Per-campaign size of the operation dedup ring (#29). Retries are
 * near-in-time; the ring is a bounded log, never a forever-log.
 */
export const OPERATION_RETENTION = 100;

export interface Repository {
  // Campaigns
  listCampaigns(): Promise<CampaignMeta[]>;
  createCampaign(meta: CampaignMeta): Promise<void>;
  deleteCampaign(id: CampaignId): Promise<void>;
  entityRevision(campaignId: CampaignId): Promise<number>;

  // Entities
  upsertEntity(e: Entity): Promise<void>;
  getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null>;
  findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: import("../domain/entity.js").EntityType): Promise<Entity[]>;
  searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]>;
  /** Return up to `k` entities for the campaign, ordered by `embeddingRefreshedAt` descending. */
  topEntities(campaignId: CampaignId, k: number): Promise<Entity[]>;

  // Facts (RC)
  appendFact(f: AttributFige & { campaignId: CampaignId }): Promise<{ factId: FactId }>;
  getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]>;
  queryFacts(campaignId: CampaignId, query: FactQuery): Promise<AttributFige[]>;

  // Potentialities
  upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void>;
  removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void>;
  getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null>;

  // GCN
  upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void>;
  upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void>;
  neighbors(campaignId: CampaignId, entityId: EntityID): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>>;

  // Turn / Scene
  appendTurn(t: Turn): Promise<void>;
  latestTurn(campaignId: CampaignId): Promise<Turn | null>;
  upsertScene(s: Scene): Promise<void>;
  currentScene(campaignId: CampaignId): Promise<Scene | null>;

  // Ledger (0.5.0, §5.4) — events are APPEND-ONLY: the contract test asserts
  // no mutation path exists on this surface (§7.1).
  appendEvent(e: NarrativeEvent): Promise<void>;
  getEvents(campaignId: CampaignId): Promise<NarrativeEvent[]>;
  appendRecord(r: OfficialRecord): Promise<void>;
  getRecords(campaignId: CampaignId): Promise<OfficialRecord[]>;
  upsertHolder(h: Holder): Promise<void>;
  listHolders(campaignId: CampaignId): Promise<Holder[]>;
  appendCarriage(c: Carriage): Promise<void>;
  listCarriages(campaignId: CampaignId, q: CarriageQuery): Promise<Carriage[]>;
  appendCarriageEffect(fx: CarriageEffect): Promise<void>;
  listCarriageEffects(campaignId: CampaignId, carriageId?: CarriageId): Promise<CarriageEffect[]>;
  appendInvention(i: ProvisionalInvention): Promise<void>;
  /** Also updates the invention row's status — transitions are the only status writer. */
  appendInventionTransition(t: InventionTransition): Promise<void>;
  listInventions(campaignId: CampaignId, status?: InventionStatus): Promise<ProvisionalInvention[]>;
  listInventionTransitions(campaignId: CampaignId, inventionId?: InventionId): Promise<InventionTransition[]>;

  // World clock (§4) — day only moves forward, and only by explicit statement.
  getWorldDay(campaignId: CampaignId): Promise<number>;
  setWorldDay(campaignId: CampaignId, day: number): Promise<void>;

  // Operation dedup ring (#29) — commit_narrative idempotency by operationId.
  recordOperation(campaignId: CampaignId, operationId: string, result: unknown): Promise<void>;
  findOperation(campaignId: CampaignId, operationId: string): Promise<unknown | null>;

  // Dispatch policy home (#15) — campaign state; empty until authored.
  getDispatchPolicy(campaignId: CampaignId): Promise<DispatchPolicy>;
  setDispatchPolicy(campaignId: CampaignId, p: DispatchPolicy): Promise<void>;

  // Transactional
  transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T>;

  // Lifecycle
  close(): Promise<void>;
}

/** Repository surface usable by distributed stores; atomic writes are injected separately. */
export type RepositoryAccess = Omit<Repository, "transaction">;
