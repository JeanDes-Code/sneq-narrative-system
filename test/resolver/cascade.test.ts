import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Resolver } from "../../src/resolver/resolver.js";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { Router } from "../../src/router/router.js";
import { UserPromptRegistry } from "../../src/hooks/user-prompt.js";
import { defaultThresholds } from "../../src/resolver/thresholds.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import { replayProvider, type ReplayProvider } from "../fixtures/replay-provider.js";
import type { Entity } from "../../src/domain/entity.js";

const cid = asCampaignId("c1");
let repo: SqliteRepository;

function ent(id: string, name: string, aliases: string[], vec: number[]): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name,
    nomConnu: true,
    aliases: aliases.map(text => ({ text, source: { kind: "GM_NARRATION" }, observedAt: 0 })),
    tags: [], createdAt: 0,
    embedding: new Float32Array(vec), embeddingRefreshedAt: 0
  };
}

function makeRouter(judge: ReplayProvider): Router {
  return new Router(
    {
      tiers: {
        heavy: { primary: judge.ref, fallbacks: [] },
        light: { primary: judge.ref, fallbacks: [] },
        embeddings: { primary: judge.ref, fallbacks: [] }
      },
      defaults: { timeoutMs: 1000, maxRetries: 0 }
    },
    { resolveProvider: () => judge }
  );
}

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 3 });
  await repo.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 3 });
  await repo.upsertEntity(ent("e1", "Aldric Fervent", ["le forgeron"], [1, 0, 0]));
  await repo.upsertEntity(ent("e2", "Marin Voile", ["le marin"], [0, 1, 0]));
});
afterEach(async () => { await repo.close(); });

describe("Resolver cascade", () => {
  it("L1 alias hit returns immediately, layerUsed=alias", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([1, 0, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "le forgeron" });
    expect(res.match?.id).toBe(asEntityID("e1"));
    expect(res.layerUsed).toBe("alias");
    expect(judge.callCount()).toBe(0);
  });

  it("L2 vector hit when top1 >= tauHigh and gap >= delta", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.98, 0.02, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "the smith" });
    expect(res.match?.id).toBe(asEntityID("e1"));
    expect(res.layerUsed).toBe("vector");
  });

  it("L3 judge invoked in ambiguous band", async () => {
    const judge = replayProvider("m", [
      { kind: "chat", response: { text: JSON.stringify({ matchedIndex: 0, confidence: 0.9, reasoning: "matches" }) } }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "smith-ish person" });
    expect(res.layerUsed).toBe("judge");
    expect(res.match).not.toBeNull();
    expect(judge.callCount()).toBe(1);
  });

  it("L4 fallback to NEW when no handler and judge unsure", async () => {
    const judge = replayProvider("m", [
      { kind: "chat", response: { text: JSON.stringify({ matchedIndex: null, confidence: 0.2, reasoning: "no match" }) } }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "unknown" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("judge");
  });

  it("returns null (new entity) when top1 < tauLow", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0, 0, 1]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "stranger" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("vector");
  });
});

describe("Resolver · generation-direction suggestion", () => {
  it("recommends new when top score < tauLow", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0, 0, 1]); } }
    });
    const s = await r.suggestExisting({ campaignId: cid, mention: "new captain", type: "PERSONNAGE" });
    expect(s.recommendsNew).toBe(true);
  });
});
