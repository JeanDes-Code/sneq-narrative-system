import { KNOWN_COMMANDS, type CommandName } from "./types.js";

const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  "init-campaign":        "Create a new campaign in the DB",
  "get-scene":            "Return the current scene of the campaign",
  "lookup-entity":        "Resolve a mention to an existing entity",
  "get-entity":           "Fetch an entity by id — identity only, never facts",
  "get-holder-context":   "What one holder knows (--holder <id> or --entity <id>); the only world read there is",
  "suggest-existing":     "Suggest existing entities before creating a new one",
  "mention-entity":       "Introduce or re-use a canonical entity",
  "commit-narrative":     "The single atomic write: event, records, carriages, inventions, holders, policy",
  "add-constraint":       "Constrain what an unsettled attribute may become (role required: REGLE_MONDE | INFERENCE_IA | …)",
  "set-scene":            "Declare the current scene and its present entities",
  "advance-turn":         "Bump the turn counter, and with --days N move the world clock out of band",
  "validate-narration":   "Gate a candidate narration: proper nouns, and with --holder also containment",
  "prepare-turn":         "The frame (day, turn, scene, present entities); with --holder/--entity, plus that holder's context",
  "campaign-exists":      "Probe whether a campaign exists; does NOT throw on missing",
  "upsert-holder":        "Author a holder (group or individual); pass the holder object via --args",
  "show-dispatch-policy": "Print the campaign's dispatch routes and rules",
  "set-dispatch-policy":  "Add routes and rules — additive, never a replacement",
  "doctor":               "Run the conformance checklist over this campaign and say what is wrong"
};

const GENERAL_HELP = `sneq-engine — narrative-state engine CLI

Usage:
  sneq-engine <command> [--db <path>] [--campaign <id>] [options]

Common flags:
  --db <path>              SQLite database file (created if absent)
  --campaign <id>          Campaign identifier
  --config <path>          Override router config (env vars by default)
  --args '<json>'          Command arguments as JSON (or read from stdin)
  --holder <id>            Holder to read for (get-holder-context, prepare-turn, validate-narration)
  --entity <id>            Entity to read for; the engine runs the holder cascade and names the road
  --days <N>               World days elapsed (advance-turn: out-of-band time only)
  --source <preset>        Observation preset for commit-narrative:
                           gm-narration (default) | player-utterance | dice-roll | system | out-of-band
  --observation '<json>'   Partial override of the observation field
  --embedding-dim <N>      Vector dimension for init-campaign (0 = no embeddings / alias-only).
                           Default derives from the router config's embeddings primary
                           (768 with the default config). Existing DBs remember their dim;
                           the flag is only needed at init.
  --help                   Show this help, or help for a specific command

Commands:
${KNOWN_COMMANDS.map(c => `  ${c.padEnd(22)} ${COMMAND_DESCRIPTIONS[c]}`).join("\n")}

Output:
  One line of JSON on stdout per call.
  Exit 0 on success, 1 on user/validation errors, 2 on internal errors.

There is no command that answers "what is true". Every world read is somebody's:
get-holder-context, always for a named holder. That is the design, not a gap.
`;

export function helpText(command?: CommandName): string {
  if (!command) return GENERAL_HELP;
  return `sneq-engine ${command}

${COMMAND_DESCRIPTIONS[command]}

Args shape: see src/tools/schemas.ts (zod schema for sneq__${command.replaceAll("-", "_")}).
Pass via --args '<json>' or stdin.
`;
}
