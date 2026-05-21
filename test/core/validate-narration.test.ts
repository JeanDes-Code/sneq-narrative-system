import { describe, it, expect } from "vitest";
import { Validator } from "../../src/core/validate-narration.js";
import type { ResolvedCandidate } from "../../src/core/validate-narration.js";

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

  it("strips French contractions written with U+2019 curly apostrophe", () => {
    // macOS auto-correct + iOS keyboards normalize ' → ’ (U+2019). Regex must match both.
    expect(validator.extract("Il vient d’Aldwyn.")).toContain("Aldwyn");
    expect(validator.extract("L’Épée de l’Évêque brille.")).toContain("Évêque");
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

import type { Resolver, ResolutionResult } from "../../src/resolver/resolver.js";
import type { CampaignId } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

function mkEntity(id: string, name: string): Entity {
  return {
    campaignId: "c1" as CampaignId,
    id: id as never,
    type: "PERSONNAGE",
    name,
    nomConnu: true,
    aliases: [],
    tags: [],
    createdAt: 0,
    embedding: new Float32Array(),
    embeddingRefreshedAt: 0
  };
}

function mockResolver(results: Record<string, ResolutionResult>): Resolver {
  return {
    async resolveEntity(opts: { campaignId: CampaignId; mention: string }): Promise<ResolutionResult> {
      const r = results[opts.mention];
      if (!r) throw new Error(`mockResolver: no result wired for "${opts.mention}"`);
      return r;
    },
    async suggestExisting() { throw new Error("not used in this test"); }
  } as unknown as Resolver;
}

describe("Validator.resolvePass", () => {
  const campaignId = "c1" as CampaignId;

  it("drops candidates that resolve to a match", async () => {
    const resolver = mockResolver({
      Anya: { match: mkEntity("e1", "Anya"), confidence: 0.95, candidates: [], layerUsed: "alias" }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Anya"]);
    expect(result).toEqual([]);
  });

  it("emits NO-MATCH for candidates with no resolver candidates", async () => {
    const resolver = mockResolver({
      Cassius: { match: null, confidence: 0, candidates: [], layerUsed: "none" }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Cassius"]);
    expect(result).toEqual([
      { noun: "Cassius", kind: "no-match", suggestions: [] }
    ]);
  });

  it("emits BELOW-THRESHOLD with suggestions when vector returned candidates", async () => {
    const aldun = mkEntity("e2", "Alduin");
    const resolver = mockResolver({
      Aldwyn: {
        match: null,
        confidence: 0.55,
        candidates: [aldun],
        layerUsed: "vector"
      }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Aldwyn"]);
    expect(result).toEqual([
      {
        noun: "Aldwyn",
        kind: "below-threshold",
        suggestions: [{ entityId: "e2", canonicalName: "Alduin", confidence: 0.55 }]
      }
    ]);
  });

  it("emits AMBIGUOUS when judge returned candidates but couldn't pick", async () => {
    const a = mkEntity("e3", "Alduin");
    const b = mkEntity("e4", "Aldmer");
    const resolver = mockResolver({
      Aldwen: {
        match: null,
        confidence: 0.7,
        candidates: [a, b],
        layerUsed: "judge"
      }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Aldwen"]);
    expect(result[0]?.kind).toBe("ambiguous");
    expect(result[0]?.suggestions).toHaveLength(2);
  });

  it("processes candidates independently (one no-match, one resolved)", async () => {
    const resolver = mockResolver({
      Anya: { match: mkEntity("e1", "Anya"), confidence: 0.95, candidates: [], layerUsed: "alias" },
      Cassius: { match: null, confidence: 0, candidates: [], layerUsed: "none" }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Anya", "Cassius"]);
    expect(result.map(r => r.noun)).toEqual(["Cassius"]);
  });

  it("classifies user-prompt + match=null + candidates as ambiguous (user declined)", async () => {
    // Per spec §8.2: user-prompt with match=null means the user was asked
    // and declined to pick. Treated as ambiguous, not no-match.
    const a = mkEntity("e5", "Alduin");
    const b = mkEntity("e6", "Aldmer");
    const resolver = mockResolver({
      Aldwen: {
        match: null,
        confidence: 0.5,
        candidates: [a, b],
        layerUsed: "user-prompt"
      }
    });
    const v = new Validator(resolver, {} as never);
    const result = await v.resolvePass(campaignId, ["Aldwen"]);
    expect(result[0]?.kind).toBe("ambiguous");
    expect(result[0]?.suggestions).toHaveLength(2);
  });
});

import type { Router } from "../../src/router/router.js";

function mockRouter(impl: (prompt: string) => Promise<string>): Router {
  return {
    async chat(_tier: string, req: { messages: { role: string; content: string }[] }) {
      const userMsg = req.messages.find(m => m.role === "user")?.content ?? "";
      const text = await impl(userMsg);
      return { text, toolCalls: [], modelUsed: "test", providerUsed: "test" };
    }
  } as unknown as Router;
}

describe("Validator.llmPass", () => {
  const campaignId = "c1" as CampaignId;

  it("returns input unchanged when there are no NO-MATCH candidates", async () => {
    const router = mockRouter(async () => { throw new Error("should not be called"); });
    const v = new Validator({} as never, router);
    const input: ResolvedCandidate[] = [
      { noun: "Aldwyn", kind: "below-threshold", suggestions: [] }
    ];
    const r = await v.llmPass(campaignId, "Aldwyn était terrifiant.", input, []);
    expect(r.candidates).toEqual(input);
    expect(r.partial).toBe(false);
  });

  it("promotes NO-MATCH to BELOW-THRESHOLD when LLM returns typo+suggestion", async () => {
    const router = mockRouter(async () => JSON.stringify([
      { noun: "Aldwn", verdict: "typo", suggestion: "e_alduin", confidence: 0.8, reasoning: "typo of Alduin" }
    ]));
    const v = new Validator({} as never, router);
    const aldun = mkEntity("e_alduin", "Alduin");
    const input: ResolvedCandidate[] = [{ noun: "Aldwn", kind: "no-match", suggestions: [] }];
    const r = await v.llmPass(campaignId, "Aldwn arrive", input, [aldun]);
    expect(r.candidates).toEqual([
      {
        noun: "Aldwn",
        kind: "below-threshold",
        suggestions: [{ entityId: "e_alduin", canonicalName: "Alduin", confidence: 0.8 }],
        llmReasoning: "typo of Alduin"
      }
    ]);
    expect(r.partial).toBe(false);
  });

  it("keeps NO-MATCH when LLM verdict is unknown", async () => {
    const router = mockRouter(async () => JSON.stringify([
      { noun: "Cassius", verdict: "unknown", reasoning: "not in canon list" }
    ]));
    const v = new Validator({} as never, router);
    const input: ResolvedCandidate[] = [{ noun: "Cassius", kind: "no-match", suggestions: [] }];
    const r = await v.llmPass(campaignId, "Cassius arrive", input, []);
    expect(r.candidates).toEqual([
      { noun: "Cassius", kind: "no-match", suggestions: [], llmReasoning: "not in canon list" }
    ]);
    expect(r.partial).toBe(false);
  });

  it("returns partial=true and keeps NO-MATCH when LLM throws", async () => {
    const router = mockRouter(async () => { throw new Error("provider down"); });
    const v = new Validator({} as never, router);
    const input: ResolvedCandidate[] = [{ noun: "Cassius", kind: "no-match", suggestions: [] }];
    const r = await v.llmPass(campaignId, "Cassius arrive", input, []);
    expect(r.candidates).toEqual(input);
    expect(r.partial).toBe(true);
  });

  it("returns partial=true when LLM returns invalid JSON", async () => {
    const router = mockRouter(async () => "not json at all");
    const v = new Validator({} as never, router);
    const input: ResolvedCandidate[] = [{ noun: "Cassius", kind: "no-match", suggestions: [] }];
    const r = await v.llmPass(campaignId, "Cassius arrive", input, []);
    expect(r.candidates).toEqual(input);
    expect(r.partial).toBe(true);
  });
});
