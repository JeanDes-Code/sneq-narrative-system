import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";
import type { ParsedInvocation } from "../../../src/cli/types.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

const engine = {
  async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
  campaign() { throw new Error("not reached"); },
  async close() {}
} as unknown as Engine;

function invocation(): ParsedInvocation {
  return {
    command: "collapse-attribute",
    rawCommand: "collapse-attribute",
    db: "x.db",
    campaign: "c1",
    config: undefined,
    source: undefined,
    observationOverride: undefined,
    argsInline: { entityId: "e", attributeKey: "k" },
    help: false,
    embeddingDim: undefined
  };
}

describe("collapse-attribute CLI", () => {
  it("exits 1 with NOT_IMPLEMENTED instead of an internal error", async () => {
    const io = fakeStdio();
    const exit = await run(invocation(), { stdin: io.stdin, stdout: io.stdout, engine, defaultEmbeddingDim: 768 });
    expect(exit).toBe(1);
    const out = io.read();
    expect(out.code).toBe("NOT_IMPLEMENTED");
    expect(out.error).toMatch(/not wired in V2/i);
  });
});
