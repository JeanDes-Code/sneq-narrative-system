import { describe, it, expect } from "vitest";
import { migrateLegacyCampaign } from "../../src/core/migrate-legacy.js";
import type { LegacyFact } from "../../src/domain/migration.js";
import type { Potentialite, Contrainte } from "../../src/domain/potentialite.js";
import type { CampaignId } from "../../src/domain/ids.js";
import { asCampaignId, asEntityID, asFactId, asConstraintId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

// A 0.3-era persisted fact: observation blobs still carry the stale fiabilite key (#18).
type LegacyFactBlob = LegacyFact & { campaignId: CampaignId } & {
  observation: LegacyFact["observation"] & { fiabilite?: string };
};

function fact(eid: string, key: string, value: LegacyFact["value"], turn = 3): LegacyFactBlob {
  return {
    campaignId: cid, factId: asFactId(`f_${eid}_${key}`), entityId: asEntityID(eid),
    key, value, category: "HISTORIQUE",
    observation: { source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0, fiabilite: "CERTAINE" },
    turn
  };
}

function contrainte(regle: Contrainte["regle"]): Contrainte {
  return {
    id: asConstraintId(`k_${Math.abs(JSON.stringify(regle).length)}`),
    source: { kind: "INFERENCE_IA", confidence: 0.7 },
    createdAt: 0, regle, justificationNarrative: "…"
  };
}

function potentialite(eid: string, attribut: string, contraintes: Contrainte[]): Potentialite {
  return {
    entiteId: asEntityID(eid), attribut, etat: "CONTRAINT", contraintes,
    contexteGeneratif: { categorieAttribut: "SOCIAL", tendances: [] }
  };
}

describe("migrateLegacyCampaign — the v0.4 migration epoch (#17 #18 #23)", () => {
  it("copies each fact to a LEGACY_FACT canonical row at day 0, observation cleaned", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [fact("e1", "metier", { type: "STRING", value: "forgeron" })],
      potentialites: []
    });
    expect(out.canonicalAttributes).toHaveLength(1);
    const row = out.canonicalAttributes[0]!;
    expect(row.source).toEqual({ kind: "LEGACY_FACT" });
    expect(row.day).toBe(0);
    expect(row.value).toEqual({ type: "STRING", value: "forgeron" });
    expect(row.observation && "fiabilite" in row.observation).toBe(false);
  });

  it("synthesizes ONE day-0 LEGACY_CANON event per entity carrying its facts as sets (#17)", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [
        fact("e1", "metier", { type: "STRING", value: "forgeron" }),
        fact("e1", "ville", { type: "STRING", value: "Valmure" }),
        fact("e2", "role", { type: "STRING", value: "bailli" })
      ],
      potentialites: []
    });
    expect(out.legacyEvents).toHaveLength(2);
    const e1 = out.legacyEvents.find(e => String(e.participants[0]) === "e1")!;
    expect(e1.day).toBe(0);
    expect(e1.gravity).toBe(0);              // below every bootstrap dispatch rule — no carriage storm
    expect(e1.acts).toHaveLength(2);
    expect(e1.acts.every(a => a.verb === "LEGACY_CANON")).toBe(true);
    expect(e1.acts.map(a => a.sets?.key).sort()).toEqual(["metier", "ville"]);
  });

  it("is deterministic: event and fact ids derive from content, not randomness", () => {
    const input = {
      campaignId: cid,
      facts: [fact("e1", "metier", { type: "STRING" as const, value: "forgeron" })],
      potentialites: []
    };
    expect(migrateLegacyCampaign(input)).toEqual(migrateLegacyCampaign(input));
  });

  it("strips the stale fiabilite key from fact blobs without touching the rest (#18)", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [fact("e1", "metier", { type: "STRING", value: "forgeron" })],
      potentialites: []
    });
    expect(out.cleanedFacts).toHaveLength(1);
    const obs = out.cleanedFacts[0]!.observation as unknown as Record<string, unknown>;
    expect("fiabilite" in obs).toBe(false);
    expect(obs["source"]).toBe("GM_NARRATION");
  });

  it("flags a DOIT_ETRE whose value types disagree with the canonical fact (#23, the rebel case)", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [fact("e1", "allegiance", { type: "STRING", value: "couronne" })],
      potentialites: [potentialite("e1", "allegiance", [
        contrainte({ type: "DOIT_ETRE", valeurs: [{ type: "ENUM", value: "couronne", enumType: "faction" }] })
      ])]
    });
    expect(out.findings).toHaveLength(1);
    expect(out.findings[0]!.kind).toBe("TYPE_MISMATCH_WITH_CANON");
    expect(out.findings[0]!.attributeKey).toBe("allegiance");
  });

  it("flags empty DOIT_ETRE, mixed value types, RANGE on non-number, REGEX on non-string", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [
        fact("e1", "age", { type: "STRING", value: "vieux" }),
        fact("e1", "nom", { type: "NUMBER", value: 7 })
      ],
      potentialites: [
        potentialite("e1", "loyaute", [contrainte({ type: "DOIT_ETRE", valeurs: [] })]),
        potentialite("e1", "humeur", [contrainte({ type: "DOIT_ETRE", valeurs: [
          { type: "STRING", value: "sombre" }, { type: "NUMBER", value: 3 }
        ] })]),
        potentialite("e1", "age", [contrainte({ type: "RANGE_NUMERIQUE", min: 0, max: 90 })]),
        potentialite("e1", "nom", [contrainte({ type: "REGEX", pattern: "^[A-Z]" })])
      ]
    });
    expect(out.findings.map(f => f.kind).sort()).toEqual([
      "EMPTY_DOIT_ETRE", "MIXED_VALUE_TYPES", "RANGE_ON_NON_NUMBER", "REGEX_ON_NON_STRING"
    ]);
  });

  it("audits without fixing: constraints are never mutated or dropped", () => {
    const pot = potentialite("e1", "loyaute", [contrainte({ type: "DOIT_ETRE", valeurs: [] })]);
    const out = migrateLegacyCampaign({ campaignId: cid, facts: [], potentialites: [pot] });
    expect(out.findings).toHaveLength(1);
    // the input structure is untouched — findings flag, migration never repairs (#23)
    expect(pot.contraintes).toHaveLength(1);
    expect(pot.contraintes[0]!.regle).toEqual({ type: "DOIT_ETRE", valeurs: [] });
  });

  it("a coherent constraint produces no finding", () => {
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [fact("e1", "allegiance", { type: "STRING", value: "couronne" })],
      potentialites: [potentialite("e1", "allegiance", [
        contrainte({ type: "DOIT_ETRE", valeurs: [{ type: "STRING", value: "couronne" }, { type: "STRING", value: "rebelles" }] })
      ])]
    });
    expect(out.findings).toEqual([]);
  });

  it("an empty campaign migrates to an empty epoch", () => {
    const out = migrateLegacyCampaign({ campaignId: cid, facts: [], potentialites: [] });
    expect(out.canonicalAttributes).toEqual([]);
    expect(out.legacyEvents).toEqual([]);
    expect(out.findings).toEqual([]);
  });
});
