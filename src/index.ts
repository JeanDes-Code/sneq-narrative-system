export const SNEQ_ENGINE_VERSION = "0.0.0";

// Engine + CampaignContext
export { Engine, type NewCampaignInput } from "./engine.js";
export { CampaignContext, type MentionInput, type RegisterFactInput } from "./campaign.js";

// Config + loading
export { type EngineConfig, loadConfigFromFile } from "./config.js";

// Router
export { defaultRouterConfig } from "./router/defaults.js";
export { Router, RouterExhaustedError, createDefaultDeps, type RouterDeps, type DefaultDepsOptions } from "./router/router.js";
export type {
  RouterConfig, ProviderRef, ProviderChain, Tier,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse,
  Provider, ProviderKind, ProviderErrorCode
} from "./router/interface.js";
export { ProviderHttpError } from "./router/interface.js";

// Errors
export {
  SneqValidationError, SneqContradictionError, SneqProviderError,
  type ValidationFailureDetail
} from "./errors.js";

// Repository (interface + types). Reference SQLite adapter is also exposed,
// but lazy-loadable via @sneq/engine/sqlite for consumers who don't want better-sqlite3.
export type {
  Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore
} from "./repository/interface.js";

// Domain
export type { Entity, EntityType, Alias, AliasSource } from "./domain/entity.js";
export type { AttributValue, AttributFige, CategorieAttribut } from "./domain/attribute.js";
export type { Observation, ObservationSource, ObservationMethod, Fiabilite } from "./domain/observation.js";
export type {
  Potentialite, Contrainte, RegleContrainte, ContrainteSource, EtatAttribut,
  Tendance, ContexteGeneratif
} from "./domain/potentialite.js";
export type { NoeudGCN, AreteGCN, TypeRelation, ReglePropagation } from "./domain/gcn.js";
export type { Scene } from "./domain/scene.js";
export type { Turn } from "./domain/turn.js";
export type { CampaignId, EntityID, FactId, ContraintId, SceneId } from "./domain/ids.js";
export {
  asCampaignId, asEntityID, asFactId, asContraintId, asSceneId
} from "./domain/ids.js";

// Resolver
export type { ResolverThresholds } from "./resolver/thresholds.js";
export {
  Resolver, type ResolutionResult, type ResolveOptions, type SuggestionResult, type Embedder
} from "./resolver/resolver.js";

// Tools
export { ToolNames, type ToolName, schemas as toolSchemas, toolDescriptions } from "./tools/schemas.js";
export { jsonSchemas as toolJsonSchemas } from "./tools/json-schema.js";
export { anthropicTools, openAITools, geminiTools, genericTools } from "./tools/adapters.js";
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
