import { describe, it, expect } from "vitest";
import { deriveBeliefs, type BeliefWorld } from "../../src/core/derive-beliefs.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { Carriage, CarriageEffect } from "../../src/domain/carriage.js";
import type { Holder } from "../../src/domain/holder.js";
import {
  asCampaignId, asEntityID, asEventId, asRecordId, asHolderId, asCarriageId
} from "../../src/domain/ids.js";

const cid = asCampaignId("c1");
const REALM_COURONNE = asEntityID("realm-couronne");
const REALM_MARCHE = asEntityID("realm-marche");
const VALMURE = asEntityID("place-valmure");   // couronne
const SKARROW = asEntityID("place-skarrow");   // marche — across the border
const BOURG = asEntityID("place-bourg");       // couronne
const HAMEAU = asEntityID("place-hameau");     // couronne — reached only by the delayed carriage
const ACTOR = asEntityID("actor");

// ≥ 3 strata at the destination — a strong model reasons its way back up a
// social gradient; it cannot reason across a border (§7.2).
const holders: Holder[] = [
  { kind: "GROUP", holderId: asHolderId("g-default"), campaignId: cid, community: "royaume", stratum: "commun", realmId: REALM_COURONNE, placeId: VALMURE, standing: 0.3 },
  { kind: "GROUP", holderId: asHolderId("g-valmure-artisans"), campaignId: cid, community: "valmure", stratum: "artisans", realmId: REALM_COURONNE, placeId: VALMURE, standing: 0.5 },
  { kind: "GROUP", holderId: asHolderId("g-skarrow-notables"), campaignId: cid, community: "skarrow", stratum: "notables", realmId: REALM_MARCHE, placeId: SKARROW, standing: 0.9 },
  { kind: "GROUP", holderId: asHolderId("g-skarrow-artisans"), campaignId: cid, community: "skarrow", stratum: "artisans", realmId: REALM_MARCHE, placeId: SKARROW, standing: 0.5 },
  { kind: "GROUP", holderId: asHolderId("g-skarrow-manants"), campaignId: cid, community: "skarrow", stratum: "manants", realmId: REALM_MARCHE, placeId: SKARROW, standing: 0.2 },
  { kind: "GROUP", holderId: asHolderId("g-bourg"), campaignId: cid, community: "bourg", stratum: "commun", realmId: REALM_COURONNE, placeId: BOURG, standing: 0.5 },
  { kind: "GROUP", holderId: asHolderId("g-hameau"), campaignId: cid, community: "hameau", stratum: "commun", realmId: REALM_COURONNE, placeId: HAMEAU, standing: 0.5 },
  { kind: "INDIVIDUAL", holderId: asHolderId("h-actor"), campaignId: cid, entityId: ACTOR, baseGroupId: asHolderId("g-valmure-artisans"), derogationReason: "PARTICIPANT" },
  { kind: "INDIVIDUAL", holderId: asHolderId("h-player"), campaignId: cid, entityId: asEntityID("player"), baseGroupId: asHolderId("g-default"), derogationReason: "PLAYER" },
];

const tollEvent: NarrativeEvent = {
  eventId: asEventId("e-toll"), campaignId: cid, day: 2, turn: 5, placeId: VALMURE,
  gravity: 2,
  acts: [{ actorId: ACTOR, verb: "STRIKE", objectId: asEntityID("gabelou") }],
  circumstance: "Un coup de gourdin près de la barrière de la gabelle.",
  participants: [ACTOR, asEntityID("gabelou")],
  surfaceTokens: ["gourdin", "gabelle"]
};

const legacyEvent: NarrativeEvent = {
  eventId: asEventId("evt_legacy_smith"), campaignId: cid, day: 0, turn: 0, gravity: 0,
  acts: [{ actorId: asEntityID("smith"), verb: "LEGACY_CANON",
           sets: { entityId: asEntityID("smith"), key: "metier", value: { type: "STRING", value: "forgeron" }, category: "HISTORIQUE" } }],
  circumstance: "Legacy canon imported from the pre-0.5 fact store — the migration epoch (§4).",
  participants: [asEntityID("smith")],
  surfaceTokens: []
};

