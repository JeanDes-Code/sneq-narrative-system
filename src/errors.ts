import type { AttributValue, CanonicalAttribute } from "./domain/attribute.js";
import type { EntityID, EventId } from "./domain/ids.js";
import type { Tier } from "./router/interface.js";

export interface ValidationFailureDetail {
  type: "FORMAT" | "CONTRAINTE_STRICTE" | "CONTRADICTION_RC";
  message: string;
}

export class SneqValidationError extends Error {
  constructor(public readonly details: ValidationFailureDetail[]) {
    super(`Validation failed: ${details.map(d => d.type).join(", ")}`);
    this.name = "SneqValidationError";
  }
}

/** Two `sets` on the same key with different values inside one commit (#27). */
export interface IntraCommitConflict {
  entityId: EntityID;
  key: string;
  values: [AttributValue, AttributValue];
  eventId: EventId;
}

export class SneqContradictionError extends Error {
  constructor(public readonly contradictions: CanonicalAttribute[] | IntraCommitConflict[], message?: string) {
    super(message ?? `Fact contradicts ${contradictions.length} canonical fact(s)`);
    this.name = "SneqContradictionError";
  }
}

export class SneqCampaignNotFoundError extends Error {
  constructor(public readonly campaignId: string) {
    super(`campaign "${campaignId}" not found — create it first (engine.createCampaign / sneq-engine init-campaign)`);
    this.name = "SneqCampaignNotFoundError";
  }
}

export type CampaignContextInvalidationReason = "deleting" | "deleted" | "engine-closed";

export class SneqCampaignContextInvalidatedError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly reason: CampaignContextInvalidationReason,
  ) {
    super(`campaign context "${campaignId}" is invalid (${reason})`);
    this.name = "SneqCampaignContextInvalidatedError";
  }
}

export class SneqConcurrentEntityCreationError extends Error {
  constructor(public readonly campaignId: string, public readonly attempts: number) {
    super(`entity canon changed during ${attempts} creation attempts for campaign "${campaignId}"; retry the logical call`);
    this.name = "SneqConcurrentEntityCreationError";
  }
}

/**
 * A tool call carried something that is not a known entity id where one is required —
 * typically a model typing a free-text name. `EntityID` is a compile-time brand, so
 * nothing stops such a value at runtime: the write used to "succeed" and every read
 * after it came back empty. This turns that silence into a message naming the fix.
 */
export class SneqUnknownEntityError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly field: string,
    public readonly value: string,
  ) {
    super(
      `${toolName}: ${field} ${JSON.stringify(value)} is not a known entity id in this campaign. ` +
      `Call sneq__lookup_entity to find the existing entity, or sneq__mention_entity to introduce it, ` +
      `then pass the returned entityId.`,
    );
    this.name = "SneqUnknownEntityError";
  }
}

/**
 * A holder id reached the engine and no holder answers to it. Distinct from
 * "this holder knows nothing", which is an empty belief list plus an explain
 * line — the #21 null doctrine keeps the three states apart, and conflating
 * them is the Cassius Vorentius bug.
 */
export class SneqUnknownHolderError extends Error {
  constructor(public readonly holderId: string) {
    super(
      `holder "${holderId}" is not a holder in this campaign. ` +
      `Pass an entityId instead and let the engine run the §2.3 cascade, ` +
      `or author the holder first (sneq-engine upsert-holder / commit_narrative holders[]).`,
    );
    this.name = "SneqUnknownHolderError";
  }
}

/**
 * A vector does not match the campaign's stored dimension (§14.5). The old
 * message said *what* to do ("use a fresh database file") and never *why*, and
 * it arrived after the campaign was already unusable. There is a migration
 * now, so the message names it.
 */
export class SneqEmbeddingDimError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly stored: number,
    public readonly got: number,
  ) {
    super(
      `embedding dim mismatch in campaign "${campaignId}": this campaign stores ${stored}-dimension vectors, ` +
      `the one supplied has ${got}. Vectors from two different models are not comparable, so the resolver ` +
      `would rank on noise. To move this campaign to ${got}: call setEmbeddingDim(campaignId, ${got}) — which ` +
      `clears the stored vectors — then reindexEmbeddings(campaignId, vectors) with every entity re-embedded ` +
      `by the new model. Until the reindex lands the campaign resolves by alias alone: degraded, never wrong.`,
    );
    this.name = "SneqEmbeddingDimError";
  }
}

/**
 * A composed payload contains a token this holder cannot hold (§11 phase D).
 * Default posture: throw — "the engine is broken, stop". A containment failure
 * is an engine bug, never a gameplay outcome.
 */
export class SneqContainmentError extends Error {
  constructor(
    public readonly holderId: string,
    public readonly forbidden: string[],
    public readonly present: string[],
  ) {
    super(
      `containment violated for holder "${holderId}": the payload contains ${present.length} token(s) ` +
      `this holder never learned (${present.map(t => JSON.stringify(t)).join(", ")}). ` +
      `The engine handed over something it should not have — stop and inspect, do not narrate around it.`,
    );
    this.name = "SneqContainmentError";
  }
}

export class SneqProviderError extends Error {
  constructor(public readonly tier: Tier, public readonly exhausted: boolean, message: string) {
    super(message);
    this.name = "SneqProviderError";
  }
}
