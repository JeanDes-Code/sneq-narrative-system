import { bootstrapCampaign } from "./atomic/bootstrap.js";
import { repositoryAtomicWriteStrategy } from "./atomic/repository-strategy.js";
import type { AtomicWriteStrategy } from "./atomic/types.js";
import type { EngineConfig } from "./config.js";
import type { Repository, RepositoryAccess, CampaignMeta } from "./repository/interface.js";
import { Router, createDefaultDeps } from "./router/router.js";
import { Resolver, type Embedder } from "./resolver/resolver.js";
import { UserPromptRegistry } from "./hooks/user-prompt.js";
import { PreGenerationRegistry } from "./hooks/pre-generation.js";
import { NarrationGateRegistry } from "./hooks/narration-gate.js";
import { defaultNarrationGateHook } from "./core/validate-narration.js";
import { CampaignContext } from "./campaign.js";
import { CampaignLifecycle } from "./campaign-lifecycle.js";
import { SneqCampaignContextInvalidatedError } from "./errors.js";
import { defaultRouterConfig } from "./router/defaults.js";
import { noopLogger, type Logger } from "./logger.js";
import type { CampaignId } from "./domain/ids.js";
import { genericTools, anthropicTools, openAITools, geminiTools } from "./tools/adapters.js";
import { jsonSchemas } from "./tools/json-schema.js";
import { schemas as zodSchemas } from "./tools/schemas.js";

export interface NewCampaignInput {
  id: CampaignId;
  name: string;
  embeddingDim: number;
}

interface CachedCampaignContext {
  context: CampaignContext;
  lifecycle: CampaignLifecycle;
}

export class Engine {
  private readonly repo: RepositoryAccess;
  private readonly router: Router;
  private readonly writes: AtomicWriteStrategy;
  private readonly resolver: Resolver;
  private readonly userPrompt = new UserPromptRegistry();
  private readonly preGen = new PreGenerationRegistry();
  private readonly narrationGate = new NarrationGateRegistry(defaultNarrationGateHook);
  private readonly logger: Logger;
  private readonly contexts = new Map<string, CachedCampaignContext>();
  private readonly deletingCampaignIds = new Set<string>();
  /** Lifecycle mutations (create/delete) in progress; close() drains these before shutting the repo. */
  private readonly inFlight = new Set<Promise<unknown>>();
  private closed = false;
  private closePromise: Promise<void> | null = null;

  private readonly embedder: Embedder | null;

  constructor(cfg: EngineConfig) {
    this.repo = cfg.repository;
    this.router = cfg.routerInstance ?? new Router(cfg.router, cfg._routerDeps ?? createDefaultDeps());
    if (cfg.writeStrategy) {
      this.writes = cfg.writeStrategy;
    } else {
      const candidate = cfg.repository as Partial<Repository>;
      if (typeof candidate.transaction !== "function") {
        throw new Error("repository without transaction requires EngineConfig.writeStrategy");
      }
      this.writes = repositoryAtomicWriteStrategy(candidate as Repository);
    }
    this.logger = cfg.logger ?? noopLogger;
    this.preGen.setErrorHandler(err => this.logger.warn("pregen-hook error", { err: String(err) }));
    // No embeddings tier configured → keyless / alias-only mode: the resolver
    // degrades gracefully and mentioned entities are stored without vectors.
    this.embedder = this.router.hasEmbeddings()
      ? {
          embed: async (text: string) => {
            const r = await this.router.embed({ texts: [text] });
            return r.vectors[0]!;
          }
        }
      : null;
    this.resolver = new Resolver({
      repo: this.repo, router: this.router, embedder: this.embedder,
      userPromptRegistry: this.userPrompt,
      ...(cfg.resolver !== undefined ? { thresholds: cfg.resolver } : {})
    });
  }

  private assertOpen(): void {
    if (this.closed) throw new Error("engine is closed");
  }

  /** Track a lifecycle operation so close() can await it before shutting the repo. */
  private track<T>(factory: () => Promise<T>): Promise<T> {
    const op = factory();
    // Never rejects, so it can't surface as an unhandled rejection while close() waits on it.
    const tracked = op.then(() => undefined, () => undefined)
      .finally(() => { this.inFlight.delete(tracked); });
    this.inFlight.add(tracked);
    return op;
  }

  private contextFor(id: CampaignId): CampaignContext {
    const cached = this.contexts.get(id);
    if (cached) return cached.context;
    const lifecycle = new CampaignLifecycle(id);
    const context = new CampaignContext({
      campaignId: id, repo: this.repo, router: this.router, resolver: this.resolver,
      writeStrategy: this.writes, embedder: this.embedder,
      userPrompt: this.userPrompt, preGen: this.preGen,
      narrationGate: this.narrationGate, logger: this.logger,
      lifecycle
    });
    this.contexts.set(id, { context, lifecycle });
    return context;
  }

  campaign(id: CampaignId): CampaignContext {
    this.assertOpen();
    if (this.deletingCampaignIds.has(id)) {
      throw new SneqCampaignContextInvalidatedError(id, "deleting");
    }
    return this.contextFor(id);
  }

  async listCampaigns(): Promise<CampaignMeta[]> {
    this.assertOpen();
    return this.repo.listCampaigns();
  }

  async createCampaign(input: NewCampaignInput): Promise<CampaignContext> {
    this.assertOpen();
    if (this.deletingCampaignIds.has(input.id)) {
      throw new SneqCampaignContextInvalidatedError(input.id, "deleting");
    }
    // Once the repository has durably created the campaign, always hand back a
    // context — never re-run assertOpen(), or a close() racing the write would
    // reject a call that actually committed, leaving the caller unable to retry
    // (the campaign now exists). close() drains this via inFlight before shutting down.
    return this.track(async () => {
      await this.repo.createCampaign({
        id: input.id, name: input.name,
        createdAt: Date.now(),
        embeddingDim: input.embeddingDim
      });
      // §2.3 bootstrap (decided at #15/#26): default realm entity, default
      // group, default dispatch rules — the baseline is a world that talks.
      await bootstrapCampaign(this.repo, input.id);
      return this.contextFor(input.id);
    });
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    this.assertOpen();
    if (this.deletingCampaignIds.has(id)) {
      throw new SneqCampaignContextInvalidatedError(id, "deleting");
    }
    return this.track(async () => {
      const cached = this.contexts.get(id);
      this.deletingCampaignIds.add(id);
      cached?.lifecycle.beginDelete();
      try {
        await this.repo.deleteCampaign(id);
        cached?.lifecycle.deletionSucceeded();
        this.contexts.delete(id);
      } catch (error) {
        cached?.lifecycle.deletionFailed();
        throw error;
      } finally {
        this.deletingCampaignIds.delete(id);
      }
    });
  }

  async close(): Promise<void> {
    // A single shared promise so concurrent/retried callers all await the same
    // shutdown instead of returning early while the repository is mid-close.
    if (this.closePromise) return this.closePromise;
    this.closePromise = (async () => {
      this.closed = true; // stop accepting new work; in-flight ops already tracked
      await Promise.allSettled([...this.inFlight]);
      for (const cached of this.contexts.values()) cached.lifecycle.close();
      await this.repo.close();
    })();
    return this.closePromise;
  }

  routerClient(): Router {
    return this.router;
  }

  static defaultRouterConfig() { return defaultRouterConfig(); }

  static readonly tools = {
    zod: zodSchemas,
    jsonSchema: jsonSchemas,
    generic: genericTools(),
    anthropic: anthropicTools(),
    openai: openAITools(),
    gemini: geminiTools()
  } as const;
}
