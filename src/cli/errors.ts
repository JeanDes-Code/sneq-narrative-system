import { ZodError } from "zod";
import { SneqValidationError, SneqContradictionError, SneqProviderError } from "../errors.js";

export type ErrorCode =
  | "INVALID_ARGS"
  | "VALIDATION_FAILED"
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_ALREADY_EXISTS"
  | "ENTITY_NOT_FOUND"
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
