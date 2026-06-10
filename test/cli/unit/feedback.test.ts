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

function inv(over: Partial<ParsedInvocation>): ParsedInvocation {
  return {
    command: "feedback", rawCommand: "feedback", db: "x.db", campaign: "c1",
    config: undefined, source: undefined, observationOverride: undefined,
    argsInline: undefined, help: false, embeddingDim: undefined, ...over
  };
}

function mkEngine(digestCalls: unknown[]): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
    campaign() {
      return {
        async feedbackDigest(filter: unknown) {
          digestCalls.push(filter);
          return { coverage: [], neverCalled: ["sneq__lookup_entity"], feedback: [] };
        }
      } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("feedback CLI", () => {
  it("emits the digest as one JSON line, default filter empty (campaign defaults to OPEN)", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(inv({}), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) });
    expect(exit).toBe(0);
    expect(io.read().neverCalled).toContain("sneq__lookup_entity");
    expect(calls[0]).toEqual({});
  });

  it("--status is case-insensitive and forwarded; --since forwarded", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(inv({ status: "promoted", since: 1234 }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) });
    expect(exit).toBe(0);
    expect(calls[0]).toEqual({ status: "PROMOTED", since: 1234 });
  });

  it("rejects an invalid --status with INVALID_ARGS", async () => {
    const io = fakeStdio();
    const exit = await run(inv({ status: "weird" }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine([]) });
    expect(exit).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
  });
});
