import type { AttributValue, CategorieAttribut } from "../domain/attribute.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId, ConstraintId, EntityID, FactId, SceneId } from "../domain/ids.js";
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

/**
 * Who is speaking, in the payload rather than hardcoded (#19). 0.3 stamped
 * every constraint `INFERENCE_IA`, so `REGLE_MONDE` — the declared world rule
 * the promotion loop needs a producer for — could never be written, and the
 * discriminator matched everything.
 */
export type ConstraintRole =
  /** A declared rule of the world: authored, not guessed. Gates promotion at full weight. */
  | { role: "REGLE_MONDE"; ruleId: string }
  /** The model's inference. Carries its own confidence, and says so. */
  | { role: "INFERENCE_IA"; confidence: number }
  /** Derived from an established canonical fact. */
  | { role: "FAIT_CANONIQUE"; factId: FactId }
  /** Derived from a relation between two entities. */
  | { role: "RELATION"; edgeKey: string };

export interface AddConstraintCommand extends AtomicCommand {
  campaignId: CampaignId;
  constraintId: ConstraintId;
  entityId: EntityID;
  attributeKey: string;
  rule: RegleContrainte;
  justification: string;
  /** REQUIRED (#19): the founding is explicit now, never inferred. */
  role: ConstraintRole;
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
  addConstraint(command: AddConstraintCommand): Promise<AddConstraintResult>;
  createEntity(command: CreateEntityCommand): Promise<CreateEntityResult>;
  setScene(command: SetSceneCommand): Promise<SetSceneResult>;
  advanceTurn(command: AdvanceTurnCommand): Promise<AdvanceTurnResult>;
  confirmEntityMatch(command: ConfirmEntityMatchCommand): Promise<ConfirmEntityMatchResult>;
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
