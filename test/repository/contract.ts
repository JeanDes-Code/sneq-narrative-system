import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Repository } from "../../src/repository/interface.js";
import type { Entity } from "../../src/domain/entity.js";
import type { AttributFige } from "../../src/domain/attribute.js";
import type { Observation } from "../../src/domain/observation.js";
import type { CampaignId } from "../../src/domain/ids.js";
import { asCampaignId, asEntityID, asFactId, asSceneId } from "../../src/domain/ids.js";

export const DIM = 4;
const cid = asCampaignId("c1");

function entity(id: string, over: Partial<Entity> = {}): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name: id,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: null, embeddingRefreshedAt: null, ...over
  };
}

const obs: Observation = {
  source: "GM_NARRATION", method: "DIALOGUE_DIRECT", fiabilite: "CERTAINE", timestamp: 0
};

function fact(eid: string, key: string, value: string, turn = 1): AttributFige & { campaignId: CampaignId } {
  return {
    campaignId: cid, factId: asFactId(`f_${eid}_${key}_${turn}`), entityId: asEntityID(eid),
    key, value: { type: "STRING", value }, category: "HISTORIQUE", observation: obs, turn
  };
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

    it("deleteCampaign purges entities, facts, scenes and turns", async () => {
      await repo.upsertEntity(entity("e1"));
      await repo.appendFact(fact("e1", "metier", "forgeron"));
      await repo.upsertScene({ campaignId: cid, id: asSceneId("s1"), locationId: asEntityID("e1"), presentEntityIds: [], description: "d", createdAtTurn: 1 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 1, summary: null, sceneId: asSceneId("s1"), createdAt: 0 });
      await repo.deleteCampaign(cid);
      expect(await repo.listCampaigns()).toEqual([]);
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
      expect(await repo.getEntity(cid, asEntityID("e1"))).toBeNull();
      expect(await repo.getFigedAttributes(cid, asEntityID("e1"))).toEqual([]);
      expect(await repo.currentScene(cid)).toBeNull();
      expect(await repo.latestTurn(cid)).toBeNull();
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

    it("topEntities orders by embeddingRefreshedAt desc and limits", async () => {
      await repo.upsertEntity(entity("a", { embeddingRefreshedAt: 100 }));
      await repo.upsertEntity(entity("b", { embeddingRefreshedAt: 300 }));
      await repo.upsertEntity(entity("c", { embeddingRefreshedAt: 200 }));
      expect((await repo.topEntities(cid, 2)).map(e => String(e.id))).toEqual(["b", "c"]);
    });

    it("facts: replace-on-same-key, query filters", async () => {
      await repo.appendFact(fact("e1", "metier", "forgeron", 1));
      await repo.appendFact(fact("e1", "metier", "capitaine", 2));
      await repo.appendFact(fact("e1", "ville", "Valmure", 3));
      const all = await repo.getFigedAttributes(cid, asEntityID("e1"));
      expect(all).toHaveLength(2);
      expect(all.find(f => f.key === "metier")?.value).toEqual({ type: "STRING", value: "capitaine" });
      expect(await repo.queryFacts(cid, { attributeKey: "ville" })).toHaveLength(1);
      expect(await repo.queryFacts(cid, { entityId: asEntityID("e1"), minTurn: 3 })).toHaveLength(1);
      expect(await repo.queryFacts(cid, { category: "HISTORIQUE", maxTurn: 2 })).toHaveLength(1);
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
      expect((await repo.neighbors(cid, asEntityID("a"), 1)).map(n => String(n.node.entityId))).toEqual(["b"]);
      expect((await repo.neighbors(cid, asEntityID("b"), 1)).map(n => String(n.node.entityId))).toEqual(["a"]);
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
        await tx.appendFact(fact("ghost", "k", "v"));
        throw new Error("boom");
      })).rejects.toThrow("boom");
      expect(await repo.getEntity(cid, asEntityID("ghost"))).toBeNull();
      expect(await repo.getFigedAttributes(cid, asEntityID("ghost"))).toEqual([]);
    });
  });
}
