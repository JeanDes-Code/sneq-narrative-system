import { describe, it, expect } from "vitest";
import { classifyOutcome } from "../../src/core/telemetry.js";

describe("classifyOutcome", () => {
  it("lookup_entity: null match → NO_MATCH with notFoundReason detail", () => {
    expect(classifyOutcome("sneq__lookup_entity", { match: null, notFoundReason: "ambiguous", candidates: [] }))
      .toEqual({ outcome: "NO_MATCH", detail: "ambiguous" });
    expect(classifyOutcome("sneq__lookup_entity", { match: { id: "e1" } }))
      .toEqual({ outcome: "OK" });
  });

  it("get_entity: null → EMPTY", () => {
    expect(classifyOutcome("sneq__get_entity", null)).toEqual({ outcome: "EMPTY" });
    expect(classifyOutcome("sneq__get_entity", { id: "e1" })).toEqual({ outcome: "OK" });
  });

  it("get_relevant_facts: empty array → EMPTY facts=0", () => {
    expect(classifyOutcome("sneq__get_relevant_facts", [])).toEqual({ outcome: "EMPTY", detail: "facts=0" });
    expect(classifyOutcome("sneq__get_relevant_facts", [{ key: "k" }])).toEqual({ outcome: "OK" });
  });

  it("suggest_existing: no candidates → EMPTY", () => {
    expect(classifyOutcome("sneq__suggest_existing", { candidates: [], recommendsNew: true })).toEqual({ outcome: "EMPTY" });
    expect(classifyOutcome("sneq__suggest_existing", { candidates: [{ id: "e1" }] })).toEqual({ outcome: "OK" });
  });

  it("register_fact: contradictions → CONTRADICTION", () => {
    expect(classifyOutcome("sneq__register_fact", { factId: null, contradictions: [{ key: "k" }] }))
      .toEqual({ outcome: "CONTRADICTION" });
    expect(classifyOutcome("sneq__register_fact", { factId: "f1", contradictions: [] })).toEqual({ outcome: "OK" });
  });

  it("validate_narration: finding issues is the tool WORKING → OK with issues=N detail", () => {
    expect(classifyOutcome("sneq__validate_narration", { ok: false, issues: [{}, {}] }))
      .toEqual({ outcome: "OK", detail: "issues=2" });
    expect(classifyOutcome("sneq__validate_narration", { ok: true, issues: [] })).toEqual({ outcome: "OK" });
  });

  it("any throw → ERROR with the error NAME only (no message: it can echo narration)", () => {
    const err = new Error("Mira said something secret");
    err.name = "SneqCampaignNotFoundError";
    const r = classifyOutcome("sneq__set_scene", undefined, err);
    expect(r.outcome).toBe("ERROR");
    expect(r.detail).toBe("SneqCampaignNotFoundError");
    expect(JSON.stringify(r)).not.toContain("Mira");
  });

  it("unknown/other tools default to OK", () => {
    expect(classifyOutcome("sneq__advance_turn", { turnNumber: 3 })).toEqual({ outcome: "OK" });
    expect(classifyOutcome("sneq__report_feedback", { recorded: true })).toEqual({ outcome: "OK" });
  });
});
