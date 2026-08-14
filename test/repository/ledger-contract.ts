import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Repository } from "../../src/repository/interface.js";
import { OPERATION_RETENTION } from "../../src/repository/interface.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { OfficialRecord } from "../../src/domain/record.js";
import type { GroupHolder, IndividualHolder } from "../../src/domain/holder.js";
import type { Carriage, CarriageEffect } from "../../src/domain/carriage.js";
import type { ProvisionalInvention } from "../../src/domain/invention.js";
import {
  asCampaignId, asEntityID, asEventId, asRecordId, asHolderId,
  asCarriageId, asInventionId
} from "../../src/domain/ids.js";

const DIM = 4;
const cid = asCampaignId("c1");

function event(id: string, over: Partial<NarrativeEvent> = {}): NarrativeEvent {
  return {
    eventId: asEventId(id), campaignId: cid, day: 1, turn: 1, gravity: 1,
    acts: [{ actorId: asEntityID("actor"), verb: "STRIKE", objectId: asEntityID("target") }],
    circumstance: "Un coup de gourdin près de la barrière.",
    participants: [asEntityID("actor"), asEntityID("target")],
    surfaceTokens: ["gourdin", "gabelle"],
    ...over
  };
}

function record(id: string, over: Partial<OfficialRecord> = {}): OfficialRecord {
  return {
    recordId: asRecordId(id), campaignId: cid, entityId: asEntityID("actor"),
    key: "verdict", value: { type: "STRING", value: "obstruction" }, category: "SOCIAL",
    authoredBy: asEntityID("bailli"), route: "OFFICIAL",
    observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
    day: 2, turn: 3, surfaceTokens: ["obstruction d'une levée légitime"],
    ...over
  };
}

function group(id: string, over: Partial<GroupHolder> = {}): GroupHolder {
  return {
    kind: "GROUP", holderId: asHolderId(id), campaignId: cid,
    community: "valmure", stratum: "artisans",
    realmId: asEntityID("realm-default"), placeId: asEntityID("place-valmure"),
    standing: 0.5, ...over
  };
}

function carriage(id: string, over: Partial<Carriage> = {}): Carriage {
  return {
    carriageId: asCarriageId(id), campaignId: cid,
    subject: { kind: "EVENT", id: asEventId("e1") },
    carrier: "courrier royal", route: "OFFICIAL",
    fromPlaceId: asEntityID("place-a"), toPlaceId: asEntityID("place-b"),
    originRealm: asEntityID("realm-default"), destinationRealm: asEntityID("realm-default"),
    departedDay: 2, travelDays: 3, ...over
  };
}

function invention(id: string, over: Partial<ProvisionalInvention> = {}): ProvisionalInvention {
  return {
    inventionId: asInventionId(id), campaignId: cid, entityId: asEntityID("passeur"),
    attributeKey: "nom", value: { type: "STRING", value: "Aldo" }, category: "IDENTITE",
    sourceNarration: "Le passeur, un dénommé Aldo…", confidence: 0.7,
    introducedAtTurn: 4, introducedOnDay: 2, status: "PROVISIONAL",
    lastReferencedTurn: 4, surfaceTokens: ["Aldo", "le bac"], ...over
  };
}

/**
 * Ledger contract (§7.1, 0.5.0): append-only events/records, holders,
 * carriages + derived arrival, inventions + transitions, world clock,
 * operation dedup ring (#29), dispatch policy home (#15).
 */
