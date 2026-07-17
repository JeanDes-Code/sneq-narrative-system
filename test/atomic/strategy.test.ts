import { describe, expect, it, vi } from "vitest";

import { repositoryAtomicWriteStrategy } from "../../src/atomic/repository-strategy.js";
import type { AtomicWriteStrategy } from "../../src/atomic/types.js";
import { Engine } from "../../src/engine.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import type { RepositoryAccess } from "../../src/repository/interface.js";
import type { ChatRequest, EmbeddingRequest, Provider, ProviderRef, RouterConfig } from "../../src/router/interface.js";
import { Router } from "../../src/router/router.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat(_request: ChatRequest) {
    return { text: "", toolCalls: [], modelUsed: ref.model, providerUsed: "custom" };
  },
  async embed(_request: EmbeddingRequest) {
    return { vectors: [new Float32Array([1])], dim: 1, modelUsed: ref.model, providerUsed: "custom" };
  },
};
const routerConfig: RouterConfig = {
  tiers: {
    heavy: { primary: ref, fallbacks: [] },
    light: { primary: ref, fallbacks: [] },
  },
};
const routerDeps = { resolveProvider: () => provider };

function injectedStrategy(): AtomicWriteStrategy {
  return {
    registerFact: vi.fn(async () => ({ factId: null, contradictions: [] })),
    setScene: vi.fn(async () => ({ sceneId: "s1" as never, turnNumber: 1 })),
    advanceTurn: vi.fn(async () => ({ turnNumber: 1 })),
  };
}

describe("atomic write strategy selection", () => {
  it("keeps Repository.transaction as the historical write strategy", async () => {
    const campaignId = asCampaignId("legacy");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Legacy", createdAt: 0, embeddingDim: 0 });
    const transaction = vi.spyOn(repository, "transaction");

    const strategy = repositoryAtomicWriteStrategy(repository);
    await expect(strategy.advanceTurn({ campaignId, summary: "one", createdAt: 1 }))
      .resolves.toEqual({ turnNumber: 1 });

    expect(transaction).toHaveBeenCalledOnce();
    expect(await repository.latestTurn(campaignId)).toMatchObject({ turnNumber: 1, summary: "one" });
  });

  it("rejects a repository without transaction when no strategy is supplied", () => {
    expect(() => new Engine({
      repository: {} as RepositoryAccess,
      router: routerConfig,
      _routerDeps: routerDeps,
    })).toThrow(/requires EngineConfig\.writeStrategy/i);
  });

  it("accepts an injected strategy and reuses an injected Router by identity", () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const router = new Router(routerConfig, routerDeps);
    const engine = new Engine({
      repository,
      router: routerConfig,
      routerInstance: router,
      writeStrategy: injectedStrategy(),
    });

    expect(engine.routerClient()).toBe(router);
  });

  it("delegates every transactional campaign write to the injected strategy", async () => {
    const campaignId = asCampaignId("atomic");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const strategy = injectedStrategy();
    const engine = new Engine({
      repository,
      router: routerConfig,
      _routerDeps: routerDeps,
      writeStrategy: strategy,
    });
    const campaign = await engine.createCampaign({ id: campaignId, name: "Atomic", embeddingDim: 0 });
    const entityId = asEntityID("e1");

    await campaign.registerFact({
      entityId,
      attributeKey: "role",
      value: { type: "STRING", value: "allié" },
      category: "SOCIAL",
      observation: {
        source: "GM_NARRATION",
        method: "DIALOGUE_DIRECT",
        fiabilite: "CERTAINE",
        timestamp: 0,
      },
    });
    await campaign.setScene({
      locationEntityId: entityId,
      presentEntityIds: [],
      description: "La forge",
    });
    await campaign.advanceTurn("suite");

    expect(strategy.registerFact).toHaveBeenCalledWith(expect.objectContaining({
      campaignId,
      entityId,
      attributeKey: "role",
    }));
    expect(strategy.setScene).toHaveBeenCalledWith(expect.objectContaining({
      campaignId,
      description: "La forge",
    }));
    expect(strategy.advanceTurn).toHaveBeenCalledWith(expect.objectContaining({
      campaignId,
      summary: "suite",
    }));
  });
});
