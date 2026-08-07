import { describe, it, expect } from "vitest";
import { dispatchToolCall, type ToolCallContext } from "../../src/tools/dispatcher.js";
import { Engine } from "../../src/engine.js";
import { ToolNames } from "../../src/tools/schemas.js";

/** Ids the stub campaign knows about. Anything else resolves to null, like a real repo. */
const KNOWN_IDS = new Set(["e1", "a", "loc1", "npc1", "npc2"]);

function stubCtx(): ToolCallContext {
  return {
    resolveEntity: async (opts) => ({ match: null, confidence: 0, candidates: [], layerUsed: "none", _mention: opts.mention } as never),
    suggestExisting: async (mention, _type) => ({ candidates: [], recommendsNew: true, _mention: mention } as never),
    getEntity: async (id) => (KNOWN_IDS.has(String(id)) ? ({ id, name: String(id) } as never) : null),
    getRelevantFacts: async (_id, _opts) => [],
    mentionEntity: async (input) => ({ entityId: "new-id", isNew: true, _name: input.canonicalName } as never),
    registerFact: async (_input) => ({ factId: "f1", contradictions: [] } as never),
    addConstraint: async (_input) => ({ constraintId: "c1" } as never),
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

  it("rejects graph depth greater than one", async () => {
    await expect(dispatchToolCall(
      "sneq__get_relevant_facts",
      { entityId: "a", depth: 2 },
      stubCtx(),
    )).rejects.toThrow();
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

import { SneqUnknownEntityError } from "../../src/errors.js";

// Regression guard for the failure this release exists to make loud: a model types a
// free-text name where an EntityID is required, the branded type vanishes at runtime,
// the write "succeeds", and every downstream read comes back empty. Silent for months.
async function rejection(p: Promise<unknown>): Promise<SneqUnknownEntityError> {
  let caught: unknown;
  let threw = false;
  try { await p; } catch (e) { caught = e; threw = true; }
  expect(threw, "expected the call to reject").toBe(true);
  return caught as SneqUnknownEntityError;
}

describe("entity-id guard at the tool boundary", () => {
  it("rejects a free-text name in set_scene instead of accepting it", async () => {
    await expect(dispatchToolCall("sneq__set_scene", {
      locationEntityId: "la taverne du Cerf",
      presentEntityIds: ["npc1"],
      description: "d"
    }, stubCtx())).rejects.toThrow(SneqUnknownEntityError);
  });

  it("names the tool, the field, the offending value and the corrective call", async () => {
    const err = await rejection(dispatchToolCall("sneq__set_scene", {
      locationEntityId: "la taverne du Cerf",
      presentEntityIds: ["npc1"],
      description: "d"
    }, stubCtx()));

    expect(err).toBeInstanceOf(SneqUnknownEntityError);
    expect(err.toolName).toBe("sneq__set_scene");
    expect(err.field).toBe("locationEntityId");
    expect(err.value).toBe("la taverne du Cerf");
    expect(err.message).toContain("la taverne du Cerf");
    expect(err.message).toContain("sneq__lookup_entity");
    expect(err.message).toContain("sneq__mention_entity");
  });

  it("points at the offending index inside presentEntityIds", async () => {
    const err = await rejection(dispatchToolCall("sneq__set_scene", {
      locationEntityId: "loc1",
      presentEntityIds: ["npc1", "le forgeron"],
      description: "d"
    }, stubCtx()));

    expect(err.field).toBe("presentEntityIds[1]");
    expect(err.value).toBe("le forgeron");
  });

  it("does not write when validation fails", async () => {
    let called = false;
    const ctx = { ...stubCtx(), setScene: async () => { called = true; return { sceneId: "s1", turnNumber: 1 } as never; } };
    await dispatchToolCall("sneq__set_scene", {
      locationEntityId: "nope", presentEntityIds: [], description: "d"
    }, ctx).catch(() => undefined);
    expect(called).toBe(false);
  });

  it("lets a fully-resolved set_scene through", async () => {
    const r = await dispatchToolCall("sneq__set_scene", {
      locationEntityId: "loc1",
      presentEntityIds: ["npc1", "npc2"],
      description: "d"
    }, stubCtx());
    expect((r as { sceneId: string }).sceneId).toBe("s1");
  });

  it.each([
    ["sneq__register_fact", {
      entityId: "le forgeron", attributeKey: "metier", category: "HISTORIQUE",
      value: { type: "STRING", value: "capitaine" },
      observation: { source: "GM_NARRATION", method: "DIALOGUE_DIRECT", fiabilite: "CERTAINE", timestamp: 1 }
    }],
    ["sneq__add_constraint", { entityId: "le forgeron", attributeKey: "k", rule: {}, justification: "j" }],
    ["sneq__get_relevant_facts", { entityId: "le forgeron" }],
  ])("guards %s", async (tool, args) => {
    await expect(dispatchToolCall(tool, args, stubCtx())).rejects.toThrow(SneqUnknownEntityError);
  });

  // Deliberate exception: null is this tool's honest answer to "is this id known?".
  // The guard exists to kill *silent* failures, and an explicit null is not silent.
  it("leaves get_entity alone — null stays a meaningful answer", async () => {
    await expect(dispatchToolCall("sneq__get_entity", { entityId: "unknown" }, stubCtx()))
      .resolves.toBeNull();
  });
});

import { anthropicTools, openAITools, geminiTools, genericTools, ADVERTISED_TOOL_NAMES } from "../../src/tools/adapters.js";

describe("advertised tools", () => {
  it("exports one truthful ten-tool set", () => {
    expect(ToolNames).toHaveLength(10);
    expect(ADVERTISED_TOOL_NAMES).toEqual(ToolNames);
    expect(ToolNames).not.toContain("sneq__collapse_attribute");
    expect(anthropicTools()).toHaveLength(10);
    expect(openAITools()).toHaveLength(10);
    expect(geminiTools()[0]!.functionDeclarations).toHaveLength(10);
    expect(genericTools()).toHaveLength(10);
  });

  // These strings go to the model on every call. A wrong one is not a typo: an agent
  // that believes get_entity returns attributes never calls the read it needs.
  it("describes every tool, and get_entity no longer claims to return attributes", async () => {
    const { toolDescriptions } = await import("../../src/tools/schemas.js");
    for (const name of ToolNames) {
      expect(toolDescriptions[name]?.length ?? 0).toBeGreaterThan(80);
    }
    expect(toolDescriptions.sneq__get_entity).not.toMatch(/full set of figed|canonical attributes\b(?! or facts)/i);
    expect(toolDescriptions.sneq__get_entity).toMatch(/does not return canonical attributes/i);
    // The tools that reject a name must say which call produces an id.
    for (const name of ["sneq__get_relevant_facts", "sneq__register_fact", "sneq__set_scene"] as const) {
      expect(toolDescriptions[name]).toMatch(/mention_entity/);
    }
    // add_constraint is the one consumers read as "this propagates". It does not.
    expect(toolDescriptions.sneq__add_constraint).toMatch(/nothing propagates/i);
  });

  it("rejects the removed collapse tool as unknown", async () => {
    await expect(dispatchToolCall(
      "sneq__collapse_attribute",
      { entityId: "e", attributeKey: "k" },
      stubCtx(),
    )).rejects.toThrow(/unknown tool/i);
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
