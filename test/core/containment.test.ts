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

  /**
   * The exemption matches identity, not strings. A secret whose textual value
   * happens to spell a public entity's name is still a secret — freeing the
   * name by string match would hand the secret over with it.
   *
   * Concretely: declare the faction "Les Corbeaux" public, and a holder who
   * merely knows Selin must still not be able to be told that Selin serves
   * them, because the allegiance record was never learned.
   */
  it("does NOT free a secret whose declared value spells a public entity's name", () => {
    const allegiance: OfficialRecord = {
      recordId: asRecordId("r-allegiance"), campaignId: cid,
      entityId: asEntityID("actor"), key: "allegeance",
      value: { type: "STRING", value: "Les Corbeaux" }, category: "SECRET",
      authoredBy: asEntityID("gabelou"), route: "OFFICIAL",
      observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
      day: 1, turn: 1, surfaceTokens: []
    };
    const factionWorld: TokenWorld = {
      events: [], records: [allegiance],
      entities: [
        ...entities,
        { id: asEntityID("faction"), name: "Les Corbeaux", aliases: [], tags: [PUBLIC_TAG] }
      ]
    };
    expect(forbiddenTokensFor(factionWorld, [])).toContain("les corbeaux");
  });

  it("still frees the same name when no unlearned subject declares it", () => {
    const factionWorld: TokenWorld = {
      events: [], records: [],
      entities: [{ id: asEntityID("faction"), name: "Les Corbeaux", aliases: [], tags: [PUBLIC_TAG] }]
    };
    expect(forbiddenTokensFor(factionWorld, [])).not.toContain("les corbeaux");
  });

  it("the host's own scene description passes once the place is public", () => {
    const sceneDescription = "Vous êtes à Valmure, sous une pluie fine.";
    expect(() => assertContainment(world, [], asHolderId("h"), sceneDescription))
      .toThrow(SneqContainmentError);
    expect(() => assertContainment(publicWorld, [], asHolderId("h"), sceneDescription))
      .not.toThrow();
  });
});

/**
 * Issue #46, second half. `surfaceTokens` reach the forbidden set from events
 * and records too, and neither path has a distinctiveness check — an event's
 * tokens are only presence-checked, a record's are not checked at all, and a
 * record's `key` and `value` join the alphabet automatically.
 *
 * A short or common token there does not leak anything. It does the opposite:
 * it forbids innocent prose for every holder who has not learned that subject,
 * so `assertContainment` throws on a harmless payload and `filterTranscript`
 * silently drops legitimate entries.
 */
describe("the forbidden set drops tokens that cannot carry a secret", () => {
  const noisyEvent: NarrativeEvent = {
    eventId: asEventId("e-noisy"), campaignId: cid, day: 1, turn: 1, gravity: 1,
    acts: [], circumstance: "Le forgeron ferme la porte.",
    participants: [], surfaceTokens: ["le"]
  };
  const noisyRecord: OfficialRecord = {
    recordId: asRecordId("r-noisy"), campaignId: cid, entityId: asEntityID("actor"),
    key: "k", value: { type: "STRING", value: "de" }, category: "SECRET",
    authoredBy: asEntityID("gabelou"), route: "OFFICIAL",
    observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
    day: 1, turn: 1, surfaceTokens: []
  };
  const noisy: TokenWorld = { events: [noisyEvent], records: [noisyRecord], entities: [] };

  it("drops a stopword supplied on an event", () => {
    expect(forbiddenTokensFor(noisy, [])).not.toContain("le");
  });

  it("drops a one-character record key and a stopword record value", () => {
    const forbidden = forbiddenTokensFor(noisy, []);
    expect(forbidden).not.toContain("k");
    expect(forbidden).not.toContain("de");
  });

  it("so innocent prose stops being blocked", () => {
    const r = checkContainment(forbiddenTokensFor(noisy, []), "Vous marchez vers le nord de la vallée.");
    expect(r.pass).toBe(true);
  });

  it("but a real secret on the same subjects is still withheld", () => {
    expect(forbiddenTokensFor(world, [])).toContain("gourdin");
    expect(forbiddenTokensFor(world, [])).toContain("quatre jours de geôle");
  });
});
