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