function carriage(id: string, over: Partial<Carriage>): Carriage {
  return {
    carriageId: asCarriageId(id), campaignId: cid,
    subject: { kind: "EVENT", id: asEventId("e-toll") },
    carrier: "un colporteur", route: "RUMOUR",
    fromPlaceId: VALMURE, toPlaceId: SKARROW,
    originRealm: REALM_COURONNE, destinationRealm: REALM_MARCHE,
    departedDay: 2, travelDays: 4, ...over
  };
}

const carriages: Carriage[] = [
  // OFFICIAL across the border — the structural halt, regardless of standing
  carriage("k-official-cross", { route: "OFFICIAL", carrier: "courrier royal", travelDays: 3 }),
  // RUMOUR across the border — crosses, but still waits for arrival (day 6); minStanding filters strata
  carriage("k-rumour-cross", { minStanding: 0.3 }),
  // OFFICIAL within the realm to Bourg — DELAY shifts arrival from 4 to 6
  carriage("k-delayed", { route: "OFFICIAL", carrier: "sergent à cheval", toPlaceId: HAMEAU, destinationRealm: REALM_COURONNE, travelDays: 2 }),
  // within realm, CANCELled — never arrives
  carriage("k-cancelled", { route: "OFFICIAL", carrier: "messager", toPlaceId: BOURG, destinationRealm: REALM_COURONNE, travelDays: 1 }),
  // within realm, DISCREDITed — arrival unchanged, fiabilite degraded
  carriage("k-discredited", { toPlaceId: BOURG, destinationRealm: REALM_COURONNE, travelDays: 1 }),
];

const effects: CarriageEffect[] = [
  { effectId: "fx-delay", campaignId: cid, carriageId: asCarriageId("k-delayed"), causedByEventId: asEventId("e-bribe"), day: 3, effect: { kind: "DELAY", days: 2 } },
  { effectId: "fx-cancel", campaignId: cid, carriageId: asCarriageId("k-cancelled"), causedByEventId: asEventId("e-ambush"), day: 3, effect: { kind: "CANCEL" } },
  { effectId: "fx-discredit", campaignId: cid, carriageId: asCarriageId("k-discredited"), causedByEventId: asEventId("e-rumeur"), day: 3, effect: { kind: "DISCREDIT" } },
];

const world: BeliefWorld = {
  events: [tollEvent, legacyEvent],
  records: [{
    recordId: asRecordId("r-verdict"), campaignId: cid, entityId: ACTOR,
    key: "verdict", value: { type: "STRING", value: "obstruction" }, category: "SOCIAL",
    authoredBy: asEntityID("bailli"), aboutEventId: asEventId("e-toll"), route: "OFFICIAL",
    observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
    day: 3, turn: 6, surfaceTokens: ["obstruction d'une levée légitime"]
  }],
  carriages: [...carriages,
    carriage("k-record", { subject: { kind: "RECORD", id: asRecordId("r-verdict") }, route: "OFFICIAL", carrier: "greffier", toPlaceId: BOURG, destinationRealm: REALM_COURONNE, departedDay: 3, travelDays: 1 })
  ],
  carriageEffects: effects,
  holders,
  defaultGroupId: asHolderId("g-default")
};

const knows = (holderId: string, today: number, subjectId: string) =>
  deriveBeliefs(world, asHolderId(holderId), today).find(b => String(b.subject.id) === subjectId);

