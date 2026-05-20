import { KNOWN_COMMANDS, type CommandName, type ParsedInvocation, type SourcePreset } from "./types.js";
import type { Observation } from "../domain/observation.js";
import { CliError } from "./errors.js";

const SOURCE_PRESETS: ReadonlySet<SourcePreset> = new Set([
  "gm-narration", "player-utterance", "dice-roll", "system"
]);

const FLAGS_WITH_VALUE = new Set([
  "--db", "--campaign", "--config", "--source", "--observation", "--args"
]);

export function parseArgv(argv: string[]): ParsedInvocation {
  let command: ParsedInvocation["command"] = "help";
  let rawCommand: string | undefined;
  let db: string | undefined;
  let campaign: string | undefined;
  let config: string | undefined;
  let source: SourcePreset | undefined;
  let observationOverride: ParsedInvocation["observationOverride"];
  let argsInline: unknown | undefined;
  let help = false;

  let i = 0;

  // First non-flag arg is the command (if present).
  if (argv.length > 0 && !argv[0]!.startsWith("--")) {
    rawCommand = argv[0]!;
    if ((KNOWN_COMMANDS as readonly string[]).includes(rawCommand)) {
      command = rawCommand as CommandName;
    } else {
      command = "unknown";
    }
    i = 1;
  }

  while (i < argv.length) {
    const tok = argv[i]!;
    if (tok === "--help") {
      help = true;
      i += 1;
      continue;
    }
    if (!tok.startsWith("--")) {
      throw new CliError("INVALID_ARGS", `unexpected positional argument: ${tok}`);
    }
    if (!FLAGS_WITH_VALUE.has(tok)) {
      throw new CliError("INVALID_ARGS", `unknown flag: ${tok}`);
    }
    const next = argv[i + 1];
    if (next === undefined) {
      throw new CliError("INVALID_ARGS", `${tok} requires a value`);
    }
    switch (tok) {
      case "--db": db = next; break;
      case "--campaign": campaign = next; break;
      case "--config": config = next; break;
      case "--source":
        if (!SOURCE_PRESETS.has(next as SourcePreset)) {
          throw new CliError(
            "INVALID_ARGS",
            `unknown --source preset: ${next} (expected one of ${[...SOURCE_PRESETS].join(", ")})`
          );
        }
        source = next as SourcePreset;
        break;
      case "--observation": observationOverride = parseJsonFlag("--observation", next) as Partial<Observation> | undefined; break;
      case "--args": argsInline = parseJsonFlag("--args", next); break;
    }
    i += 2;
  }

  if (command === "help" && !help) {
    help = true; // no command + no --help: treat as help anyway
  }

  return {
    command,
    rawCommand,
    db,
    campaign,
    config,
    source,
    observationOverride,
    argsInline,
    help
  };
}

function parseJsonFlag(flag: string, value: string): unknown {
  try {
    return JSON.parse(value);
  } catch (err) {
    throw new CliError("INVALID_ARGS", `${flag} value is not valid JSON: ${(err as Error).message}`);
  }
}
