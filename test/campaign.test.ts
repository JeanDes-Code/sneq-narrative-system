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

describe("CampaignContext.validateNarration", () => {
  it("delegates to the registered NarrationGateHook with the campaign context", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const ctx = await engine.createCampaign({ id: asCampaignId("c4"), name: "x", embeddingDim: 3 });

    let seenInput: { narration: string } | undefined;
    const handle = ctx.registerNarrationGate({
      async validate(input) {
        seenInput = input;
        return { ok: true, extractedNames: [], issues: [] };
      }
    });

    const r = await ctx.validateNarration({ narration: "test" });
    expect(seenInput).toEqual({ narration: "test" });
    expect(r.ok).toBe(true);
    handle.dispose();
    await engine.close();
  });
});

describe("CampaignContext.prepareTurn", () => {
  it("returns scene null and empty presentEntities when no scene is set", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const ctx = await engine.createCampaign({ id: asCampaignId("c5"), name: "x", embeddingDim: 3 });
    const r = await ctx.prepareTurn();
    expect(r.scene).toBeNull();
    expect(r.presentEntities).toEqual([]);
    await engine.close();
  });

  it("returns scene + entity + facts in one call (the Cassius-bug closure)", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: config,
      _routerDeps: deps
    });
    const ctx = await engine.createCampaign({ id: asCampaignId("c6"), name: "x", embeddingDim: 3 });

    const farengar = await ctx.mentionEntity({
      canonicalName: "Farengar",
      type: "PERSONNAGE",
      description: "Court mage of Dragonsreach"
    });
    const obs: Observation = {
      source: "GM_NARRATION",
      method: "OBSERVATION_VISUELLE",
      fiabilite: "CERTAINE",
      timestamp: 0
    };
    await ctx.registerFact({
      entityId: farengar.entityId!,
      attributeKey: "role",
      value: { type: "STRING", value: "court mage" },
      category: "SOCIAL",
      observation: obs
    });

    await ctx.setScene({
      locationEntityId: asEntityID("loc_dragonsreach"),
      presentEntityIds: [farengar.entityId!],
      description: "Dragonsreach great hall"
    });

    const turn = await ctx.prepareTurn();
    expect(turn.scene?.description).toBe("Dragonsreach great hall");
    expect(turn.presentEntities).toHaveLength(1);
    expect(turn.presentEntities[0]?.entity.name).toBe("Farengar");
    expect(turn.presentEntities[0]?.facts).toHaveLength(1);
    expect(turn.presentEntities[0]?.facts[0]?.key).toBe("role");
    await engine.close();
  });
});

function keylessEngine() {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
  const failing: Provider = {
    ref,
    async chat() { throw new Error("no chat in this test"); },
    async embed() { throw new Error("no embeddings in this test"); }
  };
  return new Engine({
    repository: sqliteRepository({ path: ":memory:", embeddingDim: 0 }),
    router: { tiers: { heavy: { primary: ref, fallbacks: [] }, light: { primary: ref, fallbacks: [] } } },
    _routerDeps: { resolveProvider: () => failing }
  });
}

describe("CampaignContext · keyless mode", () => {
  it("mention + alias lookup roundtrip with no embeddings tier and dim 0", async () => {
    const engine = keylessEngine();
    const c = await engine.createCampaign({ id: asCampaignId("k1"), name: "x", embeddingDim: 0 });
    const m = await c.mentionEntity({
      canonicalName: "Aldric Fervent", type: "PERSONNAGE",
      aliases: ["le forgeron"], description: "A grizzled smith."
    });
    expect(m.isNew).toBe(true);
    const r = await c.resolveEntity({ mention: "le forgeron" });
    expect(r.match?.name).toBe("Aldric Fervent");
    const e = await c.getEntity(m.entityId!);
    expect(e?.embedding).toBeNull();
    expect(e?.description).toBe("A grizzled smith.");
    await engine.close();
  });
});

describe("CampaignContext · campaign existence guard", () => {
  it("writes against a never-created campaign throw SneqCampaignNotFoundError", async () => {
    const engine = keylessEngine();
    const ghost = engine.campaign(asCampaignId("ghost"));
    await expect(ghost.mentionEntity({ canonicalName: "X", type: "PERSONNAGE", description: "d" }))
      .rejects.toThrow(/campaign "ghost" not found/i);
    await engine.close();
  });
});

