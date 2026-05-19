import { describe, it, expect } from "vitest";
import { validateValue, type ValidationContext } from "../../src/core/validation.js";
import type { AttributValue } from "../../src/domain/attribute.js";
import type { Contrainte } from "../../src/domain/potentialite.js";
import { asContraintId, asFactId } from "../../src/domain/ids.js";

function strict(rule: Contrainte["regle"], note = "x"): Contrainte {
  return {
    id: asContraintId("c1"),
    source: { kind: "FAIT_CANONIQUE", factId: asFactId("f1") },
    createdAt: 0, regle: rule, justificationNarrative: note
  };
}

describe("validation", () => {
  it("format: rejects undefined value type", () => {
    const ctx: ValidationContext = { strictContraintes: [], softContraintes: [], existingFiged: [] };
    const r = validateValue({ type: "STRING", value: "x" } as AttributValue, ctx);
    expect(r.valide).toBe(true);
  });

  it("strict DOIT_ETRE: rejects value not in allowed set", () => {
    const v: AttributValue = { type: "STRING", value: "wizard" };
    const allowed: AttributValue[] = [{ type: "STRING", value: "warrior" }];
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "DOIT_ETRE", valeurs: allowed })],
      softContraintes: [], existingFiged: []
    };
    const r = validateValue(v, ctx);
    expect(r.valide).toBe(false);
    expect(r.erreurs.some(e => e.type === "CONTRAINTE_STRICTE")).toBe(true);
  });

  it("strict NE_PEUT_PAS_ETRE: rejects forbidden value", () => {
    const v: AttributValue = { type: "STRING", value: "wizard" };
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "NE_PEUT_PAS_ETRE", valeurs: [v] })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue(v, ctx).valide).toBe(false);
  });

  it("strict RANGE_NUMERIQUE: rejects out-of-range number", () => {
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "RANGE_NUMERIQUE", min: 20, max: 60 })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue({ type: "NUMBER", value: 80 }, ctx).valide).toBe(false);
    expect(validateValue({ type: "NUMBER", value: 30 }, ctx).valide).toBe(true);
  });

  it("strict REGEX: rejects non-matching string", () => {
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "REGEX", pattern: "^[A-Z][a-z]+$" })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue({ type: "STRING", value: "ALLCAPS" }, ctx).valide).toBe(false);
    expect(validateValue({ type: "STRING", value: "Aldric" }, ctx).valide).toBe(true);
  });

  it("soft constraint violations produce warnings, not errors", () => {
    const ctx: ValidationContext = {
      strictContraintes: [],
      softContraintes: [strict({ type: "NE_PEUT_PAS_ETRE", valeurs: [{ type: "STRING", value: "x" }] })],
      existingFiged: []
    };
    const r = validateValue({ type: "STRING", value: "x" }, ctx);
    expect(r.valide).toBe(true);
    expect(r.avertissements.length).toBe(1);
  });
});
