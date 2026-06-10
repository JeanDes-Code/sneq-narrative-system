import { describe, it, expect } from "vitest";
import { dispatchToolCall, type ToolCallContext } from "../../src/tools/dispatcher.js";
import { Engine } from "../../src/engine.js";
import type { ToolCallLogEntry } from "../../src/domain/feedback.js";

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
    validateNarration: async (_input) => ({ ok: true, extractedNames: [], issues: [] }),
    reportFeedback: async (_input) => ({ recorded: true })
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
    const r = await dispatchToolCall("sneq__validate_narration", { narration: "Mira" }, ctx);
    expect(seen).toEqual({ narration: "Mira" });
    expect(r).toEqual({ ok: true, extractedNames: [], issues: [] });
  });
});

describe("dispatchToolCall · passive telemetry", () => {
  it("records one classified entry per successful call", async () => {
    const recorded: ToolCallLogEntry[] = [];
    const ctx = { ...stubCtx(), recordToolCall: async (e: ToolCallLogEntry) => { recorded.push(e); } };
    await dispatchToolCall("sneq__get_entity", { entityId: "ghost" }, ctx);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ tool: "sneq__get_entity", outcome: "EMPTY" });
    expect(typeof recorded[0]!.durationMs).toBe("number");
    expect(typeof recorded[0]!.createdAt).toBe("number");
  });

  it("records ERROR (error name only) and still rethrows when the tool throws", async () => {
    const recorded: ToolCallLogEntry[] = [];
    const ctx = {
      ...stubCtx(),
      getEntity: async () => { const e = new Error("boom with narrative content"); e.name = "RepoDown"; throw e; },
      recordToolCall: async (e: ToolCallLogEntry) => { recorded.push(e); }
    };
    await expect(dispatchToolCall("sneq__get_entity", { entityId: "x" }, ctx)).rejects.toThrow("boom");
    expect(recorded[0]).toMatchObject({ tool: "sneq__get_entity", outcome: "ERROR", detail: "RepoDown" });
  });

  it("SWALLOW: a recordToolCall that throws does NOT fail the underlying tool call", async () => {
    const ctx = { ...stubCtx(), recordToolCall: async () => { throw new Error("telemetry db gone"); } };
    const r = await dispatchToolCall("sneq__advance_turn", {}, ctx);
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });

  it("a ctx without recordToolCall works unchanged (optional member)", async () => {
    const r = await dispatchToolCall("sneq__advance_turn", {}, stubCtx());
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });
});

import { anthropicTools, openAITools, geminiTools, genericTools, ADVERTISED_TOOL_NAMES } from "../../src/tools/adapters.js";

describe("advertised tools", () => {
  it("collapse_attribute is not advertised in any adapter shape", () => {
    expect(ADVERTISED_TOOL_NAMES).toHaveLength(11);
    expect(ADVERTISED_TOOL_NAMES).not.toContain("sneq__collapse_attribute");
    expect(anthropicTools().map(t => t.name)).not.toContain("sneq__collapse_attribute");
    expect(openAITools().map(t => t.function.name)).not.toContain("sneq__collapse_attribute");
    expect(geminiTools()[0]!.functionDeclarations.map(t => t.name)).not.toContain("sneq__collapse_attribute");
    expect(genericTools().map(t => t.name)).not.toContain("sneq__collapse_attribute");
  });

  it("mention_entity accepts force and dispatches it", async () => {
    const calls: unknown[] = [];
    const ctx = {
      mentionEntity: async (input: unknown) => { calls.push(input); return { entityId: "e", isNew: true }; }
    } as unknown as import("../../src/tools/dispatcher.js").ToolCallContext;
    await dispatchToolCall("sneq__mention_entity", { canonicalName: "X", type: "PERSONNAGE", description: "d", force: true }, ctx);
    expect((calls[0] as { force?: boolean }).force).toBe(true);
  });
});

describe("sneq__report_feedback tool", () => {
  it("is advertised in every adapter shape (11 advertised after this feature)", () => {
    expect(ADVERTISED_TOOL_NAMES).toContain("sneq__report_feedback");
    expect(anthropicTools().map(t => t.name)).toContain("sneq__report_feedback");
  });

  it("dispatches to ctx.reportFeedback with optionals passed through", async () => {
    const calls: unknown[] = [];
    const ctx = { ...stubCtx(), reportFeedback: async (input: unknown) => { calls.push(input); return { recorded: true }; } };
    const r = await dispatchToolCall("sneq__report_feedback", {
      kind: "MISSING", body: "no temporary relations", subject: "sneq__add_constraint", severity: "MED"
    }, ctx);
    expect(r).toEqual({ recorded: true });
    expect(calls[0]).toEqual({
      kind: "MISSING", body: "no temporary relations", subject: "sneq__add_constraint", severity: "MED"
    });
  });

  it("rejects an unknown kind", async () => {
    await expect(dispatchToolCall("sneq__report_feedback", { kind: "RANT", body: "x" }, stubCtx()))
      .rejects.toThrow();
  });
});
