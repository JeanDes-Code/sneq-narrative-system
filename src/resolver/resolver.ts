import type { RepositoryAccess } from "../repository/interface.js";
import type { Router } from "../router/router.js";
import type { UserPromptRegistry } from "../hooks/user-prompt.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId } from "../domain/ids.js";
import { defaultThresholds, type ResolverThresholds } from "./thresholds.js";
import { normalizeAlias } from "./normalize.js";
import { judgeMatch, type JudgeResult } from "./judge.js";

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export interface ResolverDeps {
  repo: RepositoryAccess;
  router: Router;
  /** null = degraded alias-only mode (no embeddings provider configured). */
  embedder: Embedder | null;
  userPromptRegistry: UserPromptRegistry;
  thresholds?: Partial<ResolverThresholds>;
}

export interface ResolveOptions {
  campaignId: CampaignId;
  mention: string;
  type?: EntityType;
  sceneDescription?: string;
}

export interface ResolutionResult {
  match: Entity | null;
  confidence: number;
  candidates: Entity[];
  layerUsed: "alias" | "vector" | "judge" | "user-prompt" | "none";
  reasoning?: string;
  notFoundReason?: "no-match" | "below-threshold" | "ambiguous";
  unavailableReason?: "embeddings" | "vector-search";
}

export interface SuggestionResult {
  candidates: Entity[];
  recommendsNew: boolean;
}

export class Resolver {
  private readonly t: ResolverThresholds;

  constructor(private readonly deps: ResolverDeps) {
    this.t = { ...defaultThresholds, ...(deps.thresholds ?? {}) };
  }

  async resolveEntity(opts: ResolveOptions): Promise<ResolutionResult> {
    const make = (partial: Omit<ResolutionResult, "notFoundReason">): ResolutionResult => {
      const reason = deriveNotFoundReason(
        partial.match,
        partial.layerUsed,
        partial.candidates,
        partial.confidence,
        this.t.tauLow,
        partial.unavailableReason,
      );
      return reason === undefined ? partial : { ...partial, notFoundReason: reason };
    };

    const { campaignId, mention, type, sceneDescription = "" } = opts;

    // L1: alias
    const aliasHits = await this.deps.repo.findEntitiesByAlias(campaignId, normalizeAlias(mention), type);
    if (aliasHits.length === 1) {
      return make({ match: aliasHits[0]!, confidence: 0.95, candidates: aliasHits, layerUsed: "alias" });
    }
    if (aliasHits.length > 1) {
      const j = await this.safeJudge({ mention, sceneDescription, candidates: aliasHits });
      const matched = j.matchedIndex !== null ? aliasHits[j.matchedIndex] ?? null : null;
      return make({ match: matched, confidence: j.confidence, candidates: aliasHits, layerUsed: "judge", reasoning: j.reasoning });
    }

    // L2: vector — requires an embedder; without one, degrade to alias-only.
    if (!this.deps.embedder) {
      return make({ match: null, confidence: 0, candidates: [], layerUsed: "none" });
    }
    let vec: Float32Array;
    try {
      vec = await this.deps.embedder.embed(mention);
    } catch {
      return make({
        match: null,
        confidence: 0,
        candidates: [],
        layerUsed: "none",
        unavailableReason: "embeddings",
      });
    }
    const opts2: import("../repository/interface.js").VectorSearchOpts = type
      ? { topK: this.t.topK, filterType: type }
      : { topK: this.t.topK };
    let hits: import("../repository/interface.js").EntityWithScore[];
    try {
      hits = await this.deps.repo.searchEntitiesByVector(campaignId, vec, opts2);
    } catch {
      return make({
        match: null,
        confidence: 0,
        candidates: [],
        layerUsed: "none",
        unavailableReason: "vector-search",
      });
    }
    if (hits.length === 0) {
      return make({ match: null, confidence: 0, candidates: [], layerUsed: "none" });
    }
    const top1 = hits[0]!;
    if (top1.score < this.t.tauLow) {
      return make({ match: null, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" });
    }
    const top2 = hits[1];
    const gap = top2 ? top1.score - top2.score : 1;
    if (top1.score >= this.t.tauHigh && gap >= this.t.gapDelta) {
      return make({ match: top1.entity, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" });
    }

    // L3: judge
    const j = await this.safeJudge({ mention, sceneDescription, candidates: hits.map(h => h.entity) });
    if (j.matchedIndex !== null) {
      return make({
        match: hits[j.matchedIndex]?.entity ?? null,
        confidence: j.confidence,
        candidates: hits.map(h => h.entity),
        layerUsed: "judge",
        reasoning: j.reasoning
      });
    }

    // L4: user prompt
    if (this.deps.userPromptRegistry.hasHandler()) {
      const chosen = await this.deps.userPromptRegistry.ask({ mention, candidates: hits.map(h => h.entity) });
      return make({
        match: chosen,
        confidence: chosen ? 0.9 : 0,
        candidates: hits.map(h => h.entity),
        layerUsed: "user-prompt"
      });
    }

    return make({ match: null, confidence: j.confidence, candidates: hits.map(h => h.entity), layerUsed: "judge", reasoning: j.reasoning });
  }

  async suggestExisting(opts: { campaignId: CampaignId; mention: string; type: EntityType }): Promise<SuggestionResult> {
    if (!this.deps.embedder) {
      const hits = await this.deps.repo.findEntitiesByAlias(opts.campaignId, normalizeAlias(opts.mention), opts.type);
      return { candidates: hits, recommendsNew: hits.length === 0 };
    }
    const vec = await this.deps.embedder.embed(opts.mention);
    const hits = await this.deps.repo.searchEntitiesByVector(opts.campaignId, vec, { topK: this.t.topK, filterType: opts.type });
    const top = hits[0];
    const recommendsNew = !top || top.score < this.t.tauLow;
    return { candidates: hits.map(h => h.entity), recommendsNew };
  }

  /** The judge must never take the resolver down: provider failures degrade to
   *  an ambiguous non-match so the caller can adjudicate instead of crashing. */
  private async safeJudge(args: { mention: string; sceneDescription: string; candidates: Entity[] }): Promise<JudgeResult> {
    try {
      return await judgeMatch(this.deps.router, args);
    } catch (e) {
      return {
        matchedIndex: null, confidence: 0,
        reasoning: `judge unavailable: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }
}

function deriveNotFoundReason(
  match: Entity | null,
  layerUsed: ResolutionResult["layerUsed"],
  candidates: Entity[],
  confidence: number,
  tauLow: number,
  unavailableReason?: ResolutionResult["unavailableReason"],
): ResolutionResult["notFoundReason"] {
  if (match !== null) return undefined;
  if (unavailableReason !== undefined) return "ambiguous";
  if (layerUsed === "none" || candidates.length === 0) return "no-match";
  if (layerUsed === "vector" && confidence < tauLow) return "below-threshold";
  return "ambiguous";
}
