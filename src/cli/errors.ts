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
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) {
    super(`${code}: ${message}`);
    this.name = "CliError";
  }
}
