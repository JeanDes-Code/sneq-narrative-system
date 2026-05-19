import type { Repository } from "../repository/interface.js";
import type { Router } from "../router/router.js";
import type { UserPromptRegistry } from "../hooks/user-prompt.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId } from "../domain/ids.js";
import { defaultThresholds, type ResolverThresholds } from "./thresholds.js";
import { normalizeAlias } from "./normalize.js";
import { judgeMatch } from "./judge.js";

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export interface ResolverDeps {
  repo: Repository;
  router: Router;
  embedder: Embedder;
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
    const { campaignId, mention, type, sceneDescription = "" } = opts;

    // L1: alias
    const aliasHits = await this.deps.repo.findEntitiesByAlias(campaignId, normalizeAlias(mention), type);
    if (aliasHits.length === 1) {
      return { match: aliasHits[0]!, confidence: 0.95, candidates: aliasHits, layerUsed: "alias" };
    }
    if (aliasHits.length > 1) {
      const j = await judgeMatch(this.deps.router, { mention, sceneDescription, candidates: aliasHits });
      const matched = j.matchedIndex !== null ? aliasHits[j.matchedIndex] ?? null : null;
      return { match: matched, confidence: j.confidence, candidates: aliasHits, layerUsed: "judge", reasoning: j.reasoning };
    }

    // L2: vector
    const vec = await this.deps.embedder.embed(mention);
    const opts2: import("../repository/interface.js").VectorSearchOpts = type
      ? { topK: this.t.topK, filterType: type }
      : { topK: this.t.topK };
    const hits = await this.deps.repo.searchEntitiesByVector(campaignId, vec, opts2);
    if (hits.length === 0) {
      return { match: null, confidence: 0, candidates: [], layerUsed: "none" };
    }
    const top1 = hits[0]!;
    if (top1.score < this.t.tauLow) {
      return { match: null, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" };
    }
    const top2 = hits[1];
    const gap = top2 ? top1.score - top2.score : 1;
    if (top1.score >= this.t.tauHigh && gap >= this.t.gapDelta) {
      return { match: top1.entity, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" };
    }

    // L3: judge
    const j = await judgeMatch(this.deps.router, { mention, sceneDescription, candidates: hits.map(h => h.entity) });
    if (j.matchedIndex !== null) {
      return {
        match: hits[j.matchedIndex]?.entity ?? null,
        confidence: j.confidence,
        candidates: hits.map(h => h.entity),
        layerUsed: "judge",
        reasoning: j.reasoning
      };
    }

    // L4: user prompt
    if (this.deps.userPromptRegistry.hasHandler()) {
      const chosen = await this.deps.userPromptRegistry.ask({ mention, candidates: hits.map(h => h.entity) });
      return {
        match: chosen,
        confidence: chosen ? 0.9 : 0,
        candidates: hits.map(h => h.entity),
        layerUsed: "user-prompt"
      };
    }

    return { match: null, confidence: j.confidence, candidates: hits.map(h => h.entity), layerUsed: "judge", reasoning: j.reasoning };
  }

  async suggestExisting(opts: { campaignId: CampaignId; mention: string; type: EntityType }): Promise<SuggestionResult> {
    const vec = await this.deps.embedder.embed(opts.mention);
    const hits = await this.deps.repo.searchEntitiesByVector(opts.campaignId, vec, { topK: this.t.topK, filterType: opts.type });
    const top = hits[0];
    const recommendsNew = !top || top.score < this.t.tauLow;
    return { candidates: hits.map(h => h.entity), recommendsNew };
  }
}
