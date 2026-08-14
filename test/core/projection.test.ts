import { describe, it, expect } from "vitest";
import { rebuildProjection } from "../../src/core/projection.js";
import { SneqContradictionError } from "../../src/errors.js";
import type { NarrativeEvent, ActEffect } from "../../src/domain/event.js";
import type { ProvisionalInvention, InventionTransition } from "../../src/domain/invention.js";
import type { CanonicalAttribute } from "../../src/domain/attribute.js";
import {
  asCampaignId, asEntityID, asEventId, asFactId, asInventionId
} from "../../src/domain/ids.js";

const cid = asCampaignId("c1");
const actor = asEntityID("actor");

function sets(key: string, value: string): ActEffect {
  return { entityId: actor, key, value: { type: "STRING", value }, category: "ETAT" };
}

function event(id: string, day: number, turn: number, effects: ActEffect[], over: Partial<NarrativeEvent> = {}): NarrativeEvent {
  return {
    eventId: asEventId(id), campaignId: cid, day, turn, gravity: 1,
    acts: effects.map(fx => ({ actorId: actor, verb: "DECLARE", sets: fx })),
    circumstance: "…", participants: [actor], surfaceTokens: [], ...over
  };
}

function promoted(id: string, key: string, value: string, atDay: number, atTurn: number): {
  invention: ProvisionalInvention; transition: InventionTransition;
} {
  return {
    invention: {
      inventionId: asInventionId(id), campaignId: cid, entityId: actor,
      attributeKey: key, value: { type: "STRING", value }, category: "IDENTITE",
      sourceNarration: "…", confidence: 0.7, introducedAtTurn: 1, introducedOnDay: 0,
      status: "PROMOTED", lastReferencedTurn: atTurn, surfaceTokens: []
    },
    transition: {
      inventionId: asInventionId(id), campaignId: cid, from: "PROVISIONAL", to: "PROMOTED",
      atDay, atTurn, evidence: { kind: "PLAYER_UPTAKE", eventId: asEventId("e-up") }
    }
  };
}

function legacy(key: string, value: string): CanonicalAttribute {
  return {
    factId: asFactId(`legacy_${key}`), entityId: actor, key,
    value: { type: "STRING", value }, category: "HISTORIQUE",
    turn: 0, day: 0, source: { kind: "LEGACY_FACT" }
  };
}

const byKey = (rows: CanonicalAttribute[], key: string) => rows.find(r => r.key === key && r.entityId === actor);

describe("rebuildProjection — the deterministic fold (#27)", () => {
  it("an act projects only through sets; a verb alone projects nothing", () => {
    const rows = rebuildProjection({
      events: [event("e1", 1, 1, [sets("statut", "libre")], {
        acts: [
          { actorId: actor, verb: "WALKS" },
          { actorId: actor, verb: "DECLARE", sets: sets("statut", "libre") }
        ]
      })],
      promotions: [], legacy: []
    });
    expect(rows).toHaveLength(1);
    expect(byKey(rows, "statut")?.value).toEqual({ type: "STRING", value: "libre" });
    expect(byKey(rows, "statut")?.source).toEqual({ kind: "EVENT", eventId: asEventId("e1") });
    expect(byKey(rows, "statut")?.day).toBe(1);
  });

  it("replace-on-key is state evolution: last writer by (day, turn, ledger seq) wins", () => {
    const rows = rebuildProjection({
      events: [
        event("e1", 1, 1, [sets("statut", "libre")]),
        event("e2", 1, 2, [sets("statut", "geôle")]),
        event("e3", 2, 3, [sets("metier", "forgeron")])
      ],
      promotions: [], legacy: []
    });
    expect(rows).toHaveLength(2);
    expect(byKey(rows, "statut")?.value).toEqual({ type: "STRING", value: "geôle" });
    expect(byKey(rows, "statut")?.source).toEqual({ kind: "EVENT", eventId: asEventId("e2") });
  });

  it("ledger order breaks (day, turn) ties", () => {
    const rows = rebuildProjection({
      events: [
        event("e1", 1, 1, [sets("statut", "libre")]),
        event("e2", 1, 1, [sets("statut", "geôle")])
      ],
      promotions: [], legacy: []
    });
    expect(byKey(rows, "statut")?.value).toEqual({ type: "STRING", value: "geôle" });
  });

  it("same key, different values, ONE event → SneqContradictionError; same value is idempotent", () => {
    expect(() => rebuildProjection({
      events: [event("e1", 1, 1, [sets("statut", "libre"), sets("statut", "geôle")])],
      promotions: [], legacy: []
    })).toThrow(SneqContradictionError);
    const rows = rebuildProjection({
      events: [event("e1", 1, 1, [sets("statut", "libre"), sets("statut", "libre")])],
      promotions: [], legacy: []
    });
    expect(rows).toHaveLength(1);
  });

  it("a promotion projects with source PROMOTED_INVENTION at its transition day", () => {
    const rows = rebuildProjection({
      events: [], promotions: [promoted("i1", "nom", "Aldo", 3, 7)], legacy: []
    });
    expect(byKey(rows, "nom")?.value).toEqual({ type: "STRING", value: "Aldo" });
    expect(byKey(rows, "nom")?.source).toEqual({ kind: "PROMOTED_INVENTION", inventionId: asInventionId("i1") });
    expect(byKey(rows, "nom")?.day).toBe(3);
  });

  it("producers interleave on the same timeline: a later event set overrides an earlier promotion", () => {
    const rows = rebuildProjection({
      events: [event("e1", 5, 9, [sets("nom", "Aldormar")])],
      promotions: [promoted("i1", "nom", "Aldo", 3, 7)],
      legacy: []
    });
    expect(byKey(rows, "nom")?.value).toEqual({ type: "STRING", value: "Aldormar" });
  });

  it("legacy rows seed the projection and any later producer overrides them", () => {
    const rows = rebuildProjection({
      events: [event("e1", 1, 1, [sets("metier", "capitaine")])],
      promotions: [],
      legacy: [legacy("metier", "forgeron"), legacy("ville", "Valmure")]
    });
    expect(byKey(rows, "metier")?.value).toEqual({ type: "STRING", value: "capitaine" });
    expect(byKey(rows, "ville")?.value).toEqual({ type: "STRING", value: "Valmure" });
    expect(byKey(rows, "ville")?.source).toEqual({ kind: "LEGACY_FACT" });
  });

  it("only PROMOTED transitions project — REJECTED and SUPERSEDED do not", () => {
    const rejected = promoted("i1", "nom", "Aldo", 3, 7);
    rejected.transition.to = "REJECTED";
    rejected.invention.status = "REJECTED";
    expect(rebuildProjection({ events: [], promotions: [rejected], legacy: [] })).toEqual([]);
  });

  it("is deterministic: same inputs, same output, twice", () => {
    const inputs = {
      events: [event("e1", 1, 1, [sets("statut", "libre")]), event("e2", 2, 2, [sets("metier", "forgeron")])],
      promotions: [promoted("i1", "nom", "Aldo", 3, 7)],
      legacy: [legacy("ville", "Valmure")]
    };
    expect(rebuildProjection(inputs)).toEqual(rebuildProjection(inputs));
  });
});
