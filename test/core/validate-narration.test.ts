import { describe, it, expect } from "vitest";
import { Validator } from "../../src/core/validate-narration.js";

// We only test extract() here; resolver+router are unused at this stage.
const validator = new Validator({} as never, {} as never);

describe("Validator.extract", () => {
  it("returns an empty list for empty text", () => {
    expect(validator.extract("")).toEqual([]);
    expect(validator.extract("   ")).toEqual([]);
  });

  it("extracts a single capitalized name", () => {
    expect(validator.extract("Aldwyn était grand.")).toEqual(["Aldwyn"]);
  });

  it("extracts a multi-word capitalized name", () => {
    expect(validator.extract("Cassius Vorentius arriva.")).toEqual(["Cassius Vorentius"]);
  });

  it("extracts multiple names from one sentence", () => {
    const r = validator.extract("Anya rejoint Jean à Dragonsreach.");
    expect(r).toEqual(expect.arrayContaining(["Anya", "Jean", "Dragonsreach"]));
  });

  it("drops stopwords even when capitalized (sentence start)", () => {
    const r = validator.extract("Tu vas à Whiterun. Il rencontre Alduin.");
    expect(r).not.toContain("Tu");
    expect(r).not.toContain("Il");
    expect(r).toEqual(expect.arrayContaining(["Whiterun", "Alduin"]));
  });

  it("strips French contractions (l', d', n', s', m', t', j', c', qu')", () => {
    expect(validator.extract("Il vient d'Aldwyn.")).toContain("Aldwyn");
    expect(validator.extract("L'épée de l'Évêque brille.")).toContain("Évêque");
  });

  it("strips trailing/leading punctuation", () => {
    expect(validator.extract("« Anya », dit-il.")).toContain("Anya");
    expect(validator.extract("Alduin?! vraiment?")).toContain("Alduin");
  });

  it("ignores lowercase tokens", () => {
    expect(validator.extract("le forgeron est ici")).toEqual([]);
  });

  it("deduplicates repeated names", () => {
    const r = validator.extract("Anya regarda Anya. Anya sourit.");
    const anyas = r.filter(n => n === "Anya");
    expect(anyas.length).toBe(1);
  });

  it("caps multi-word sequences at 3 tokens", () => {
    const r = validator.extract("Le Saint Empire Romain Germanique tomba.");
    // Should split into max-3-word chunks; we don't care exactly how, but
    // no chunk should exceed 3 words.
    for (const name of r) {
      expect(name.split(/\s+/).length).toBeLessThanOrEqual(3);
    }
  });
});
