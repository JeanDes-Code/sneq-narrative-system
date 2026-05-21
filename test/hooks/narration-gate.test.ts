import { describe, it, expect } from "vitest";
import {
  NarrationGateRegistry,
  type NarrationGateHook,
  type NarrationGateInput,
  type NarrationGateContext,
  type ValidationReport
} from "../../src/hooks/narration-gate.js";

const okReport: ValidationReport = { ok: true, extractedNames: [], issues: [] };

function fakeHook(label: string): NarrationGateHook {
  return {
    async validate(_input, _ctx) {
      return { ok: true, extractedNames: [label], issues: [] };
    }
  };
}

function fakeCtx(): NarrationGateContext {
  return { campaignId: "c1" as never, resolver: {} as never, router: {} as never, repo: {} as never };
}

describe("NarrationGateRegistry", () => {
  it("uses the fallback hook by default", async () => {
    const reg = new NarrationGateRegistry(fakeHook("default"));
    const r = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r.extractedNames).toEqual(["default"]);
  });

  it("register() swaps the active hook; dispose() restores the fallback", async () => {
    const reg = new NarrationGateRegistry(fakeHook("default"));
    const handle = reg.register(fakeHook("custom"));
    const r1 = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r1.extractedNames).toEqual(["custom"]);
    handle.dispose();
    const r2 = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r2.extractedNames).toEqual(["default"]);
  });

  it("passes the input and context through unchanged", async () => {
    let seenInput: NarrationGateInput | undefined;
    let seenCtx: NarrationGateContext | undefined;
    const reg = new NarrationGateRegistry({
      async validate(input, ctx) {
        seenInput = input;
        seenCtx = ctx;
        return okReport;
      }
    });
    const input: NarrationGateInput = { narration: "Aldwyn", type: "PERSONNAGE", strict: true };
    const ctx = fakeCtx();
    await reg.validate(input, ctx);
    expect(seenInput).toBe(input);
    expect(seenCtx).toBe(ctx);
  });
});
