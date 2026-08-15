import { describe, it, expect } from "vitest";
import {
  surfaceTokensOf, validateSuppliedTokens, forbiddenTokensFor,
  checkContainment, assertContainment, PUBLIC_TAG, type TokenWorld
} from "../../src/core/containment.js";
import { SneqContainmentError } from "../../src/errors.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { OfficialRecord } from "../../src/domain/record.js";
import type { Belief } from "../../src/domain/belief.js";
import { asCampaignId, asEntityID, asEventId, asRecordId, asHolderId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

const entities = [
  { id: asEntityID("gabelou"), name: "Maître Orin", aliases: ["le gabelou", "le péager"] },
  { id: asEntityID("actor"), name: "Jehan", aliases: [] },
  { id: asEntityID("place-valmure"), name: "Valmure", aliases: [] },
];

const tollEvent: NarrativeEvent = {
  eventId: asEventId("e-toll"), campaignId: cid, day: 2, turn: 5, placeId: asEntityID("place-valmure"),
  gravity: 2,
  acts: [{ actorId: asEntityID("actor"), verb: "STRIKE", objectId: asEntityID("gabelou"),
           value: { type: "STRING", value: "un coup de gourdin" } }],
  circumstance: "Un coup de gourdin près de la barrière de la gabelle, sous la pluie.",
  participants: [asEntityID("actor"), asEntityID("gabelou")],
  surfaceTokens: ["gourdin", "la gabelle"]
};

const verdict: OfficialRecord = {
  recordId: asRecordId("r-verdict"), campaignId: cid, entityId: asEntityID("actor"),
  key: "verdict", value: { type: "STRING", value: "obstruction d'une levée légitime" }, category: "SOCIAL",
  authoredBy: asEntityID("gabelou"), aboutEventId: asEventId("e-toll"), route: "OFFICIAL",
  observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
  day: 3, turn: 6, surfaceTokens: ["quatre jours de geôle"]
};

const world: TokenWorld = { events: [tollEvent], records: [verdict], entities };

function beliefOn(subjectId: string, kind: "EVENT" | "RECORD" = "EVENT"): Belief {
  return {
    holderId: asHolderId("h"), certainty: "TOLD", fiabilite: "TEMOIGNAGE",
    subject: kind === "EVENT"
      ? { kind: "EVENT", id: asEventId(subjectId) }
      : { kind: "RECORD", id: asRecordId(subjectId) },
    content: "…", learnedOnDay: 3, method: "DIALOGUE_DIRECT",
    salience: 0.5,
    factors: { gravity: 0, recency: 0, personalInvolvement: 0, socialPosition: 0, propagationDelay: 0 }
  };
}

describe("surface tokens (#25): model supplies, engine floors", () => {
  it("the engine floor adds participant names + aliases, place, and object names", () => {
    const tokens = surfaceTokensOf(tollEvent, entities);
    expect(tokens).toContain("gourdin");            // model-supplied
    expect(tokens).toContain("la gabelle");
    expect(tokens).toContain("Maître Orin");        // objectId + participant name
    expect(tokens).toContain("le gabelou");         // alias
    expect(tokens).toContain("Jehan");              // participant name
    expect(tokens).toContain("Valmure");            // place name
  });

  it("the record floor adds subject names, the key, and the textual value", () => {
    const tokens = surfaceTokensOf(verdict, entities);
    expect(tokens).toContain("quatre jours de geôle");             // model-supplied
    expect(tokens).toContain("Jehan");                             // subject entity
    expect(tokens).toContain("verdict");                           // key
    expect(tokens).toContain("obstruction d'une levée légitime");  // textual value
  });

  it("verbs never enter the floor — taxonomy strings only false-positive", () => {
    expect(surfaceTokensOf(tollEvent, entities)).not.toContain("STRIKE");
  });

  it("validateSuppliedTokens rejects a token absent from circumstance and act values", () => {
    const bad: NarrativeEvent = { ...tollEvent, surfaceTokens: ["gourdin", "le trésor caché"] };
    expect(validateSuppliedTokens(bad)).toEqual(["le trésor caché"]);
    expect(validateSuppliedTokens(tollEvent)).toEqual([]);
  });
});

describe("containment (§7.3): the toll-keeper test", () => {
  it("forbids every token of an unheld subject", () => {
    const forbidden = forbiddenTokensFor(world, []);
    expect(forbidden).toContain("gourdin");
    expect(forbidden).toContain("quatre jours de geôle");
  });

  it("a held subject's tokens are never forbidden — even when they also appear in unheld ones", () => {
    // "Jehan" appears in both the event and the record; holding the event alone frees it
    const forbidden = forbiddenTokensFor(world, [beliefOn("e-toll")]);
    expect(forbidden).not.toContain("gourdin");
    expect(forbidden).not.toContain("Jehan");
    expect(forbidden).toContain("quatre jours de geôle");  // the record stays forbidden
  });

  it("checkContainment matches case-insensitively as substrings", () => {
    const r = checkContainment(["gourdin", "la gabelle"], "On raconte qu'un GOURDIN a servi près de la barrière.");
    expect(r.pass).toBe(false);
    expect(r.present).toEqual(["gourdin"]);
    expect(checkContainment(["gourdin"], "Rien à signaler.").pass).toBe(true);
  });

  it("assertContainment throws — a containment failure is an engine bug, not a gameplay outcome", () => {
    expect(() => assertContainment(world, [], asHolderId("h-tollkeeper"),
      "Le péager marmonne quelque chose sur quatre jours de geôle."
    )).toThrow(SneqContainmentError);
    // the same payload for a holder who holds the record passes
    expect(() => assertContainment(world, [beliefOn("r-verdict", "RECORD")], asHolderId("h-tollkeeper"),
      "Le péager marmonne quelque chose sur quatre jours de geôle."
    )).not.toThrow();
  });

  it("the thrown error names what leaked", () => {
    try {
      assertContainment(world, [], asHolderId("h"), "un gourdin, dit-on");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(SneqContainmentError);
      expect((e as SneqContainmentError).present).toEqual(["gourdin"]);
      expect((e as SneqContainmentError).forbidden.length).toBeGreaterThan(0);
    }
  });
});

/**
 * The floor forbids the NAMES of an unlearned event's place, participants and
 * objects. That is right for people and secrets and wrong for landmarks: a
 * tavern that appears in one secret meeting becomes unmentionable to the whole
 * town, and the host's own scene description stops passing its own pre-flight
 * check. `public` is the authored, per-entity exemption.
 */
describe("the public-token exemption", () => {
  const publicWorld: TokenWorld = {
    events: [tollEvent],
    records: [verdict],
    entities: entities.map(e =>
      e.id === "place-valmure" ? { ...e, tags: [PUBLIC_TAG] } : e)
  };

  it("a place name everybody knows stops being withheld", () => {
    expect(forbiddenTokensFor(world, [])).toContain("valmure");
    expect(forbiddenTokensFor(publicWorld, [])).not.toContain("valmure");
  });

  it("exempts the entity's aliases too, not only its canonical name", () => {
    const withAliases: TokenWorld = {
      ...world,
      entities: entities.map(e =>
        e.id === "gabelou" ? { ...e, tags: [PUBLIC_TAG] } : e)
    };
    const forbidden = forbiddenTokensFor(withAliases, []);
    expect(forbidden).not.toContain("maître orin");
    expect(forbidden).not.toContain("le péager");
  });

  // The exemption is about identity, not about what happened. A public place
  // does not make the secret that happened there public.
  it("does NOT exempt what happened there", () => {
    const forbidden = forbiddenTokensFor(publicWorld, []);
    expect(forbidden).toContain("gourdin");
    expect(forbidden).toContain("la gabelle");
    expect(forbidden).toContain("quatre jours de geôle");
  });

  it("an untagged entity is unaffected — the exemption is opt-in, never a default", () => {
    expect(forbiddenTokensFor(publicWorld, [])).toContain("jehan");
  });

  it("the host's own scene description passes once the place is public", () => {
    const sceneDescription = "Vous êtes à Valmure, sous une pluie fine.";
    expect(() => assertContainment(world, [], asHolderId("h"), sceneDescription))
      .toThrow(SneqContainmentError);
    expect(() => assertContainment(publicWorld, [], asHolderId("h"), sceneDescription))
      .not.toThrow();
  });
});
