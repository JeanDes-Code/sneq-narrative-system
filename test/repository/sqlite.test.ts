import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

let repo: SqliteRepository;
const cid = asCampaignId("c1");

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
  await repo.createCampaign({ id: cid, name: "Test", createdAt: 0, embeddingDim: 4 });
});

afterEach(async () => { await repo.close(); });

describe("SqliteRepository · campaigns + entities", () => {
  it("lists created campaigns", async () => {
    const list = await repo.listCampaigns();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(cid);
  });

  it("upserts and reads back an entity", async () => {
    const e: Entity = {
      campaignId: cid, id: asEntityID("e1"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true, aliases: [], tags: [], createdAt: 0,
      embedding: null, embeddingRefreshedAt: null
    };
    await repo.upsertEntity(e);
    const got = await repo.getEntity(cid, asEntityID("e1"));
    expect(got?.name).toBe("Aldric");
    expect(got?.nomConnu).toBe(true);
  });

  it("upserts entity with embedding and reads it back", async () => {
    const vec = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const e: Entity = {
      campaignId: cid, id: asEntityID("e2"), type: "PERSONNAGE", name: "B",
      nomConnu: false, aliases: [], tags: [], createdAt: 0,
      embedding: vec, embeddingRefreshedAt: 1
    };
    await repo.upsertEntity(e);
    const got = await repo.getEntity(cid, asEntityID("e2"));
    expect(got?.embedding).not.toBeNull();
    const stored = Array.from(got!.embedding!);
    expect(stored).toHaveLength(4);
    expect(stored[0]).toBeCloseTo(0.1, 5);
    expect(stored[1]).toBeCloseTo(0.2, 5);
    expect(stored[2]).toBeCloseTo(0.3, 5);
    expect(stored[3]).toBeCloseTo(0.4, 5);
  });

  it("finds entities by normalized alias", async () => {
    const e: Entity = {
      campaignId: cid, id: asEntityID("e3"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true,
      aliases: [{ text: "Le forgeron", source: { kind: "GM_NARRATION" }, observedAt: 0 }],
      tags: [], createdAt: 0, embedding: null, embeddingRefreshedAt: null
    };
    await repo.upsertEntity(e);
    const matches = await repo.findEntitiesByAlias(cid, "le forgeron");
    expect(matches).toHaveLength(1);
    expect(matches[0]!.id).toBe(asEntityID("e3"));
  });

  it("returns null for unknown entity", async () => {
    const got = await repo.getEntity(cid, asEntityID("nope"));
    expect(got).toBeNull();
  });
});
