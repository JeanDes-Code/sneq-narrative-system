import { describe, it, expect } from "vitest";
import { schemas } from "../../src/tools/schemas.js";

// #18: fiabilite is deleted from Observation. The tool boundary rejects the
// key loudly (0.3.1 doctrine) — a compile-time deletion alone is silent for
// agent callers going through JSON.
describe("observation at the tool boundary (#18)", () => {
  const record = (observation: unknown) => ({
    operationId: "op-1",
    daysElapsed: 0,
    records: [{
      recordId: "r1",
      entityId: "e1",
      key: "metier",
      value: { type: "STRING", value: "forgeron" },
      category: "HISTORIQUE",
      authoredBy: "crown",
      route: "OFFICIAL",
      surfaceTokens: [],
      observation,
    }],
  });

  it("accepts an observation without fiabilite", () => {
    const parsed = schemas.sneq__commit_narrative.safeParse(
      record({ source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0 })
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects an observation that still carries fiabilite", () => {
    const parsed = schemas.sneq__commit_narrative.safeParse(
      record({
        source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0,
        fiabilite: "CERTAINE",
      })
    );
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toMatch(/fiabilite/);
  });
});
