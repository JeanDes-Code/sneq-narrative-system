import type { AttributFige, AttributValue, CategorieAttribut } from "../domain/attribute.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId, EntityID, FactId, SceneId } from "../domain/ids.js";
import type { Observation } from "../domain/observation.js";
import type { Scene } from "../domain/scene.js";
import type { Turn } from "../domain/turn.js";

export interface AtomicCommand {
  /** Stable token for atomically deduplicating retries of one logical write. */
  operationId: string;
}

export interface RegisterFactCommand {
  campaignId: CampaignId;
  factId: FactId;
  entityId: EntityID;
  attributeKey: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
}

export interface RegisterFactResult {
  factId: FactId | null;
  contradictions: AttributFige[];
}

export interface SetSceneCommand {
  campaignId: CampaignId;
  sceneId: SceneId;
  locationEntityId: EntityID;
  presentEntityIds: EntityID[];
  description: string;
  createdAt: number;
}

export interface SetSceneResult {
  sceneId: SceneId;
  turnNumber: number;
}

export interface AdvanceTurnCommand {
  campaignId: CampaignId;
  summary?: string;
  createdAt: number;
}

export interface AdvanceTurnResult {
  turnNumber: number;
}

export interface ConfirmEntityMatchCommand extends AtomicCommand {
  campaignId: CampaignId;
  mention: string;
  entityId: EntityID;
  type: EntityType;
  observedAt: number;
}

export interface ConfirmEntityMatchResult {
  entityId: EntityID;
  aliasAdded: boolean;
}

export interface ConfirmEntityMatchDecisionInput extends ConfirmEntityMatchCommand {
  entity: Entity | null;
}

export interface ConfirmEntityMatchDecision {
  entity: Entity;
  result: ConfirmEntityMatchResult;
}

export interface AtomicWriteStrategy {
  registerFact(command: RegisterFactCommand): Promise<RegisterFactResult>;
  setScene(command: SetSceneCommand): Promise<SetSceneResult>;
  advanceTurn(command: AdvanceTurnCommand): Promise<AdvanceTurnResult>;
}

export interface RegisterFactDecisionInput extends RegisterFactCommand {
  existing: AttributFige[];
  latestTurnNumber: number;
}

export interface RegisterFactDecision {
  fact: (AttributFige & { campaignId: CampaignId }) | null;
  contradictions: AttributFige[];
}

export interface SetSceneDecisionInput extends SetSceneCommand {
  latestTurnNumber: number;
}

export interface SetSceneDecision {
  scene: Scene;
  turn: Turn;
}

export interface AdvanceTurnDecisionInput extends AdvanceTurnCommand {
  latestTurn: Turn | null;
}

export interface AdvanceTurnDecision {
  turn: Turn;
}
