import type { AttributValue, AttributFige } from "../domain/attribute.js";
import type { Contrainte, RegleContrainte } from "../domain/potentialite.js";

export interface ValidationContext {
  strictContraintes: ReadonlyArray<Contrainte>;
  softContraintes: ReadonlyArray<Contrainte>;
  existingFiged: ReadonlyArray<AttributFige>;
}

export type ErrorType = "FORMAT" | "CONTRAINTE_STRICTE" | "CONTRADICTION_RC";

export interface ValidationFailure {
  type: ErrorType;
  message: string;
  contrainte?: Contrainte;
}

export interface Avertissement {
  type: "CONTRAINTE_SOUPLE";
  message: string;
  contrainte: Contrainte;
}

export interface ValidationResult {
  valide: boolean;
  erreurs: ValidationFailure[];
  avertissements: Avertissement[];
}

export function validateValue(value: AttributValue, ctx: ValidationContext): ValidationResult {
  const erreurs: ValidationFailure[] = [];
  const avertissements: Avertissement[] = [];

  const fmt = checkFormat(value);
  if (!fmt.ok) erreurs.push({ type: "FORMAT", message: fmt.reason });

  for (const c of ctx.strictContraintes) {
    const v = checkRule(value, c.regle);
    if (!v.ok) {
      erreurs.push({
        type: "CONTRAINTE_STRICTE",
        message: `${c.justificationNarrative}: ${v.reason}`,
        contrainte: c
      });
    }
  }

  for (const c of ctx.softContraintes) {
    const v = checkRule(value, c.regle);
    if (!v.ok) {
      avertissements.push({
        type: "CONTRAINTE_SOUPLE",
        message: `${c.justificationNarrative}: ${v.reason}`,
        contrainte: c
      });
    }
  }

  return { valide: erreurs.length === 0, erreurs, avertissements };
}

function checkFormat(v: AttributValue): { ok: true } | { ok: false; reason: string } {
  switch (v.type) {
    case "STRING":     return typeof v.value === "string" ? { ok: true } : { ok: false, reason: "expected string" };
    case "NUMBER":     return typeof v.value === "number" && Number.isFinite(v.value) ? { ok: true } : { ok: false, reason: "expected finite number" };
    case "BOOLEAN":    return typeof v.value === "boolean" ? { ok: true } : { ok: false, reason: "expected boolean" };
    case "ENTITY_REF": return typeof v.id === "string" ? { ok: true } : { ok: false, reason: "expected entity id" };
    case "ENTITY_SET": return Array.isArray(v.ids) ? { ok: true } : { ok: false, reason: "expected entity id array" };
    case "ENUM":       return typeof v.value === "string" && typeof v.enumType === "string" ? { ok: true } : { ok: false, reason: "expected enum" };
    case "COMPOSITE":  return typeof v.fields === "object" && v.fields !== null ? { ok: true } : { ok: false, reason: "expected composite" };
  }
}

function checkRule(v: AttributValue, r: RegleContrainte): { ok: true } | { ok: false; reason: string } {
  switch (r.type) {
    case "DOIT_ETRE":
      return r.valeurs.some(allowed => equalValue(v, allowed))
        ? { ok: true }
        : { ok: false, reason: "value not in allowed set" };

    case "NE_PEUT_PAS_ETRE":
      return r.valeurs.some(forbidden => equalValue(v, forbidden))
        ? { ok: false, reason: "value explicitly forbidden" }
        : { ok: true };

    case "RANGE_NUMERIQUE":
      if (v.type !== "NUMBER") return { ok: false, reason: "expected number" };
      if (r.min !== undefined && v.value < r.min) return { ok: false, reason: `< ${r.min}` };
      if (r.max !== undefined && v.value > r.max) return { ok: false, reason: `> ${r.max}` };
      return { ok: true };

    case "REGEX":
      if (v.type !== "STRING") return { ok: false, reason: "expected string" };
      return new RegExp(r.pattern).test(v.value) ? { ok: true } : { ok: false, reason: `does not match ${r.pattern}` };

    case "IMPLIQUE":
    case "CORRELE_AVEC":
      return { ok: true };
  }
}

function equalValue(a: AttributValue, b: AttributValue): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "STRING":  return a.value === (b as typeof a).value;
    case "NUMBER":  return a.value === (b as typeof a).value;
    case "BOOLEAN": return a.value === (b as typeof a).value;
    case "ENTITY_REF": return a.id === (b as typeof a).id;
    case "ENTITY_SET": {
      const bb = b as typeof a;
      return a.ids.length === bb.ids.length && a.ids.every((id, i) => id === bb.ids[i]);
    }
    case "ENUM": {
      const bb = b as typeof a;
      return a.value === bb.value && a.enumType === bb.enumType;
    }
    case "COMPOSITE": return JSON.stringify(a.fields) === JSON.stringify((b as typeof a).fields);
  }
}
