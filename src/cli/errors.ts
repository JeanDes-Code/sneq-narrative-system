import { ZodError } from "zod";
import {
  SneqValidationError, SneqContradictionError, SneqProviderError, SneqCampaignNotFoundError,
  SneqUnknownEntityError, SneqUnknownHolderError, SneqContainmentError, SneqEmbeddingDimError
} from "../errors.js";

export type ErrorCode =
  | "INVALID_ARGS"
  | "VALIDATION_FAILED"
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_ALREADY_EXISTS"
  | "ENTITY_NOT_FOUND"
  | "HOLDER_NOT_FOUND"
  | "CONTAINMENT_VIOLATION"
  | "EMBEDDING_DIM_MISMATCH"
  | "PROVIDER_ERROR"
  | "REPOSITORY_ERROR"
  | "UNKNOWN_COMMAND"
  | "INTERNAL_ERROR";

export class CliError extends Error {
  /** Human-readable message without the code prefix — used in JSON output. */
  readonly rawMessage: string;

  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) {
    // Include code in Error.message so .toThrow(/CODE/) matchers work in tests.
    super(`${code}: ${message}`);
    this.name = "CliError";
    this.rawMessage = message;
  }
}

export interface FormattedError {
  json: string;
  exitCode: 1 | 2;
}

export function formatError(err: unknown): FormattedError {
  if (err instanceof CliError) {
    return {
      json: JSON.stringify(stripUndefined({
        error: err.rawMessage,
        code: err.code,
        details: err.details
      })),
      exitCode: 1
    };
  }
  if (err instanceof SneqValidationError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "VALIDATION_FAILED",
        details: err.details
      }),
      exitCode: 1
    };
  }
  // Defensive: registerFact currently returns contradictions as a resolved value (exit 0),
  // but other code paths may throw SneqContradictionError. Map to VALIDATION_FAILED to be safe.
  if (err instanceof SneqContradictionError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "VALIDATION_FAILED",
        details: { contradictions: err.contradictions }
      }),
      exitCode: 1
    };
  }
  // A user/agent error, not an engine bug: exit 1, and the message already names the
  // corrective call. Keeping it out of INTERNAL_ERROR is the point — an agent reads
  // exit 2 as "the engine is broken" and gives up instead of fixing its own call.
  if (err instanceof SneqUnknownEntityError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "ENTITY_NOT_FOUND",
        details: { tool: err.toolName, field: err.field, value: err.value }
      }),
      exitCode: 1
    };
  }
  // The seam broke: the engine handed over something it should not have. Exit 1
  // rather than 2 because the message names what to inspect, but treat it as the
  // stop-everything result it is — never narrate around it (§11 phase D).
  if (err instanceof SneqContainmentError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "CONTAINMENT_VIOLATION",
        details: { holderId: err.holderId, present: err.present, forbidden: err.forbidden }
      }),
      exitCode: 1
    };
  }
  // Distinct from "this holder knows nothing", which is a successful read with
  // an empty belief list (#21's null doctrine).
  if (err instanceof SneqUnknownHolderError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "HOLDER_NOT_FOUND",
        details: { holderId: err.holderId }
      }),
      exitCode: 1
    };
  }
  if (err instanceof SneqEmbeddingDimError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "EMBEDDING_DIM_MISMATCH",
        details: { campaignId: err.campaignId, stored: err.stored, got: err.got }
      }),
      exitCode: 1
    };
  }
  if (err instanceof SneqCampaignNotFoundError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "CAMPAIGN_NOT_FOUND",
        details: { campaignId: err.campaignId }
      }),
      exitCode: 1
    };
  }
  if (err instanceof SneqProviderError) {
    return {
      json: JSON.stringify({
        error: err.message,
        code: "PROVIDER_ERROR",
        details: { tier: err.tier, exhausted: err.exhausted }
      }),
      exitCode: 1
    };
  }
  if (err instanceof ZodError) {
    return {
      json: JSON.stringify({
        error: "args validation failed",
        code: "VALIDATION_FAILED",
        details: err.issues
      }),
      exitCode: 1
    };
  }
  const message = err instanceof Error ? err.message : (typeof err === "string" ? err : "unknown error");
  return {
    json: JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
    exitCode: 2
  };
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
  return out as Partial<T>;
}
