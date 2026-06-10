import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

describe("report-feedback CLI (default tool-command route)", () => {
  it("routes kebab→snake through dispatchToolCall and prints {recorded}", async () => {
    const io = fakeStdio();
    const engine = {
      async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
      campaign() {
        return { async reportFeedback() { return { recorded: true }; } } as never;
      },
      async close() {}
    } as unknown as Engine;
    const exit = await run(
      {
        command: "report-feedback", rawCommand: "report-feedback", db: "x.db", campaign: "c1",
        config: undefined, source: undefined, observationOverride: undefined,
        argsInline: { kind: "FRICTION", body: "resolver feels slow" }, help: false, embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ recorded: true });
  });
});
