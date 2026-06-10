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

function inv(argsInline: unknown): ParsedInvocation {
  return {
    command: "triage-feedback", rawCommand: "triage-feedback", db: "x.db", campaign: "c1",
    config: undefined, source: undefined, observationOverride: undefined,
    argsInline, help: false, embeddingDim: undefined
  };
}

function mkEngine(calls: unknown[]): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
    campaign() {
      return { async triageFeedback(input: unknown) { calls.push(input); return { updated: true }; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("triage-feedback CLI", () => {
  it("forwards id, normalized status and promotedTo; prints {updated}", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(
      inv({ id: "fb_1", status: "promoted", promotedTo: "https://github.com/x/y/issues/12" }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ updated: true });
    expect(calls[0]).toEqual({ id: "fb_1", status: "PROMOTED", promotedTo: "https://github.com/x/y/issues/12" });
  });

  it("INVALID_ARGS when id or status is missing/bad", async () => {
    const io = fakeStdio();
    expect(await run(inv({ status: "TRIAGED" }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine([]) })).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
    const io2 = fakeStdio();
    expect(await run(inv({ id: "fb_1", status: "NOT_A_STATUS" }), { stdin: io2.stdin, stdout: io2.stdout, engine: mkEngine([]) })).toBe(1);
    expect(io2.read().code).toBe("INVALID_ARGS");
  });
});
