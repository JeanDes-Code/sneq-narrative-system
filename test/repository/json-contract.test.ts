import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFileRepository } from "../../src/repository/json/index.js";
import { repositoryContract, DIM } from "./contract.js";
import { asCampaignId, asEntityID, asEventId } from "../../src/domain/ids.js";

import { ledgerContract } from "./ledger-contract.js";

ledgerContract("json-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
  return new JsonFileRepository({ path: join(dir, "store.json"), embeddingDim: DIM });
});

repositoryContract("json-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
  return new JsonFileRepository({ path: join(dir, "store.json"), embeddingDim: DIM });
});

describe("JsonFileRepository · persistence", () => {
  it("reloads state (including Float32Array embeddings and the adopted dim) from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const cid = asCampaignId("c1");
    const r1 = new JsonFileRepository({ path });
    await r1.createCampaign({ id: cid, name: "Persist", createdAt: 0, embeddingDim: 4 });
    await r1.upsertEntity({
      campaignId: cid, id: asEntityID("e1"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true, aliases: [], tags: [], createdAt: 0, description: "smith",
      embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1
    });
    await r1.close();
    expect((JSON.parse(readFileSync(path, "utf-8")) as { version: number }).version).toBe(2);

    const r2 = new JsonFileRepository({ path }); // no dim: adopt from file
    const got = await r2.getEntity(cid, asEntityID("e1"));
    expect(got?.description).toBe("smith");
    expect(got?.embedding).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.embedding!)).toEqual([1, 0, 0, 0]);
    expect(await r2.entityRevision(cid)).toBe(1);
    await expect(r2.createCampaign({ id: asCampaignId("c2"), name: "bad", createdAt: 0, embeddingDim: 9 }))
      .rejects.toThrow(/dim/i);
    await r2.close();
  });

  it("rejects opening with a dim that contradicts the stored one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const r1 = new JsonFileRepository({ path, embeddingDim: 4 });
    await r1.createCampaign({ id: asCampaignId("c1"), name: "x", createdAt: 0, embeddingDim: 4 });
    await r1.close();
    expect(() => new JsonFileRepository({ path, embeddingDim: 8 })).toThrow(/dim mismatch/i);
  });
});

describe("JsonFileRepository · ledger persistence (v2)", () => {
  it("reloads ledger state from disk and reads a version-1 file as empty ledger", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const cid = asCampaignId("c1");
    const r1 = new JsonFileRepository({ path, embeddingDim: 4 });
    await r1.createCampaign({ id: cid, name: "L", createdAt: 0, embeddingDim: 4 });
    await r1.appendEvent({
      eventId: asEventId("e1"), campaignId: cid, day: 1, turn: 1, gravity: 2,
      acts: [{ actorId: asEntityID("a"), verb: "STRIKE" }],
      circumstance: "c", participants: [asEntityID("a")], surfaceTokens: ["gourdin"]
    });
    await r1.setWorldDay(cid, 4);
    await r1.close();

    const r2 = new JsonFileRepository({ path });
    expect((await r2.getEvents(cid)).map(e => String(e.eventId))).toEqual(["e1"]);
    expect(await r2.getWorldDay(cid)).toBe(4);
    await r2.close();

    // a v1 file (no ledger collections) loads with an empty ledger
    const v1 = JSON.parse(readFileSync(path, "utf-8")) as { version: number; state: Record<string, unknown> };
    v1.version = 1;
    delete v1.state["events"]; delete v1.state["worldDays"];
    const p1 = join(dir, "v1.json");
    writeFileSync(p1, JSON.stringify(v1));
    const r3 = new JsonFileRepository({ path: p1 });
    expect(await r3.getEvents(cid)).toEqual([]);
    expect(await r3.getWorldDay(cid)).toBe(0);
    await r3.close();
  });
});

describe("JsonFileRepository · v1 data migration (#17 #18 #23)", () => {
  it("loading a v1 file populates the migration epoch", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-v1-"));
    const path = join(dir, "v1-legacy.json");
    const enc = (v: unknown) => JSON.stringify(v, (_k, x: unknown) =>
      x instanceof Map ? { __map: [...x.entries()] } : x);
    const fact = {
      campaignId: "c1", factId: "f1", entityId: "e1", key: "metier",
      value: { type: "STRING", value: "forgeron" }, category: "HISTORIQUE",
      observation: { source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0, fiabilite: "CERTAINE" },
      turn: 3
    };
    const pot = {
      entiteId: "e1", attribut: "metier", etat: "CONTRAINT",
      contraintes: [{
        id: "k1", source: { kind: "INFERENCE_IA", confidence: 0.7 }, createdAt: 0,
        regle: { type: "DOIT_ETRE", valeurs: [{ type: "ENUM", value: "forgeron", enumType: "job" }] },
        justificationNarrative: "…"
      }],
      contexteGeneratif: { categorieAttribut: "SOCIAL", tendances: [] }
    };
    const state = {
      campaigns: new Map([["c1", { id: "c1", name: "Legacy", createdAt: 0, embeddingDim: 0 }]]),
      entityRevisions: new Map([["c1", 0]]),
      entities: new Map(), potentialites: new Map([["c1", new Map([["e1|metier", pot]])]]),
      facts: new Map([["c1", new Map([["e1|metier", fact]])]]),
      nodes: new Map(), edges: new Map(), turns: new Map(), scenes: new Map()
    };
    writeFileSync(path, enc({ version: 1, dim: 0, state }));

    const repo = new JsonFileRepository({ path });
    const c1 = asCampaignId("c1");
    const canon = await repo.getCanonicalAttributes(c1, asEntityID("e1"));
    expect(canon).toHaveLength(1);
    expect(canon[0]!.source).toEqual({ kind: "LEGACY_FACT" });
    expect(canon[0]!.observation && "fiabilite" in canon[0]!.observation).toBe(false);
    const events = await repo.getEvents(c1);
    expect(events).toHaveLength(1);
    expect(events[0]!.acts[0]!.verb).toBe("LEGACY_CANON");
    const facts = await repo.getFigedAttributes(c1, asEntityID("e1"));
    expect("fiabilite" in (facts[0]!.observation as unknown as Record<string, unknown>)).toBe(false);
    expect((await repo.listMigrationFindings(c1)).map(f => f.kind)).toEqual(["TYPE_MISMATCH_WITH_CANON"]);
    await repo.close();
  });
});
