import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { asCampaignId, asEntityID, asFactId } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Provider, ProviderRef } from "../src/router/interface.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("not used"); },
  async embed() { throw new Error("not used"); },
};

const observation = {
  source: "SYSTEM",
  method: "DEDUCTION_CONFIRMEE",
  timestamp: 0,
} as const;

describe("CampaignContext getRelevantFacts depth", () => {
  it("returns own facts at depth zero and direct neighbors only at depth one", async () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const engine = new Engine({
      repository,
      router: {
        tiers: {
          heavy: { primary: ref, fallbacks: [] },
          light: { primary: ref, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => provider },
    });
    const campaignId = asCampaignId("depth");
    const campaign = await engine.createCampaign({ id: campaignId, name: "Depth", embeddingDim: 0 });
    const a = asEntityID("A");
    const b = asEntityID("B");
    const c = asEntityID("C");

    for (const entityId of [a, b, c]) {
      await repository.upsertNode(campaignId, {
        entityId,
        type: "PERSONNAGE",
        etatActuel: "BIEN_CONNU",
        poidsNarratif: 1,
        tags: [],
      });
      await repository.appendFact({
        campaignId,
        factId: asFactId(`fact-${entityId}`),
        entityId,
        key: "name",
        value: { type: "STRING", value: String(entityId) },
        category: "IDENTITE",
        observation,
        turn: 1,
      });
    }
    await repository.upsertEdge(campaignId, {
      key: "A-B",
      source: a,
      cible: b,
      typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
      directionnalite: "BIDIRECTIONNELLE",
      forcePropagation: 1,
      etatArete: "FIGE",
      attributs: {},
    });
    await repository.upsertEdge(campaignId, {
      key: "B-C",
      source: b,
      cible: c,
      typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
      directionnalite: "BIDIRECTIONNELLE",
      forcePropagation: 1,
      etatArete: "FIGE",
      attributs: {},
    });

    expect((await campaign.getRelevantFacts(a)).map((fact) => fact.entityId)).toEqual([a]);
    expect(new Set((await campaign.getRelevantFacts(a, { depth: 1 })).map((fact) => fact.entityId)))
      .toEqual(new Set([a, b]));
    expect((await campaign.getRelevantFacts(a, { depth: 1 })).map((fact) => fact.entityId))
      .not.toContain(c);
    await engine.close();
  });
});
