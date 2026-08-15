import { describe, it, expect } from "vitest";
import { decideCommitNarrative, type CommitContext, type CommitNarrativeBundle } from "../../src/core/commit-narrative.js";
import { SneqContradictionError, SneqValidationError } from "../../src/errors.js";
import type { GroupHolder, IndividualHolder } from "../../src/domain/holder.js";
import {
  asCampaignId, asEntityID, asEventId, asCarriageId, asInventionId, asConstraintId
} from "../../src/domain/ids.js";

const cid = asCampaignId("c1");
const DEFAULT_REALM = asEntityID("realm-default");
const MARCHE = asEntityID("realm-marche");
const VALMURE = asEntityID("place-valmure");
const BOURG = asEntityID("place-bourg");     // default realm (no realmId declared)
const SKARROW = asEntityID("place-skarrow"); // foreign realm
const HAMEAU = asEntityID("place-hameau");   // default realm

function group(id: string, placeId: ReturnType<typeof asEntityID>, community: string): GroupHolder {
  return {
    kind: "GROUP", holderId: `g-${id}` as GroupHolder["holderId"], campaignId: cid,
    community, stratum: "commun", realmId: DEFAULT_REALM, placeId, standing: 0.5
  };
}

function individual(id: string, baseGroup: string, over: Partial<IndividualHolder> = {}): IndividualHolder {
  return {
    kind: "INDIVIDUAL", holderId: `i-${id}` as IndividualHolder["holderId"], campaignId: cid,
    entityId: asEntityID(`e-${id}`), baseGroupId: `g-${baseGroup}` as IndividualHolder["baseGroupId"],
    derogationReason: "PERSONAL_STAKE",
    ...over
  };
}

function ctx(over: Partial<CommitContext> = {}): CommitContext {
  return {
    campaignId: cid, worldDay: 5, latestTurn: 9,
    policy: {
      routes: [
        { fromPlaceId: VALMURE, toPlaceId: BOURG, travelDays: 2, route: "RUMOUR" },
        { fromPlaceId: VALMURE, toPlaceId: SKARROW, travelDays: 4, route: "RUMOUR" },
        { fromPlaceId: VALMURE, toPlaceId: HAMEAU, travelDays: 1, route: "RUMOUR" }
      ],
      rules: [{ minGravity: 2, route: "RUMOUR", targets: "ALL_KNOWN_COMMUNITIES", carrierLabel: "le bruit qui court" }]
    },
    places: [{ id: SKARROW, realmId: MARCHE }],   // Bourg/Valmure/Hameau: default realm by fallback (#26)
    defaultRealmId: DEFAULT_REALM,
    holders: [group("bourg", BOURG, "bourg"), group("skarrow", SKARROW, "skarrow"), group("hameau", HAMEAU, "hameau")],
    canon: [], inventions: [], potentialites: [],
    maxDispatchFanout: 64,
    ...over
  };
}

function bundle(over: Partial<CommitNarrativeBundle> = {}): CommitNarrativeBundle {
  return {
    campaignId: cid, operationId: "op-1", daysElapsed: 1,
    event: {
      eventId: asEventId("e1"), placeId: VALMURE, gravity: 2,
      acts: [{ actorId: asEntityID("actor"), verb: "STRIKE",
               sets: { entityId: asEntityID("actor"), key: "statut", value: { type: "STRING", value: "recherché" }, category: "ETAT" } }],
      circumstance: "Un coup de gourdin, et l'homme est désormais recherché.",
      participants: [asEntityID("actor")],
      surfaceTokens: ["gourdin"]
    },
    ...over
  };
}

