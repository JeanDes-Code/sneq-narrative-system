import type { SalienceFactors } from "../domain/belief.js";

export type SalienceWeights = SalienceFactors;

/**
 * The prototype's exercised values (§2.5). Five factors are the decided thing;
 * the weights are a config constant, tunable via `EngineConfig` without
 * touching the factor list. The model never ranks its own memory.
 */
export const DEFAULT_SALIENCE_WEIGHTS: SalienceWeights = {
  gravity: 0.40,
  recency: 0.20,
  personalInvolvement: 0.20,
  socialPosition: 0.10,
  propagationDelay: 0.10
};

export function computeSalience(
  factors: SalienceFactors,
  weights: SalienceWeights = DEFAULT_SALIENCE_WEIGHTS
): number {
  return (
    factors.gravity * weights.gravity +
    factors.recency * weights.recency +
    factors.personalInvolvement * weights.personalInvolvement +
    factors.socialPosition * weights.socialPosition +
    factors.propagationDelay * weights.propagationDelay
  );
}
