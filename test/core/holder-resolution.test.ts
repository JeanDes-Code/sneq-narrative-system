import { describe, it, expect } from "vitest";
import { resolveHolder } from "../../src/core/holder-resolution.js";
import type { Holder } from "../../src/domain/holder.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import { asCampaignId, asEntityID, asEventId, asHolderId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");
const DEFAULT = asHolderId("g-default");

const holders: Holder[] = [
  { kind: "GROUP", holderId: DEFAULT, campaignId: cid, community: "royaume", stratum: "commun", realmId: asEntityID("realm"), placeId: asEntityID("place"), standing: 0.3 },
  { kind: "INDIVIDUAL", holderId: asHolderId("h-declared"), campaignId: cid, entityId: asEntityID("bailli"), baseGroupId: DEFAULT, derogationReason: "PERSONAL_STAKE" },
];

function event(id: string, participants: string[]): NarrativeEvent {
  return {
    eventId: asEventId(id), campaignId: cid, day: 1, turn: 1, gravity: 1,
    acts: [{ actorId: asEntityID(participants[0]!), verb: "TALK" }],
    circumstance: "…", participants: participants.map(asEntityID), surfaceTokens: []
  };
}

describe("resolveHolder — the cascade (#21) with lazy auto-PARTICIPANT (#28)", () => {
  it("a declared INDIVIDUAL holder wins, and the reply names the road", () => {
    const r = resolveHolder(asEntityID("bailli"), { holders, events: [], defaultGroupId: DEFAULT });
    expect(r.holder.holderId).toBe(asHolderId("h-declared"));
    expect(r.road).toBe("DECLARED_INDIVIDUAL");
    expect(r.materialized).toBeUndefined();
  });

  it("a participant with no declared holder materializes an INDIVIDUAL lazily", () => {
    const r = resolveHolder(asEntityID("witness"), {
      holders, events: [event("e1", ["witness", "other"])], defaultGroupId: DEFAULT
    });
    expect(r.road).toBe("AUTO_PARTICIPANT");
    expect(r.holder.kind).toBe("INDIVIDUAL");
    if (r.holder.kind === "INDIVIDUAL") {
      expect(r.holder.derogationReason).toBe("PARTICIPANT");
      expect(r.holder.baseGroupId).toBe(DEFAULT);
      expect(String(r.holder.entityId)).toBe("witness");
    }
    // the materialized holder is returned for persistence — creation is the caller's write
    expect(r.materialized).toEqual(r.holder);
  });

  it("materialization is deterministic: same entity, same holderId, twice", () => {
    const input = { holders, events: [event("e1", ["witness"])], defaultGroupId: DEFAULT };
    const a = resolveHolder(asEntityID("witness"), input);
    const b = resolveHolder(asEntityID("witness"), input);
    expect(a.holder.holderId).toBe(b.holder.holderId);
  });

  it("a non-participant falls through to the campaign default group", () => {
    const r = resolveHolder(asEntityID("background-npc"), { holders, events: [event("e1", ["someone-else"])], defaultGroupId: DEFAULT });
    expect(r.road).toBe("DEFAULT_GROUP");
    expect(r.holder.holderId).toBe(DEFAULT);
    expect(r.materialized).toBeUndefined();
  });

  it("LEGACY_CANON participation does not derogate — the epoch is shared knowledge, not drama", () => {
    const legacy: NarrativeEvent = {
      ...event("evt_legacy_smith", ["smith"]),
      acts: [{ actorId: asEntityID("smith"), verb: "LEGACY_CANON" }]
    };
    const r = resolveHolder(asEntityID("smith"), { holders, events: [legacy], defaultGroupId: DEFAULT });
    expect(r.road).toBe("DEFAULT_GROUP");
  });

  it("throws loud when the default group itself is missing", () => {
    expect(() => resolveHolder(asEntityID("anyone"), { holders: [], events: [], defaultGroupId: DEFAULT }))
      .toThrow(/default group/i);
  });
});