describe("CampaignContext · needsAdjudication", () => {
  function ambiguousEngine() {
    const embedRef: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "emb" };
    const vecFor = (t: string): number[] =>
      t.includes("Nord") ? [1, 0, 0] : t.includes("Sud") ? [0.9, 0.4359, 0] : [0.97, 0.243, 0];
    const provider: Provider = {
      ref: embedRef,
      async chat() { throw new Error("judge down"); },
      async embed(req) { return { vectors: [new Float32Array(vecFor(req.texts[0]!))], dim: 3, modelUsed: "emb", providerUsed: "custom" }; }
    };
    return new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: {
        tiers: { heavy: { primary: embedRef, fallbacks: [] }, light: { primary: embedRef, fallbacks: [] }, embeddings: { primary: embedRef, fallbacks: [] } },
        defaults: { timeoutMs: 1000, maxRetries: 0 }
      },
      resolver: { tauHigh: 0.999, tauLow: 0.1, gapDelta: 0.5 },
      _routerDeps: { resolveProvider: () => provider }
    });
  }

  it("refuses to create on ambiguity and returns candidates; force:true creates", async () => {
    const engine = ambiguousEngine();
    const c = await engine.createCampaign({ id: asCampaignId("amb"), name: "x", embeddingDim: 3 });
    await c.mentionEntity({ canonicalName: "Garde Nord", type: "PERSONNAGE", description: "a", force: true });
    await c.mentionEntity({ canonicalName: "Garde Sud", type: "PERSONNAGE", description: "b", force: true });
    const r = await c.mentionEntity({ canonicalName: "le garde", type: "PERSONNAGE", description: "c" });
    expect(r.needsAdjudication).toBe(true);
    if (r.needsAdjudication) {
      expect(r.entityId).toBeNull();
      expect(r.candidates.length).toBeGreaterThan(0);
    }
    const forced = await c.mentionEntity({ canonicalName: "le garde", type: "PERSONNAGE", description: "c", force: true });
    expect(forced.isNew).toBe(true);
    await engine.close();
  });
});

describe("CampaignContext · scene context reaches the judge", () => {
  it("passes the current scene description as sceneDescription", async () => {
    const seen: string[] = [];
    const embedRef: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "m" };
    const vecFor = (t: string): number[] =>
      t.includes("Aldric") ? [1, 0, 0] : t.includes("Alduin") ? [0.9, 0.4359, 0] : [0.97, 0.243, 0];
    const provider: Provider = {
      ref: embedRef,
      async chat(req) {
        seen.push(req.messages[0]!.content);
        return { text: JSON.stringify({ matchedIndex: null, confidence: 0, reasoning: "n" }), toolCalls: [], modelUsed: "m", providerUsed: "custom" };
      },
      async embed(req) { return { vectors: [new Float32Array(vecFor(req.texts[0]!))], dim: 3, modelUsed: "m", providerUsed: "custom" }; }
    };
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: { tiers: { heavy: { primary: embedRef, fallbacks: [] }, light: { primary: embedRef, fallbacks: [] }, embeddings: { primary: embedRef, fallbacks: [] } }, defaults: { timeoutMs: 1000, maxRetries: 0 } },
      resolver: { tauHigh: 0.999, tauLow: 0.1, gapDelta: 0.5 },
      _routerDeps: { resolveProvider: () => provider }
    });
    const c = await engine.createCampaign({ id: asCampaignId("sc"), name: "x", embeddingDim: 3 });
    const a = await c.mentionEntity({ canonicalName: "Aldric", type: "PERSONNAGE", description: "smith", force: true });
    await c.mentionEntity({ canonicalName: "Alduin", type: "PERSONNAGE", description: "dragon", force: true });
    await c.setScene({ locationEntityId: a.entityId!, presentEntityIds: [], description: "Dans la forge de Valmure" });
    await c.resolveEntity({ mention: "le maitre des lieux" });
    expect(seen.some(s => s.includes("Dans la forge de Valmure"))).toBe(true);
    expect(seen.some(s => s.includes("smith"))).toBe(true);
    await engine.close();
  });
});
