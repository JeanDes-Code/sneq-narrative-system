import type { AttributFige } from "./domain/attribute.js";
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

export class SneqContradictionError extends Error {
  constructor(public readonly contradictions: AttributFige[]) {
    super(`Fact contradicts ${contradictions.length} canonical fact(s)`);
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

export class SneqProviderError extends Error {
  constructor(public readonly tier: Tier, public readonly exhausted: boolean, message: string) {
    super(message);
    this.name = "SneqProviderError";
  }
}
