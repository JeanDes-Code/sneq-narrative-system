#!/usr/bin/env node
// Entry point for the `sneq-engine` CLI. Wires real I/O and delegates to run().
// All routing logic lives in src/cli/run.ts.

async function main(): Promise<void> {
  // Wired in later tasks: parse argv → load config → build engine → run() → exit
  process.stderr.write("sneq-engine: not yet implemented\n");
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`fatal: ${String(err)}\n`);
  process.exit(2);
});
