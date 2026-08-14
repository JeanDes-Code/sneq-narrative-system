import Database from "better-sqlite3";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

let repo: SqliteRepository;
const cid = asCampaignId("c1");

function someEntity(id: string): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name: id,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: null, embeddingRefreshedAt: null
  };
}

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

describe("Repository.topEntities", () => {
  it("returns up to K entities ordered by embeddingRefreshedAt desc", async () => {
    const e1: Entity = { ...someEntity("t1"), embeddingRefreshedAt: 100 };
    const e2: Entity = { ...someEntity("t2"), embeddingRefreshedAt: 300 };
    const e3: Entity = { ...someEntity("t3"), embeddingRefreshedAt: 200 };
    await repo.upsertEntity(e1);
    await repo.upsertEntity(e2);
    await repo.upsertEntity(e3);

    const top2 = await repo.topEntities(cid, 2);
    expect(top2).toHaveLength(2);
    expect(top2[0]!.id).toBe(asEntityID("t2")); // 300 is most recent
    expect(top2[1]!.id).toBe(asEntityID("t3")); // 200 next
  });

  it("returns an empty array for a campaign with no entities", async () => {
    const emptyCid = asCampaignId("empty-campaign");
    await repo.createCampaign({ id: emptyCid, name: "Empty", createdAt: 0, embeddingDim: 4 });
    const result = await repo.topEntities(emptyCid, 10);
    expect(result).toEqual([]);
  });
});

describe("SqliteRepository · transaction serialization", () => {
  it("serializes concurrent transactions", async () => {
    const [a, b] = await Promise.all([
      repo.transaction(async (tx) => { await tx.upsertEntity(someEntity("X")); return "a"; }),
      repo.transaction(async (tx) => { await tx.upsertEntity(someEntity("Y")); return "b"; })
    ]);
    expect([a, b]).toEqual(["a", "b"]);
    const x = await repo.getEntity(cid, asEntityID("X"));
    const y = await repo.getEntity(cid, asEntityID("Y"));
    expect(x).not.toBeNull();
    expect(y).not.toBeNull();
  });

  it("waits for an already-started transaction before closing the database", async () => {
    const repository = new SqliteRepository({ path: ":memory:", embeddingDim: 0 });
    await repository.createCampaign({ id: cid, name: "Close queue", createdAt: 0, embeddingDim: 0 });
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const transaction = repository.transaction(async (tx) => {
      entered();
      await gate;
      await tx.upsertEntity(someEntity("before-close"));
    });

    await started;
    let closeFinished = false;
    const closing = repository.close().then(() => { closeFinished = true; });
    await Promise.resolve();
    expect(closeFinished).toBe(false);

    release();
    await Promise.all([transaction, closing]);
    expect(closeFinished).toBe(true);
  });
});

