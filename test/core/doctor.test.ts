import { describe, it, expect } from "vitest";
import { runDoctor, type DoctorInput, type DoctorReport } from "../../src/core/doctor.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { Holder } from "../../src/domain/holder.js";
import { asCampaignId, asConstraintId, asEntityID, asEventId, asHolderId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

const defaultGroup: Holder = {
  kind: "GROUP", holderId: asHolderId("h_default_group"), campaignId: cid,
  community: "default", stratum: "commun", realmId: asEntityID("realm_default"),
  placeId: asEntityID("place_default"), standing: 0.5
};

function event(turn: number, gravity: NarrativeEvent["gravity"] = 1): NarrativeEvent {
  return {
    eventId: asEventId(`ev${turn}`), campaignId: cid, day: turn, turn, gravity,
    acts: [], circumstance: "something happened", participants: [], surfaceTokens: []
  };
}

/** n events, gravities cycled from the pattern — enough of them to clear the sample floor. */
function eventsWithGravity(pattern: Array<NarrativeEvent["gravity"]>, n = 12): NarrativeEvent[] {
  return Array.from({ length: n }, (_, i) => event(i + 1, pattern[i % pattern.length]!));
}

function input(over: Partial<DoctorInput> = {}): DoctorInput {
  return {
    campaignId: "c1", day: 3, turn: 3,
    scene: null, sceneEntityResolution: [],
    events: [event(3)], holders: [defaultGroup],
    potentialites: [], migrationFindings: [], publicEntities: [],
    health: { inTransit: 0, frozenClock: false, outOfBandRecords: 0 },
    ...over
  };
}

const check = (r: DoctorReport, id: string) => r.checks.find(c => c.id === id)!;

describe("runDoctor · the grimoire bug, caught on day one", () => {
  it("FAILs when a scene names an id the campaign does not know", () => {
    const r = runDoctor(input({
      scene: {
        campaignId: cid, id: "s1" as never, locationId: asEntityID("la taverne du Cerf"),
        presentEntityIds: [asEntityID("e_known")], description: "d", createdAtTurn: 1
      },
      sceneEntityResolution: [
        { entityId: asEntityID("la taverne du Cerf"), known: false },
        { entityId: asEntityID("e_known"), known: true }
      ]
    }));
    const c = check(r, "entity-ids-resolve");
    expect(c.status).toBe("FAIL");
    expect(c.message).toMatch(/la taverne du Cerf/);
    expect(c.message).toMatch(/sneq__mention_entity/);
    expect(r.status).toBe("FAIL");
  });

  it("FAILs a declared scene with nobody in it — the silent-drop signature", () => {
    const r = runDoctor(input({
      scene: {
        campaignId: cid, id: "s1" as never, locationId: asEntityID("e_known"),
        presentEntityIds: [], description: "d", createdAtTurn: 1
      },
      sceneEntityResolution: [{ entityId: asEntityID("e_known"), known: true }]
    }));
    expect(check(r, "scene-populated").status).toBe("FAIL");
  });

  it("WARNs rather than guessing when no scene is declared", () => {
    const c = check(runDoctor(input()), "scene-populated");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/never guess/i);
  });
});

describe("runDoctor · narration outruns the ledger (§6.2)", () => {
  it("FAILs when turns have passed and nothing was ever committed", () => {
    const c = check(runDoctor(input({ events: [], turn: 7 })), "ledger-fresh");
    expect(c.status).toBe("FAIL");
    expect(c.message).toMatch(/sneq__commit_narrative/);
  });

  it("a fresh campaign with no turns and no events is not a failure", () => {
    expect(check(runDoctor(input({ events: [], turn: 0 })), "ledger-fresh").status).toBe("WARN");
  });

  it("WARNs when the last event is further back than the staleness window", () => {
    const c = check(runDoctor(input({ events: [event(1)], turn: 20, staleAfterTurns: 5 })), "ledger-fresh");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/outrunning the ledger/);
  });
});

describe("runDoctor · the seam itself", () => {
  // The load-bearing sentence: a leak requires information the API never handed
  // over. That is only true while no omniscient read is advertised.
  it("PASSes because no omniscient read is on the advertised tool surface", () => {
    const c = check(runDoctor(input()), "no-omniscient-read");
    expect(c.status).toBe("PASS");
    expect(c.message).toMatch(/never handed over/);
  });

  it("FAILs when the campaign has no holders at all", () => {
    expect(check(runDoctor(input({ holders: [] })), "holders-present").status).toBe("FAIL");
  });
});

