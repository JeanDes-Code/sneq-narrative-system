import type { FeedbackId } from "./ids.js";

export type FeedbackKind =
  | "FRICTION" | "MISSING" | "BROKEN"      // the agent: something grates / is absent / is broken
  | "REFLECTION" | "CORRECTION" | "PRAISE" // the player, relayed in meta-break
  | "IDEA";                                 // either

export type FeedbackStatus = "OPEN" | "TRIAGED" | "PROMOTED" | "DISMISSED";

export type FeedbackOrigin = "AGENT" | "HUMAN";

/** Out-of-band system feedback. Never narrative state, never shown to the player. */
export interface FeedbackEntry {
  id: FeedbackId;
  origin: FeedbackOrigin;
  kind: FeedbackKind;
  body: string;
  /** Pointer: tool name, subsystem, "general". */
  subject?: string;
  severity?: "LOW" | "MED" | "HIGH";
  status: FeedbackStatus;
  /** GitHub issue URL. Set iff status === "PROMOTED" — enforced at write-time by triage, not by this type. */
  promotedTo?: string;
  createdAt: number;
  createdTurn?: number;
}

export type ToolCallOutcome = "OK" | "EMPTY" | "NO_MATCH" | "CONTRADICTION" | "ERROR";

/** One row per tool call, captured passively at dispatchToolCall.
 *  Never contains raw args or narration (telemetry must hold no PII/prose). */
export interface ToolCallLogEntry {
  /** A ToolName as plain string — this module stays dependency-free of the tools layer. */
  tool: string;
  outcome: ToolCallOutcome;
  durationMs: number;
  /** Minimal machine detail: error name, "facts=0", "issues=2". */
  detail?: string;
  createdAt: number;
  /** Best-effort campaign turn at call time. */
  turn?: number;
}
