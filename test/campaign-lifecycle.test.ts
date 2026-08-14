import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { SneqCampaignContextInvalidatedError } from "../src/errors.js";
import { asCampaignId, asEntityID } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { CampaignId } from "../src/domain/ids.js";
import type { CampaignMeta } from "../src/repository/interface.js";
import type { Provider, ProviderRef, RouterConfig } from "../src/router/interface.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("provider must not run"); },
  async embed() { throw new Error("provider must not run"); },
};
const router: RouterConfig = {
  tiers: {
    heavy: { primary: ref, fallbacks: [] },
    light: { primary: ref, fallbacks: [] },
  },
};

function makeEngine(repository = new InMemoryRepository({ embeddingDim: 0 })) {
  return {
    repository,
    engine: new Engine({
      repository,
      router,
      _routerDeps: { resolveProvider: () => provider },
    }),
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const campaignId = asCampaignId("lifecycle");
const entityId = asEntityID("entity");

async function expectInvalid(operation: () => unknown | Promise<unknown>) {
  await expect(Promise.resolve().then(operation)).rejects.toBeInstanceOf(
    SneqCampaignContextInvalidatedError,
  );
}

describe("CampaignContext lifecycle", () => {
  it("permanently rejects a retained context after delete and allows a fresh context after recreation", async () => {
    const { engine } = makeEngine();
    const oldContext = await engine.createCampaign({ id: campaignId, name: "Old", embeddingDim: 0 });
    await oldContext.addConstraint({
      entityId,
      attributeKey: "loyalty",
      rule: { type: "DOIT_ETRE", valeurs: [{ type: "STRING", value: "duke" }] },
      justification: "seed verification",
    });

    await engine.deleteCampaign(campaignId);
    await expectInvalid(() => oldContext.addConstraint({
      entityId,
      attributeKey: "loyalty",
      rule: { type: "DOIT_ETRE", valeurs: [{ type: "STRING", value: "king" }] },
      justification: "must not resurrect",
    }));

    const fresh = await engine.createCampaign({ id: campaignId, name: "Fresh", embeddingDim: 0 });
    expect(fresh).not.toBe(oldContext);
    await expect(fresh.currentScene()).resolves.toBeNull();
    await expectInvalid(() => oldContext.currentScene());
    await engine.close();
  });

  it("rejects read, write, dispatch, and hook operations after Engine.close", async () => {
    const { engine } = makeEngine();
    const context = await engine.createCampaign({ id: campaignId, name: "Close", embeddingDim: 0 });
    await engine.close();

    const asyncOperations = [
      () => context.resolveEntity({ mention: "Roric" }),
      () => context.suggestExisting("Roric", "PERSONNAGE"),
      () => context.getEntity(entityId),
      () => context.getRelevantFacts(entityId),
      () => context.currentScene(),
      () => context.mentionEntity({ canonicalName: "Roric", type: "PERSONNAGE" as const, description: "Captain" }),
      () => context.registerFact({
        entityId,
        attributeKey: "role",
        value: { type: "STRING" as const, value: "captain" },
        category: "SOCIAL" as const,
        observation: { source: "SYSTEM" as const, method: "DEDUCTION_CONFIRMEE" as const, timestamp: 0 },
      }),
      () => context.addConstraint({
        entityId,
        attributeKey: "role",
        rule: { type: "REGEX" as const, pattern: ".+" },
        justification: "closed",
      }),
      () => context.setScene({ locationEntityId: entityId, presentEntityIds: [], description: "closed" }),
      () => context.advanceTurn("closed"),
      () => context.validateNarration({ narration: "Roric enters." }),
      () => context.prepareTurn(),
      () => context.handleToolCall("sneq__get_entity", { entityId }),
    ];
    for (const operation of asyncOperations) await expectInvalid(operation);

    expect(() => context.registerUserPromptHandler(async () => null)).toThrow(SneqCampaignContextInvalidatedError);
    expect(() => context.registerPreGenerationHook({ onEvent() {} })).toThrow(SneqCampaignContextInvalidatedError);
    expect(() => context.registerNarrationGate({ async validate() { return { ok: true, extractedNames: [], issues: [] }; } }))
      .toThrow(SneqCampaignContextInvalidatedError);

    expect(() => engine.campaign(campaignId)).toThrow(/engine is closed/i);
    await expect(engine.listCampaigns()).rejects.toThrow(/engine is closed/i);
    await expect(engine.createCampaign({ id: campaignId, name: "No", embeddingDim: 0 }))
      .rejects.toThrow(/engine is closed/i);
    expect(engine.routerClient()).toBeDefined();
    await expect(engine.close()).resolves.toBeUndefined();
  });

  it("resets a context to unverified when repository deletion fails", async () => {
    class FailingDeleteRepository extends InMemoryRepository {
      failOnce = true;

      override async deleteCampaign(id: CampaignId) {
        if (this.failOnce) {
          this.failOnce = false;
          throw new Error("delete failed");
        }
        return super.deleteCampaign(id);
      }
    }
    const repository = new FailingDeleteRepository({ embeddingDim: 0 });
    const { engine } = makeEngine(repository);
    const context = await engine.createCampaign({ id: campaignId, name: "Retry", embeddingDim: 0 });

    await expect(engine.deleteCampaign(campaignId)).rejects.toThrow("delete failed");
    await expect(context.currentScene()).resolves.toBeNull();
    await engine.deleteCampaign(campaignId);
    await expectInvalid(() => context.currentScene());
    await engine.close();
  });

  it("returns a durably-created context when close races createCampaign", async () => {
    const release = deferred();
    class SlowCreateRepository extends InMemoryRepository {
      override async createCampaign(meta: CampaignMeta) {
        await release.promise;
        return super.createCampaign(meta);
      }
    }
    const repository = new SlowCreateRepository({ embeddingDim: 0 });
    const { engine } = makeEngine(repository);

    const creating = engine.createCampaign({ id: campaignId, name: "Race", embeddingDim: 0 });
    const closing = engine.close(); // races the in-flight write
    release.resolve();

    // Must not reject as if creation failed, even though close() ran mid-write.
    const context = await creating;
    await closing;
    expect(context).toBeDefined();
    // The campaign was durably committed, so a naive retry can't wrongly report "already exists".
    expect((await repository.listCampaigns()).map((c) => c.id)).toContain(campaignId);
  });

  it("shares one shutdown across concurrent and repeated close() calls", async () => {
    let repoCloseCalls = 0;
    const release = deferred();
    class CountingCloseRepository extends InMemoryRepository {
      override async close() {
        repoCloseCalls += 1;
        await release.promise;
        return super.close();
      }
    }
    const repository = new CountingCloseRepository({ embeddingDim: 0 });
    const { engine } = makeEngine(repository);
    await engine.createCampaign({ id: campaignId, name: "C", embeddingDim: 0 });

    const first = engine.close();
    const second = engine.close();
    let firstResolved = false;
    void first.then(() => { firstResolved = true; });
    await Promise.resolve();
    expect(firstResolved).toBe(false); // still draining the repository close

    release.resolve();
    await Promise.all([first, second, engine.close()]);
    expect(repoCloseCalls).toBe(1); // one shared shutdown, not one per caller
  });

  it("blocks new contexts while deleting an uncached campaign", async () => {
    class BlockingDeleteRepository extends InMemoryRepository {
      readonly started = deferred();
      readonly release = deferred();

      override async deleteCampaign(id: CampaignId) {
        this.started.resolve();
        await this.release.promise;
        return super.deleteCampaign(id);
      }
    }
    const repository = new BlockingDeleteRepository({ embeddingDim: 0 });
    await repository.createCampaign({ id: campaignId, name: "Uncached", createdAt: 0, embeddingDim: 0 });
    const { engine } = makeEngine(repository);

    const deletion = engine.deleteCampaign(campaignId);
    await repository.started.promise;
    expect(() => engine.campaign(campaignId)).toThrow(SneqCampaignContextInvalidatedError);
    repository.release.resolve();
    await deletion;
    await engine.close();
  });
});