describe("decideCommitNarrative — the single write (§5.1)", () => {
  it("daysElapsed is REQUIRED and never negative (#20)", () => {
    for (const bad of [undefined as unknown as number, -1]) {
      try {
        decideCommitNarrative(bundle({ daysElapsed: bad }), ctx());
        expect.unreachable();
      } catch (e) {
        expect(e).toBeInstanceOf(SneqValidationError);
        expect((e as SneqValidationError).details[0]!.message).toMatch(/daysElapsed/);
      }
    }
    expect(decideCommitNarrative(bundle({ daysElapsed: 0 }), ctx()).newWorldDay).toBe(5);
  });

  it("the engine sets day and turn: day = worldDay + daysElapsed, turn = latestTurn + 1", () => {
    const plan = decideCommitNarrative(bundle(), ctx());
    expect(plan.newWorldDay).toBe(6);
    expect(plan.event?.day).toBe(6);
    expect(plan.event?.turn).toBe(10);
  });

  it("rejects a supplied token absent from the content (#25)", () => {
    const b = bundle();
    b.event!.surfaceTokens = ["gourdin", "le trésor caché"];
    expect(() => decideCommitNarrative(b, ctx())).toThrow(SneqValidationError);
  });

  it("two sets on the same key with different values in one commit → SneqContradictionError (#27)", () => {
    const b = bundle();
    b.event!.acts = [
      { actorId: asEntityID("actor"), verb: "A", sets: { entityId: asEntityID("actor"), key: "statut", value: { type: "STRING", value: "libre" }, category: "ETAT" } },
      { actorId: asEntityID("actor"), verb: "B", sets: { entityId: asEntityID("actor"), key: "statut", value: { type: "STRING", value: "recherché" }, category: "ETAT" } }
    ];
    b.event!.circumstance = "libre puis recherché";
    b.event!.surfaceTokens = [];
    expect(() => decideCommitNarrative(b, ctx())).toThrow(SneqContradictionError);
  });

  it("policy dispatch: gravity ≥ rule fans out over routed communities, realms engine-stamped (#15 #26)", () => {
    const plan = decideCommitNarrative(bundle(), ctx());
    const targets = plan.carriages.map(c => String(c.toPlaceId)).sort();
    expect(targets).toEqual(["place-bourg", "place-hameau", "place-skarrow"]);
    const toSkarrow = plan.carriages.find(c => c.toPlaceId === SKARROW)!;
    expect(toSkarrow.originRealm).toBe(DEFAULT_REALM);       // Valmure: fallback to default (#26)
    expect(toSkarrow.destinationRealm).toBe(MARCHE);         // declared foreign realm
    expect(toSkarrow.carrier).toBe("le bruit qui court");
    expect(toSkarrow.departedDay).toBe(6);
    expect(plan.health.uncovered).toBe(false);
    expect(plan.health.unroutable).toEqual([]);
  });

  it("gravity below every rule → no dispatch, uncovered counted (§6.1)", () => {
    const b = bundle();
    b.event!.gravity = 1;
    const plan = decideCommitNarrative(b, ctx());
    expect(plan.carriages).toEqual([]);
    expect(plan.health.uncovered).toBe(true);
  });

  it("a rule that fires with no route to a target counts unroutable, not silence (§6.1)", () => {
    const c = ctx();
    c.policy.routes = c.policy.routes.filter(r => r.toPlaceId !== BOURG);
    const plan = decideCommitNarrative(bundle(), c);
    expect(plan.carriages.map(k => String(k.toPlaceId)).sort()).toEqual(["place-hameau", "place-skarrow"]);
    expect(plan.health.unroutable).toEqual([{ toPlaceId: BOURG, carrierLabel: "le bruit qui court" }]);
  });

  it("fan-out cap truncates nearest-first and counts what it dropped (#15)", () => {
    const plan = decideCommitNarrative(bundle(), ctx({ maxDispatchFanout: 2 }));
    // travelDays: hameau 1, bourg 2, skarrow 4 → skarrow dropped
    expect(plan.carriages.map(k => String(k.toPlaceId)).sort()).toEqual(["place-bourg", "place-hameau"]);
    expect(plan.health.truncated).toBe(1);
  });

  it("explicit carriages are realm-stamped by the engine — the caller never supplies realms (#26)", () => {
    const plan = decideCommitNarrative(bundle({
      carriages: [{
        carriageId: asCarriageId("k-explicit"), subject: { kind: "EVENT", id: asEventId("e1") },
        carrier: "un moine", route: "OFFICIAL", fromPlaceId: VALMURE, toPlaceId: SKARROW, travelDays: 3
      }]
    }), ctx());
    const k = plan.carriages.find(c => String(c.carriageId) === "k-explicit")!;
    expect(k.originRealm).toBe(DEFAULT_REALM);
    expect(k.destinationRealm).toBe(MARCHE);
    expect(k.departedDay).toBe(6);
  });

  it("promotion evidence promotes through the collapse loop; sets + promotions both update canon", () => {
    const invention = {
      inventionId: asInventionId("i1"), campaignId: cid, entityId: asEntityID("passeur"),
      attributeKey: "nom", value: { type: "STRING" as const, value: "Aldo" }, category: "IDENTITE" as const,
      sourceNarration: "…", confidence: 0.5, introducedAtTurn: 3, introducedOnDay: 2,
      status: "PROVISIONAL" as const, lastReferencedTurn: 3, surfaceTokens: ["Aldo"]
    };
    const plan = decideCommitNarrative(bundle({
      promotionEvidence: [{ inventionId: asInventionId("i1"), evidence: { kind: "PLAYER_UPTAKE", eventId: asEventId("e1") } }]
    }), ctx({ inventions: [invention] }));
    expect(plan.transitions.map(t => t.to)).toEqual(["PROMOTED"]);
    const keys = plan.canonicalUpdates.map(r => r.key).sort();
    expect(keys).toEqual(["nom", "statut"]);
    const nom = plan.canonicalUpdates.find(r => r.key === "nom")!;
    expect(nom.source).toEqual({ kind: "PROMOTED_INVENTION", inventionId: asInventionId("i1") });
  });

  it("quarantined constraints surface on the plan (#23)", () => {
    const invention = {
      inventionId: asInventionId("i1"), campaignId: cid, entityId: asEntityID("passeur"),
      attributeKey: "nom", value: { type: "STRING" as const, value: "Aldo" }, category: "IDENTITE" as const,
      sourceNarration: "…", confidence: 0.5, introducedAtTurn: 3, introducedOnDay: 2,
      status: "PROVISIONAL" as const, lastReferencedTurn: 3, surfaceTokens: ["Aldo"]
    };
    const plan = decideCommitNarrative(bundle({
      promotionEvidence: [{ inventionId: asInventionId("i1"), evidence: { kind: "PLAYER_UPTAKE", eventId: asEventId("e1") } }]
    }), ctx({
      inventions: [invention],
      potentialites: [{
        entiteId: asEntityID("passeur"), attribut: "nom", etat: "CONTRAINT",
        contraintes: [{
          id: asConstraintId("k-bad"), source: { kind: "REGLE_MONDE", ruleId: "r" },
          createdAt: 0, regle: { type: "DOIT_ETRE", valeurs: [] }, justificationNarrative: "…"
        }],
        contexteGeneratif: { categorieAttribut: "IDENTITE", tendances: [] }
      }]
    }));
    expect(plan.transitions.map(t => t.to)).toEqual(["PROMOTED"]);
    expect(plan.quarantined.map(String)).toEqual(["k-bad"]);
  });

  it("bundle policy merges additively — routes accrete, they never replace (#15)", () => {
    const plan = decideCommitNarrative(bundle({
      policy: { routes: [{ fromPlaceId: BOURG, toPlaceId: HAMEAU, travelDays: 1, route: "RUMOUR" }] }
    }), ctx());
    expect(plan.policyUpdate).toBeDefined();
    expect(plan.policyUpdate!.routes).toHaveLength(4);
    expect(plan.policyUpdate!.rules).toHaveLength(1);
  });

  it("an event-less bundle still advances time — onion soup moves no courier but the day may end", () => {
    const plan = decideCommitNarrative({ campaignId: cid, operationId: "op-2", daysElapsed: 1 }, ctx());
    expect(plan.newWorldDay).toBe(6);
    expect(plan.event).toBeUndefined();
    expect(plan.carriages).toEqual([]);
  });
});