export function ledgerContract(name: string, makeRepo: () => Repository | Promise<Repository>): void {
  describe(`Ledger contract · ${name}`, () => {
    let repo: Repository;
    beforeEach(async () => {
      repo = await makeRepo();
      await repo.createCampaign({ id: cid, name: "Ledger", createdAt: 0, embeddingDim: DIM });
    });
    afterEach(async () => { await repo.close(); });

    // -- events ---------------------------------------------------------------

    it("events append-only: both remain queryable, ordered by (day, turn, seq)", async () => {
      await repo.appendEvent(event("e2", { day: 2, turn: 1 }));
      await repo.appendEvent(event("e1", { day: 1, turn: 9 }));
      await repo.appendEvent(event("e3", { day: 2, turn: 1, circumstance: "later same tick" }));
      const all = await repo.getEvents(cid);
      expect(all.map(e => String(e.eventId))).toEqual(["e1", "e2", "e3"]);
    });

    it("event round-trip preserves acts, sets, surfaceTokens, gravity, place", async () => {
      await repo.appendEvent(event("e1", {
        placeId: asEntityID("place-a"), gravity: 3,
        acts: [{
          actorId: asEntityID("bailli"), verb: "SENTENCE", objectId: asEntityID("actor"),
          value: { type: "NUMBER", value: 4 },
          sets: { entityId: asEntityID("actor"), key: "statut", value: { type: "STRING", value: "geôle" }, category: "ETAT" }
        }],
        surfaceTokens: ["quatre jours de geôle"]
      }));
      const [e] = await repo.getEvents(cid);
      expect(e!.acts[0]!.sets?.key).toBe("statut");
      expect(e!.acts[0]!.value).toEqual({ type: "NUMBER", value: 4 });
      expect(e!.surfaceTokens).toEqual(["quatre jours de geôle"]);
      expect(e!.gravity).toBe(3);
      expect(String(e!.placeId)).toBe("place-a");
    });

    it("no event mutation path exists on the repository surface", () => {
      const names: string[] = [];
      let o: object | null = repo;
      while (o && o !== Object.prototype) {
        names.push(...Object.getOwnPropertyNames(o));
        o = Object.getPrototypeOf(o) as object | null;
      }
      const mutators = names.filter(n => /^(update|delete|remove|set|replace|mutate).*event/i.test(n));
      expect(mutators).toEqual([]);
    });

    it("a returned event is a copy — mutating it does not touch the store", async () => {
      await repo.appendEvent(event("e1"));
      const [e] = await repo.getEvents(cid);
      e!.surfaceTokens.push("intrus");
      (e!.acts[0]! as { verb: string }).verb = "TAMPERED";
      const [again] = await repo.getEvents(cid);
      expect(again!.surfaceTokens).toEqual(["gourdin", "gabelle"]);
      expect(again!.acts[0]!.verb).toBe("STRIKE");
    });

    it("rejects a duplicate eventId instead of silently replacing", async () => {
      await repo.appendEvent(event("e1"));
      await expect(repo.appendEvent(event("e1", { circumstance: "rewrite attempt" })))
        .rejects.toThrow(/already exists/i);
    });

    // -- records --------------------------------------------------------------

    it("records accumulate: same entity+key never replaces", async () => {
      await repo.appendRecord(record("r1", { day: 2 }));
      await repo.appendRecord(record("r2", { day: 5, value: { type: "STRING", value: "grâce" } }));
      const all = await repo.getRecords(cid);
      expect(all).toHaveLength(2);
      expect(all.map(r => String(r.recordId))).toEqual(["r1", "r2"]);
    });

    // -- holders --------------------------------------------------------------

    it("holders round-trip both kinds; upsert replaces by holderId", async () => {
      const ind: IndividualHolder = {
        kind: "INDIVIDUAL", holderId: asHolderId("h-ind"), campaignId: cid,
        entityId: asEntityID("actor"), baseGroupId: asHolderId("h-grp"),
        derogationReason: "PARTICIPANT"
      };
      await repo.upsertHolder(group("h-grp"));
      await repo.upsertHolder(ind);
      await repo.upsertHolder(group("h-grp", { standing: 0.9 }));
      const all = await repo.listHolders(cid);
      expect(all).toHaveLength(2);
      const grp = all.find(h => h.kind === "GROUP") as GroupHolder;
      expect(grp.standing).toBe(0.9);
      expect(String(grp.realmId)).toBe("realm-default");
      const got = all.find(h => h.kind === "INDIVIDUAL") as IndividualHolder;
      expect(got.derogationReason).toBe("PARTICIPANT");
    });

    // -- carriages + derived arrival -----------------------------------------

    it("listCarriages filters by toPlaceId and arrivedBy = departedDay + travelDays + Σ delays", async () => {
      await repo.appendCarriage(carriage("k1"));                                  // arrives day 5 at place-b
      await repo.appendCarriage(carriage("k2", { toPlaceId: asEntityID("place-c") }));
      expect((await repo.listCarriages(cid, { toPlaceId: asEntityID("place-b") })).map(c => String(c.carriageId))).toEqual(["k1"]);
      expect(await repo.listCarriages(cid, { arrivedBy: 4 })).toEqual([]);
      expect((await repo.listCarriages(cid, { arrivedBy: 5 })).map(c => String(c.carriageId))).toEqual(["k1", "k2"]);
    });

    it("DELAY shifts arrival; CANCEL never arrives", async () => {
      await repo.appendCarriage(carriage("k1"));
      await repo.appendCarriageEffect({
        effectId: "fx1", campaignId: cid, carriageId: asCarriageId("k1"),
        causedByEventId: asEventId("e-bribe"), day: 3, effect: { kind: "DELAY", days: 2 }
      });
      expect(await repo.listCarriages(cid, { arrivedBy: 5 })).toEqual([]);
      expect((await repo.listCarriages(cid, { arrivedBy: 7 })).map(c => String(c.carriageId))).toEqual(["k1"]);
      await repo.appendCarriageEffect({
        effectId: "fx2", campaignId: cid, carriageId: asCarriageId("k1"),
        causedByEventId: asEventId("e-ambush"), day: 4, effect: { kind: "CANCEL" }
      });
      expect(await repo.listCarriages(cid, { arrivedBy: 100 })).toEqual([]);
    });

    it("carriage effects are append-only and readable per carriage", async () => {
      await repo.appendCarriage(carriage("k1"));
      const fx: CarriageEffect = {
        effectId: "fx1", campaignId: cid, carriageId: asCarriageId("k1"),
        causedByEventId: asEventId("e-bribe"), day: 3, effect: { kind: "DISCREDIT" }
      };
      await repo.appendCarriageEffect(fx);
      expect(await repo.listCarriageEffects(cid, asCarriageId("k1"))).toEqual([fx]);
    });

    // -- inventions + transitions --------------------------------------------

    it("inventions: append, filter by status; a transition updates the row's status", async () => {
      await repo.appendInvention(invention("i1"));
      await repo.appendInvention(invention("i2", { attributeKey: "cicatrice" }));
      expect(await repo.listInventions(cid, "PROVISIONAL")).toHaveLength(2);
      await repo.appendInventionTransition({
        inventionId: asInventionId("i1"), campaignId: cid,
        from: "PROVISIONAL", to: "PROMOTED", atDay: 2, atTurn: 9,
        evidence: { kind: "PLAYER_UPTAKE", eventId: asEventId("e-uptake") }
      });
      expect((await repo.listInventions(cid, "PROMOTED")).map(i => String(i.inventionId))).toEqual(["i1"]);
      expect(await repo.listInventions(cid, "PROVISIONAL")).toHaveLength(1);
      const transitions = await repo.listInventionTransitions(cid, asInventionId("i1"));
      expect(transitions).toHaveLength(1);
      expect(transitions[0]!.evidence?.kind).toBe("PLAYER_UPTAKE");
    });

    // -- world clock ----------------------------------------------------------

    it("world day: starts at 0, set/get round-trips, never runs backwards", async () => {
      expect(await repo.getWorldDay(cid)).toBe(0);
      await repo.setWorldDay(cid, 7);
      expect(await repo.getWorldDay(cid)).toBe(7);
      await expect(repo.setWorldDay(cid, 3)).rejects.toThrow(/backward/i);
    });

    // -- operations ring (#29) ------------------------------------------------

    it("operation dedup: findOperation returns what recordOperation stored, null otherwise", async () => {
      expect(await repo.findOperation(cid, "op-1")).toBeNull();
      await repo.recordOperation(cid, "op-1", { committed: true });
      expect(await repo.findOperation(cid, "op-1")).toEqual({ committed: true });
    });

    it("operation ring is bounded: the oldest entry falls out past retention", async () => {
      for (let i = 0; i < OPERATION_RETENTION + 1; i++) {
        await repo.recordOperation(cid, `op-${i}`, { i });
      }
      expect(await repo.findOperation(cid, "op-0")).toBeNull();
      expect(await repo.findOperation(cid, `op-${OPERATION_RETENTION}`)).toEqual({ i: OPERATION_RETENTION });
    });

    // -- dispatch policy (#15) ------------------------------------------------

    it("dispatch policy: empty by default, set/get round-trips", async () => {
      expect(await repo.getDispatchPolicy(cid)).toEqual({ routes: [], rules: [] });
      const policy = {
        routes: [{ fromPlaceId: asEntityID("place-a"), toPlaceId: asEntityID("place-b"), travelDays: 3, route: "OFFICIAL" as const }],
        rules: [{ minGravity: 2 as const, route: "RUMOUR" as const, targets: "ALL_KNOWN_COMMUNITIES" as const, carrierLabel: "une caravane marchande" }]
      };
      await repo.setDispatchPolicy(cid, policy);
      expect(await repo.getDispatchPolicy(cid)).toEqual(policy);
    });

    // -- campaign scoping -----------------------------------------------------

    it("ledger writes reject a missing campaign", async () => {
      await repo.deleteCampaign(cid);
      const missing = /campaign "c1" not found/i;
      await expect(repo.appendEvent(event("e1"))).rejects.toThrow(missing);
      await expect(repo.appendRecord(record("r1"))).rejects.toThrow(missing);
      await expect(repo.upsertHolder(group("h1"))).rejects.toThrow(missing);
      await expect(repo.appendCarriage(carriage("k1"))).rejects.toThrow(missing);
      await expect(repo.appendInvention(invention("i1"))).rejects.toThrow(missing);
      await expect(repo.setWorldDay(cid, 1)).rejects.toThrow(missing);
      await expect(repo.setDispatchPolicy(cid, { routes: [], rules: [] })).rejects.toThrow(missing);
    });

    it("deleteCampaign purges the whole ledger", async () => {
      await repo.appendEvent(event("e1"));
      await repo.appendRecord(record("r1"));
      await repo.upsertHolder(group("h1"));
      await repo.appendCarriage(carriage("k1"));
      await repo.appendInvention(invention("i1"));
      await repo.setWorldDay(cid, 5);
      await repo.deleteCampaign(cid);
      await repo.createCampaign({ id: cid, name: "Ledger", createdAt: 0, embeddingDim: DIM });
      expect(await repo.getEvents(cid)).toEqual([]);
      expect(await repo.getRecords(cid)).toEqual([]);
      expect(await repo.listHolders(cid)).toEqual([]);
      expect(await repo.listCarriages(cid, {})).toEqual([]);
      expect(await repo.listInventions(cid)).toEqual([]);
      expect(await repo.getWorldDay(cid)).toBe(0);
    });

    // -- transactions cover the ledger ---------------------------------------

    it("a throwing transaction rolls back ledger writes", async () => {
      await expect(repo.transaction(async tx => {
        await tx.appendEvent(event("ghost"));
        await tx.appendRecord(record("ghost-r"));
        await tx.setWorldDay(cid, 9);
        throw new Error("boom");
      })).rejects.toThrow("boom");
      expect(await repo.getEvents(cid)).toEqual([]);
      expect(await repo.getRecords(cid)).toEqual([]);
      expect(await repo.getWorldDay(cid)).toBe(0);
    });
  });
}
