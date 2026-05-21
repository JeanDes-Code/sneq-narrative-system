# SNEQ Defensive Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add five defensive features to `@sneq/engine` (3 new CLI commands, 1 new hook type, 1 additive resolver field) that close bugs 1–3 from GitHub issue #1 by making "resolve before narrate" mechanically enforceable.

**Architecture:** A new `Validator` class in `src/core/` runs a 4-stage pipeline (regex → resolver → light-tier LLM → assemble) to detect unresolved proper nouns in candidate narrations. A new `NarrationGateHook` interface (in `src/hooks/narration-gate.ts`) lets in-process consumers swap the validator; the default implementation wraps the Validator. Three new CLI commands (`validate-narration`, `prepare-turn`, `campaign-exists`) expose the same functionality to out-of-process consumers like Hermes-Agent. The resolver gains a derived `notFoundReason` field for cleaner CLI consumer branching.

**Tech Stack:** TypeScript 5.x (ESM, NodeNext), Zod for runtime schemas, Vitest for tests, zod-to-json-schema for tool exposure. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md`

---

## File Structure

**Created:**
- `src/hooks/narration-gate.ts` — Types (`NarrationGateInput`, `NarrationGateContext`, `NarrationIssue`, `ValidationReport`), `NarrationGateHook` interface, `NarrationGateRegistry` class.
- `src/core/stopwords.ts` — Frozen FR+EN stopword set used by the Validator's regex stage.
- `src/core/validate-narration.ts` — `Validator` class (4-stage pipeline) + `defaultNarrationGateHook` export.
- `test/core/validate-narration.test.ts` — Validator unit tests.
- `test/core/stopwords.test.ts` — Trivial sanity test for the stopword set.
- `test/hooks/narration-gate.test.ts` — Registry behavior tests.
- `test/cli/unit/validate-narration.test.ts` — CLI command unit tests.
- `test/cli/unit/prepare-turn.test.ts` — CLI command unit tests.
- `test/cli/unit/campaign-exists.test.ts` — CLI command unit tests.

**Modified:**
- `src/resolver/resolver.ts` — Additive `notFoundReason` field on `ResolutionResult`.
- `src/campaign.ts` — New methods: `validateNarration`, `prepareTurn`, `registerNarrationGate`.
- `src/engine.ts` — Owns the `NarrationGateRegistry`.
- `src/cli/types.ts` — `KNOWN_COMMANDS` grows from 12 → 15.
- `src/cli/run.ts` — Bypass campaign-exists pre-check; 3 new switch cases.
- `src/cli/help.ts` — 3 new entries in `COMMAND_DESCRIPTIONS`.
- `src/tools/schemas.ts` — Add `sneq__validate_narration` Zod schema + description.
- `src/tools/dispatcher.ts` — New `ToolCallContext.validateNarration` method + dispatch case.
- `test/resolver/resolver.test.ts` — Additive cases for `notFoundReason`.
- `test/cli/e2e.test.ts` — Roundtrip cases for the 3 new commands.
- `test/cli/smoke.test.ts` — Smoke entries for the 3 new commands.
- `README.md` — Update CLI section to mention 15 commands.

**Boundary rule:** Anything not in this list stays untouched. If a task seems to require changes outside this list, stop and flag it.

---

## Task 1: Shared Types & Empty `NarrationGateRegistry`

**Files:**
- Create: `src/hooks/narration-gate.ts`
- Create: `test/hooks/narration-gate.test.ts`

- [ ] **Step 1: Write the failing test for the Registry**

Create `test/hooks/narration-gate.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  NarrationGateRegistry,
  type NarrationGateHook,
  type NarrationGateInput,
  type NarrationGateContext,
  type ValidationReport
} from "../../src/hooks/narration-gate.js";

const okReport: ValidationReport = { ok: true, extractedNames: [], issues: [] };

function fakeHook(label: string): NarrationGateHook {
  return {
    async validate(_input, _ctx) {
      return { ok: true, extractedNames: [label], issues: [] };
    }
  };
}

function fakeCtx(): NarrationGateContext {
  return { campaignId: "c1" as never, resolver: {} as never, router: {} as never };
}

