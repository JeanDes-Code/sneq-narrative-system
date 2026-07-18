import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { repositoryAtomicWriteStrategy } from "../src/atomic/repository-strategy.js";
import type { AtomicWriteStrategy } from "../src/atomic/types.js";
import { asCampaignId } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Repository } from "../src/repository/interface.js";
import type { Provider, ProviderRef } from "../src/router/interface.js";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("not used"); },
  async embed() { throw new Error("not used in keyless mode"); },
};

class TrackingMemoryRepository extends InMemoryRepository {
  insideTransaction = false;

  override transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    return super.transaction(async (tx) => {
      this.insideTransaction = true;
      try {
        return await fn(tx);
      } finally {
        this.insideTransaction = false;
      }
    });
  }
}

describe("CampaignContext mentionEntity concurrency", () => {
  it("makes the stale creator rerun resolution and converge on one canonical entity", async () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const base = repositoryAtomicWriteStrategy(repository);
    const bothReady = deferred();
    const release = deferred();
    let firstAttempts = 0;
    const strategy: AtomicWriteStrategy = {
      ...base,
      async createEntity(command) {
        firstAttempts += 1;
        if (firstAttempts <= 2) {
          if (firstAttempts === 2) bothReady.resolve();
          await release.promise;
        }
        return base.createEntity(command);
      },
    };
    const engine = new Engine({
      repository,
      writeStrategy: strategy,
      router: {
        tiers: {
          heavy: { primary: ref, fallbacks: [] },
          light: { primary: ref, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => provider },
    });
    const campaignId = asCampaignId("race");
    const campaign = await engine.createCampaign({ id: campaignId, name: "Race", embeddingDim: 0 });

    const first = campaign.mentionEntity({
      canonicalName: "Captain Roric",
      type: "PERSONNAGE",
      aliases: ["the captain"],
      description: "Captain of the guard",
    });
    const second = campaign.mentionEntity({
      canonicalName: "Captain Roric",
      type: "PERSONNAGE",
      aliases: ["the captain"],
      description: "Captain of the guard",
    });

    const reachedAtomicCreate = await Promise.race([
      bothReady.promise.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 50)),
    ]);
    expect(reachedAtomicCreate).toBe(true);
    release.resolve();
    const results = await Promise.all([first, second]);

    expect(new Set(results.map((result) => result.entityId)).size).toBe(1);
    expect(results.filter((result) => result.isNew)).toHaveLength(1);
    expect(await repository.findEntitiesByAlias(campaignId, "captain roric", "PERSONNAGE"))
      .toHaveLength(1);
    await engine.close();
  });

  it("keeps resolver and candidate embedding work outside repository transactions", async () => {
    const repository = new TrackingMemoryRepository({ embeddingDim: 3 });
    const embeddingRef: ProviderRef = {
      provider: "custom",
      apiKeyEnv: "_NOOP",
      model: "embedding-test",
      embeddingDim: 3,
    };
    let embeddingCalls = 0;
    const embeddingProvider: Provider = {
      ref: embeddingRef,
      async chat() { throw new Error("judge is not needed for an empty campaign"); },
      async embed() {
        expect(repository.insideTransaction).toBe(false);
        embeddingCalls += 1;
        return {
          vectors: [new Float32Array([1, 0, 0])],
          dim: 3,
          modelUsed: embeddingRef.model,
          providerUsed: "custom",
        };
      },
    };
    const engine = new Engine({
      repository,
      router: {
        tiers: {
          heavy: { primary: embeddingRef, fallbacks: [] },
          light: { primary: embeddingRef, fallbacks: [] },
          embeddings: { primary: embeddingRef, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => embeddingProvider },
    });
    const campaign = await engine.createCampaign({
      id: asCampaignId("outside-transaction"),
      name: "Outside transaction",
      embeddingDim: 3,
    });

    await expect(campaign.mentionEntity({
      canonicalName: "Aldric",
      type: "PERSONNAGE",
      description: "A smith",
    })).resolves.toMatchObject({ isNew: true });
    expect(embeddingCalls).toBeGreaterThanOrEqual(2);
    await engine.close();
  });
});
