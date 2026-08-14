import { describe, expect, it, vi } from "vitest";

import { repositoryAtomicWriteStrategy } from "../../src/atomic/repository-strategy.js";
import type { AtomicWriteStrategy, CreateEntityCommand, CreateEntityResult } from "../../src/atomic/types.js";
import { CampaignContext } from "../../src/campaign.js";
import { Engine } from "../../src/engine.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import { NarrationGateRegistry } from "../../src/hooks/narration-gate.js";
import { PreGenerationRegistry } from "../../src/hooks/pre-generation.js";
import { UserPromptRegistry } from "../../src/hooks/user-prompt.js";
import { noopLogger } from "../../src/logger.js";
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import type { RepositoryAccess } from "../../src/repository/interface.js";
import { Resolver } from "../../src/resolver/resolver.js";
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
    addConstraint: vi.fn(async (command) => ({ constraintId: command.constraintId })),
    createEntity: vi.fn(async (command) => ({
      status: "created" as const,
      entityId: command.candidate.id,
      isNew: true as const,
    })),
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

  it("preserves direct CampaignContext construction with a transactional repository", async () => {
    const campaignId = asCampaignId("direct-context");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({
      id: campaignId,
      name: "Direct",
      createdAt: 0,
      embeddingDim: 0,
    });
    const router = new Router(routerConfig, routerDeps);
    const userPrompt = new UserPromptRegistry();
    const campaign = new CampaignContext({
      campaignId,
      repo: repository,
      router,
      resolver: new Resolver({
        repo: repository,
        router,
        embedder: null,
        userPromptRegistry: userPrompt,
      }),
      embedder: null,
      userPrompt,
      preGen: new PreGenerationRegistry(),
      narrationGate: new NarrationGateRegistry({
        async validate() {
          return { ok: true, extractedNames: [], issues: [] };
        },
      }),
      logger: noopLogger,
    });

    await expect(campaign.advanceTurn("one")).resolves.toEqual({ turnNumber: 1 });
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

  it("rejects createEntity when the candidate belongs to a different campaign than the command", async () => {
    const campaignId = asCampaignId("target");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Target", createdAt: 0, embeddingDim: 0 });
    await repository.createCampaign({ id: asCampaignId("other"), name: "Other", createdAt: 0, embeddingDim: 0 });
    const strategy = repositoryAtomicWriteStrategy(repository);

    await expect(strategy.createEntity({
      operationId: "op-mismatch",
      campaignId,
      expectedEntityRevision: 0,
      candidate: {
        campaignId: asCampaignId("other"),
        id: asEntityID("e-cross"),
        type: "PERSONNAGE",
        name: "Cross",
        nomConnu: true,
        aliases: [],
        tags: [],
        createdAt: 0,
        embedding: null,
        embeddingRefreshedAt: null,
      },
      identityKeys: ["cross"],
      force: false,
    })).rejects.toThrow(/campaign mismatch/i);

    // Neither campaign was mutated.
    expect(await repository.getEntity(asCampaignId("other"), asEntityID("e-cross"))).toBeNull();
    expect(await repository.entityRevision(campaignId)).toBe(0);
    expect(await repository.entityRevision(asCampaignId("other"))).toBe(0);
  });

  it("increments the entity revision when confirmation adds an alias", async () => {
    const campaignId = asCampaignId("confirm-revision");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Revision", createdAt: 0, embeddingDim: 0 });
    const entityId = await seedEntity(repository, campaignId);
    const strategy = repositoryAtomicWriteStrategy(repository);
    expect(await repository.entityRevision(campaignId)).toBe(1);

    await strategy.confirmEntityMatch({
      operationId: "op-confirm-revision",
      campaignId,
      entityId,
      mention: "the captain",
      type: "PERSONNAGE",
      observedAt: 10,
    });

    expect(await repository.entityRevision(campaignId)).toBe(2);
  });

  it("preserves both constraints when addConstraint runs concurrently", async () => {
    const campaignId = asCampaignId("constraint-concurrent");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Constraints", createdAt: 0, embeddingDim: 0 });
    const strategy = repositoryAtomicWriteStrategy(repository);

    await Promise.all([
      strategy.addConstraint({
        operationId: "op-a",
        campaignId,
        constraintId: "a" as never,
        entityId: asEntityID("captain"),
        attributeKey: "loyalty",
        rule: { type: "REGEX", pattern: "duke" },
        justification: "a",
        createdAt: 1,
      }),
      strategy.addConstraint({
        operationId: "op-b",
        campaignId,
        constraintId: "b" as never,
        entityId: asEntityID("captain"),
        attributeKey: "loyalty",
        rule: { type: "REGEX", pattern: "king" },
        justification: "b",
        createdAt: 2,
      }),
    ]);

    expect((await repository.getPotentialite(campaignId, asEntityID("captain"), "loyalty"))
      ?.contraintes.map((constraint) => String(constraint.id)).sort()).toEqual(["a", "b"]);
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
        timestamp: 0,
      },
    });
    await campaign.addConstraint({
      entityId,
      attributeKey: "loyalty",
      rule: { type: "REGEX", pattern: "duke|king" },
      justification: "politics",
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
    expect(strategy.addConstraint).toHaveBeenCalledWith(expect.objectContaining({
      campaignId,
      entityId,
      attributeKey: "loyalty",
      createdAt: expect.any(Number),
      constraintId: expect.any(String),
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
      strategy.addConstraint,
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

  it("keeps one operation ID across a stale create retry", async () => {
    const campaignId = asCampaignId("retry-op");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Retry", createdAt: 0, embeddingDim: 0 });
    const base = injectedStrategy();
    const createEntity = vi.fn(async (command: CreateEntityCommand): Promise<CreateEntityResult> => ({
      status: "created",
      entityId: command.candidate.id,
      isNew: true,
    }));
    createEntity.mockResolvedValueOnce({ status: "stale" });
    const engine = new Engine({
      repository,
      router: routerConfig,
      _routerDeps: routerDeps,
      writeStrategy: { ...base, createEntity },
    });
    const campaign = engine.campaign(campaignId);

    await expect(campaign.mentionEntity({
      canonicalName: "Roric",
      type: "PERSONNAGE",
      description: "Captain",
    })).resolves.toMatchObject({ isNew: true });

    expect(createEntity).toHaveBeenCalledTimes(2);
    const first = createEntity.mock.calls[0]![0];
    const second = createEntity.mock.calls[1]![0];
    expect(second.operationId).toBe(first.operationId);
    expect(second.candidate.id).toBe(first.candidate.id);
    expect(second.candidate.createdAt).toBe(first.candidate.createdAt);
  });

  it("throws after three stale entity revisions without changing operation ID", async () => {
    const campaignId = asCampaignId("retry-exhausted");
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Exhausted", createdAt: 0, embeddingDim: 0 });
    const base = injectedStrategy();
    const createEntity = vi.fn(async (_command: CreateEntityCommand) => ({ status: "stale" as const }));
    const engine = new Engine({
      repository,
      router: routerConfig,
      _routerDeps: routerDeps,
      writeStrategy: { ...base, createEntity },
    });
    const campaign = engine.campaign(campaignId);

    await expect(campaign.mentionEntity({
      canonicalName: "Roric",
      type: "PERSONNAGE",
      description: "Captain",
    })).rejects.toMatchObject({
      name: "SneqConcurrentEntityCreationError",
      campaignId,
      attempts: 3,
    });
    expect(createEntity).toHaveBeenCalledTimes(3);
    expect(new Set(createEntity.mock.calls.map(([command]) => command.operationId)).size).toBe(1);
  });
});
