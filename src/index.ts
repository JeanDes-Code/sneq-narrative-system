export const SNEQ_ENGINE_VERSION = "0.3.1";

// Engine + CampaignContext
export { Engine, type NewCampaignInput } from "./engine.js";
export {
  CampaignContext,
  type ConfirmEntityMatchInput,
  type MentionInput,
  type MentionResult,
  type RegisterFactInput,
} from "./campaign.js";

// Config + loading
export { type EngineConfig, loadConfigFromFile, DEFAULT_MAX_DISPATCH_FANOUT } from "./config.js";

// Router
export { defaultRouterConfig } from "./router/defaults.js";
export { Router, RouterExhaustedError, createDefaultDeps, type RouterDeps, type DefaultDepsOptions } from "./router/router.js";
export type {
  RouterConfig, RouterTiers, ProviderRef, ProviderChain, Tier,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse,
  Provider, ProviderKind, ProviderErrorCode, ProviderUsage
} from "./router/interface.js";
export { ProviderHttpError } from "./router/interface.js";

// Errors
export {
  SneqValidationError,
  SneqContradictionError,
  SneqProviderError,
  SneqCampaignNotFoundError,
  SneqCampaignContextInvalidatedError,
  SneqConcurrentEntityCreationError,
  SneqUnknownEntityError,
  SneqContainmentError,
  type CampaignContextInvalidationReason,
  type ValidationFailureDetail,
  type IntraCommitConflict
} from "./errors.js";

// Repository (interface + types). Reference SQLite adapter is also exposed,
// but lazy-loadable via sneq-engine/sqlite for consumers who don't want better-sqlite3.
export type {
  Repository, RepositoryAccess, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore,
  CarriageQuery
} from "./repository/interface.js";
export { OPERATION_RETENTION } from "./repository/interface.js";

// Distributed-store atomic strategy (framework-free)
export type {
  AtomicCommand,
  AtomicWriteStrategy,
  AddConstraintCommand,
  AddConstraintResult,
  AddConstraintDecisionInput,
  AddConstraintDecision,
  CreateEntityCommand,
  CreateEntityResult,
  CreateEntityDecisionInput,
  CreateEntityDecision,
  EntityCandidateSummary,
  ConfirmEntityMatchCommand,
  ConfirmEntityMatchResult,
  ConfirmEntityMatchDecisionInput,
  ConfirmEntityMatchDecision,
  RegisterFactCommand,
  RegisterFactResult,
  SetSceneCommand,
  SetSceneResult,
  AdvanceTurnCommand,
  AdvanceTurnResult,
  AdvanceTurnDecisionInput,
  AdvanceTurnDecision,
  RegisterFactDecisionInput,
  RegisterFactDecision,
  SetSceneDecisionInput,
  SetSceneDecision,
} from "./atomic/types.js";
export {
  decideAddConstraint,
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideCreateEntity,
  decideRegisterFact,
  decideSetScene,
} from "./atomic/decisions.js";

// Domain
export type { Entity, EntityType, Alias, AliasSource } from "./domain/entity.js";
export type { AttributValue, AttributFige, CategorieAttribut, CanonicalAttribute, CanonicalSource } from "./domain/attribute.js";
export type { Observation, ObservationSource, ObservationMethod, Fiabilite } from "./domain/observation.js";
export type {
  Potentialite, Contrainte, RegleContrainte, ContrainteSource, EtatAttribut, ConstraintStatus,
  Tendance, ContexteGeneratif
} from "./domain/potentialite.js";
export type { NoeudGCN, AreteGCN, TypeRelation, ReglePropagation } from "./domain/gcn.js";
export type { Scene } from "./domain/scene.js";
export type { Turn } from "./domain/turn.js";
export type {
  CampaignId, EntityID, FactId, ConstraintId, SceneId,
  EventId, RecordId, HolderId, CarriageId, InventionId
} from "./domain/ids.js";
export {
  asCampaignId, asEntityID, asFactId, asConstraintId, asSceneId,
  asEventId, asRecordId, asHolderId, asCarriageId, asInventionId
} from "./domain/ids.js";