describe("runDoctor · the 2026-08-14 lines", () => {
  it("FAILs a frozen clock while carriages are in transit (#20)", () => {
    const c = check(runDoctor(input({
      health: { inTransit: 2, frozenClock: true, outOfBandRecords: 0 }
    })), "clock-moving");
    expect(c.status).toBe("FAIL");
    expect(c.message).toMatch(/never land/);
    expect(c.message).toMatch(/daysElapsed: 0/);
  });

  it("counts OUT_OF_BAND records without locking the hatch (#22)", () => {
    const c = check(runDoctor(input({
      health: { inTransit: 0, frozenClock: false, outOfBandRecords: 4 }
    })), "out-of-band-audited");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/sanctioned road, not an exception/);
  });

  it("names quarantined constraints as a data bug awaiting repair (#23)", () => {
    const c = check(runDoctor(input({
      potentialites: [{
        entiteId: asEntityID("e1"), attribut: "metier", etat: "CONTRAINT",
        contraintes: [{
          id: asConstraintId("c-bad"), source: { kind: "REGLE_MONDE", ruleId: "r1" },
          createdAt: 0, regle: { type: "DOIT_ETRE", valeurs: [] },
          justificationNarrative: "j", status: "QUARANTINED"
        }],
        contexteGeneratif: { categorieAttribut: "SOCIAL", tendances: [] }
      }]
    })), "no-quarantined-constraints");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/never a permanent state/);
    expect(c.message).toMatch(/c-bad/);
  });

  it("WARNs on a map hole: rules that fire with no route to travel (#15)", () => {
    const c = check(runDoctor(input({ dispatch: { uncovered: 0, unroutable: 3, truncated: 0 } })), "dispatch-health");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/map hole/);
    expect(c.message).toMatch(/set-dispatch-policy/);
  });

  it("surfaces the migration audit's findings, which were flagged and never fixed", () => {
    const c = check(runDoctor(input({
      migrationFindings: [{
        campaignId: cid, entityId: asEntityID("e1"), attributeKey: "metier",
        constraintId: "c1", kind: "EMPTY_DOIT_ETRE", detail: "d"
      }]
    })), "migration-findings");
    expect(c.status).toBe("WARN");
    expect(c.message).toMatch(/EMPTY_DOIT_ETRE/);
  });
});

describe("runDoctor · what it cannot see", () => {
  // Said out loud rather than quietly dropped: a checklist that hides its own
  // blind spots reads as coverage it does not have.
  it("reports the two unmeasurable lines as INFO, and they do not move the verdict", () => {
    const r = runDoctor(input());
    expect(check(r, "containment-assertions").status).toBe("INFO");
    expect(check(r, "belief-cache").status).toBe("INFO");
    expect(r.status).not.toBe("FAIL");
  });

  // Every public entity is a deliberate hole in the floor. Counting them is the
  // whole point: a person or a secret should never be on this list.
  it("counts the authored exemptions, and says what an empty list costs", () => {
    const none = check(runDoctor(input()), "public-entities");
    expect(none.status).toBe("INFO");
    expect(none.message).toMatch(/block prompts that merely describe where the player is standing/);

    const some = check(runDoctor(input({
      publicEntities: [{ entityId: asEntityID("place_forge"), name: "La Forge" }]
    })), "public-entities");
    expect(some.message).toMatch(/La Forge/);
    expect(some.message).toMatch(/only the name is not/);
  });

  it("rolls up to the worst real status", () => {
    expect(runDoctor(input({ scene: null })).status).toBe("WARN");
    expect(runDoctor(input({ holders: [] })).status).toBe("FAIL");
  });

  /**
   * Gravity is the model's to answer and nothing in the ledger can derive it —
   * a 0–3 band is a closed question, which is the shape the consuming doctrine
   * licenses. But it is 40% of salience and gates all auto-dispatch, and no
   * counter ever looked at the answers. Count it, do not police it (#46).
   */
  describe("gravity-distribution", () => {
    it("PASSes on a spread, and shows the histogram", () => {
      const c = check(runDoctor(input({ events: eventsWithGravity([0, 1, 2, 3]) })), "gravity-distribution");
      expect(c.status).toBe("PASS");
      expect(c.message).toMatch(/0:3\s+1:3\s+2:3\s+3:3/);
    });

    it("WARNs when every event is gravity 0 — dispatch never fires and the world goes deaf", () => {
      const c = check(runDoctor(input({ events: eventsWithGravity([0]) })), "gravity-distribution");
      expect(c.status).toBe("WARN");
      expect(c.message).toMatch(/dispatch/i);
    });

    it("WARNs when every event is top band — the fan-out cap does the thinking", () => {
      const c = check(runDoctor(input({ events: eventsWithGravity([3]) })), "gravity-distribution");
      expect(c.status).toBe("WARN");
      expect(c.message).toMatch(/fan-out cap/);
    });

    it("a lopsided-but-not-degenerate campaign is nobody's business", () => {
      const c = check(runDoctor(input({ events: eventsWithGravity([0, 0, 0, 0, 0, 1]) })), "gravity-distribution");
      expect(c.status).toBe("PASS");
    });

    // A quiet afternoon is not a deaf world. Below the floor it reports and
    // judges nothing, so a fresh campaign does not open with a warning.
    it("reports without judging below the sample floor", () => {
      const c = check(runDoctor(input({ events: eventsWithGravity([0], 3) })), "gravity-distribution");
      expect(c.status).toBe("INFO");
      expect(c.message).toMatch(/0:3/);
    });

    it("says so when there are no events at all", () => {
      expect(check(runDoctor(input({ events: [] })), "gravity-distribution").status).toBe("INFO");
    });

    // INFO is excluded from the roll-up, so the floor cannot colour a report.
    it("an under-floor campaign that is otherwise healthy does not roll up to WARN because of gravity", () => {
      const r = runDoctor(input({
        events: eventsWithGravity([0], 3),
        scene: {
          campaignId: cid, id: "s1" as never, locationId: asEntityID("e_known"),
          presentEntityIds: [asEntityID("e_known")], description: "d", createdAtTurn: 1
        },
        sceneEntityResolution: [{ entityId: asEntityID("e_known"), known: true }]
      }));
      expect(check(r, "gravity-distribution").status).toBe("INFO");
      expect(r.checks.filter(c => c.status === "WARN").map(c => c.id)).not.toContain("gravity-distribution");
    });
  });
});