describe("SqliteRepository · dim lifecycle", () => {
  it("adopts the stored dim when reopened without embeddingDim", async () => {
    const tmp = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-dim-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const r1 = new SqliteRepository({ path: tmp, embeddingDim: 4 });
    await r1.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await r1.close();
    const r2 = new SqliteRepository({ path: tmp }); // no dim flag
    const metas = await r2.listCampaigns();
    expect(metas[0]!.embeddingDim).toBe(4);
    await expect(r2.upsertEntity({ ...someEntity("eX"), embedding: new Float32Array([1, 2]), embeddingRefreshedAt: 1 }))
      .rejects.toThrow(/dim mismatch/i);
    await r2.close();
  });

  it("rejects opening with a dim that contradicts the stored one", async () => {
    const tmp = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-dim2-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const r1 = new SqliteRepository({ path: tmp, embeddingDim: 4 });
    await r1.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await r1.close();
    expect(() => new SqliteRepository({ path: tmp, embeddingDim: 8 })).toThrow(/dim mismatch/i);
  });

  it("migrates a version-2 campaign with entity revision zero", async () => {
    const tmp = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-revision-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const legacy = new Database(tmp);
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
      INSERT INTO schema_version (version) VALUES (2);
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_dim INTEGER NOT NULL
      );
      INSERT INTO campaigns (id, name, created_at, embedding_dim)
      VALUES ('c1', 'Legacy', 0, 0);
    `);
    legacy.close();

    const migrated = new SqliteRepository({ path: tmp, embeddingDim: 0 });
    expect(await migrated.entityRevision(cid)).toBe(0);
    await migrated.close();
  });

  it("supports embeddingDim 0: no vec table, vector search returns [], embedding writes throw", async () => {
    const r = new SqliteRepository({ path: ":memory:", embeddingDim: 0 });
    await r.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 0 });
    await r.upsertEntity(someEntity("e0"));
    expect(await r.searchEntitiesByVector(cid, new Float32Array([1, 0, 0, 0]), { topK: 3 })).toEqual([]);
    await expect(r.upsertEntity({ ...someEntity("e1"), embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 }))
      .rejects.toThrow(/no vector store/i);
    await r.close();
  });

  it("a fresh DB with no dim option defers the vec table to createCampaign", async () => {
    const r = new SqliteRepository({ path: ":memory:" });
    expect(await r.searchEntitiesByVector(cid, new Float32Array([1, 0, 0, 0]), { topK: 3 })).toEqual([]);
    await r.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await r.upsertEntity({ ...someEntity("eY"), embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 });
    const hits = await r.searchEntitiesByVector(cid, new Float32Array([1, 0, 0, 0]), { topK: 3 });
    expect(hits).toHaveLength(1);
    await r.close();
  });

  it("rejects a query vector with the wrong dimension", async () => {
    const r = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
    await r.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await expect(r.searchEntitiesByVector(cid, new Float32Array([1, 0]), { topK: 3 })).rejects.toThrow(/dim mismatch/i);
    await r.close();
  });
});

describe("SqliteRepository · embedding lifecycle", () => {
  it("drops the vector when an entity is re-upserted without an embedding", async () => {
    const vec = new Float32Array([1, 0, 0, 0]);
    await repo.upsertEntity({ ...someEntity("e1"), embedding: vec, embeddingRefreshedAt: 1 });
    expect(await repo.searchEntitiesByVector(cid, vec, { topK: 5 })).toHaveLength(1);

    await repo.upsertEntity({ ...someEntity("e1"), embedding: null, embeddingRefreshedAt: null });
    const hits = await repo.searchEntitiesByVector(cid, vec, { topK: 5 });
    expect(hits.map((h) => String(h.entity.id))).not.toContain("e1");
    expect((await repo.getEntity(cid, asEntityID("e1")))?.embedding ?? null).toBeNull();
  });
});

describe("SqliteRepository · entity description", () => {
  it("persists and returns the description; absent stays undefined", async () => {
    await repo.upsertEntity({ ...someEntity("ed"), description: "A grizzled smith." });
    expect((await repo.getEntity(cid, asEntityID("ed")))?.description).toBe("A grizzled smith.");
    await repo.upsertEntity(someEntity("ed2"));
    expect((await repo.getEntity(cid, asEntityID("ed2")))?.description).toBeUndefined();
  });
});

describe("SqliteRepository · ledger reopen (schema v4)", () => {
  it("reopens a file DB and reads back identical ledger state; v3 DB migrates in place", async () => {
    const { mkdtempSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const { asEventId, asHolderId } = await import("../../src/domain/ids.js");
    const path = join(mkdtempSync(join(tmpdir(), "sneq-sqlite-")), "ledger.db");

    const r1 = new SqliteRepository({ path, embeddingDim: 4 });
    await r1.createCampaign({ id: cid, name: "L", createdAt: 0, embeddingDim: 4 });
    await r1.appendEvent({
      eventId: asEventId("e1"), campaignId: cid, day: 1, turn: 1, gravity: 2,
      acts: [{ actorId: asEntityID("a"), verb: "STRIKE",
               sets: { entityId: asEntityID("a"), key: "statut", value: { type: "STRING", value: "blessé" }, category: "ETAT" } }],
      circumstance: "c", participants: [asEntityID("a")], surfaceTokens: ["gourdin"]
    });
    await r1.upsertHolder({
      kind: "GROUP", holderId: asHolderId("h1"), campaignId: cid,
      community: "valmure", stratum: "artisans",
      realmId: asEntityID("realm"), placeId: asEntityID("place"), standing: 0.4
    });
    await r1.setWorldDay(cid, 3);
    const before = { events: await r1.getEvents(cid), holders: await r1.listHolders(cid) };
    await r1.close();

    const r2 = new SqliteRepository({ path });
    expect(await r2.getEvents(cid)).toEqual(before.events);
    expect(await r2.listHolders(cid)).toEqual(before.holders);
    expect(await r2.getWorldDay(cid)).toBe(3);
    await r2.close();
  });
});
