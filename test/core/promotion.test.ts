import { describe, it, expect } from "vitest";
import { detectUptake, decidePromotion } from "../../src/core/promotion.js";
import type { ProvisionalInvention } from "../../src/domain/invention.js";
import type { CanonicalAttribute } from "../../src/domain/attribute.js";
import type { Contrainte } from "../../src/domain/potentialite.js";
import {
  asCampaignId, asEntityID, asEventId, asFactId, asInventionId, asConstraintId
} from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

function invention(id: string, over: Partial<ProvisionalInvention> = {}): ProvisionalInvention {
  return {
    inventionId: asInventionId(id), campaignId: cid, entityId: asEntityID("passeur"),
    attributeKey: "nom", value: { type: "STRING", value: "Aldo" }, category: "IDENTITE",
    sourceNarration: "Le passeur, un dénommé Aldo…", confidence: 0.7,
    introducedAtTurn: 4, introducedOnDay: 2, status: "PROVISIONAL",
    lastReferencedTurn: 4, surfaceTokens: ["Aldo", "le bac"], ...over
  };
}

function canonRow(key: string, value: string): CanonicalAttribute {
  return {
    factId: asFactId(`proj_${key}`), entityId: asEntityID("passeur"), key,
    value: { type: "STRING", value }, category: "IDENTITE",
    turn: 1, day: 1, source: { kind: "LEGACY_FACT" }
  };
}

function contrainte(regle: Contrainte["regle"], over: Partial<Contrainte> = {}): Contrainte {
  return {
    id: asConstraintId("k1"), source: { kind: "REGLE_MONDE", ruleId: "r1" },
    createdAt: 0, regle, justificationNarrative: "loi du monde", ...over
  };
}

const evidence = { kind: "PLAYER_UPTAKE" as const, eventId: asEventId("e-up") };

describe("detectUptake (#25): known-token substring search, engine-side", () => {
  it("fires on a lowercase token inside the player's utterance", () => {
    // the capitalization-gated extractor could never fire on "le bac" (§0.5 premise 4)
    const hits = detectUptake("je retourne voir le bac demain", [invention("i1")], 9);
    expect(hits).toEqual([asInventionId("i1")]);
  });

  it("does not fire on an unrelated utterance, whatever the confidence", () => {
    expect(detectUptake("rien à voir", [invention("i1", { confidence: 0.99 })], 9)).toEqual([]);
  });

  it("a same-turn echo is not uptake", () => {
    expect(detectUptake("le bac, dites-vous ?", [invention("i1", { introducedAtTurn: 9 })], 9)).toEqual([]);
  });

  it("a stale provisional stays promotable twenty turns later", () => {
    expect(detectUptake("et ce fameux Aldo ?", [invention("i1", { lastReferencedTurn: 4 })], 24))
      .toEqual([asInventionId("i1")]);
  });

  it("only PROVISIONAL inventions are matched", () => {
    expect(detectUptake("le bac", [invention("i1", { status: "REJECTED" })], 9)).toEqual([]);
  });
});

describe("decidePromotion (§7.4): the collapse loop, aimed at the output side", () => {
  it("uptake evidence promotes; the transition carries day, turn and evidence", () => {
    const d = decidePromotion(invention("i1"), { canon: [], constraints: [], evidence, atDay: 3, atTurn: 9 });
    expect(d.outcome).toBe("PROMOTED");
    if (d.outcome === "PROMOTED") {
      expect(d.transition.to).toBe("PROMOTED");
      expect(d.transition.atDay).toBe(3);
      expect(d.transition.evidence).toEqual(evidence);
    }
  });

  it("canon contradiction → silent REJECTED, no SneqContradictionError (inverts today's path)", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [canonRow("nom", "Bertrand")], constraints: [], evidence, atDay: 3, atTurn: 9
    });
    expect(d.outcome).toBe("REJECTED");
    if (d.outcome === "REJECTED") expect(d.transition.to).toBe("REJECTED");
  });

  it("canon agreeing on the same value does not reject", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [canonRow("nom", "Aldo")], constraints: [], evidence, atDay: 3, atTurn: 9
    });
    expect(d.outcome).toBe("PROMOTED");
  });

  it("a healthy exclusion constraint blocks promotion — validateValue's first reader (#19)", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [],
      constraints: [contrainte({ type: "NE_PEUT_PAS_ETRE", valeurs: [{ type: "STRING", value: "Aldo" }] })],
      evidence, atDay: 3, atTurn: 9
    });
    expect(d.outcome).toBe("REJECTED");
    expect(d.quarantined).toEqual([]);
  });

  it("a type-unsatisfiable constraint is QUARANTINED, skipped, and never blocks (#23)", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [],
      constraints: [
        contrainte({ type: "DOIT_ETRE", valeurs: [{ type: "ENUM", value: "Aldo", enumType: "nom" }] }),
        contrainte({ type: "DOIT_ETRE", valeurs: [] }, { id: asConstraintId("k2") })
      ],
      evidence, atDay: 3, atTurn: 9
    });
    expect(d.outcome).toBe("PROMOTED");
    expect(d.quarantined.map(String).sort()).toEqual(["k1", "k2"]);
  });

  it("an already-QUARANTINED constraint never gates", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [],
      constraints: [contrainte({ type: "NE_PEUT_PAS_ETRE", valeurs: [{ type: "STRING", value: "Aldo" }] }, { status: "QUARANTINED" })],
      evidence, atDay: 3, atTurn: 9
    });
    expect(d.outcome).toBe("PROMOTED");
  });

  it("first uptake wins between competing provisionals: the loser is SUPERSEDED", () => {
    const d = decidePromotion(invention("i1"), {
      canon: [], constraints: [], evidence, atDay: 3, atTurn: 9,
      competing: [invention("i2", { value: { type: "STRING", value: "Bertrand" } })]
    });
    expect(d.outcome).toBe("PROMOTED");
    if (d.outcome === "PROMOTED") {
      expect(d.superseded).toHaveLength(1);
      expect(d.superseded[0]!.to).toBe("SUPERSEDED");
      expect(d.superseded[0]!.supersededBy).toBe(asInventionId("i1"));
    }
  });
});
