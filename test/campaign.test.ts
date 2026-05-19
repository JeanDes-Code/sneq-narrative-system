import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine.js";
import { sqliteRepository } from "../src/repository/sqlite/factory.js";
import { asCampaignId, asEntityID } from "../src/domain/ids.js";
import type { RouterConfig } from "../src/router/interface.js";
import type { Provider, ProviderRef, ChatRequest, EmbeddingRequest } from "../src/router/interface.js";
import type { Observation } from "../src/domain/observation.js";


function makeEmbedRouter(vec: number[]): { config: RouterConfig; deps: { resolveProvider(ref: ProviderRef): Provider } } {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "fake-embed" };
  const provider: Provider = {
    ref,
    async chat(_req: ChatRequest) {
      return { text: "", toolCalls: [], modelUsed: ref.model, providerUsed: "custom" };
    },
    async embed(_req: EmbeddingRequest) {
      return { vectors: [new Float32Array(vec)], dim: vec.length, modelUsed: ref.model, providerUsed: "custom" };
    }
  };
  const config: RouterConfig = {
    tiers: {
      heavy: { primary: ref, fallbacks: [] },
      light: { primary: ref, fallbacks: [] },
      embeddings: { primary: ref, fallbacks: [] }
    },
    defaults: { timeoutMs: 1000, maxRetries: 0 }
  };
  return { config, deps: { resolveProvider: () => provider } };
}

describe("CampaignContext · setScene", () => {
  it("links the new scene to a fresh turn", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const c = await engine.createCampaign({ id: asCampaignId("c1"), name: "x", embeddingDim: 3 });
    const r = await c.setScene({
      locationEntityId: "loc1" as ReturnType<typeof import("../src/domain/ids.js").asEntityID>,
      presentEntityIds: [],
      description: "in the tavern"
    });
    const current = await c.currentScene();
    expect(current?.id).toBe(r.sceneId);
    await engine.close();
  });
});

describe("CampaignContext · mentionEntity", () => {
  it("embeds new entities so they are findable by vector search", async () => {
    const { config, deps } = makeEmbedRouter([0.7, 0.0, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const c = await engine.createCampaign({ id: asCampaignId("c2"), name: "x", embeddingDim: 3 });
    const r = await c.mentionEntity({
      canonicalName: "Aldric Fervent",
      type: "PERSONNAGE",
      description: "A grizzled smith with haunted eyes."
    });
    expect(r.isNew).toBe(true);
    // Vector search must find the entity (same fake vector each time)
    const s = await c.suggestExisting("the smith", "PERSONNAGE");
    expect(s.candidates.length).toBeGreaterThan(0);
    await engine.close();
  });
});

describe("CampaignContext · registerFact", () => {
  const observation: Observation = {
    source: "GM_NARRATION",
    method: "OBSERVATION_VISUELLE",
    fiabilite: "CERTAINE",
    timestamp: 0
  };

  it("returns factId: null when fact contradicts existing canon", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const c = await engine.createCampaign({ id: asCampaignId("c3"), name: "x", embeddingDim: 3 });
    const entityId = asEntityID("ent1");

    // Register the canonical fact
    const first = await c.registerFact({
      entityId,
      attributeKey: "alignment",
      value: { type: "STRING", value: "lawful-good" },
      category: "PSYCHOLOGIE",
      observation
    });
    expect(first.factId).not.toBeNull();
    expect(first.contradictions).toHaveLength(0);

    // Register a contradicting value
    const second = await c.registerFact({
      entityId,
      attributeKey: "alignment",
      value: { type: "STRING", value: "chaotic-evil" },
      category: "PSYCHOLOGIE",
      observation
    });
    expect(second.factId).toBeNull();
    expect(second.contradictions.length).toBeGreaterThan(0);

    await engine.close();
  });
});
