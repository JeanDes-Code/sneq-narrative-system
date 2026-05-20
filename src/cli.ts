#!/usr/bin/env node
// Entry point for the `sneq-engine` CLI. Wires real I/O and delegates to run().

import { Engine } from "./engine.js";
import { sqliteRepository } from "./repository/sqlite/factory.js";
import { defaultRouterConfig } from "./router/defaults.js";
import { loadConfigFromFile } from "./config.js";
import { parseArgv } from "./cli/parse-argv.js";
import { run } from "./cli/run.js";
import { CliError, formatError } from "./cli/errors.js";
import { helpText } from "./cli/help.js";
import type { RouterConfig } from "./router/interface.js";
import type { ParsedInvocation, CommandName } from "./cli/types.js";

async function main(): Promise<void> {
  let invocation: ParsedInvocation;
  try {
    invocation = parseArgv(process.argv.slice(2));
  } catch (err) {
    return emitErrorAndExit(err);
  }

  // Help short-circuit: never construct an Engine for help.
  if (invocation.help || invocation.command === "help") {
    const target = (invocation.command !== "help" && invocation.command !== "unknown")
      ? (invocation.command as CommandName)
      : undefined;
    process.stdout.write(helpText(target));
    process.exit(0);
  }

  if (invocation.command === "unknown") {
    return emitErrorAndExit(new CliError("UNKNOWN_COMMAND", `unknown command: ${invocation.rawCommand}`));
  }

  if (!invocation.db) {
    return emitErrorAndExit(new CliError("INVALID_ARGS", "--db is required"));
  }
  if (!invocation.campaign) {
    return emitErrorAndExit(new CliError("INVALID_ARGS", "--campaign is required"));
  }

  let routerConfig: RouterConfig;
  try {
    routerConfig = invocation.config
      ? loadConfigFromFile(invocation.config).router
      : defaultRouterConfig();
  } catch (err) {
    return emitErrorAndExit(err);
  }

  const embeddingDim = invocation.embeddingDim ?? 1024;
  const engine = new Engine({
    repository: sqliteRepository({ path: invocation.db, embeddingDim }),
    router: routerConfig
  });

  let exitCode = 0;
  try {
    exitCode = await run(invocation, {
      stdin: process.stdin,
      stdout: process.stdout,
      engine
    });
  } finally {
    await engine.close();
  }
  process.exit(exitCode);
}

function emitErrorAndExit(err: unknown): never {
  const f = formatError(err);
  process.stdout.write(f.json + "\n");
  process.exit(f.exitCode);
}

main().catch((err) => emitErrorAndExit(err));
