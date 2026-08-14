import type { ProvisionalInvention, InventionTransition, PromotionEvidence } from "../domain/invention.js";
import type { CanonicalAttribute } from "../domain/attribute.js";
import type { Contrainte } from "../domain/potentialite.js";
import type { ConstraintId, InventionId } from "../domain/ids.js";
import { validateValue } from "./validation.js";

/**
 * Player uptake, detected by the engine at commit time, never by the model
 * (§2.6): a case-insensitive substring search of the utterance for each
 * provisional invention's known `surfaceTokens` — the `checkContainment`
 * match, not open extraction (#25; closes §0.5 premise 4's under-fire on
 * lowercase tokens). A same-turn echo is the GM's own phrasing bouncing back
 * and is not uptake. Confidence plays no part: it is provenance, never a
 * promotion threshold.
 */
export function detectUptake(
  utterance: string,
  inventions: ProvisionalInvention[],
  atTurn: number
): InventionId[] {
  const hay = utterance.toLowerCase();
  return inventions
    .filter(i =>
      i.status === "PROVISIONAL" &&
      i.introducedAtTurn !== atTurn &&
      i.surfaceTokens.some(t => hay.includes(t.toLowerCase())))
    .map(i => i.inventionId);
}

export interface PromotionContext {
  /** Canon rows for the invention's entity (at minimum its attributeKey). */
  canon: CanonicalAttribute[];
  /** Constraints on (entity, attributeKey). QUARANTINED ones never gate. */
  constraints: Contrainte[];
  evidence: PromotionEvidence;
  atDay: number;
  atTurn: number;
  /** Other PROVISIONAL inventions on the same (entity, key) — first uptake wins. */
  competing?: ProvisionalInvention[];
}

export type PromotionDecision =
  | { outcome: "PROMOTED"; transition: InventionTransition; superseded: InventionTransition[]; quarantined: ConstraintId[] }
  | { outcome: "REJECTED"; transition: InventionTransition; quarantined: ConstraintId[] };

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A constraint that can only reject on TYPE mismatch is a data bug, not
 * fiction (#23): empty DOIT_ETRE, mixed value types, or a uniform type that
 * differs from the candidate's. It is quarantined and skipped — one
 * mis-encoded row must never hard-block promotion on a key.
 */
function isTypeUnsatisfiable(c: Contrainte, candidateType: string): boolean {
  const r = c.regle;
  if (r.type !== "DOIT_ETRE" && r.type !== "NE_PEUT_PAS_ETRE") return false;
  if (r.type === "DOIT_ETRE" && r.valeurs.length === 0) return true;
  const types = new Set(r.valeurs.map(v => v.type));
  if (types.size > 1) return true;
  return r.valeurs.length > 0 && !types.has(candidateType as never);
}

/**
 * The collapse loop, aimed at the output side (§2.6): promotion validates
 * against canon + exclusion constraints. Contradiction by canon → REJECTED
 * silently — no error, no interrupt (inverting today's `decideRegisterFact`
 * path). Between provisionals, first uptake wins and the loser is SUPERSEDED.
 */
export function decidePromotion(invention: ProvisionalInvention, ctx: PromotionContext): PromotionDecision {
  const quarantined: ConstraintId[] = [];
  const active = ctx.constraints.filter(c => c.status !== "QUARANTINED");
  const gating: Contrainte[] = [];
  for (const c of active) {
    if (isTypeUnsatisfiable(c, invention.value.type)) quarantined.push(c.id);
    else gating.push(c);
  }

  const transition = (to: "PROMOTED" | "REJECTED"): InventionTransition => ({
    inventionId: invention.inventionId, campaignId: invention.campaignId,
    from: "PROVISIONAL", to, atDay: ctx.atDay, atTurn: ctx.atTurn, evidence: ctx.evidence
  });

  const canonical = ctx.canon.find(r => r.entityId === invention.entityId && r.key === invention.attributeKey);
  if (canonical && !sameValue(canonical.value, invention.value)) {
    return { outcome: "REJECTED", transition: transition("REJECTED"), quarantined };
  }

  const verdict = validateValue(invention.value, {
    strictContraintes: gating, softContraintes: [], existingCanon: []
  });
  if (!verdict.valide) {
    return { outcome: "REJECTED", transition: transition("REJECTED"), quarantined };
  }

  const superseded: InventionTransition[] = (ctx.competing ?? [])
    .filter(i => i.status === "PROVISIONAL" && i.inventionId !== invention.inventionId)
    .map(i => ({
      inventionId: i.inventionId, campaignId: i.campaignId,
      from: "PROVISIONAL", to: "SUPERSEDED", atDay: ctx.atDay, atTurn: ctx.atTurn,
      supersededBy: invention.inventionId
    }));

  return { outcome: "PROMOTED", transition: transition("PROMOTED"), superseded, quarantined };
}
