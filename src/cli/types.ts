import type { Observation } from "../domain/observation.js";

export type SourcePreset = "gm-narration" | "player-utterance" | "dice-roll" | "system";

export const KNOWN_COMMANDS = [
  "init-campaign",
  "get-scene",
  "lookup-entity",
  "get-entity",
  "get-relevant-facts",
  "suggest-existing",
  "mention-entity",
  "register-fact",
  "add-constraint",
  "collapse-attribute",
  "set-scene",
  "advance-turn",
  "validate-narration",
  "prepare-turn",
  "campaign-exists"
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
}