describe("deriveBeliefs — the arrival matrix (§7.2)", () => {
  it("participants know immediately with WITNESSED", () => {
    const b = knows("h-actor", 2, "e-toll");
    expect(b).toBeDefined();
    expect(b!.certainty).toBe("WITNESSED");
    expect(b!.learnedOnDay).toBe(2);
  });

  it("nothing arrives early: day 5 delivers nothing to Skarrow, day 6 delivers what day 5 did not", () => {
    expect(knows("g-skarrow-notables", 5, "e-toll")).toBeUndefined();
    expect(knows("g-skarrow-notables", 6, "e-toll")).toBeDefined();
  });

  it("official halts at a realm border regardless of standing — only the rumour crosses", () => {
    const b = knows("g-skarrow-notables", 20, "e-toll");
    expect(b).toBeDefined();
    // the official carriage would have arrived day 5; the rumour arrives day 6.
    // If the official had leaked through, learnedOnDay would be 5.
    expect(b!.learnedOnDay).toBe(6);
    expect(b!.viaCarrier).toBe("un colporteur");
  });

  it("minStanding filters strata: manants (0.2 < 0.3) never learn from that rumour", () => {
    expect(knows("g-skarrow-manants", 20, "e-toll")).toBeUndefined();
    expect(knows("g-skarrow-artisans", 20, "e-toll")).toBeDefined();
  });

  it("DELAY shifts arrival: the hamlet learns on day 6, not day 4", () => {
    expect(knows("g-hameau", 5, "e-toll")).toBeUndefined();
    const b = knows("g-hameau", 6, "e-toll");
    expect(b).toBeDefined();
    expect(b!.learnedOnDay).toBe(6);
  });

  it("CANCEL kills: the cancelled messenger never delivers (arrival would have been day 3)", () => {
    // only k-delayed (day 6) and k-discredited (day 3) can reach Bourg with e-toll;
    // at day 5 the only possible source would have been the cancelled day-3 official
    // or the discredited day-3 rumour — the discredited one DID arrive day 3.
    const b = knows("g-bourg", 3, "e-toll");
    expect(b).toBeDefined();
    expect(b!.viaCarrier).toBe("un colporteur");   // the discredited rumour, not the cancelled official
  });

  it("DISCREDIT degrades fiabilite only — arrival day is untouched", () => {
    const b = knows("g-bourg", 3, "e-toll");
    expect(b!.learnedOnDay).toBe(3);
    expect(b!.fiabilite).toBe("RUMEUR_CONFIRMEE");
  });

  it("a local group witnesses events at its own place, same day", () => {
    const b = knows("g-valmure-artisans", 2, "e-toll");
    expect(b).toBeDefined();
    expect(b!.certainty).toBe("WITNESSED");
  });

  it("records travel too: Bourg holds the verdict once the greffier arrives", () => {
    expect(knows("g-bourg", 3, "r-verdict")).toBeUndefined();
    const b = knows("g-bourg", 4, "r-verdict");
    expect(b).toBeDefined();
    expect(b!.method).toBe("DOCUMENT");
  });

  it("LEGACY_CANON events are known to the default group and the player from day 0 (#17)", () => {
    expect(knows("g-default", 0, "evt_legacy_smith")?.certainty).toBe("WITNESSED");
    expect(knows("h-player", 0, "evt_legacy_smith")).toBeDefined();
    expect(knows("g-skarrow-notables", 20, "evt_legacy_smith")).toBeUndefined();
  });

  it("an individual inherits its base group's beliefs", () => {
    // h-actor's base is g-valmure-artisans; the record never reaches Valmure,
    // but the local toll event does — inherited, plus their own participation.
    const beliefs = deriveBeliefs(world, asHolderId("h-actor"), 10);
    expect(beliefs.some(b => String(b.subject.id) === "e-toll")).toBe(true);
    expect(beliefs.some(b => String(b.subject.id) === "r-verdict")).toBe(false);
  });

  it("beliefs are salience-ranked and carry the five factors", () => {
    const beliefs = deriveBeliefs(world, asHolderId("g-bourg"), 10);
    expect(beliefs.length).toBeGreaterThan(1);
    for (let i = 1; i < beliefs.length; i++) {
      expect(beliefs[i - 1]!.salience).toBeGreaterThanOrEqual(beliefs[i]!.salience);
    }
    expect(Object.keys(beliefs[0]!.factors).sort()).toEqual(
      ["gravity", "personalInvolvement", "propagationDelay", "recency", "socialPosition"]
    );
  });
});
