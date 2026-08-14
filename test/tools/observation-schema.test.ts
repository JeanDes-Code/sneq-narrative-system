import { describe, it, expect } from "vitest";
import { schemas } from "../../src/tools/schemas.js";

// #18: fiabilite is deleted from Observation. The tool boundary rejects the
// key loudly (0.3.1 doctrine) — a compile-time deletion alone is silent for
// agent callers going through JSON.
describe("observation at the tool boundary (#18)", () => {
  const base = {
    entityId: "e1",
    attributeKey: "metier",
    value: { type: "STRING", value: "forgeron" },
    category: "HISTORIQUE",
  };

  it("accepts an observation without fiabilite", () => {
    const parsed = schemas.sneq__register_fact.safeParse({
      ...base,
      observation: { source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0 },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an observation that still carries fiabilite", () => {
    const parsed = schemas.sneq__register_fact.safeParse({
      ...base,
      observation: {
        source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0,
        fiabilite: "CERTAINE",
      },
    });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.success ? [] : parsed.error.issues)).toMatch(/fiabilite/);
  });
});