// Ledger domain (0.5.0)
export type { NarrativeEvent, EventAct, ActEffect } from "./domain/event.js";
export type { OfficialRecord, CarriageRoute } from "./domain/record.js";
export type { Holder, GroupHolder, IndividualHolder, DerogationReason } from "./domain/holder.js";
export type { Carriage, CarriageEffect, DispatchPolicy, DispatchRoute, DispatchRule } from "./domain/carriage.js";
export type {
  ProvisionalInvention, InventionStatus, PromotionEvidence, InventionTransition
} from "./domain/invention.js";
export { rebuildProjection, type ProjectionInputs } from "./core/projection.js";
export {
  migrateLegacyCampaign,
  type LegacyCampaignInput, type LegacyMigrationOutput
} from "./core/migrate-legacy.js";
export type { MigrationFinding, MigrationFindingKind } from "./domain/migration.js";

// The perspective seam's engine room (0.5.0, slice 3)
export type { Belief, BeliefCertainty, SalienceFactors } from "./domain/belief.js";
export { deriveBeliefs, type BeliefWorld } from "./core/derive-beliefs.js";
export { computeSalience, DEFAULT_SALIENCE_WEIGHTS, type SalienceWeights } from "./core/salience.js";
export {
  resolveHolder,
  type HolderResolution, type HolderResolutionInput, type ResolutionRoad
} from "./core/holder-resolution.js";
export {
  surfaceTokensOf, validateSuppliedTokens, forbiddenTokensFor,
  checkContainment, assertContainment,
  type TokenWorld, type EntityLike, type ContainmentResult
} from "./core/containment.js";
export {
  detectUptake, decidePromotion,
  type PromotionContext, type PromotionDecision
} from "./core/promotion.js";

// The single write and the world (0.5.0, slice 4)
export {
  decideCommitNarrative,
  type CommitNarrativeBundle, type CommitContext, type CommitPlan,
  type CommitHealth, type CommitEventInput, type CommitCarriageInput
} from "./core/commit-narrative.js";
export {
  commitNarrative,
  type CommitNarrativeOptions, type CommitNarrativeResult
} from "./atomic/commit-narrative.js";
export { tick, worldHealth, type WorldHealth, type WorldHealthInput } from "./core/tick.js";
export {
  bootstrapCampaign,
  DEFAULT_REALM_ENTITY_ID, DEFAULT_GROUP_HOLDER_ID,
  type BootstrapResult, type BootstrapRepo
} from "./atomic/bootstrap.js";

// Resolver
export type { ResolverThresholds } from "./resolver/thresholds.js";
export {
  Resolver, type ResolutionResult, type ResolveOptions, type SuggestionResult, type Embedder
} from "./resolver/resolver.js";

// Tools
export { ToolNames, type ToolName, schemas as toolSchemas, toolDescriptions } from "./tools/schemas.js";
export { jsonSchemas as toolJsonSchemas } from "./tools/json-schema.js";
export { anthropicTools, openAITools, geminiTools, genericTools, ADVERTISED_TOOL_NAMES } from "./tools/adapters.js";
export { dispatchToolCall, type ToolCallContext } from "./tools/dispatcher.js";

// Hooks
export type { AskUserFn, AskUserArgs } from "./hooks/user-prompt.js";
export { UserPromptRegistry } from "./hooks/user-prompt.js";
export type { PreGenerationHook, PredictionEvent } from "./hooks/pre-generation.js";
export { PreGenerationRegistry, noopPreGenerationHook } from "./hooks/pre-generation.js";
export type {
  NarrationGateHook, NarrationGateInput, NarrationGateContext,
  NarrationIssue, ValidationReport
} from "./hooks/narration-gate.js";
export { NarrationGateRegistry } from "./hooks/narration-gate.js";

// Narration validator (used by NarrationGateHook default impl + CLI validate-narration)
export {
  Validator, defaultNarrationGateHook,
  type ValidatorOptions, type ResolvedCandidate
} from "./core/validate-narration.js";

// Logger
export { type Logger, noopLogger } from "./logger.js";

// Validation utility (for consumers composing their own collapse)
export {
  validateValue,
  type ValidationContext, type ValidationResult, type ValidationFailure, type Avertissement
} from "./core/validation.js";

// Propagation utility (for consumers composing manual propagation after fact registration)
export { propagate, type PropagationInput, type PropagationResult, type ContraintePropagee } from "./core/propagation.js";
