import { describe, it, expect } from "vitest";
import { worldHealth, tick } from "../../src/core/tick.js";
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { Carriage } from "../../src/domain/carriage.js";
import type { OfficialRecord } from "../../src/domain/record.js";
import { asCampaignId, asEntityID, asEventId, asRecordId, asCarriageId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

function event(id: string, day: number): NarrativeEvent {
  return {
    eventId: asEventId(id), campaignId: cid, day, turn: 1, gravity: 1,
    acts: [{ actorId: asEntityID("a"), verb: "TALK" }],
    circumstance: "…", participants: [asEntityID("a")], surfaceTokens: []
  };
}

function carriage(id: string, departedDay: number, travelDays: number): Carriage {
  return {
    carriageId: asCarriageId(id), campaignId: cid,
    subject: { kind: "EVENT", id: asEventId("e1") }, carrier: "c", route: "RUMOUR",
    fromPlaceId: asEntityID("a"), toPlaceId: asEntityID("b"),
    originRealm: asEntityID("r"), destinationRealm: asEntityID("r"),
    departedDay, travelDays
  };
}

function record(id: string, source: OfficialRecord["observation"]["source"]): OfficialRecord {
  return {
    recordId: asRecordId(id), campaignId: cid, entityId: asEntityID("a"),
    key: "k", value: { type: "STRING", value: "v" }, category: "SOCIAL",
    authoredBy: asEntityID("b"), route: "OFFICIAL",
    observation: { source, method: "DOCUMENT", timestamp: 0 },
    day: 1, turn: 1, surfaceTokens: []
  };
}

describe("worldHealth — the §6.1 counters the commit cannot see", () => {
  it("frozen clock: K commits on one day while a carriage is still on the road (#20)", () => {
    const h = worldHealth({
      events: [event("e1", 2), event("e2", 2), event("e3", 2)],
      carriages: [carriage("k1", 2, 10)], carriageEffects: [], records: [],
      worldDay: 2, k: 3
    });
    expect(h.frozenClock).toBe(true);
    expect(h.inTransit).toBe(1);
  });

  it("a moving clock is never frozen, whatever is in transit", () => {
    const h = worldHealth({
      events: [event("e1", 1), event("e2", 2), event("e3", 3)],
      carriages: [carriage("k1", 2, 10)], carriageEffects: [], records: [],
      worldDay: 3, k: 3
    });
    expect(h.frozenClock).toBe(false);
  });

  it("no carriages in transit → not frozen, even on a still day", () => {
    const h = worldHealth({
      events: [event("e1", 2), event("e2", 2), event("e3", 2)],
      carriages: [carriage("k1", 0, 1)], carriageEffects: [], records: [],
      worldDay: 2, k: 3
    });
    expect(h.inTransit).toBe(0);
    expect(h.frozenClock).toBe(false);
  });

  it("fewer than K commits never trips the detector", () => {
    const h = worldHealth({
      events: [event("e1", 2)], carriages: [carriage("k1", 2, 10)],
      carriageEffects: [], records: [], worldDay: 2, k: 3
    });
    expect(h.frozenClock).toBe(false);
  });

  it("counts OUT_OF_BAND records — the audited escape hatch (#22)", () => {
    const h = worldHealth({
      events: [], carriages: [], carriageEffects: [],
      records: [record("r1", "OUT_OF_BAND"), record("r2", "SYSTEM")],
      worldDay: 1, k: 3
    });
    expect(h.outOfBandRecords).toBe(1);
  });
});

describe("tick — the out-of-band road (§11 H, #20)", () => {
  it("advances the world day and returns the health report", async () => {
    const repo = new InMemoryRepository({ embeddingDim: 0 });
    await repo.createCampaign({ id: cid, name: "T", createdAt: 0, embeddingDim: 0 });
    const r = await tick(repo, cid, { days: 3 });
    expect(r.worldDay).toBe(3);
    expect(await repo.getWorldDay(cid)).toBe(3);
    expect(r.health.frozenClock).toBe(false);
  });
});
