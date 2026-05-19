import type { EngineConfig } from "./config.js";
import type { Repository, CampaignMeta } from "./repository/interface.js";
import { Router, createDefaultDeps } from "./router/router.js";
import { Resolver, type Embedder } from "./resolver/resolver.js";
import { UserPromptRegistry } from "./hooks/user-prompt.js";
import { PreGenerationRegistry } from "./hooks/pre-generation.js";
import { CampaignContext } from "./campaign.js";
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

export class Engine {
  private readonly repo: Repository;
  private readonly router: Router;
  private readonly resolver: Resolver;
  private readonly userPrompt = new UserPromptRegistry();
  private readonly preGen = new PreGenerationRegistry();
  private readonly logger: Logger;
  private readonly contexts = new Map<string, CampaignContext>();

  private readonly embedder: Embedder;

  constructor(cfg: EngineConfig) {
    this.repo = cfg.repository;
    this.router = new Router(cfg.router, cfg._routerDeps ?? createDefaultDeps());
    this.logger = cfg.logger ?? noopLogger;
    this.embedder = {
      embed: async (text: string) => {
        const r = await this.router.embed({ texts: [text] });
        return r.vectors[0]!;
      }
    };
    this.resolver = new Resolver({
      repo: this.repo, router: this.router, embedder: this.embedder,
      userPromptRegistry: this.userPrompt,
      ...(cfg.resolver !== undefined ? { thresholds: cfg.resolver } : {})
    });
  }

  campaign(id: CampaignId): CampaignContext {
    const cached = this.contexts.get(id);
    if (cached) return cached;
    const ctx = new CampaignContext({
      campaignId: id, repo: this.repo, router: this.router, resolver: this.resolver,
      embedder: this.embedder,
      userPrompt: this.userPrompt, preGen: this.preGen, logger: this.logger
    });
    this.contexts.set(id, ctx);
    return ctx;
  }

  async listCampaigns(): Promise<CampaignMeta[]> {
    return this.repo.listCampaigns();
  }

  async createCampaign(input: NewCampaignInput): Promise<CampaignContext> {
    await this.repo.createCampaign({
      id: input.id, name: input.name,
      createdAt: Date.now(),
      embeddingDim: input.embeddingDim
    });
    return this.campaign(input.id);
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    this.contexts.delete(id);
    return this.repo.deleteCampaign(id);
  }

  async close(): Promise<void> {
    return this.repo.close();
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
