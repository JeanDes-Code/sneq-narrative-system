import type { EtatAttribut } from "../domain/potentialite.js";

const ALLOWED: ReadonlyArray<[EtatAttribut, EtatAttribut]> = [
  ["INDEFINI", "CONTRAINT"],
  // Direct observation collapses straight to FIGE without passing CONTRAINT.
  ["INDEFINI", "FIGE"],
  ["CONTRAINT", "FIGE"]
];

export function canTransition(from: EtatAttribut, to: EtatAttribut): boolean {
  return ALLOWED.some(([f, t]) => f === from && t === to);
}

export function assertTransition(from: EtatAttribut, to: EtatAttribut): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} → ${to}`);
  }
}
