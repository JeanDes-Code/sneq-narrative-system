import { describe, it, expect } from "vitest";
import { dispatchToolCall, type ToolCallContext } from "../../src/tools/dispatcher.js";
import { Engine } from "../../src/engine.js";

function stubCtx(): ToolCallContext {
  return {
    resolveEntity: async (opts) => ({ match: null, confidence: 0, candidates: [], layerUsed: "none", _mention: opts.mention } as never),
    suggestExisting: async (mention, _type) => ({ candidates: [], recommendsNew: true, _mention: mention } as never),
    getEntity: async (_id) => null,
    getRelevantFacts: async (_id, _opts) => [],
    mentionEntity: async (input) => ({ entityId: "new-id", isNew: true, _name: input.canonicalName } as never),
    registerFact: async (_input) => ({ factId: "f1", contradictions: [] } as never),
    addConstraint: async (_input) => ({ constraintId: "c1" } as never),
    collapseAttribute: async (_id, _key, _opts) => ({ value: { type: "STRING", value: "x" }, reasoning: "", propagation: { entitesImpactees: [] } } as never),
    setScene: async (_input) => ({ sceneId: "s1", turnNumber: 1 } as never),
    advanceTurn: async (summary) => ({ turnNumber: 42, _summary: summary ?? null } as never),
    validateNarration: async (_input) => ({ ok: true, extractedNames: [], issues: [] })
  };
}

describe("sneq__validate_narration tool", () => {
  it("is included in Engine.tools.anthropic", () => {
    const names = Engine.tools.anthropic.map((t: { name: string }) => t.name);
    expect(names).toContain("sneq__validate_narration");
  });
});

describe("dispatchToolCall", () => {
  it("dispatches sneq__lookup_entity to resolveEntity", async () => {
    const r = await dispatchToolCall("sneq__lookup_entity", { mention: "hi" }, stubCtx());
    expect((r as { _mention: string })._mention).toBe("hi");
  });

  it("rejects unknown tool names", async () => {
    await expect(dispatchToolCall("sneq__not_real", {}, stubCtx()))
      .rejects.toThrow(/unknown tool/i);
  });

  it("rejects bad argument shape", async () => {
    await expect(dispatchToolCall("sneq__lookup_entity", { wrongField: true }, stubCtx()))
      .rejects.toThrow();
  });

  it("dispatches sneq__advance_turn with optional summary", async () => {
    const r = await dispatchToolCall("sneq__advance_turn", { summary: "we left the village" }, stubCtx());
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });

  it("dispatches sneq__mention_entity through schema validation", async () => {
    const r = await dispatchToolCall("sneq__mention_entity", {
      canonicalName: "Aldric", type: "PERSONNAGE", description: "a smith"
    }, stubCtx());
    expect((r as { _name: string })._name).toBe("Aldric");
  });

  it("dispatches sneq__validate_narration to validateNarration", async () => {
    let seen: unknown;
    const ctx = {
      ...stubCtx(),
      validateNarration: async (input: unknown) => { seen = input; return { ok: true, extractedNames: [], issues: [] }; }
    };
    const r = await dispatchToolCall("sneq__validate_narration", { narration: "Anya" }, ctx);
    expect(seen).toEqual({ narration: "Anya" });
    expect(r).toEqual({ ok: true, extractedNames: [], issues: [] });
  });
});
