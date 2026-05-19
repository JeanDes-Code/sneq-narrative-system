import { describe, it, expect } from "vitest";
import { propagate } from "../../src/core/propagation.js";
import type { AreteGCN, ReglePropagation } from "../../src/domain/gcn.js";
import type { AttributFige } from "../../src/domain/attribute.js";
import { asEntityID, asCampaignId, asFactId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

function edge(src: string, dst: string, force = 0.8): AreteGCN {
  return {
    key: `${src}->${dst}`,
    source: asEntityID(src),
    cible: asEntityID(dst),
    typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
    directionnalite: "BIDIRECTIONNELLE",
    forcePropagation: force,
    etatArete: "FIGE",
    attributs: {}
  };
}

const rule: ReglePropagation = {
  id: "r1",
  nom: "secret-spreads",
  declencheur: { categorieAttribut: ["SECRET"] },
  actionType: "AJOUTER_CONTRAINTE",
  cibleType: "RELATION_DIRECTE",
  cibleParams: { description: "linked secret" },
  priorite: 10
};

const fact: AttributFige = {
  factId: asFactId("f1"),
  entityId: asEntityID("A"),
  key: "secret",
  value: { type: "STRING", value: "war crime" },
  category: "SECRET",
  observation: {
    source: "GM_NARRATION", method: "DIALOGUE_DIRECT",
    fiabilite: "CERTAINE", timestamp: 0
  },
  turn: 1
};

describe("propagation", () => {
  it("propagates to direct neighbors when rule matches", () => {
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, edges, rules: [rule], maxDepth: 2, minForce: 0.1 });
    expect(result.entitesImpactees).toContain(asEntityID("B"));
    expect(result.contraintesPropagees).toHaveLength(1);
    expect(result.contraintesPropagees[0]!.entityId).toBe(asEntityID("B"));
  });

  it("decays force across hops and stops below minForce", () => {
    const edges = [edge("A", "B", 0.5), edge("B", "C", 0.5), edge("C", "D", 0.5)];
    const result = propagate({ fact, campaignId: cid, edges, rules: [rule], maxDepth: 5, minForce: 0.2 });
    expect(result.entitesImpactees).toContain(asEntityID("B"));
    expect(result.entitesImpactees).toContain(asEntityID("C"));
    expect(result.entitesImpactees).not.toContain(asEntityID("D"));
  });

  it("does not visit the source entity", () => {
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, edges, rules: [rule], maxDepth: 2, minForce: 0.1 });
    expect(result.entitesImpactees).not.toContain(asEntityID("A"));
  });

  it("returns empty result when no rule matches", () => {
    const otherRule: ReglePropagation = { ...rule, declencheur: { categorieAttribut: ["IDENTITE"] } };
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, edges, rules: [otherRule], maxDepth: 2, minForce: 0.1 });
    expect(result.contraintesPropagees).toHaveLength(0);
  });
});
