import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

let repo: SqliteRepository;
const cid = asCampaignId("c1");

function ent(id: string, vec: number[], name = id, type: Entity["type"] = "PERSONNAGE", campaignId = cid): Entity {
  return {
    campaignId, id: asEntityID(id), type, name,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: new Float32Array(vec), embeddingRefreshedAt: 0
  };
}

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 3 });
  await repo.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 3 });
});
afterEach(async () => { await repo.close(); });

describe("vector search", () => {
  it("returns nearest neighbor first", async () => {
    await repo.upsertEntity(ent("a", [1, 0, 0]));
    await repo.upsertEntity(ent("b", [0, 1, 0]));
    await repo.upsertEntity(ent("c", [0, 0, 1]));
    const hits = await repo.searchEntitiesByVector(cid, new Float32Array([0.95, 0.05, 0]), { topK: 2 });
    expect(hits[0]!.entity.id).toBe(asEntityID("a"));
  });

  it("filters by type", async () => {
    await repo.upsertEntity(ent("loc1", [1, 0, 0], "loc1", "LIEU"));
    await repo.upsertEntity(ent("pnj1", [1, 0, 0], "pnj1", "PERSONNAGE"));
    const hits = await repo.searchEntitiesByVector(cid, new Float32Array([1, 0, 0]), { topK: 5, filterType: "LIEU" });
    expect(hits.map(h => h.entity.id)).toEqual([asEntityID("loc1")]);
  });

  it("rejects dim mismatch on construction", () => {
    expect(() => {
      const r1 = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
      r1.close();
    }).not.toThrow();
  });

  it("isolates vectors across campaigns", async () => {
    const cid2 = asCampaignId("c2");
    await repo.createCampaign({ id: cid2, name: "y", createdAt: 0, embeddingDim: 3 });
    await repo.upsertEntity(ent("shared", [1, 0, 0], "shared", "PERSONNAGE", cid));
    await repo.upsertEntity(ent("shared", [0, 1, 0], "shared", "PERSONNAGE", cid2));
    const hitsC1 = await repo.searchEntitiesByVector(cid, new Float32Array([1, 0, 0]), { topK: 1 });
    expect(hitsC1[0]!.entity.campaignId).toBe(cid);
    const hitsC2 = await repo.searchEntitiesByVector(cid2, new Float32Array([0, 1, 0]), { topK: 1 });
    expect(hitsC2[0]!.entity.campaignId).toBe(cid2);
  });

  it("removes vectors when campaign deleted", async () => {
    await repo.upsertEntity(ent("a", [1, 0, 0]));
    await repo.deleteCampaign(cid);
    await repo.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 3 });
    const hits = await repo.searchEntitiesByVector(cid, new Float32Array([1, 0, 0]), { topK: 5 });
    expect(hits).toEqual([]);
  });
});
