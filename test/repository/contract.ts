import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Repository } from "../../src/repository/interface.js";
import type { Entity } from "../../src/domain/entity.js";
import { asCampaignId, asEntityID, asSceneId } from "../../src/domain/ids.js";

export const DIM = 4;
const cid = asCampaignId("c1");

function entity(id: string, over: Partial<Entity> = {}): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name: id,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: null, embeddingRefreshedAt: null, ...over
  };
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

/**
 * Behavioral contract every Repository adapter must satisfy.
 * The interface is the test surface: a new adapter is "done" when this passes.
 */
export function repositoryContract(name: string, makeRepo: () => Repository | Promise<Repository>): void {
  describe(`Repository contract · ${name}`, () => {
    let repo: Repository;
    beforeEach(async () => {
      repo = await makeRepo();
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
    });
    afterEach(async () => { await repo.close(); });

    it("lists campaigns and rejects a second campaign with a different dim", async () => {
      expect((await repo.listCampaigns()).map(c => c.id)).toEqual([cid]);
      await expect(repo.createCampaign({ id: asCampaignId("c2"), name: "bad", createdAt: 0, embeddingDim: DIM + 1 }))
        .rejects.toThrow(/dim/i);
    });

    it("tracks a per-campaign entity revision", async () => {
      expect(await repo.entityRevision(cid)).toBe(0);
      await repo.upsertEntity(entity("rev-1"));
      expect(await repo.entityRevision(cid)).toBe(1);
      await repo.upsertEntity(entity("rev-1", { description: "updated" }));
      expect(await repo.entityRevision(cid)).toBe(2);
    });

    it("rejects entityRevision for a missing campaign", async () => {
      await repo.deleteCampaign(cid);
      await expect(repo.entityRevision(cid)).rejects.toThrow(/campaign "c1" not found/i);
    });

    it("deleteCampaign purges entities, facts, scenes and turns", async () => {
      await repo.upsertEntity(entity("e1"));
      await repo.upsertScene({ campaignId: cid, id: asSceneId("s1"), locationId: asEntityID("e1"), presentEntityIds: [], description: "d", createdAtTurn: 1 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 1, summary: null, sceneId: asSceneId("s1"), createdAt: 0 });
      await repo.deleteCampaign(cid);
      expect(await repo.listCampaigns()).toEqual([]);
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
      expect(await repo.getEntity(cid, asEntityID("e1"))).toBeNull();
      expect(await repo.currentScene(cid)).toBeNull();
      expect(await repo.latestTurn(cid)).toBeNull();
    });

    it("rejects campaign-scoped writes after the parent campaign is deleted", async () => {
      await repo.deleteCampaign(cid);
      const missing = /campaign "c1" not found/i;

      await expect(repo.upsertEntity(entity("orphan"))).rejects.toThrow(missing);
      await expect(repo.upsertPotentialite(cid, {
        entiteId: asEntityID("orphan"),
        attribut: "role",
        etat: "CONTRAINT",
        contraintes: [],
        contexteGeneratif: { categorieAttribut: "SOCIAL", tendances: [] },
      })).rejects.toThrow(missing);
      await expect(repo.upsertNode(cid, {
        entityId: asEntityID("orphan"),
        type: "PERSONNAGE",
        etatActuel: "PARTIELLEMENT_CONNU",
        poidsNarratif: 0,
        tags: [],
      })).rejects.toThrow(missing);
      await expect(repo.upsertEdge(cid, {
        key: "orphan-edge",
        source: asEntityID("orphan"),
        cible: asEntityID("other"),
        typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
        directionnalite: "BIDIRECTIONNELLE",
        forcePropagation: 0.5,
        etatArete: "FIGE",
        attributs: {},
      })).rejects.toThrow(missing);
      await expect(repo.appendTurn({
        campaignId: cid,
        turnNumber: 1,
        summary: null,
        sceneId: null,
        createdAt: 0,
      })).rejects.toThrow(missing);
      await expect(repo.upsertScene({
        campaignId: cid,
        id: asSceneId("orphan-scene"),
        locationId: asEntityID("orphan"),
        presentEntityIds: [],
        description: "orphan",
        createdAtTurn: 1,
      })).rejects.toThrow(missing);
    });

    it("rejects recreating a campaign that already exists", async () => {
      await repo.upsertEntity(entity("e1"));
      await repo.upsertEntity(entity("e1", { description: "bumped" }));
      expect(await repo.entityRevision(cid)).toBe(2);
      await expect(repo.createCampaign({ id: cid, name: "dup", createdAt: 0, embeddingDim: DIM }))
        .rejects.toThrow(/already exists/i);
      // revision and entities are untouched — no silent reset to 0
      expect(await repo.entityRevision(cid)).toBe(2);
      expect(await repo.getEntity(cid, asEntityID("e1"))).not.toBeNull();
    });

    it("deletes inline through a transaction handle without deadlocking", async () => {
      await repo.upsertEntity(entity("e1"));
      await repo.transaction(async (tx) => { await tx.deleteCampaign(cid); });
      expect(await repo.listCampaigns()).toEqual([]);
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
      expect(await repo.getEntity(cid, asEntityID("e1"))).toBeNull();
    }, 3000);

    it("orders deletion after an already-started transaction and never resurrects its state", async () => {
      const entered = deferred();
      const release = deferred();
      const transaction = repo.transaction(async (tx) => {
        entered.resolve();
        await release.promise;
        await tx.upsertEntity(entity("in-flight"));
      });

      await entered.promise;
      let deletionFinished = false;
      const deletion = repo.deleteCampaign(cid).then(() => { deletionFinished = true; });
      await Promise.resolve();
      expect(deletionFinished).toBe(false);

      release.resolve();
      await Promise.all([transaction, deletion]);
      expect(await repo.listCampaigns()).toEqual([]);
      expect(await repo.getEntity(cid, asEntityID("in-flight"))).toBeNull();
    });

    it("entity roundtrip preserves description, aliases, tags, embedding", async () => {
      await repo.upsertEntity(entity("e1", {
        name: "Aldric Fervent",
        description: "A grizzled smith with haunted eyes.",
        aliases: [{ text: "Le Forgeron", source: { kind: "GM_NARRATION" }, observedAt: 0 }],
        tags: ["smith"],
        embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 7
      }));
      const got = await repo.getEntity(cid, asEntityID("e1"));
      expect(got?.description).toBe("A grizzled smith with haunted eyes.");
      expect(got?.aliases[0]?.text).toBe("Le Forgeron");
      expect(got?.tags).toEqual(["smith"]);
      expect(Array.from(got!.embedding!)).toHaveLength(DIM);
      await repo.upsertEntity(entity("e2"));
      expect((await repo.getEntity(cid, asEntityID("e2")))?.description).toBeUndefined();
    });

    it("findEntitiesByAlias matches name, alias, accents and article-stripped forms, honors type filter", async () => {
      await repo.upsertEntity(entity("e1", {
        name: "Aldric",
        aliases: [{ text: "Le Forgeron Maudit", source: { kind: "GM_NARRATION" }, observedAt: 0 }]
      }));
      await repo.upsertEntity(entity("loc1", { name: "Valmure", type: "LIEU" }));
      expect((await repo.findEntitiesByAlias(cid, "aldric")).map(e => String(e.id))).toEqual(["e1"]);
      expect((await repo.findEntitiesByAlias(cid, "forgeron maudit")).map(e => String(e.id))).toEqual(["e1"]);
      expect((await repo.findEntitiesByAlias(cid, "ALDRIC")).map(e => String(e.id))).toEqual(["e1"]);
      expect(await repo.findEntitiesByAlias(cid, "aldric", "LIEU")).toEqual([]);
    });

    it("searchEntitiesByVector orders by similarity, honors topK/filterType/exclude, skips embeddingless entities", async () => {
      await repo.upsertEntity(entity("close", { embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 }));
      await repo.upsertEntity(entity("far", { embedding: new Float32Array([0, 1, 0, 0]), embeddingRefreshedAt: 1 }));
      await repo.upsertEntity(entity("novec"));
      await repo.upsertEntity(entity("place", { type: "LIEU", embedding: new Float32Array([0.9, 0.1, 0, 0]), embeddingRefreshedAt: 1 }));
      const q = new Float32Array([1, 0, 0, 0]);
      const all = await repo.searchEntitiesByVector(cid, q, { topK: 10 });
      expect(String(all[0]!.entity.id)).toBe("close");
      expect(all.map(h => String(h.entity.id))).not.toContain("novec");
      const persons = await repo.searchEntitiesByVector(cid, q, { topK: 10, filterType: "PERSONNAGE" });
      expect(persons.map(h => String(h.entity.id))).not.toContain("place");
      const excl = await repo.searchEntitiesByVector(cid, q, { topK: 10, excludeEntityIds: [asEntityID("close")] });
      expect(excl.map(h => String(h.entity.id))).not.toContain("close");
      expect(await repo.searchEntitiesByVector(cid, q, { topK: 1 })).toHaveLength(1);
    });

    // §14.5 — the dimension used to be chosen at campaign creation and then
    // immutable, with no reindex path in the contract at all. That is very
    // likely why 4/4 consumers picked 0.
    it("setEmbeddingDim moves the campaign and clears vectors; reindexEmbeddings refills them", async () => {
      await repo.upsertEntity(entity("e1", { embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 }));

      await repo.setEmbeddingDim(cid, DIM + 2);
      expect((await repo.listCampaigns())[0]!.embeddingDim).toBe(DIM + 2);
      // Cleared, not converted: a vector of the old dimension is unreadable at
      // the new one, and keeping it would rank on noise.
      expect((await repo.getEntity(cid, asEntityID("e1")))!.embedding).toBeNull();
      expect(await repo.searchEntitiesByVector(cid, new Float32Array(DIM + 2), { topK: 5 })).toEqual([]);

      await repo.reindexEmbeddings(cid, [
        { entityId: asEntityID("e1"), vector: new Float32Array([1, 0, 0, 0, 0, 0]) }
      ]);
      const hits = await repo.searchEntitiesByVector(cid, new Float32Array([1, 0, 0, 0, 0, 0]), { topK: 5 });
      expect(hits.map(h => String(h.entity.id))).toEqual(["e1"]);
    });

    it("reindexEmbeddings rejects a vector of the wrong dimension, naming the migration", async () => {
      await repo.upsertEntity(entity("e1"));
      await expect(repo.reindexEmbeddings(cid, [
        { entityId: asEntityID("e1"), vector: new Float32Array(DIM + 1) }
      ])).rejects.toThrow(/setEmbeddingDim/);
    });

    it("reindexEmbeddings skips an entity that no longer exists rather than failing the batch", async () => {
      await repo.upsertEntity(entity("e1"));
      await expect(repo.reindexEmbeddings(cid, [
        { entityId: asEntityID("gone"), vector: new Float32Array(DIM) },
        { entityId: asEntityID("e1"),   vector: new Float32Array([1, 0, 0, 0]) }
      ])).resolves.toBeUndefined();
      expect((await repo.getEntity(cid, asEntityID("e1")))!.embedding).not.toBeNull();
    });

    it("topEntities orders by embeddingRefreshedAt desc and limits", async () => {
      await repo.upsertEntity(entity("a", { embeddingRefreshedAt: 100 }));
      await repo.upsertEntity(entity("b", { embeddingRefreshedAt: 300 }));
      await repo.upsertEntity(entity("c", { embeddingRefreshedAt: 200 }));
      expect((await repo.topEntities(cid, 2)).map(e => String(e.id))).toEqual(["b", "c"]);
    });

    it("potentialites: upsert / get / remove", async () => {
      await repo.upsertPotentialite(cid, {
        entiteId: asEntityID("e1"), attribut: "loyaute", etat: "CONTRAINT",
        contraintes: [], contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE", tendances: [] }
      });
      expect((await repo.getPotentialite(cid, asEntityID("e1"), "loyaute"))?.etat).toBe("CONTRAINT");
      await repo.removePotentialite(cid, asEntityID("e1"), "loyaute");
      expect(await repo.getPotentialite(cid, asEntityID("e1"), "loyaute")).toBeNull();
    });

    it("nodes/edges/neighbors both directions", async () => {
      await repo.upsertNode(cid, { entityId: asEntityID("a"), type: "PERSONNAGE", etatActuel: "BIEN_CONNU", poidsNarratif: 1, tags: [] });
      await repo.upsertNode(cid, { entityId: asEntityID("b"), type: "PERSONNAGE", etatActuel: "BIEN_CONNU", poidsNarratif: 1, tags: [] });
      await repo.upsertEdge(cid, {
        key: "a|b", source: asEntityID("a"), cible: asEntityID("b"),
        typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
        directionnalite: "BIDIRECTIONNELLE", forcePropagation: 0.5, etatArete: "FIGE", attributs: {}
      });
      expect((await repo.neighbors(cid, asEntityID("a"))).map(n => String(n.node.entityId))).toEqual(["b"]);
      expect((await repo.neighbors(cid, asEntityID("b"))).map(n => String(n.node.entityId))).toEqual(["a"]);
    });

    it("turns/scenes: latestTurn, currentScene via the latest scene-bearing turn", async () => {
      await repo.upsertScene({ campaignId: cid, id: asSceneId("s1"), locationId: asEntityID("loc"), presentEntityIds: [asEntityID("e1")], description: "tavern", createdAtTurn: 1 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 1, summary: null, sceneId: asSceneId("s1"), createdAt: 0 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 2, summary: "walk", sceneId: null, createdAt: 0 });
      expect((await repo.latestTurn(cid))?.turnNumber).toBe(2);
      expect((await repo.currentScene(cid))?.id).toBe(asSceneId("s1"));
    });

    it("transaction commits on success and rolls back everything on throw", async () => {
      await repo.transaction(async tx => {
        await tx.upsertEntity(entity("kept"));
      });
      expect(await repo.getEntity(cid, asEntityID("kept"))).not.toBeNull();
      await expect(repo.transaction(async tx => {
        await tx.upsertEntity(entity("ghost"));
        throw new Error("boom");
      })).rejects.toThrow("boom");
      expect(await repo.getEntity(cid, asEntityID("ghost"))).toBeNull();
    });
  });
}
