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

export class SneqProviderError extends Error {
  constructor(public readonly tier: Tier, public readonly exhausted: boolean, message: string) {
    super(message);
    this.name = "SneqProviderError";
  }
}
