import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return {
    stdin,
    stdout,
    read: () => JSON.parse(chunks.join("").trim())
  };
}

function mkEngine(campaigns: { id: string; name: string; embeddingDim: number }[]): Engine {
  return {
    async listCampaigns() {
      return campaigns.map(c => ({ ...c, createdAt: 0 }));
    },
    campaign() { throw new Error("not used in this test"); },
    async close() {}
  } as unknown as Engine;
}

describe("campaign-exists CLI", () => {
  it("returns exists=true with name+embeddingDim when the campaign is present", async () => {
    const io = fakeStdio();
    const engine = mkEngine([{ id: "c1", name: "Stuck in Tamriel", embeddingDim: 1024 }]);
    const exit = await run(
      {
        command: "campaign-exists",
        rawCommand: "campaign-exists",
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
    expect(io.read()).toEqual({ exists: true, name: "Stuck in Tamriel", embeddingDim: 1024 });
  });

  it("returns exists=false without throwing CAMPAIGN_NOT_FOUND", async () => {
    const io = fakeStdio();
    const engine = mkEngine([]);
    const exit = await run(
      {
        command: "campaign-exists",
        rawCommand: "campaign-exists",
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
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ exists: false });
  });
});
