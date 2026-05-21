import type { Entity } from "../domain/entity.js";
import type { AttributFige } from "../domain/attribute.js";
import type { Potentialite } from "../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../domain/gcn.js";
import type { Scene } from "../domain/scene.js";
import type { Turn } from "../domain/turn.js";
import type { CampaignId, EntityID, FactId } from "../domain/ids.js";

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

export interface Repository {
  // Campaigns
  listCampaigns(): Promise<CampaignMeta[]>;
  createCampaign(meta: CampaignMeta): Promise<void>;
  deleteCampaign(id: CampaignId): Promise<void>;

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
  neighbors(campaignId: CampaignId, entityId: EntityID, depth: number): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>>;

  // Turn / Scene
  appendTurn(t: Turn): Promise<void>;
  latestTurn(campaignId: CampaignId): Promise<Turn | null>;
  upsertScene(s: Scene): Promise<void>;
  currentScene(campaignId: CampaignId): Promise<Scene | null>;

  // Transactional
  transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T>;

  // Lifecycle
  close(): Promise<void>;
}
