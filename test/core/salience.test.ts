import { describe, it, expect } from "vitest";
import { computeSalience, DEFAULT_SALIENCE_WEIGHTS } from "../../src/core/salience.js";

describe("computeSalience (§2.5)", () => {
  it("default weights are the prototype's exercised values and sum to 1", () => {
    expect(DEFAULT_SALIENCE_WEIGHTS).toEqual({
      gravity: 0.40, recency: 0.20, personalInvolvement: 0.20,
      socialPosition: 0.10, propagationDelay: 0.10
    });
    const sum = Object.values(DEFAULT_SALIENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("is the weighted sum of the five factors", () => {
    const factors = { gravity: 1, recency: 0.5, personalInvolvement: 1, socialPosition: 0.5, propagationDelay: 1 };
    expect(computeSalience(factors)).toBeCloseTo(0.40 + 0.10 + 0.20 + 0.05 + 0.10, 10);
  });

  it("accepts weight overrides without touching the factor list", () => {
    const factors = { gravity: 1, recency: 0, personalInvolvement: 0, socialPosition: 0, propagationDelay: 0 };
    expect(computeSalience(factors, { ...DEFAULT_SALIENCE_WEIGHTS, gravity: 1.0 })).toBeCloseTo(1.0, 10);
  });
});
