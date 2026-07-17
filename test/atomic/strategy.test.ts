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
    confirmEntityMatch: vi.fn(async (command) => ({
      entityId: command.entityId,
      aliasAdded: true,
    })),
  };
}

async function seedEntity(
  repository: InMemoryRepository,
  campaignId: ReturnType<typeof asCampaignId>,
) {
  const entityId = asEntityID("captain");
  await repository.upsertEntity({
    campaignId,
    id: entityId,
    type: "PERSONNAGE",
    name: "Roric",
    description: "Capitaine",
    nomConnu: true,
    aliases: [],
    tags: [],
    createdAt: 0,
    embedding: null,
    embeddingRefreshedAt: null,
  });
  return entityId;
}

describe("atomic write strategy selection", () => {
  it("keeps Repository.transaction as the historical write strategy", async () => {
    const campaignId = asCampaignId("legacy");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Legacy", createdAt: 0, embeddingDim: 0 });
    const transaction = vi.spyOn(repository, "transaction");

    const strategy = repositoryAtomicWriteStrategy(repository);
    await expect(strategy.advanceTurn({
      operationId: "op-legacy-turn",
      campaignId,
      summary: "one",
      createdAt: 1,
    }))
      .resolves.toEqual({ turnNumber: 1 });

    expect(transaction).toHaveBeenCalledOnce();
    expect(await repository.latestTurn(campaignId)).toMatchObject({ turnNumber: 1, summary: "one" });
  });

  it("confirms an entity match inside Repository.transaction", async () => {
    const campaignId = asCampaignId("confirm-transaction");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({
      id: campaignId,
      name: "Confirm",
      createdAt: 0,
      embeddingDim: 0,
    });
    const entityId = await seedEntity(repository, campaignId);
    const transaction = vi.spyOn(repository, "transaction");
    const strategy = repositoryAtomicWriteStrategy(repository);

    await expect(strategy.confirmEntityMatch({
      operationId: "op-confirm",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 10,
    })).resolves.toEqual({ entityId, aliasAdded: true });

    expect(transaction).toHaveBeenCalledOnce();
  });

  it("preserves both aliases when confirmations run concurrently", async () => {
    const campaignId = asCampaignId("confirm-concurrent");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({
      id: campaignId,
      name: "Concurrent",
      createdAt: 0,
      embeddingDim: 0,
    });
    const entityId = await seedEntity(repository, campaignId);
    const strategy = repositoryAtomicWriteStrategy(repository);

    await Promise.all([
      strategy.confirmEntityMatch({
        operationId: "op-confirm-captain",
        campaignId,
        entityId,
        mention: "the captain",
        type: "PERSONNAGE",
        observedAt: 10,
      }),
      strategy.confirmEntityMatch({
        operationId: "op-confirm-commander",
        campaignId,
        entityId,
        mention: "guard commander",
        type: "PERSONNAGE",
        observedAt: 11,
      }),
    ]);

    expect((await repository.getEntity(campaignId, entityId))?.aliases
      .map((alias) => alias.text)
      .sort()).toEqual(["guard commander", "the captain"]);
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
    await campaign.confirmEntityMatch({
      mention: "the captain",
      entityId,
      type: "PERSONNAGE",
    });

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
    expect(strategy.confirmEntityMatch).toHaveBeenCalledWith(expect.objectContaining({
      campaignId,
      entityId,
      mention: "the captain",
      type: "PERSONNAGE",
      observedAt: expect.any(Number),
    }));

    for (const method of [
      strategy.registerFact,
      strategy.setScene,
      strategy.advanceTurn,
      strategy.confirmEntityMatch,
    ]) {
      expect(method).toHaveBeenCalledWith(expect.objectContaining({
        operationId: expect.stringMatching(/^op_/),
        campaignId,
      }));
    }
  });
});
