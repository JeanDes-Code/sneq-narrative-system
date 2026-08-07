import type { AttributFige, AttributValue, CategorieAttribut } from "../domain/attribute.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId, ConstraintId, EntityID, FactId, SceneId } from "../domain/ids.js";
import type { Observation } from "../domain/observation.js";
import type { Potentialite, RegleContrainte } from "../domain/potentialite.js";
import type { Scene } from "../domain/scene.js";
import type { Turn } from "../domain/turn.js";

export interface AtomicCommand {
  /**
   * Stable token identifying one logical write, generated once per engine call and
   * reused across its retries.
   *
   * The engine does NOT deduplicate on it. The built-in repository-backed strategy
   * ignores this field entirely; a distributed `AtomicWriteStrategy` that needs
   * exactly-once semantics has to implement the dedup itself, keyed on this token —
   * that is what it is here for. Do not read it as a guarantee the engine provides.
   */
  operationId: string;
}

export interface RegisterFactCommand extends AtomicCommand {
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

export interface SetSceneCommand extends AtomicCommand {
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

export interface AdvanceTurnCommand extends AtomicCommand {
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

export interface AddConstraintCommand extends AtomicCommand {
  campaignId: CampaignId;
  constraintId: ConstraintId;
  entityId: EntityID;
  attributeKey: string;
  rule: RegleContrainte;
  justification: string;
  createdAt: number;
}

export interface AddConstraintResult {
  constraintId: ConstraintId;
}

export interface AddConstraintDecisionInput extends AddConstraintCommand {
  existing: Potentialite | null;
}

export interface AddConstraintDecision {
  potentialite: Potentialite;
  result: AddConstraintResult;
}

export interface EntityCandidateSummary {
  entityId: EntityID;
  name: string;
  type: EntityType;
}

export interface CreateEntityCommand extends AtomicCommand {
  campaignId: CampaignId;
  expectedEntityRevision: number;
  candidate: Entity;
  identityKeys: string[];
  force: boolean;
}

export type CreateEntityResult =
  | { status: "stale" }
  | { status: "created"; entityId: EntityID; isNew: true }
  | { status: "existing"; entityId: EntityID; isNew: false; resolvedTo: EntityID }
  | { status: "conflict"; candidates: EntityCandidateSummary[] };

export interface CreateEntityDecisionInput extends CreateEntityCommand {
  currentEntityRevision: number;
  exactMatches: Entity[];
}

export interface CreateEntityDecision {
  entity: Entity | null;
  result: CreateEntityResult;
}

export interface AtomicWriteStrategy {
  registerFact(command: RegisterFactCommand): Promise<RegisterFactResult>;
  addConstraint(command: AddConstraintCommand): Promise<AddConstraintResult>;
  createEntity(command: CreateEntityCommand): Promise<CreateEntityResult>;
  setScene(command: SetSceneCommand): Promise<SetSceneResult>;
  advanceTurn(command: AdvanceTurnCommand): Promise<AdvanceTurnResult>;
  confirmEntityMatch(command: ConfirmEntityMatchCommand): Promise<ConfirmEntityMatchResult>;
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
