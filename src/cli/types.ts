import type { Observation } from "../domain/observation.js";

/**
 * `out-of-band` is the sanctioned fifth road (#22): "confirmed by the human,
 * outside the fiction", for the documented stale-scene recovery. It travels the
 * normal commit road, may be back-dated, and `doctor` counts it — so laundering
 * confabulation through it shows up in one line. `--source player-utterance`
 * for the same job was rejected: the label would lie, and a lying provenance in
 * an append-only ledger is forever.
 */
export type SourcePreset =
  | "gm-narration" | "player-utterance" | "dice-roll" | "system" | "out-of-band";

/**
 * 18 commands. Fourteen in 0.3, two renames (count-neutral: `get-relevant-facts`
 * → `get-holder-context`, `register-fact` → `commit-narrative`), plus
 * `upsert-holder`, `show-dispatch-policy`, `set-dispatch-policy` (#15) and
 * `doctor` (§12.4).
 */
export const KNOWN_COMMANDS = [
  "init-campaign",
  "get-scene",
  "lookup-entity",
  "get-entity",
  "get-holder-context",
  "suggest-existing",
  "mention-entity",
  "commit-narrative",
  "add-constraint",
  "set-scene",
  "advance-turn",
  "validate-narration",
  "prepare-turn",
  "campaign-exists",
  "upsert-holder",
  "show-dispatch-policy",
  "set-dispatch-policy",
  "doctor"
] as const;

export type CommandName = typeof KNOWN_COMMANDS[number];

export interface ParsedInvocation {
  command: CommandName | "help" | "unknown";
  rawCommand: string | undefined;
  db: string | undefined;
  campaign: string | undefined;
  config: string | undefined;
  source: SourcePreset | undefined;
  observationOverride: Partial<Observation> | undefined;
  argsInline: unknown | undefined;
  help: boolean;
  embeddingDim: number | undefined;
  /**
   * Ergonomic hot paths that break the "every tool argument travels through
   * --args/stdin" convention, deliberately and on the record (§5.3): these two
   * are typed by hand every turn of live play.
   */
  holder: string | undefined;
  entity: string | undefined;
  days: number | undefined;
}