describe("NarrationGateRegistry", () => {
  it("uses the fallback hook by default", async () => {
    const reg = new NarrationGateRegistry(fakeHook("default"));
    const r = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r.extractedNames).toEqual(["default"]);
  });

  it("register() swaps the active hook; dispose() restores the fallback", async () => {
    const reg = new NarrationGateRegistry(fakeHook("default"));
    const handle = reg.register(fakeHook("custom"));
    const r1 = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r1.extractedNames).toEqual(["custom"]);
    handle.dispose();
    const r2 = await reg.validate({ narration: "x" }, fakeCtx());
    expect(r2.extractedNames).toEqual(["default"]);
  });

  it("passes the input and context through unchanged", async () => {
    let seenInput: NarrationGateInput | undefined;
    let seenCtx: NarrationGateContext | undefined;
    const reg = new NarrationGateRegistry({
      async validate(input, ctx) {
        seenInput = input;
        seenCtx = ctx;
        return okReport;
      }
    });
    const input: NarrationGateInput = { narration: "Aldwyn", type: "PERSONNAGE", strict: true };
    const ctx = fakeCtx();
    await reg.validate(input, ctx);
    expect(seenInput).toBe(input);
    expect(seenCtx).toBe(ctx);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/hooks/narration-gate.test.ts`
Expected: FAIL with "Cannot find module '../../src/hooks/narration-gate.js'".

- [ ] **Step 3: Create `src/hooks/narration-gate.ts`**

```typescript
import type { CampaignId } from "../domain/ids.js";
import type { EntityType } from "../domain/entity.js";
import type { Resolver } from "../resolver/resolver.js";
import type { Router } from "../router/router.js";

export interface NarrationGateInput {
  narration: string;
  type?: EntityType;
  strict?: boolean;
}

export interface NarrationGateContext {
  campaignId: CampaignId;
  resolver: Resolver;
  router: Router;
}

export interface NarrationIssue {
  noun: string;
  kind: "no-match" | "below-threshold" | "ambiguous";
  suggestions: {
    entityId: string;
    canonicalName: string;
    confidence: number;
  }[];
  llmReasoning?: string;
}

export interface ValidationReport {
  ok: boolean;
  partial?: boolean;
  extractedNames: string[];
  issues: NarrationIssue[];
}

export interface NarrationGateHook {
  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport>;
}

export class NarrationGateRegistry {
  private current: NarrationGateHook;

  constructor(private readonly fallback: NarrationGateHook) {
    this.current = fallback;
  }

  register(h: NarrationGateHook): { dispose(): void } {
    this.current = h;
    return {
      dispose: () => {
        this.current = this.fallback;
      }
    };
  }

  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport> {
    return this.current.validate(input, ctx);
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/hooks/narration-gate.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/narration-gate.ts test/hooks/narration-gate.test.ts
git commit -m "feat(hooks): add NarrationGateHook interface + registry"
```

---

## Task 2: FR+EN Stopword Set

**Files:**
- Create: `src/core/stopwords.ts`
- Create: `test/core/stopwords.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/core/stopwords.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/core/stopwords.test.ts`
Expected: FAIL with "Cannot find module '../../src/core/stopwords.js'".

- [ ] **Step 3: Create `src/core/stopwords.ts`**

```typescript
// French + English stopwords used by the Validator regex stage to drop
// capitalized tokens that look like proper nouns but aren't. All lowercase;
// the Validator lowercases candidates before checking membership.
const FRENCH_STOPWORDS = [
  "le","la","les","un","une","des","du","de","au","aux",
  "je","tu","il","elle","on","nous","vous","ils","elles",
  "ce","cet","cette","ces","mon","ma","mes","ton","ta","tes","son","sa","ses",
  "notre","nos","votre","vos","leur","leurs",
  "et","ou","mais","donc","or","ni","car","si","quand","lorsque","alors","ainsi",
  "puis","ensuite","enfin","aussi","encore","déjà","jamais","toujours","souvent",
  "ici","là","là-bas","oui","non","peut-être","bien","très","trop","plus","moins",
  "comme","comment","pourquoi","parce","que","qui","quoi","quel","quelle","quels","quelles",
  "qu","l","d","n","s","m","t","j","c","jusque","jusqu","quoique","cependant",
  "soudain","aujourd","hui","demain","hier","aujourd'hui","oh","ah","eh","hé","ho","bah"
];

const ENGLISH_STOPWORDS = [
  "the","a","an","is","are","was","were","be","been","being","am",
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "my","your","his","its","our","their","mine","yours","hers","ours","theirs",
  "this","that","these","those","such",
  "and","or","but","so","yet","nor","for","if","then","when","while","because",
  "as","of","at","by","with","from","into","onto","upon","over","under","through",
  "yes","no","ok","okay","oh","ah","hey","whoa","wow","huh","well",
  "now","here","there","where","why","how","what","who","whom","which",
  "very","quite","just","also","too","still","already","never","always","often",
  "more","less","most","least","not","only","even"
];

const ALL = [...FRENCH_STOPWORDS, ...ENGLISH_STOPWORDS].map(w => w.toLowerCase());

export const STOPWORDS: ReadonlySet<string> = new Set(ALL);
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/core/stopwords.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/stopwords.ts test/core/stopwords.test.ts
git commit -m "feat(core): add FR+EN stopword set for validator"
```

---

## Task 3: Validator — Stage 1 (Regex Extraction)

**Files:**
- Create: `src/core/validate-narration.ts`
- Create: `test/core/validate-narration.test.ts`

- [ ] **Step 1: Write the failing test for `extract()`**

Create `test/core/validate-narration.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/core/validate-narration.test.ts`
Expected: FAIL with "Cannot find module '../../src/core/validate-narration.js'".

- [ ] **Step 3: Create `src/core/validate-narration.ts` with Stage 1**

```typescript
import type { Resolver } from "../resolver/resolver.js";
import type { Router } from "../router/router.js";
import type {
  NarrationGateHook,
  NarrationGateInput,
  NarrationGateContext,
  ValidationReport
} from "../hooks/narration-gate.js";
import { STOPWORDS } from "./stopwords.js";

export interface ValidatorOptions {
  stopwords?: ReadonlySet<string>;
  topK?: number;
  llmCharBudget?: number;
}

const FRENCH_CONTRACTIONS = /^(l|d|n|s|m|t|j|c|qu)['’]/i;

export class Validator {
  private readonly stopwords: ReadonlySet<string>;
  private readonly topK: number;
  private readonly llmCharBudget: number;

  constructor(
    private readonly resolver: Resolver,
    private readonly router: Router,
    opts: ValidatorOptions = {}
  ) {
    this.stopwords = opts.stopwords ?? STOPWORDS;
    this.topK = opts.topK ?? 20;
    this.llmCharBudget = opts.llmCharBudget ?? 3000;
  }

  /** Stage 1 — regex extraction of capitalized name candidates. */
  extract(text: string): string[] {
    const found = new Set<string>();
    if (!text || !text.trim()) return [];

    // Tokenize on whitespace; preserve order for multi-word sequence detection.
    const tokens = text.split(/\s+/).filter(Boolean);
    const normalized = tokens.map(t => this.normalizeToken(t));

    let i = 0;
    while (i < normalized.length) {
      const t = normalized[i]!;
      if (!t || !this.isProperNounCandidate(t)) {
        i++;
        continue;
      }

      // Collect 1-3 consecutive capitalized non-stopword tokens.
      const seq: string[] = [t];
      let j = i + 1;
      while (j < normalized.length && seq.length < 3) {
        const next = normalized[j]!;
        if (next && this.isProperNounCandidate(next)) {
          seq.push(next);
          j++;
        } else {
          break;
        }
      }

      found.add(seq.join(" "));
      i = j;
    }

    return [...found];
  }

  /** Strip surrounding punctuation and French elision contractions. */
  private normalizeToken(s: string): string {
    // Strip leading/trailing non-letter characters (Unicode-aware).
    let t = s.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    // Strip French contractions (l', d', n', s', m', t', j', c', qu')
    t = t.replace(FRENCH_CONTRACTIONS, "");
    return t;
  }

  private isProperNounCandidate(t: string): boolean {
    if (t.length < 2) return false;
    if (this.stopwords.has(t.toLowerCase())) return false;
    // First char must be uppercase (Unicode-aware).
    const first = t[0]!;
    return first.toUpperCase() === first && first.toLowerCase() !== first;
  }
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/core/validate-narration.test.ts`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate-narration.ts test/core/validate-narration.test.ts
git commit -m "feat(core): validator stage 1 — regex extraction of proper-noun candidates"
```

---

## Task 4: Validator — Stage 2 (Resolver Pass)

**Files:**
- Modify: `src/core/validate-narration.ts`
- Modify: `test/core/validate-narration.test.ts`

- [ ] **Step 1: Write the failing test for `resolvePass()`**

Append to `test/core/validate-narration.test.ts` (inside the file, after the existing `describe`):

```typescript
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
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/core/validate-narration.test.ts -t "resolvePass"`
Expected: FAIL — `v.resolvePass is not a function`.

- [ ] **Step 3: Add `resolvePass` method to Validator**

Edit `src/core/validate-narration.ts` — add this method to the `Validator` class (after `extract`):

```typescript
/** Stage 2 — alias/vector/judge pass via existing resolver. */
async resolvePass(
  campaignId: CampaignId,
  candidates: string[],
  type?: EntityType
): Promise<ResolvedCandidate[]> {
  const out: ResolvedCandidate[] = [];
  for (const noun of candidates) {
    const r = await this.resolver.resolveEntity({
      campaignId,
      mention: noun,
      ...(type !== undefined ? { type } : {})
    });
    if (r.match !== null) {
      // RESOLVED — drop entirely.
      continue;
    }
    if (r.layerUsed === "none" || r.candidates.length === 0) {
      out.push({ noun, kind: "no-match", suggestions: [] });
      continue;
    }
    // We have candidates but no match. Distinguish below-threshold vs ambiguous.
    const kind: "below-threshold" | "ambiguous" =
      r.layerUsed === "vector" ? "below-threshold" : "ambiguous";
    out.push({
      noun,
      kind,
      suggestions: r.candidates.slice(0, 3).map(c => ({
        entityId: String(c.id),
        canonicalName: c.name,
        confidence: r.confidence
      }))
    });
  }
  return out;
}
```

Also add the supporting type at the top of the file (after the existing imports):

```typescript
import type { CampaignId } from "../domain/ids.js";
import type { EntityType } from "../domain/entity.js";

export interface ResolvedCandidate {
  noun: string;
  kind: "no-match" | "below-threshold" | "ambiguous";
  suggestions: {
    entityId: string;
    canonicalName: string;
    confidence: number;
  }[];
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run test/core/validate-narration.test.ts`
Expected: PASS — all extract + resolvePass tests green.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate-narration.ts test/core/validate-narration.test.ts
git commit -m "feat(core): validator stage 2 — resolver pass with kind classification"
```

---

## Task 5: Validator — Stage 3 (LLM Pass)

**Files:**
- Modify: `src/core/validate-narration.ts`
- Modify: `test/core/validate-narration.test.ts`

- [ ] **Step 1: Write the failing test for `llmPass()`**

Append to `test/core/validate-narration.test.ts`:

```typescript
import type { Router } from "../../src/router/router.js";
import type { Repository } from "../../src/repository/interface.js";

function mockRouter(impl: (prompt: string) => Promise<string>): Router {
  return {
    async chat(req: { tier: "heavy" | "light"; messages: { role: string; content: string }[] }) {
      const userMsg = req.messages.find(m => m.role === "user")?.content ?? "";
      const content = await impl(userMsg);
      return { content, model: "test", tier: req.tier };
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
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/core/validate-narration.test.ts -t "llmPass"`
Expected: FAIL — `v.llmPass is not a function`.

- [ ] **Step 3: Add `llmPass` method to Validator**

Edit `src/core/validate-narration.ts` — add after `resolvePass`:

```typescript
/** Stage 3 — light-tier LLM second opinion on NO-MATCH candidates. */
async llmPass(
  _campaignId: CampaignId,
  narration: string,
  resolved: ResolvedCandidate[],
  topEntities: Entity[]
): Promise<{ candidates: ResolvedCandidate[]; partial: boolean }> {
  const noMatch = resolved.filter(c => c.kind === "no-match");
  if (noMatch.length === 0) {
    return { candidates: resolved, partial: false };
  }

  const excerpt = narration.length > this.llmCharBudget
    ? narration.slice(0, this.llmCharBudget) + "…"
    : narration;

  const knownLines = topEntities
    .slice(0, this.topK)
    .map(e => `- ${e.id}: ${e.name}`)
    .join("\n");

  const noMatchList = noMatch.map(c => `- "${c.noun}"`).join("\n");

  const prompt = [
    "You are validating proper nouns extracted from a roleplay narration against a campaign canon.",
    "For each candidate noun, decide if it is a typo/variant of a known canonical entity, or wholly unknown.",
    "",
    "Narration excerpt:",
    excerpt,
    "",
    "Candidate nouns to classify:",
    noMatchList,
    "",
    "Known canonical entities (id: name):",
    knownLines || "(none)",
    "",
    "Respond with ONLY a JSON array, one object per candidate, in this shape:",
    `[{"noun":"...","verdict":"typo"|"unknown","suggestion"?:"<entityId>","confidence"?:0..1,"reasoning"?:"..."}]`
  ].join("\n");

  let raw: string;
  try {
    const resp = await this.router.chat({
      tier: "light",
      messages: [{ role: "user", content: prompt }]
    });
    raw = resp.content;
  } catch {
    return { candidates: resolved, partial: true };
  }

  let verdicts: LlmVerdict[];
  try {
    const parsed: unknown = JSON.parse(raw.trim());
    if (!Array.isArray(parsed)) throw new Error("not an array");
    verdicts = parsed as LlmVerdict[];
  } catch {
    return { candidates: resolved, partial: true };
  }

  const byNoun = new Map(verdicts.map(v => [v.noun, v]));
  const merged = resolved.map(c => {
    if (c.kind !== "no-match") return c;
    const v = byNoun.get(c.noun);
    if (!v) return c;
    if (v.verdict === "typo" && v.suggestion) {
      const ent = topEntities.find(e => String(e.id) === v.suggestion);
      const suggestion = ent
        ? {
            entityId: String(ent.id),
            canonicalName: ent.name,
            confidence: typeof v.confidence === "number" ? v.confidence : 0.6
          }
        : null;
      return {
        ...c,
        kind: "below-threshold" as const,
        suggestions: suggestion ? [suggestion] : [],
        ...(v.reasoning ? { llmReasoning: v.reasoning } : {})
      };
    }
    // verdict === "unknown" → confirm no-match, optionally attach reasoning.
    return {
      ...c,
      ...(v.reasoning ? { llmReasoning: v.reasoning } : {})
    };
  });

  return { candidates: merged, partial: false };
}
```

And add this type + import near the existing imports:

```typescript
import type { Entity } from "../domain/entity.js";

interface LlmVerdict {
  noun: string;
  verdict: "typo" | "unknown";
  suggestion?: string;
  confidence?: number;
  reasoning?: string;
}
```

(`Entity` may already be imported transitively — add if not.)

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run test/core/validate-narration.test.ts`
Expected: PASS — extract + resolvePass + llmPass all green.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate-narration.ts test/core/validate-narration.test.ts
git commit -m "feat(core): validator stage 3 — light-tier LLM second opinion"
```

---

## Task 6: Validator — Stage 4 (Assemble) + Full Pipeline + `defaultNarrationGateHook`

**Files:**
- Modify: `src/core/validate-narration.ts`
- Modify: `test/core/validate-narration.test.ts`

- [ ] **Step 1: Write the failing test for `validate()` end-to-end**

Append to `test/core/validate-narration.test.ts`:

```typescript
describe("Validator.validate (full pipeline)", () => {
  const campaignId = "c1" as CampaignId;

  it("returns ok=true and no issues when every candidate resolves", async () => {
    const resolver = mockResolver({
      Anya: { match: mkEntity("e1", "Anya"), confidence: 0.95, candidates: [], layerUsed: "alias" },
      Dragonsreach: { match: mkEntity("e2", "Dragonsreach"), confidence: 0.95, candidates: [], layerUsed: "alias" }
    });
    const router = mockRouter(async () => "[]");
    const v = new Validator(resolver, router);
    const repo = { topEntities: async () => [] as Entity[] };
    const r = await v.validate(
      { narration: "Anya parle à Dragonsreach." },
      campaignId,
      repo
    );
    expect(r.ok).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.extractedNames).toEqual(expect.arrayContaining(["Anya", "Dragonsreach"]));
  });

  it("returns ok=false with issues when names are unresolved", async () => {
    const resolver = mockResolver({
      Cassius: { match: null, confidence: 0, candidates: [], layerUsed: "none" }
    });
    const router = mockRouter(async () => JSON.stringify([
      { noun: "Cassius", verdict: "unknown", reasoning: "not in canon" }
    ]));
    const v = new Validator(resolver, router);
    const repo = { topEntities: async () => [] as Entity[] };
    const r = await v.validate(
      { narration: "Cassius est mage." },
      campaignId,
      repo
    );
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual([
      { noun: "Cassius", kind: "no-match", suggestions: [], llmReasoning: "not in canon" }
    ]);
  });

  it("populates partial=true when the LLM step fails", async () => {
    const resolver = mockResolver({
      Cassius: { match: null, confidence: 0, candidates: [], layerUsed: "none" }
    });
    const router = mockRouter(async () => { throw new Error("down"); });
    const v = new Validator(resolver, router);
    const repo = { topEntities: async () => [] as Entity[] };
    const r = await v.validate({ narration: "Cassius." }, campaignId, repo);
    expect(r.partial).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/core/validate-narration.test.ts -t "full pipeline"`
Expected: FAIL — `v.validate is not a function`.

- [ ] **Step 3: Add `validate()` + `assemble()` + `defaultNarrationGateHook`**

Edit `src/core/validate-narration.ts`:

```typescript
/** Stage 4 — group + sort + report shape. */
private assemble(extracted: string[], resolved: ResolvedCandidate[], partial: boolean): ValidationReport {
  // Sort: kind priority (no-match > ambiguous > below-threshold) then confidence desc within each kind.
  const order: Record<ResolvedCandidate["kind"], number> = {
    "no-match": 0,
    "ambiguous": 1,
    "below-threshold": 2
  };
  const sorted = [...resolved].sort((a, b) => {
    const k = order[a.kind] - order[b.kind];
    if (k !== 0) return k;
    const aConf = a.suggestions[0]?.confidence ?? 0;
    const bConf = b.suggestions[0]?.confidence ?? 0;
    return bConf - aConf;
  });
  const report: ValidationReport = {
    ok: sorted.length === 0,
    extractedNames: extracted,
    issues: sorted
  };
  if (partial) report.partial = true;
  return report;
}

/** Full pipeline: extract → resolve → llm → assemble. */
async validate(
  input: NarrationGateInput,
  campaignId: CampaignId,
  repo: { topEntities(campaignId: CampaignId, k: number): Promise<Entity[]> }
): Promise<ValidationReport> {
  const candidates = this.extract(input.narration);
  if (candidates.length === 0) {
    return { ok: true, extractedNames: [], issues: [] };
  }
  const resolved = await this.resolvePass(campaignId, candidates, input.type);
  const top = await repo.topEntities(campaignId, this.topK);
  const llmStage = await this.llmPass(campaignId, input.narration, resolved, top);
  return this.assemble(candidates, llmStage.candidates, llmStage.partial);
}
```

Then at the end of the file, add the default hook export:

```typescript
/**
 * Default `NarrationGateHook` implementation backed by the Validator. Engine
 * uses this as the registry fallback so a consumer that never registers a
 * custom hook still gets the built-in behavior.
 */
export const defaultNarrationGateHook: NarrationGateHook = {
  async validate(input, ctx) {
    const v = new Validator(ctx.resolver, ctx.router);
    // The hook context carries resolver/router but not the repo. We rely on
    // the Resolver's deps for entity lookups; for `topEntities` we delegate to
    // a small helper on Resolver (added in Task 8). Until then, default to empty.
    return v.validate(
      input,
      ctx.campaignId,
      { topEntities: async () => [] }
    );
  }
};
```

> Note: the empty `topEntities` default is wired correctly in Task 8 when we expose `topEntities` on the engine.

- [ ] **Step 4: Run all validator tests and verify they pass**

Run: `pnpm vitest run test/core/validate-narration.test.ts`
Expected: PASS — extract + resolvePass + llmPass + full pipeline all green.

- [ ] **Step 5: Commit**

```bash
git add src/core/validate-narration.ts test/core/validate-narration.test.ts
git commit -m "feat(core): validator stage 4 — assemble + full pipeline + default hook"
```

---

## Task 7: Add `topEntities` to Repository Interface + SQLite Impl

**Files:**
- Modify: `src/repository/interface.ts`
- Modify: `src/repository/sqlite/repository.ts` (or wherever the SQLite impl lives)
- Modify: `test/repository/` (add a test for the new method)

> **Why this task exists:** Stage 3 of the Validator needs the top-K recently-touched canonical entities for the LLM second opinion. The repository doesn't currently expose this. We add a minimal method.

- [ ] **Step 1: Find the SQLite repository file**

Run: `find src/repository -name "*.ts" -not -path "*/node_modules/*"`
Inspect the directory; the SQLite impl typically lives in `src/repository/sqlite/repository.ts` or `src/repository/sqlite/factory.ts`. Read both to find where `findEntitiesByAlias` is defined — that's the same file you'll modify.

- [ ] **Step 2: Write the failing test**

Find the existing SQLite repository test file (likely `test/repository/sqlite.test.ts`). Add this test:

```typescript
describe("topEntities", () => {
  it("returns up to K entities ordered by embeddingRefreshedAt desc", async () => {
    const { repo, campaignId } = await mkFixture(); // reuse existing fixture helper

    const now = Date.now();
    const e1 = await mkAndInsertEntity(repo, campaignId, "Old", now - 1000);
    const e2 = await mkAndInsertEntity(repo, campaignId, "Recent", now);
    const e3 = await mkAndInsertEntity(repo, campaignId, "Mid", now - 500);

    const top = await repo.topEntities(campaignId, 2);
    expect(top).toHaveLength(2);
    expect(top[0]?.name).toBe("Recent");
    expect(top[1]?.name).toBe("Mid");
  });

  it("returns an empty array for a campaign with no entities", async () => {
    const { repo, campaignId } = await mkFixture();
    const top = await repo.topEntities(campaignId, 10);
    expect(top).toEqual([]);
  });
});
```

Adapt the helper names to match what the existing test file uses. If unsure, read the existing test file first and mirror its setup.

- [ ] **Step 3: Run the test and verify it fails**

Run: `pnpm vitest run test/repository`
Expected: FAIL — `repo.topEntities is not a function`.

- [ ] **Step 4: Add `topEntities` to the Repository interface**

Edit `src/repository/interface.ts` — add to the `Repository` interface (alphabetically or near `findEntitiesByAlias`):

```typescript
/** Return up to `k` entities for the campaign, ordered by `embeddingRefreshedAt` descending. */
topEntities(campaignId: CampaignId, k: number): Promise<Entity[]>;
```

- [ ] **Step 5: Implement in the SQLite repository**

In the SQLite repo file, add:

```typescript
async topEntities(campaignId: CampaignId, k: number): Promise<Entity[]> {
  const rows = this.db
    .prepare(
      `SELECT * FROM entities WHERE campaign_id = ? ORDER BY embedding_refreshed_at DESC LIMIT ?`
    )
    .all(campaignId, k) as EntityRow[];
  return rows.map(rowToEntity);
}
```

(Adapt the SQL + row mapping to whatever the existing file uses. The pattern should mirror an existing list method like `listCampaigns` or an entity query.)

- [ ] **Step 6: Run the tests and verify they pass**

Run: `pnpm vitest run test/repository`
Expected: PASS — both new tests + existing repo tests green.

- [ ] **Step 7: Commit**

```bash
git add src/repository/interface.ts src/repository/sqlite/repository.ts test/repository
git commit -m "feat(repository): add topEntities(k) for validator LLM-pass context"
```

---

## Task 8: Wire `topEntities` into Validator Default Hook + CampaignContext

**Files:**
- Modify: `src/core/validate-narration.ts`
- Modify: `src/campaign.ts`
- Modify: `src/engine.ts`
- Modify: `test/campaign.test.ts` (or create test/campaign-validate-narration.test.ts)

- [ ] **Step 1: Write the failing test on CampaignContext**

Append to `test/campaign.test.ts` (or wherever campaign methods are tested):

```typescript
describe("CampaignContext.validateNarration", () => {
  it("delegates to the registered NarrationGateHook with the campaign context", async () => {
    // Use existing setup pattern from this test file.
    const { engine, campaignId } = await setupEngineWithCampaign();
    const ctx = engine.campaign(campaignId);

    let seenInput: { narration: string } | undefined;
    const handle = ctx.registerNarrationGate({
      async validate(input) {
        seenInput = input;
        return { ok: true, extractedNames: [], issues: [] };
      }
    });

    const r = await ctx.validateNarration({ narration: "test" });
    expect(seenInput).toEqual({ narration: "test" });
    expect(r.ok).toBe(true);
    handle.dispose();
  });
});

describe("CampaignContext.prepareTurn", () => {
  it("returns scene null and empty presentEntities when no scene is set", async () => {
    const { engine, campaignId } = await setupEngineWithCampaign();
    const ctx = engine.campaign(campaignId);
    const r = await ctx.prepareTurn();
    expect(r.scene).toBeNull();
    expect(r.presentEntities).toEqual([]);
  });
});
```

If `setupEngineWithCampaign` doesn't exist, create a minimal one inline using the patterns from the rest of the test file.

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/campaign.test.ts -t "validateNarration|prepareTurn"`
Expected: FAIL — `ctx.validateNarration is not a function`.

- [ ] **Step 3: Add `NarrationGateRegistry` to `Engine`**

Edit `src/engine.ts`. Imports:

```typescript
import { NarrationGateRegistry } from "./hooks/narration-gate.js";
import { defaultNarrationGateHook } from "./core/validate-narration.js";
```

In the class body, after `preGen`:

```typescript
private readonly narrationGate = new NarrationGateRegistry(defaultNarrationGateHook);
```

Update the `campaign()` method to pass it through to `CampaignContext`:

```typescript
campaign(id: CampaignId): CampaignContext {
  const cached = this.contexts.get(id);
  if (cached) return cached;
  const ctx = new CampaignContext({
    campaignId: id,
    repo: this.repo,
    router: this.router,
    resolver: this.resolver,
    embedder: this.embedder,
    userPrompt: this.userPrompt,
    preGen: this.preGen,
    narrationGate: this.narrationGate, // NEW
    logger: this.logger
  });
  this.contexts.set(id, ctx);
  return ctx;
}
```

- [ ] **Step 4: Add the new methods to `CampaignContext`**

Edit `src/campaign.ts`. Imports:

```typescript
import type {
  NarrationGateHook,
  NarrationGateInput,
  NarrationGateRegistry,
  ValidationReport
} from "./hooks/narration-gate.js";
import type { Entity } from "./domain/entity.js";
import type { AttributFige } from "./domain/attribute.js";
```

In `CampaignContextDeps` interface, add:

```typescript
narrationGate: NarrationGateRegistry;
```

Add these methods at the bottom of the class:

```typescript
async validateNarration(input: NarrationGateInput): Promise<ValidationReport> {
  return this.deps.narrationGate.validate(input, {
    campaignId: this.id,
    resolver: this.deps.resolver,
    router: this.deps.router
  });
}

registerNarrationGate(hook: NarrationGateHook): { dispose(): void } {
  return this.deps.narrationGate.register(hook);
}

async prepareTurn(): Promise<{
  scene: Scene | null;
  presentEntities: { entity: Entity; facts: AttributFige[] }[];
}> {
  const scene = await this.deps.repo.currentScene(this.id);
  if (!scene) return { scene: null, presentEntities: [] };

  const present = await Promise.all(
    scene.presentEntityIds.map(async (eid) => {
      const entity = await this.deps.repo.getEntity(this.id, eid);
      if (!entity) return null;
      const facts = await this.deps.repo.getFigedAttributes(this.id, eid);
      return { entity, facts };
    })
  );
  return { scene, presentEntities: present.filter((p): p is { entity: Entity; facts: AttributFige[] } => p !== null) };
}
```

- [ ] **Step 5: Wire `topEntities` into the default hook**

Edit `src/core/validate-narration.ts`. The default hook needs access to the repo's `topEntities`. The cleanest fix: extend `NarrationGateContext` to carry a repo accessor.

In `src/hooks/narration-gate.ts`, extend `NarrationGateContext`:

```typescript
import type { Repository } from "../repository/interface.js";

export interface NarrationGateContext {
  campaignId: CampaignId;
  resolver: Resolver;
  router: Router;
  repo: Repository;   // NEW
}
```

Update `src/campaign.ts` `validateNarration` to pass it:

```typescript
async validateNarration(input: NarrationGateInput): Promise<ValidationReport> {
  return this.deps.narrationGate.validate(input, {
    campaignId: this.id,
    resolver: this.deps.resolver,
    router: this.deps.router,
    repo: this.deps.repo
  });
}
```

Now update `defaultNarrationGateHook` in `src/core/validate-narration.ts`:

```typescript
export const defaultNarrationGateHook: NarrationGateHook = {
  async validate(input, ctx) {
    const v = new Validator(ctx.resolver, ctx.router);
    return v.validate(input, ctx.campaignId, {
      topEntities: (cid, k) => ctx.repo.topEntities(cid, k)
    });
  }
};
```

Also update the test fixture in `test/hooks/narration-gate.test.ts` if `fakeCtx()` no longer compiles — add `repo: {} as never` to the returned object.

- [ ] **Step 6: Run all tests and verify they pass**

Run: `pnpm vitest run`
Expected: PASS — all tests including campaign + validator + hooks.

- [ ] **Step 7: Commit**

```bash
git add src/engine.ts src/campaign.ts src/core/validate-narration.ts src/hooks/narration-gate.ts test/campaign.test.ts test/hooks/narration-gate.test.ts
git commit -m "feat(engine): wire NarrationGateRegistry + prepareTurn/validateNarration on CampaignContext"
```

---

## Task 9: Resolver `notFoundReason` Additive Field

**Files:**
- Modify: `src/resolver/resolver.ts`
- Modify: `test/resolver/resolver.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `test/resolver/resolver.test.ts` (mirror its existing setup patterns):

```typescript
describe("Resolver.resolveEntity notFoundReason", () => {
  it("is undefined when match is non-null", async () => {
    const { resolver, campaignId } = await setupWithEntities([{ name: "Anya", aliases: ["Anya"] }]);
    const r = await resolver.resolveEntity({ campaignId, mention: "Anya" });
    expect(r.match).not.toBeNull();
    expect(r.notFoundReason).toBeUndefined();
  });

  it("is 'no-match' when layerUsed='none' (no candidates)", async () => {
    const { resolver, campaignId } = await setupWithEntities([]);
    const r = await resolver.resolveEntity({ campaignId, mention: "Cassius" });
    expect(r.match).toBeNull();
    expect(r.layerUsed).toBe("none");
    expect(r.notFoundReason).toBe("no-match");
  });

  it("is 'below-threshold' when vector returned candidates with confidence < tauLow", async () => {
    // Build a resolver where the vector search returns a low-confidence hit.
    // Use the existing test pattern that lets you inject mock search results.
    const { resolver, campaignId } = await setupVectorBelowThreshold("Aldwyn", "Alduin", 0.4);
    const r = await resolver.resolveEntity({ campaignId, mention: "Aldwyn" });
    expect(r.match).toBeNull();
    expect(r.notFoundReason).toBe("below-threshold");
  });

  it("is 'ambiguous' when judge couldn't pick from candidates above tauLow", async () => {
    const { resolver, campaignId } = await setupJudgeAmbiguous();
    const r = await resolver.resolveEntity({ campaignId, mention: "Aldwen" });
    expect(r.match).toBeNull();
    expect(r.layerUsed).toBe("judge");
    expect(r.notFoundReason).toBe("ambiguous");
  });
});
```

> If `setupVectorBelowThreshold` / `setupJudgeAmbiguous` helpers don't exist, define them inline using the file's existing mocking patterns. The existing tests for the resolver should give you the template.

- [ ] **Step 2: Run the tests and verify they fail**

Run: `pnpm vitest run test/resolver/resolver.test.ts -t "notFoundReason"`
Expected: FAIL — `r.notFoundReason` is undefined for the no-match cases.

- [ ] **Step 3: Add the field + derivation logic**

Edit `src/resolver/resolver.ts`. Update `ResolutionResult`:

```typescript
export interface ResolutionResult {
  match: Entity | null;
  confidence: number;
  candidates: Entity[];
  layerUsed: "alias" | "vector" | "judge" | "user-prompt" | "none";
  reasoning?: string;
  notFoundReason?: "no-match" | "below-threshold" | "ambiguous";   // NEW
}
```

Add a small helper at the bottom of the file (outside the class):

```typescript
function deriveNotFoundReason(
  match: Entity | null,
  layerUsed: ResolutionResult["layerUsed"],
  candidates: Entity[],
  confidence: number,
  tauLow: number
): ResolutionResult["notFoundReason"] | undefined {
  if (match !== null) return undefined;
  if (layerUsed === "none" || candidates.length === 0) return "no-match";
  if (layerUsed === "vector" && confidence < tauLow) return "below-threshold";
  return "ambiguous";
}
```

Then update every `return { match: ..., ... }` in `resolveEntity` to pass through `deriveNotFoundReason`. Simplest pattern: wrap each return through a helper. Rewrite the method to use a `make(...)` helper that always applies the derivation:

```typescript
async resolveEntity(opts: ResolveOptions): Promise<ResolutionResult> {
  const make = (partial: Omit<ResolutionResult, "notFoundReason">): ResolutionResult => {
    const reason = deriveNotFoundReason(partial.match, partial.layerUsed, partial.candidates, partial.confidence, this.t.tauLow);
    return reason === undefined ? partial : { ...partial, notFoundReason: reason };
  };

  const { campaignId, mention, type, sceneDescription = "" } = opts;

  // ... existing logic, but replace every `return { ... }` with `return make({ ... })`
}
```

> The existing implementation has 6 return points in `resolveEntity`. Each one needs to be wrapped in `make({...})`. Do not change the logic at any branch — only the wrapping.

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run test/resolver/resolver.test.ts`
Expected: PASS — new notFoundReason tests + all existing resolver tests green.

- [ ] **Step 5: Commit**

```bash
git add src/resolver/resolver.ts test/resolver/resolver.test.ts
git commit -m "feat(resolver): derive notFoundReason on ResolutionResult"
```

---

## Task 10: CLI — Add 3 New Commands to `KNOWN_COMMANDS`

**Files:**
- Modify: `src/cli/types.ts`
- Create: `test/cli/unit/parse-argv-new-commands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/cli/unit/parse-argv-new-commands.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseArgv } from "../../../src/cli/parse-argv.js";

describe("parseArgv — new commands", () => {
  it("recognizes validate-narration", () => {
    const inv = parseArgv(["validate-narration", "--db", "x.db", "--campaign", "c1", "--args", "{}"]);
    expect(inv.command).toBe("validate-narration");
  });

  it("recognizes prepare-turn", () => {
    const inv = parseArgv(["prepare-turn", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("prepare-turn");
  });

  it("recognizes campaign-exists", () => {
    const inv = parseArgv(["campaign-exists", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("campaign-exists");
  });

  it("flags an unknown command as 'unknown'", () => {
    const inv = parseArgv(["floop", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/cli/unit/parse-argv-new-commands.test.ts`
Expected: FAIL — the three new commands are flagged as "unknown".

- [ ] **Step 3: Update `KNOWN_COMMANDS`**

Edit `src/cli/types.ts`:

```typescript
export const KNOWN_COMMANDS = [
  "init-campaign",
  "get-scene",
  "lookup-entity",
  "get-entity",
  "get-relevant-facts",
  "suggest-existing",
  "mention-entity",
  "register-fact",
  "add-constraint",
  "collapse-attribute",
  "set-scene",
  "advance-turn",
  "validate-narration",   // NEW
  "prepare-turn",         // NEW
  "campaign-exists"       // NEW
] as const;
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `pnpm vitest run test/cli/unit/parse-argv-new-commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/types.ts test/cli/unit/parse-argv-new-commands.test.ts
git commit -m "feat(cli): register validate-narration, prepare-turn, campaign-exists in KNOWN_COMMANDS"
```

---

## Task 11: CLI — `campaign-exists` Command (Bypass Pre-Check)

**Files:**
- Modify: `src/cli/run.ts`
- Create: `test/cli/unit/campaign-exists.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/cli/unit/campaign-exists.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return {
    stdin,
    stdout,
    read: () => JSON.parse(chunks.join("").trim())
  };
}

function mkEngine(campaigns: { id: string; name: string; embeddingDim: number }[]): Engine {
  return {
    async listCampaigns() {
      return campaigns.map(c => ({ ...c, createdAt: 0 }));
    },
    campaign() { throw new Error("not used in this test"); },
    async close() {}
  } as unknown as Engine;
}

describe("campaign-exists CLI", () => {
  it("returns exists=true with name+embeddingDim when the campaign is present", async () => {
    const io = fakeStdio();
    const engine = mkEngine([{ id: "c1", name: "Stuck in Tamriel", embeddingDim: 1024 }]);
    const exit = await run(
      {
        command: "campaign-exists",
        rawCommand: "campaign-exists",
        db: "x.db",
        campaign: "c1",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ exists: true, name: "Stuck in Tamriel", embeddingDim: 1024 });
  });

  it("returns exists=false without throwing CAMPAIGN_NOT_FOUND", async () => {
    const io = fakeStdio();
    const engine = mkEngine([]);
    const exit = await run(
      {
        command: "campaign-exists",
        rawCommand: "campaign-exists",
        db: "x.db",
        campaign: "missing",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ exists: false });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/cli/unit/campaign-exists.test.ts`
Expected: FAIL — `campaign-exists` is currently rejected as unknown by the dispatcher, OR throws CAMPAIGN_NOT_FOUND.

- [ ] **Step 3: Update `src/cli/run.ts`**

In `dispatch()`, update the pre-check that throws `CAMPAIGN_NOT_FOUND`:

```typescript
if (inv.command !== "init-campaign" && inv.command !== "campaign-exists") {
  const existing = await deps.engine.listCampaigns();
  if (!existing.some(c => c.id === inv.campaign)) {
    throw new CliError("CAMPAIGN_NOT_FOUND", `campaign '${inv.campaign}' not found`);
  }
}
```

Then add a new case before the `default:`:

```typescript
case "campaign-exists": {
  const existing = await deps.engine.listCampaigns();
  const hit = existing.find(c => c.id === inv.campaign);
  if (hit) {
    deps.stdout.write(JSON.stringify({
      exists: true,
      name: hit.name,
      embeddingDim: hit.embeddingDim
    }) + "\n");
  } else {
    deps.stdout.write(JSON.stringify({ exists: false }) + "\n");
  }
  return 0;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/cli/unit/campaign-exists.test.ts`
Expected: PASS — both cases.

- [ ] **Step 5: Commit**

```bash
git add src/cli/run.ts test/cli/unit/campaign-exists.test.ts
git commit -m "feat(cli): campaign-exists command (no throw on missing)"
```

---

## Task 12: CLI — `prepare-turn` Command

**Files:**
- Modify: `src/cli/run.ts`
- Create: `test/cli/unit/prepare-turn.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/cli/unit/prepare-turn.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function mkEngine(prepareTurnResult: unknown): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 1024 }]; },
    campaign() {
      return { async prepareTurn() { return prepareTurnResult; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("prepare-turn CLI", () => {
  it("emits the TurnContext as a single JSON line", async () => {
    const expected = { scene: null, presentEntities: [] };
    const io = fakeStdio();
    const engine = mkEngine(expected);
    const exit = await run(
      {
        command: "prepare-turn",
        rawCommand: "prepare-turn",
        db: "x.db",
        campaign: "c1",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual(expected);
  });

  it("throws CAMPAIGN_NOT_FOUND when the campaign is missing", async () => {
    const io = fakeStdio();
    const engine = {
      async listCampaigns() { return []; },
      campaign() { throw new Error("unreachable"); },
      async close() {}
    } as unknown as Engine;
    const exit = await run(
      {
        command: "prepare-turn",
        rawCommand: "prepare-turn",
        db: "x.db",
        campaign: "missing",
        config: undefined,
        source: undefined,
        observationOverride: undefined,
        argsInline: undefined,
        help: false,
        embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(1);
    const out = io.read();
    expect(out.code).toBe("CAMPAIGN_NOT_FOUND");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/cli/unit/prepare-turn.test.ts`
Expected: FAIL — prepare-turn isn't handled.

- [ ] **Step 3: Add the case in `src/cli/run.ts`**

Before the `default:`:

```typescript
case "prepare-turn": {
  const campaign = deps.engine.campaign(campaignId);
  const result = await campaign.prepareTurn();
  deps.stdout.write(JSON.stringify(result) + "\n");
  return 0;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/cli/unit/prepare-turn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cli/run.ts test/cli/unit/prepare-turn.test.ts
git commit -m "feat(cli): prepare-turn command"
```

---

## Task 13: CLI — `validate-narration` Command

**Files:**
- Modify: `src/cli/run.ts`
- Create: `test/cli/unit/validate-narration.test.ts`

- [ ] **Step 1: Write the failing test**

Create `test/cli/unit/validate-narration.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";
import type { ValidationReport } from "../../../src/hooks/narration-gate.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function mkEngine(report: ValidationReport): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 1024 }]; },
    campaign() {
      return { async validateNarration(_input: unknown) { return report; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

const baseInv = (overrides: Partial<Parameters<typeof run>[0]> = {}) => ({
  command: "validate-narration" as const,
  rawCommand: "validate-narration",
  db: "x.db",
  campaign: "c1",
  config: undefined,
  source: undefined,
  observationOverride: undefined,
  argsInline: { narration: "Anya parle." },
  help: false,
  embeddingDim: undefined,
  ...overrides
});

describe("validate-narration CLI", () => {
  it("emits the report and exits 0 on ok=true", async () => {
    const report: ValidationReport = { ok: true, extractedNames: ["Anya"], issues: [] };
    const io = fakeStdio();
    const exit = await run(baseInv(), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) });
    expect(exit).toBe(0);
    expect(io.read()).toEqual(report);
  });

  it("emits the report and exits 0 on ok=false when strict is absent/false", async () => {
    const report: ValidationReport = {
      ok: false,
      extractedNames: ["Cassius"],
      issues: [{ noun: "Cassius", kind: "no-match", suggestions: [] }]
    };
    const io = fakeStdio();
    const exit = await run(baseInv(), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) });
    expect(exit).toBe(0);
    expect(io.read()).toEqual(report);
  });

  it("exits 1 on ok=false when strict=true", async () => {
    const report: ValidationReport = {
      ok: false,
      extractedNames: ["Cassius"],
      issues: [{ noun: "Cassius", kind: "no-match", suggestions: [] }]
    };
    const io = fakeStdio();
    const exit = await run(
      baseInv({ argsInline: { narration: "Cassius.", strict: true } }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(report) }
    );
    expect(exit).toBe(1);
    expect(io.read()).toEqual(report); // Report still emitted on stdout.
  });

  it("rejects missing narration with INVALID_ARGS", async () => {
    const io = fakeStdio();
    const exit = await run(
      baseInv({ argsInline: {} }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine({ ok: true, extractedNames: [], issues: [] }) }
    );
    expect(exit).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/cli/unit/validate-narration.test.ts`
Expected: FAIL — validate-narration isn't handled.

- [ ] **Step 3: Add the case in `src/cli/run.ts`**

Before the `default:`:

```typescript
case "validate-narration": {
  const argsObj = (inv.argsInline ?? {}) as Record<string, unknown>;
  const narration = argsObj["narration"];
  if (typeof narration !== "string" || narration.length === 0) {
    throw new CliError("INVALID_ARGS", "validate-narration requires args.narration (string)");
  }
  const type = argsObj["type"] as import("../domain/entity.js").EntityType | undefined;
  const strict = argsObj["strict"] === true;
  const campaign = deps.engine.campaign(campaignId);
  const report = await campaign.validateNarration({
    narration,
    ...(type !== undefined ? { type } : {}),
    ...(strict ? { strict: true } : {})
  });
  deps.stdout.write(JSON.stringify(report) + "\n");
  return strict && !report.ok ? 1 : 0;
}
```

> Note: When `strict && !report.ok`, we return exit 1 but the JSON report is still on stdout. Per the spec, the caller can read both the verdict and the report.

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/cli/unit/validate-narration.test.ts`
Expected: PASS — all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add src/cli/run.ts test/cli/unit/validate-narration.test.ts
git commit -m "feat(cli): validate-narration command with strict-mode exit code"
```

---

## Task 14: CLI — Help Text for 3 New Commands

**Files:**
- Modify: `src/cli/help.ts`
- Modify: an existing help test or create one

- [ ] **Step 1: Find or create the help test**

Run: `grep -r "helpText" test/ 2>/dev/null | head`

If a test file exists, append to it; else create `test/cli/unit/help.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { helpText } from "../../../src/cli/help.js";

describe("helpText", () => {
  it("lists all 15 commands in the general help", () => {
    const out = helpText();
    expect(out).toContain("validate-narration");
    expect(out).toContain("prepare-turn");
    expect(out).toContain("campaign-exists");
  });

  it("returns command-specific help for validate-narration", () => {
    const out = helpText("validate-narration");
    expect(out).toContain("validate-narration");
    expect(out.length).toBeGreaterThan(50);
  });

  it("returns command-specific help for prepare-turn", () => {
    const out = helpText("prepare-turn");
    expect(out).toContain("prepare-turn");
  });

  it("returns command-specific help for campaign-exists", () => {
    const out = helpText("campaign-exists");
    expect(out).toContain("campaign-exists");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/cli/unit/help.test.ts`
Expected: FAIL — TypeScript may even refuse to compile because `helpText("validate-narration")` exceeds the `CommandName` type (the 12 existing commands).

- [ ] **Step 3: Add the 3 entries to `COMMAND_DESCRIPTIONS`**

Edit `src/cli/help.ts`:

```typescript
const COMMAND_DESCRIPTIONS: Record<CommandName, string> = {
  "init-campaign":      "Create a new campaign in the DB",
  "get-scene":          "Return the current scene of the campaign",
  "lookup-entity":      "Resolve a mention to an existing entity",
  "get-entity":         "Fetch an entity by id with its figed attributes",
  "get-relevant-facts": "List figed facts about an entity",
  "suggest-existing":   "Suggest existing entities before creating a new one",
  "mention-entity":     "Introduce or re-use a canonical entity",
  "register-fact":      "Append a figed (canonical) attribute to an entity",
  "add-constraint":     "Add a soft or strict constraint to a non-figed attribute",
  "collapse-attribute": "Drive an LLM to fill a specific attribute (heavy tier)",
  "set-scene":          "Declare the current scene and its present entities",
  "advance-turn":       "Increment the campaign turn counter",
  "validate-narration": "Scan a candidate narration for unresolved proper nouns (hybrid: regex → resolver → light-tier LLM)",
  "prepare-turn":       "Atomic bundle: current scene + present entities + their facts in one call",
  "campaign-exists":    "Probe whether a campaign exists; does NOT throw on missing"
};
```

(The `KNOWN_COMMANDS.map` in `GENERAL_HELP` automatically includes the new entries — no further change needed.)

- [ ] **Step 4: Run the test and verify it passes**

Run: `pnpm vitest run test/cli/unit/help.test.ts`
Expected: PASS — all 4 cases.

- [ ] **Step 5: Commit**

```bash
git add src/cli/help.ts test/cli/unit/help.test.ts
git commit -m "feat(cli): help text for validate-narration, prepare-turn, campaign-exists"
```

---

## Task 15: Tool Exposure — `sneq__validate_narration` Schema + Dispatcher

**Files:**
- Modify: `src/tools/schemas.ts`
- Modify: `src/tools/dispatcher.ts`
- Modify: an existing tools test or create one

> **Why this task:** The spec says `sneq__validate_narration` is exposed as an LLM-callable tool through `Engine.tools.*`, so in-process consumers using the tool-call protocol can call validate-narration like any other SNEQ tool. `prepare-turn` and `campaign-exists` are CLI-only (per spec §5.5, §6.6); not added here.

- [ ] **Step 1: Write the failing test**

Find or create `test/tools/dispatcher.test.ts` — if it exists, append:

```typescript
describe("sneq__validate_narration tool", () => {
  it("is included in Engine.tools.anthropic", async () => {
    const { Engine } = await import("../../src/engine.js");
    const tools = Engine.tools.anthropic;
    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain("sneq__validate_narration");
  });

  it("dispatches to ctx.validateNarration", async () => {
    const { dispatchToolCall } = await import("../../src/tools/dispatcher.js");
    let seen: unknown;
    const ctx = {
      async validateNarration(input: unknown) { seen = input; return { ok: true, extractedNames: [], issues: [] }; }
    } as never;
    const r = await dispatchToolCall("sneq__validate_narration", { narration: "Anya" }, ctx);
    expect(seen).toEqual({ narration: "Anya" });
    expect(r).toEqual({ ok: true, extractedNames: [], issues: [] });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `pnpm vitest run test/tools/`
Expected: FAIL — `sneq__validate_narration` isn't a known tool.

- [ ] **Step 3: Add the Zod schema + description**

Edit `src/tools/schemas.ts`:

```typescript
export const ToolNames = [
  "sneq__lookup_entity",
  "sneq__get_entity",
  "sneq__get_relevant_facts",
  "sneq__suggest_existing",
  "sneq__mention_entity",
  "sneq__register_fact",
  "sneq__add_constraint",
  "sneq__collapse_attribute",
  "sneq__set_scene",
  "sneq__advance_turn",
  "sneq__validate_narration"   // NEW
] as const;
```

In the `schemas` object, add:

```typescript
sneq__validate_narration: z.object({
  narration: z.string(),
  type: entityType.optional(),
  strict: z.boolean().optional()
}),
```

In `toolDescriptions`, add:

```typescript
sneq__validate_narration: "Validate a candidate narration string against the campaign canon. Returns the list of proper-noun candidates the regex extractor found, plus any that didn't resolve. Use BEFORE flushing narration to the player."
```

- [ ] **Step 4: Add the dispatcher case**

Edit `src/tools/dispatcher.ts`. First extend `ToolCallContext`:

```typescript
export interface ToolCallContext {
  // ...existing methods...
  validateNarration(input: { narration: string; type?: EntityType; strict?: boolean }): Promise<import("../hooks/narration-gate.js").ValidationReport>;
}
```

Add a new switch case before the closing brace:

```typescript
case "sneq__validate_narration":
  return ctx.validateNarration({
    narration: args["narration"] as string,
    ...(args["type"] !== undefined ? { type: args["type"] as EntityType } : {}),
    ...(args["strict"] !== undefined ? { strict: args["strict"] as boolean } : {})
  });
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `pnpm vitest run test/tools/`
Expected: PASS — new tool tests + all existing tool tests green.

- [ ] **Step 6: Commit**

```bash
git add src/tools/schemas.ts src/tools/dispatcher.ts test/tools
git commit -m "feat(tools): expose sneq__validate_narration as an LLM-callable tool"
```

---

## Task 16: E2E + Smoke Tests for New Commands

**Files:**
- Modify: `test/cli/e2e.test.ts`
- Modify: `test/cli/smoke.test.ts`

- [ ] **Step 1: Read the existing e2e + smoke tests to understand the pattern**

Run: `cat test/cli/e2e.test.ts test/cli/smoke.test.ts`

Mirror the existing setup (typically: create a temp db, init-campaign, run various commands, assert JSON shape on stdout).

- [ ] **Step 2: Add e2e cases for the 3 new commands**

At the end of `test/cli/e2e.test.ts`, mirroring the existing `it()` style:

```typescript
it("campaign-exists returns false for an uninitialized campaign", async () => {
  const { db } = await mkTempDb();
  const result = await runCli(["campaign-exists", "--db", db, "--campaign", "ghost"]);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ exists: false });
});

it("campaign-exists returns true after init-campaign", async () => {
  const { db } = await mkTempDb();
  await runCli(["init-campaign", "--db", db, "--campaign", "c1", "--args", '{"name":"Test"}']);
  const result = await runCli(["campaign-exists", "--db", db, "--campaign", "c1"]);
  expect(result.exitCode).toBe(0);
  const parsed = JSON.parse(result.stdout);
  expect(parsed.exists).toBe(true);
  expect(parsed.name).toBe("Test");
});

it("prepare-turn returns scene:null on a fresh campaign", async () => {
  const { db } = await mkTempDb();
  await runCli(["init-campaign", "--db", db, "--campaign", "c1", "--args", '{"name":"Test"}']);
  const result = await runCli(["prepare-turn", "--db", db, "--campaign", "c1"]);
  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toEqual({ scene: null, presentEntities: [] });
});

it("validate-narration on an empty campaign flags unknown names", async () => {
  const { db } = await mkTempDb();
  await runCli(["init-campaign", "--db", db, "--campaign", "c1", "--args", '{"name":"Test"}']);
  const result = await runCli([
    "validate-narration", "--db", db, "--campaign", "c1",
    "--args", JSON.stringify({ narration: "Cassius arrive." })
  ]);
  expect(result.exitCode).toBe(0);
  const r = JSON.parse(result.stdout);
  expect(r.extractedNames).toContain("Cassius");
});
```

> Tip: `mkTempDb` and `runCli` are existing helpers in the e2e file. If they have different names in your repo, mirror what's actually there.

- [ ] **Step 3: Add smoke entries**

In `test/cli/smoke.test.ts`, add a smoke test that runs the binary against `--help` and asserts the 3 new commands appear:

```typescript
it("smoke: --help mentions all 15 commands", async () => {
  const result = execSync(`node ${distCliPath} --help`, { encoding: "utf8" });
  for (const cmd of ["validate-narration", "prepare-turn", "campaign-exists"]) {
    expect(result).toContain(cmd);
  }
});
```

- [ ] **Step 4: Run all tests and verify they pass**

Run: `pnpm test`
Expected: PASS — all unit + e2e + smoke tests green.

- [ ] **Step 5: Commit**

```bash
git add test/cli/e2e.test.ts test/cli/smoke.test.ts
git commit -m "test(cli): e2e + smoke coverage for validate-narration, prepare-turn, campaign-exists"
```

---

## Task 17: Regenerate Docs + Update README

**Files:**
- Modify: `docs/api.md` (auto-generated via `pnpm docs`)
- Modify: `README.md`

- [ ] **Step 1: Regenerate API docs**

Run: `pnpm docs`
Expected: `docs/api.md` updates to reflect the new `validateNarration`, `prepareTurn`, `registerNarrationGate` methods on `CampaignContext` + the new `NarrationGateHook` types.

- [ ] **Step 2: Update README CLI section**

Open `README.md`. Find the section "CLI usage (out-of-process consumers)" and update the inventory line. Currently:

> - 12 commands: the 10 tool dispatcher entries (`lookup-entity`, `get-entity`, ...) plus two conveniences (`init-campaign`, `get-scene`).

Change to:

> - 15 commands: the 10 tool dispatcher entries (`lookup-entity`, `get-entity`, `get-relevant-facts`, `suggest-existing`, `mention-entity`, `register-fact`, `add-constraint`, `collapse-attribute`, `set-scene`, `advance-turn`) plus three conveniences (`init-campaign`, `get-scene`, `campaign-exists`), one defensive validation command (`validate-narration`), and one orchestration command (`prepare-turn`).
>
> - Full spec: [`docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md`](docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md).

Also add a short usage block after the existing CLI examples:

```bash
# Probe whether a campaign is initialized (no throw on missing)
sneq-engine campaign-exists --db ./campaign.db --campaign sang-artemis

# Atomic wake-up bundle: scene + present entities + their facts in one call
sneq-engine prepare-turn --db ./campaign.db --campaign sang-artemis

# Validate a candidate narration before flushing to the player
sneq-engine validate-narration --db ./campaign.db --campaign sang-artemis \
  --args '{"narration":"Anya rejoint Jean à Dragonsreach.","strict":true}'
```

- [ ] **Step 3: Verify the build + all tests one last time**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: All green. Build emits `dist/cli.js`.

- [ ] **Step 4: Commit**

```bash
git add docs/api.md README.md
git commit -m "docs: README + api.md for defensive features (15-command CLI)"
```

---

## Self-Review

**Spec coverage check** — every spec section has a task:

| Spec section | Task(s) |
|---|---|
| §3.2 row: `src/resolver/resolver.ts` | Task 9 |
| §3.2 row: `src/hooks/narration-gate.ts` | Task 1 |
| §3.2 row: `src/core/validate-narration.ts` | Tasks 3, 4, 5, 6 |
| §3.2 row: `src/campaign.ts` | Task 8 |
| §3.2 row: `src/engine.ts` | Task 8 |
| §3.2 row: `src/cli/types.ts` | Task 10 |
| §3.2 row: `src/cli/run.ts` | Tasks 11, 12, 13 |
| §3.2 row: `src/cli/help.ts` | Task 14 |
| §3.2 row: `src/tools/schemas.ts` | Task 15 |
| §3.2 row: `src/tools/dispatcher.ts` | Task 15 |
| §4 (validate-narration pipeline) | Tasks 3–6 |
| §5 (prepare-turn) | Tasks 8, 12 |
| §6 (campaign-exists) | Task 11 |
| §7 (NarrationGateHook) | Tasks 1, 8 |
| §8 (notFoundReason) | Task 9 |
| §9 (testing layout) | Tasks 1–17 inline |
| Repository extension (topEntities) — needed by §4.3 stage 3 | Task 7 (implicit) |

**Type consistency** (spot-check):
- `ValidationReport` defined Task 1, used in Tasks 6, 8, 13, 15 — same shape.
- `NarrationGateContext` extended in Task 8 (adds `repo: Repository`); consistent thereafter.
- `Validator` constructor signature stable across Tasks 3–6.
- `ResolutionResult.notFoundReason` shape matches between Task 9 derivation and Task 13 CLI passthrough.

**Placeholder scan** — no "TBD", "TODO", or "implement later" in the plan. Every step has runnable code or a runnable command.

**Order of operations** — task dependencies form a DAG:

```
T1 (gate types) ──┐
T2 (stopwords) ───┼──▶ T3 (extract) ─▶ T4 (resolve) ─▶ T5 (llm) ─▶ T6 (assemble + default hook)
                  │                                                            │
                  │                                                            ▼
                  │                                                T7 (repo.topEntities)
                  │                                                            │
                  │                                                            ▼
                  └─────────────────────────────────────────────────▶ T8 (wire engine + campaign)
                                                                              │
                                                                              ▼
                                  T9 (notFoundReason — independent, can run anytime) ─┐
                                                                              │      │
                                  T10 (KNOWN_COMMANDS) ─▶ T11 ─▶ T12 ─▶ T13 ─▶ T14 ─▶ T15 ─▶ T16 ─▶ T17
```

Tasks 1–8 are the core engine layer; Task 9 is independent (can interleave); Tasks 10–17 are the CLI + tool surfacing + docs.

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-05-21-sneq-defensive-features.md`.
