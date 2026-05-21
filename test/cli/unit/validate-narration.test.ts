import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";
import type { ValidationReport } from "../../../src/hooks/narration-gate.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function mkEngine(report: ValidationReport): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 1024 }]; },
    campaign() {
      return { async validateNarration(_input: unknown) { return report; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

const baseInv = (overrides: Partial<Parameters<typeof run>[0]> = {}) => ({
  command: "validate-narration" as const,
  rawCommand: "validate-narration",
  db: "x.db",
  campaign: "c1",
  config: undefined,
  source: undefined,
  observationOverride: undefined,
  argsInline: { narration: "Anya parle." },
  help: false,
  embeddingDim: undefined,
  ...overrides
});

describe("validate-narration CLI", () => {
  it("emits the report and exits 0 on ok=true", async () => {
    const report: ValidationReport = { ok: true, extractedNames: ["Anya"], issues: [] };
    const io = fakeStdio();
    const exit = await run(baseInv(), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) });
    expect(exit).toBe(0);
    expect(io.read()).toEqual(report);
  });

  it("emits the report and exits 0 on ok=false when strict is absent/false", async () => {
    const report: ValidationReport = {
      ok: false,
      extractedNames: ["Cassius"],
      issues: [{ noun: "Cassius", kind: "no-match", suggestions: [] }]
    };
    const io = fakeStdio();
    const exit = await run(baseInv(), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) });
    expect(exit).toBe(0);
    expect(io.read()).toEqual(report);
  });

  it("exits 1 on ok=false when strict=true", async () => {
    const report: ValidationReport = {
      ok: false,
      extractedNames: ["Cassius"],
      issues: [{ noun: "Cassius", kind: "no-match", suggestions: [] }]
    };
    const io = fakeStdio();
    const exit = await run(
      baseInv({ argsInline: { narration: "Cassius.", strict: true } }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) }
    );
    expect(exit).toBe(1);
    expect(io.read()).toEqual(report); // Report still emitted on stdout.
  });

  it("rejects missing narration with INVALID_ARGS", async () => {
    const io = fakeStdio();
    const exit = await run(
      baseInv({ argsInline: {} }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine({ ok: true, extractedNames: [], issues: [] }) }
    );
    expect(exit).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
  });
});
