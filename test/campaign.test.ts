import { describe, it, expect } from "vitest";
import { Engine } from "../src/engine.js";
import { sqliteRepository } from "../src/repository/sqlite/factory.js";
import { asCampaignId } from "../src/domain/ids.js";
import type { RouterConfig } from "../src/router/interface.js";
import { replayProvider } from "./fixtures/replay-provider.js";

function makeEmbedRouter(vec: number[]): RouterConfig {
  const p = replayProvider("fake-embed", []);
  // Override embed to always return the scripted vector without consuming the script
  const orig = p.embed.bind(p);
  p.embed = async (_req, signal) => {
    void orig;
    void signal;
    return { vectors: [new Float32Array(vec)], dim: vec.length, modelUsed: "fake-embed", providerUsed: "custom" };
  };
  return {
    tiers: {
      heavy: { primary: p.ref, fallbacks: [] },
      light: { primary: p.ref, fallbacks: [] },
      embeddings: { primary: p.ref, fallbacks: [] }
    },
    defaults: { timeoutMs: 1000, maxRetries: 0 }
  };
}

describe("CampaignContext · setScene", () => {
  it("links the new scene to a fresh turn", async () => {
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: makeEmbedRouter([0.5, 0.5, 0.0])
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
