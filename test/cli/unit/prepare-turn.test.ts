import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function mkEngine(prepareTurnResult: unknown): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 1024 }]; },
    campaign() {
      return { async prepareTurn() { return prepareTurnResult; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("prepare-turn CLI", () => {
  it("emits the TurnContext as a single JSON line", async () => {
    const expected = { scene: null, presentEntities: [] };
    const io = fakeStdio();
    const engine = mkEngine(expected);
    const exit = await run(
      {
        command: "prepare-turn",
        rawCommand: "prepare-turn",
        db: "x.db",
        campaign: "c1",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual(expected);
  });

  it("throws CAMPAIGN_NOT_FOUND when the campaign is missing", async () => {
    const io = fakeStdio();
    const engine = {
      async listCampaigns() { return []; },
      campaign() { throw new Error("unreachable"); },
      async close() {}
    } as unknown as Engine;
    const exit = await run(
      {
        command: "prepare-turn",
        rawCommand: "prepare-turn",
        db: "x.db",
        campaign: "missing",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(1);
    const out = io.read();
    expect(out.code).toBe("CAMPAIGN_NOT_FOUND");
  });
});
