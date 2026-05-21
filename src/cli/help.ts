import { KNOWN_COMMANDS, type CommandName } from "./types.js";

const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  "init-campaign":      "Create a new campaign in the DB",
  "get-scene":          "Return the current scene of the campaign",
  "lookup-entity":      "Resolve a mention to an existing entity",
  "get-entity":         "Fetch an entity by id with its figed attributes",
  "get-relevant-facts": "List figed facts about an entity",
  "suggest-existing":   "Suggest existing entities before creating a new one",
  "mention-entity":     "Introduce or re-use a canonical entity",
  "register-fact":      "Append a figed (canonical) attribute to an entity",
  "add-constraint":     "Add a soft or strict constraint to a non-figed attribute",
  "collapse-attribute": "Drive an LLM to fill a specific attribute (heavy tier)",
  "set-scene":          "Declare the current scene and its present entities",
  "advance-turn":       "Increment the campaign turn counter",
  "validate-narration": "Scan a candidate narration for unresolved proper nouns (hybrid: regex → resolver → light-tier LLM)",
  "prepare-turn":       "Atomic bundle: current scene + present entities + their facts in one call",
  "campaign-exists":    "Probe whether a campaign exists; does NOT throw on missing"
};

const GENERAL_HELP = `sneq-engine — narrative-state engine CLI

Usage:
  sneq-engine <command> [--db <path>] [--campaign <id>] [options]

Common flags:
  --db <path>              SQLite database file (created if absent)
  --campaign <id>          Campaign identifier
  --config <path>          Override router config (env vars by default)
  --args '<json>'          Command arguments as JSON (or read from stdin)
  --source <preset>        Observation preset for register-fact:
                           gm-narration (default) | player-utterance | dice-roll | system
  --observation '<json>'   Partial override of the observation field
  --embedding-dim <N>      Vector dimension (default 1024; match your embedding provider:
                           Google text-embedding-004=768, Mistral mistral-embed=1024)
  --help                   Show this help, or help for a specific command

Commands:
${KNOWN_COMMANDS.map(c => `  ${c.padEnd(20)} ${COMMAND_DESCRIPTIONS[c]}`).join("\n")}

Output:
  One line of JSON on stdout per call.
  Exit 0 on success, 1 on user/validation errors, 2 on internal errors.

Docs: docs/superpowers/specs/2026-05-20-sneq-cli-design.md
`;

export function helpText(command?: CommandName): string {
  if (!command) return GENERAL_HELP;
  return `sneq-engine ${command}

${COMMAND_DESCRIPTIONS[command]}

Args shape: see src/tools/schemas.ts (zod schema for sneq__${command.replaceAll("-", "_")}).
Pass via --args '<json>' or stdin.
`;
}
