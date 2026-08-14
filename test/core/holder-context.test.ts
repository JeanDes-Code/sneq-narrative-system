import { describe, it, expect } from "vitest";
import {
  buildHolderContext, renderContextBlock, filterTranscript
} from "../../src/core/holder-context.js";
import type { Belief } from "../../src/domain/belief.js";
import type { NarrativeEvent } from "../../src/domain/event.js";
import type { OfficialRecord } from "../../src/domain/record.js";
import { asCampaignId, asEntityID, asEventId, asHolderId, asRecordId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");
const holderId = asHolderId("h1");

function event(id: string, over: Partial<NarrativeEvent> = {}): NarrativeEvent {
  return {
    eventId: asEventId(id), campaignId: cid, day: 1, turn: 1, gravity: 1,
    acts: [], circumstance: `something at ${id}`, participants: [], surfaceTokens: [],
    ...over
  };
}

function belief(eventId: string, salience: number, over: Partial<Belief> = {}): Belief {
  return {
    holderId,
    subject: { kind: "EVENT", id: asEventId(eventId) },
    content: `belief about ${eventId}`,
    learnedOnDay: 1,
    certainty: "TOLD",
    fiabilite: "TEMOIGNAGE",
    method: "DIALOGUE_DIRECT",
    salience,
    factors: { gravity: 0, recency: 0, personalInvolvement: 0, socialPosition: 0, propagationDelay: 0 },
    ...over
  };
}

const base = { holderId, road: "DECLARED_INDIVIDUAL" as const, day: 5, turn: 3, records: [] };

describe("buildHolderContext · the #21 null doctrine", () => {
  // The Cassius Vorentius bug was a plausible-empty standing in for a null.
  // An empty list is an ANSWER, and it has to say so in band or the agent will
  // hunt for the read that does not exist and improvise when it fails.
  it("a holder who knows nothing gets beliefs: [] plus an explain line saying so", () => {
    const ctx = buildHolderContext({ ...base, beliefs: [], events: [] });
    expect(ctx.beliefs).toEqual([]);
    expect(ctx.omitted).toBe(0);
    expect(ctx.explain).toMatch(/knows nothing/i);
    expect(ctx.explain).toMatch(/not a missing read/i);
  });

  it("names the road that answered, always", () => {
    const ctx = buildHolderContext({ ...base, road: "AUTO_PARTICIPANT", beliefs: [], events: [] });
    expect(ctx.road).toBe("AUTO_PARTICIPANT");
    expect(ctx.explain).toMatch(/AUTO_PARTICIPANT/);
  });

  it("carries the entity the cascade started from when asked by entity", () => {
    const ctx = buildHolderContext({
      ...base, resolvedFrom: asEntityID("npc1"), beliefs: [], events: []
    });
    expect(ctx.resolvedFrom).toBe("npc1");
  });
});

describe("buildHolderContext · ranking and truncation", () => {
  it("ranks by salience, highest first", () => {
    const ctx = buildHolderContext({
      ...base,
      beliefs: [belief("e1", 0.2), belief("e2", 0.9), belief("e3", 0.5)],
      events: [event("e1"), event("e2"), event("e3")]
    });
    expect(ctx.beliefs.map(b => b.subject.id)).toEqual(["e2", "e3", "e1"]);
  });

  // A truncated read is never silent: an agent that cannot tell "nothing more"
  // from "more, withheld" will narrate the difference away.
  it("topK truncates and reports how many were dropped", () => {
    const ctx = buildHolderContext({
      ...base, topK: 2,
      beliefs: [belief("e1", 0.2), belief("e2", 0.9), belief("e3", 0.5)],
      events: [event("e1"), event("e2"), event("e3")]
    });
    expect(ctx.beliefs).toHaveLength(2);
    expect(ctx.omitted).toBe(1);
    expect(ctx.explain).toMatch(/1 lower-salience belief\(s\) were left out/);
  });
});

describe("buildHolderContext · about", () => {
  const npc = asEntityID("npc1");
  const events = [
    event("e_participant", { participants: [npc] }),
    event("e_place", { placeId: npc }),
    event("e_actor", { acts: [{ actorId: npc, verb: "SPEAKS" }] }),
    event("e_object", { acts: [{ actorId: asEntityID("other"), verb: "TAKES", objectId: npc }] }),
    event("e_unrelated", { participants: [asEntityID("someone-else")] })
  ];

  it("keeps only the beliefs whose subject touches the entity", () => {
    const ctx = buildHolderContext({
      ...base, about: npc,
      beliefs: events.map((e, i) => belief(String(e.eventId), 1 - i / 10)),
      events
    });
    expect(ctx.beliefs.map(b => String(b.subject.id))).toEqual([
      "e_participant", "e_place", "e_actor", "e_object"
    ]);
  });

  it("matches a record by its subject entity or its author", () => {
    const record: OfficialRecord = {
      recordId: asRecordId("r1"), campaignId: cid, entityId: npc, key: "role",
      value: { type: "STRING", value: "capitaine" }, category: "SOCIAL",
      authoredBy: asEntityID("crown"), route: "OFFICIAL",
      observation: { source: "SYSTEM", method: "DOCUMENT", timestamp: 0 },
      day: 1, turn: 1, surfaceTokens: []
    };
    const ctx = buildHolderContext({
      ...base, about: npc, events: [], records: [record],
      beliefs: [belief("unused", 1, { subject: { kind: "RECORD", id: asRecordId("r1") } })]
    });
    expect(ctx.beliefs).toHaveLength(1);
  });

  // "They hold beliefs, none about this subject" is a different fact from
  // "they hold nothing at all", and the agent has to be able to tell them apart.
  it("says the holder knows something, just nothing about this subject", () => {
    const ctx = buildHolderContext({
      ...base, about: asEntityID("stranger"),
      beliefs: [belief("e_unrelated", 0.5)],
      events
    });
    expect(ctx.beliefs).toEqual([]);
    expect(ctx.explain).toMatch(/none of them about "stranger"/);
    expect(ctx.explain).toMatch(/narrate their ignorance/i);
  });
});

describe("renderContextBlock", () => {
  it("states in band that there is no read for what is true", () => {
    const block = renderContextBlock(buildHolderContext({
      ...base, beliefs: [belief("e1", 0.5)], events: [event("e1")]
    }));
    expect(block).toMatch(/Only this may inform their behaviour/);
    expect(block).toMatch(/no "what is actually true" read/);
    expect(block).toMatch(/belief about e1/);
  });

  it("renders the empty case as the explain line, not as a blank block", () => {
    const block = renderContextBlock(buildHolderContext({ ...base, beliefs: [], events: [] }));
    expect(block).toMatch(/knows nothing/i);
  });

  it("says how many were omitted", () => {
    const block = renderContextBlock(buildHolderContext({
      ...base, topK: 1,
      beliefs: [belief("e1", 0.9), belief("e2", 0.1)],
      events: [event("e1"), event("e2")]
    }));
    expect(block).toMatch(/1 lower-salience belief\(s\) omitted/);
  });
});

describe("filterTranscript · phase C", () => {
  const known = event("e_known", { surfaceTokens: ["la forge"] });
  const secret = event("e_secret", { surfaceTokens: ["le péage de Valmure"] });
  const world = { events: [known, secret], records: [], entities: [] };
  const beliefs = [belief("e_known", 1)];

  // Without this the guarantee expires after one turn: turn 2's prompt replays
  // turn 1's prose, and no per-call filter can help.
  it("drops an entry carrying a token this holder never learned", () => {
    const result = filterTranscript(world, beliefs, [
      { id: "1", text: "Vous entrez dans la forge." },
      { id: "2", text: "Le péage de Valmure a brûlé cette nuit." }
    ]);
    expect(result.kept.map(e => e.id)).toEqual(["1"]);
    expect(result.dropped).toHaveLength(1);
    expect(result.dropped[0]!.present).toEqual(["le péage de valmure"]);
  });

  it("keeps everything when the holder holds every subject", () => {
    const result = filterTranscript(world, [belief("e_known", 1), belief("e_secret", 1)], [
      { id: "1", text: "Le péage de Valmure a brûlé." }
    ]);
    expect(result.kept).toHaveLength(1);
    expect(result.dropped).toEqual([]);
  });

  // Dropping, never rewriting: a summariser would be a model call inside the
  // seam, and the seam's claim is that it hands over nothing it has not checked.
  it("drops rather than redacting in place", () => {
    const result = filterTranscript(world, beliefs, [
      { id: "1", text: "Le péage de Valmure a brûlé." }
    ]);
    expect(result.kept).toEqual([]);
    expect(result.dropped[0]!.entry.text).toBe("Le péage de Valmure a brûlé.");
  });
});
