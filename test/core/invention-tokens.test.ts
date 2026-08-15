import { describe, it, expect } from "vitest";
import { validateInventionTokens } from "../../src/core/containment.js";

const inv = (surfaceTokens: string[], sourceNarration = "Un vieux passeur nommé Bran vous attend au gué.") =>
  ({ sourceNarration, surfaceTokens });

/**
 * Issue #46. An invention's `surfaceTokens` are the alphabet `detectUptake`
 * searches the player's utterance for, and a match promotes the invention into
 * canon. They arrive from the model and, before this, nothing looked at them —
 * so the model chose the string whose later appearance makes its own invention
 * true.
 *
 * Two guards, because they stop different things and neither stops the other's
 * case:
 *
 *   provenance      — the token must occur in `sourceNarration`, so a token can
 *                     only be one the player actually read.
 *   distinctiveness — the token must not be a stopword and must not be tiny,
 *                     so a token cannot be one that matches almost any sentence.
 *
 * Provenance alone is not enough, which is the trap: `sourceNarration` is
 * model-supplied too, and "le" occurs in nearly all French prose. It passes a
 * presence check trivially.
 */
describe("validateInventionTokens · provenance", () => {
  it("accepts a token the source narration actually contains", () => {
    expect(validateInventionTokens(inv(["Bran"]))).toEqual([]);
  });

  it("is case-insensitive, like the detector it guards", () => {
    expect(validateInventionTokens(inv(["bran"]))).toEqual([]);
    expect(validateInventionTokens(inv(["BRAN"]))).toEqual([]);
  });

  it("accepts a multi-word phrase, stopwords inside it and all", () => {
    expect(validateInventionTokens(inv(["un vieux passeur"]))).toEqual([]);
  });

  it("rejects a token the model never said — a trigger invented as a trigger", () => {
    const out = validateInventionTokens(inv(["le sceau de la reine"]));
    expect(out).toEqual([{ token: "le sceau de la reine", reason: "ABSENT_FROM_SOURCE" }]);
  });
});

describe("validateInventionTokens · distinctiveness", () => {
  // The case provenance cannot catch: present in the source, and present in
  // almost every other sentence too.
  it("rejects a stopword even when the source narration contains it", () => {
    const out = validateInventionTokens(inv(["un"]));
    expect(out).toEqual([{ token: "un", reason: "NOT_DISTINCTIVE" }]);
  });

  it("rejects the words that made the report: le, la, oui, non", () => {
    const source = "le la oui non";
    for (const t of ["le", "la", "oui", "non"]) {
      expect(validateInventionTokens(inv([t], source))).toEqual([
        { token: t, reason: "NOT_DISTINCTIVE" }
      ]);
    }
  });

  it("rejects a token too short to be evidence of anything", () => {
    expect(validateInventionTokens(inv(["gu"], "au gu")))
      .toEqual([{ token: "gu", reason: "NOT_DISTINCTIVE" }]);
  });

  it("rejects blank and whitespace-only tokens", () => {
    expect(validateInventionTokens(inv(["   "], "a   b")))
      .toEqual([{ token: "   ", reason: "NOT_DISTINCTIVE" }]);
  });

  // Distinctiveness is checked first: "le" is both absent-shaped and
  // non-distinctive in most sources, and the useful message is the second.
  it("reports one reason per token, not two", () => {
    const out = validateInventionTokens(inv(["le"], "rien ici"));
    expect(out).toHaveLength(1);
    expect(out[0]!.reason).toBe("NOT_DISTINCTIVE");
  });
});

describe("validateInventionTokens · shape", () => {
  it("an empty token set is legal — the engine floor still applies", () => {
    expect(validateInventionTokens(inv([]))).toEqual([]);
  });

  it("reports every offending token, not just the first", () => {
    const out = validateInventionTokens(inv(["le", "jamais dit", "Bran"]));
    expect(out.map(o => o.token)).toEqual(["le", "jamais dit"]);
  });
});