/**
 * §5.3 adjudicated holder authoring as a host concern and then put holder
 * creation in this bundle. `standing` gates carriage delivery
 * (`derive-beliefs.ts:121`) and feeds the socialPosition salience factor
 * (`:157`), so leaving it writable here lets a model hand a holder the news the
 * minStanding gate was withholding — the model writing an effect. The line runs
 * between the two halves of §5.3: create yes, re-price no (#46).
 */
describe("holders[] may create a holder, never re-price one (#46)", () => {
  const BOURG_GROUP = group("bourg", BOURG, "bourg"); // standing 0.5

  it("refuses a bundle that raises an existing group's standing", () => {
    expect(() => decideCommitNarrative(
      bundle({ holders: [{ ...BOURG_GROUP, standing: 0.9 }] }),
      ctx({ holders: [BOURG_GROUP] })
    )).toThrow(SneqValidationError);
  });

  it("refuses a bundle that lowers it too — the guard is about authority, not direction", () => {
    expect(() => decideCommitNarrative(
      bundle({ holders: [{ ...BOURG_GROUP, standing: 0.1 }] }),
      ctx({ holders: [BOURG_GROUP] })
    )).toThrow(SneqValidationError);
  });

  it("names upsert-holder as the corrective call, like every other refusal", () => {
    try {
      decideCommitNarrative(
        bundle({ holders: [{ ...BOURG_GROUP, standing: 0.9 }] }),
        ctx({ holders: [BOURG_GROUP] })
      );
      throw new Error("expected the bundle to be refused");
    } catch (e) {
      expect(e).toBeInstanceOf(SneqValidationError);
      expect((e as SneqValidationError).details.map(d => d.message).join(" ")).toContain("upsert-holder");
    }
  });

  it("rejects the whole bundle, so one re-priced holder writes nothing (fail-closed, like the invention guard)", () => {
    expect(() => decideCommitNarrative(
      bundle({ holders: [group("valmure", VALMURE, "valmure"), { ...BOURG_GROUP, standing: 0.9 }] }),
      ctx({ holders: [BOURG_GROUP] })
    )).toThrow(SneqValidationError);
  });

  it("refuses a bundle that changes an existing individual's standingOverride", () => {
    const miller = individual("miller", "bourg", { standingOverride: 0.4 });
    expect(() => decideCommitNarrative(
      bundle({ holders: [{ ...miller, standingOverride: 0.95 }] }),
      ctx({ holders: [BOURG_GROUP, miller] })
    )).toThrow(SneqValidationError);
  });

  it("refuses a bundle that drops an existing standingOverride — erasing it is a change", () => {
    const miller = individual("miller", "bourg", { standingOverride: 0.4 });
    const { standingOverride: _erased, ...withoutOverride } = miller;
    expect(() => decideCommitNarrative(
      bundle({ holders: [withoutOverride] }),
      ctx({ holders: [BOURG_GROUP, miller] })
    )).toThrow(SneqValidationError);
  });

  it("refuses a bundle that flips an existing holder's kind — that re-prices it by construction", () => {
    expect(() => decideCommitNarrative(
      bundle({ holders: [individual("bourg", "bourg", { standingOverride: 0.9 })] }),
      ctx({ holders: [{ ...BOURG_GROUP, holderId: "i-bourg" as GroupHolder["holderId"] }] })
    )).toThrow(SneqValidationError);
  });

  // The other half of the line: everything below must keep working, or the guard
  // is not a line, it is a wall.

  it("still creates a group the campaign does not have, standing included", () => {
    const plan = decideCommitNarrative(
      bundle({ holders: [group("valmure", VALMURE, "valmure")] }),
      ctx({ holders: [BOURG_GROUP] })
    );
    expect(plan.holders).toHaveLength(1);
    expect((plan.holders[0] as GroupHolder).standing).toBe(0.5);
  });

  it("still creates an individual, whose absent override was never a standing write", () => {
    const plan = decideCommitNarrative(
      bundle({ holders: [individual("miller", "bourg")] }),
      ctx({ holders: [BOURG_GROUP] })
    );
    expect(plan.holders).toHaveLength(1);
  });

  it("lets an existing holder through when the standing is unchanged — a re-send is not an edit", () => {
    const plan = decideCommitNarrative(
      bundle({ holders: [{ ...BOURG_GROUP, stratum: "notables" }] }),
      ctx({ holders: [BOURG_GROUP] })
    );
    expect(plan.holders).toHaveLength(1);
    expect((plan.holders[0] as GroupHolder).stratum).toBe("notables");
  });

  it("dispatch still finds its communities now that the context carries every holder", () => {
    const plan = decideCommitNarrative(bundle(), ctx());
    expect(plan.carriages.length).toBeGreaterThan(0);
  });
});
