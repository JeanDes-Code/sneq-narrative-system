import { describe, it, expect } from "vitest";
import { STOPWORDS } from "../../src/core/stopwords.js";

describe("STOPWORDS", () => {
  it("includes common French sentence-starters", () => {
    for (const w of ["tu", "il", "elle", "nous", "vous", "mais", "si", "ainsi", "alors"]) {
      expect(STOPWORDS.has(w)).toBe(true);
    }
  });

  it("includes common English sentence-starters", () => {
    for (const w of ["you", "he", "she", "we", "but", "so", "yes", "no", "now"]) {
      expect(STOPWORDS.has(w)).toBe(true);
    }
  });

  it("does NOT include common proper-noun-like words", () => {
    for (const w of ["aldwyn", "alduin", "dragonsreach", "anya", "skyrim", "cassius"]) {
      expect(STOPWORDS.has(w)).toBe(false);
    }
  });

  it("is case-insensitive in storage (all lowercase)", () => {
    for (const w of STOPWORDS) {
      expect(w).toBe(w.toLowerCase());
    }
  });
});
