import type { Resolver } from "../resolver/resolver.js";
import type { Router } from "../router/router.js";
import type {
  NarrationGateHook,
  NarrationGateInput,
  NarrationGateContext,
  ValidationReport
} from "../hooks/narration-gate.js";
import type { CampaignId } from "../domain/ids.js";
import type { Entity, EntityType } from "../domain/entity.js";
import { STOPWORDS } from "./stopwords.js";

interface LlmVerdict {
  noun: string;
  verdict: "typo" | "unknown";
  suggestion?: string;
  confidence?: number;
  reasoning?: string;
}

export interface ResolvedCandidate {
  noun: string;
  kind: "no-match" | "below-threshold" | "ambiguous";
  suggestions: {
    entityId: string;
    canonicalName: string;
    confidence: number;
  }[];
  llmReasoning?: string;
}

export interface ValidatorOptions {
  stopwords?: ReadonlySet<string>;
  topK?: number;
  llmCharBudget?: number;
}

const FRENCH_CONTRACTIONS = /^(l|d|n|s|m|t|j|c|qu)['’]/i;
const LLM_DEFAULT_CONFIDENCE = 0.6;
const FENCE_STRIP = /^```(?:json)?\s*|\s*```$/gi;

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

  /** Stage 2 — alias/vector/judge pass via existing resolver. */
  async resolvePass(
    campaignId: CampaignId,
    candidates: string[],
    type?: EntityType
  ): Promise<ResolvedCandidate[]> {
    const out: ResolvedCandidate[] = [];
    // Sequential await is intentional: each call may invoke the LLM judge.
    // Parallelising would multiply token cost with no ordering guarantee.
    for (const noun of candidates) {
      const r = await this.resolver.resolveEntity({
        campaignId,
        mention: noun,
        ...(type !== undefined ? { type } : {})
      });
      if (r.match !== null) {
        continue;
      }
      if (r.layerUsed === "none" || r.candidates.length === 0) {
        out.push({ noun, kind: "no-match", suggestions: [] });
        continue;
      }
      // layerUsed at this point is "vector" | "judge" | "user-prompt".
      // - "vector" with candidates below tauLow → "below-threshold" (Aldwyn→Alduin near-miss).
      // - "judge" with match=null → "ambiguous" (judge saw candidates but couldn't pick).
      // - "user-prompt" with match=null → "ambiguous" (user declined both candidates).
      //   Per spec §8.2, user-decline is classified ambiguous, not no-match.
      const kind: "below-threshold" | "ambiguous" =
        r.layerUsed === "vector" ? "below-threshold" : "ambiguous";
      // `confidence` here is the resolver's aggregate score, not per-candidate.
      // ResolutionResult.candidates is Entity[] (no per-entity score); same value for all.
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
      .map(e => `- ${String(e.id)}: ${e.name}`)
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
      const resp = await this.router.chat("light", {
        messages: [{ role: "user", content: prompt }]
      });
      raw = resp.text;
    } catch {
      return { candidates: resolved, partial: true };
    }

    // Light-tier models often wrap JSON in markdown code fences despite
    // instructions to the contrary. Strip them defensively before parsing.
    const stripped = raw.trim().replace(FENCE_STRIP, "").trim();

    let verdicts: LlmVerdict[];
    try {
      const parsed: unknown = JSON.parse(stripped);
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
        // If the LLM hallucinated a suggestion ID we don't recognise, leave
        // the candidate as no-match. Promoting to below-threshold with empty
        // suggestions would be a worse signal than the original verdict.
        if (!ent) return c;
        return {
          ...c,
          kind: "below-threshold" as const,
          suggestions: [{
            entityId: String(ent.id),
            canonicalName: ent.name,
            confidence: typeof v.confidence === "number" ? v.confidence : LLM_DEFAULT_CONFIDENCE
          }],
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

  /** Stage 4 — group + sort + report shape. */
  private assemble(extracted: string[], resolved: ResolvedCandidate[], partial: boolean): ValidationReport {
    // Sort: most-urgent kind first (no-match → ambiguous → below-threshold),
    // then highest confidence first within a kind.
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
    // resolvePass + topEntities are independent (one walks the resolver, the
    // other hits the repo). Fire in parallel — saves a round-trip in the
    // common-uncertain case where resolvePass invokes the LLM judge.
    const [resolved, top] = await Promise.all([
      this.resolvePass(campaignId, candidates, input.type),
      repo.topEntities(campaignId, this.topK)
    ]);
    const llmStage = await this.llmPass(campaignId, input.narration, resolved, top);
    return this.assemble(candidates, llmStage.candidates, llmStage.partial);
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

/**
 * Default `NarrationGateHook` implementation backed by the Validator. Engine
 * uses this as the registry fallback so a consumer that never registers a
 * custom hook still gets the built-in behavior.
 */
export const defaultNarrationGateHook: NarrationGateHook = {
  async validate(input, ctx) {
    const v = new Validator(ctx.resolver, ctx.router);
    return v.validate(input, ctx.campaignId, {
      topEntities: (cid, k) => ctx.repo.topEntities(cid, k)
    });
  }
};
