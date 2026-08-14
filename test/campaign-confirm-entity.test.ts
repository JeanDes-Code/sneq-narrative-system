import { describe, expect, it, vi } from "vitest";

import type { ConfirmEntityMatchCommand } from "../src/atomic/types.js";
import { Engine } from "../src/engine.js";
import { asCampaignId, asEntityID } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Provider, ProviderRef } from "../src/router/interface.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() {
    return { text: "", toolCalls: [], modelUsed: "noop", providerUsed: "custom" };
  },
  async embed() {
    throw new Error("keyless test");
  },
};

function makeEngine() {
  return new Engine({
    repository: new InMemoryRepository({ embeddingDim: 0 }),
    router: {
      tiers: {
        heavy: { primary: ref, fallbacks: [] },
        light: { primary: ref, fallbacks: [] },
      },
    },
    _routerDeps: { resolveProvider: () => provider },
  });
}

describe("CampaignContext.confirmEntityMatch", () => {
  it("delegates asynchronous confirmation to the injected atomic strategy", async () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const confirmEntityMatch = vi.fn(async (command: ConfirmEntityMatchCommand) => ({
      entityId: command.entityId,
      aliasAdded: true,
    }));
    const engine = new Engine({
      repository,
      router: {
        tiers: {
          heavy: { primary: ref, fallbacks: [] },
          light: { primary: ref, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => provider },
      writeStrategy: {
        addConstraint: async (command) => ({ constraintId: command.constraintId }),
        createEntity: async (command) => ({
          status: "created" as const,
          entityId: command.candidate.id,
          isNew: true as const,
        }),
        setScene: async () => ({ sceneId: "s1" as never, turnNumber: 1 }),
        advanceTurn: async () => ({ turnNumber: 1 }),
        confirmEntityMatch,
      },
    });
    const campaign = await engine.createCampaign({
      id: asCampaignId("delegated"),
      name: "Test",
      embeddingDim: 0,
    });
    const entityId = asEntityID("external-entity");

    await expect(campaign.confirmEntityMatch({
      mention: "the captain",
      entityId,
      type: "PERSONNAGE",
    })).resolves.toEqual({ entityId, aliasAdded: true });

    expect(confirmEntityMatch).toHaveBeenCalledWith(expect.objectContaining({
      operationId: expect.stringMatching(/^op_/),
      campaignId: asCampaignId("delegated"),
      entityId,
      mention: "the captain",
      type: "PERSONNAGE",
      observedAt: expect.any(Number),
    }));
    await engine.close();
  });

  it("adds the adjudicated mention as a PLAYER alias", async () => {
    const engine = makeEngine();
    const campaign = await engine.createCampaign({ id: asCampaignId("c1"), name: "Test", embeddingDim: 0 });
    const roric = await campaign.mentionEntity({
      canonicalName: "Roric",
      type: "PERSONNAGE",
      description: "Capitaine de la garde",
      force: true,
    });

    const result = await campaign.confirmEntityMatch({
      mention: "le capitaine",
      entityId: roric.entityId!,
      type: "PERSONNAGE",
    });

    expect(result).toEqual({ entityId: roric.entityId, aliasAdded: true });
    expect((await campaign.getEntity(roric.entityId!))?.aliases).toContainEqual(
      expect.objectContaining({ text: "le capitaine", source: { kind: "PLAYER" } }),
    );
    await engine.close();
  });

  it("is idempotent for normalized duplicate aliases", async () => {
    const engine = makeEngine();
    const campaign = await engine.createCampaign({ id: asCampaignId("c2"), name: "Test", embeddingDim: 0 });
    const roric = await campaign.mentionEntity({
      canonicalName: "Roric",
      type: "PERSONNAGE",
      description: "Capitaine",
      force: true,
    });

    await campaign.confirmEntityMatch({ mention: "Le Capitaine", entityId: roric.entityId!, type: "PERSONNAGE" });
    const second = await campaign.confirmEntityMatch({ mention: "le capitaine", entityId: roric.entityId!, type: "PERSONNAGE" });

    expect(second).toEqual({ entityId: roric.entityId, aliasAdded: false });
    expect((await campaign.getEntity(roric.entityId!))?.aliases).toHaveLength(1);
    await engine.close();
  });

  it("rejects unknown entities and type mismatches", async () => {
    const engine = makeEngine();
    const campaign = await engine.createCampaign({ id: asCampaignId("c3"), name: "Test", embeddingDim: 0 });
    const location = await campaign.mentionEntity({
      canonicalName: "Valmure",
      type: "LIEU",
      description: "Ville fortifiée",
      force: true,
    });

    await expect(campaign.confirmEntityMatch({
      mention: "x",
      entityId: asEntityID("missing"),
      type: "PERSONNAGE",
    })).rejects.toThrow(/not found/i);
    await expect(campaign.confirmEntityMatch({
      mention: "x",
      entityId: location.entityId!,
      type: "PERSONNAGE",
    })).rejects.toThrow(/type mismatch/i);
    await engine.close();
  });
});
