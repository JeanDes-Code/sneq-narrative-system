import type { NarrativeEvent } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Belief } from "../domain/belief.js";
import type { EntityID, HolderId } from "../domain/ids.js";
import { SneqContainmentError } from "../errors.js";

/** The identity surface the engine can floor without NLP (#25). */
export interface EntityLike {
  id: EntityID;
  name: string;
  aliases: string[];
  /** `public` here exempts this entity's own name and aliases from the floor. */
  tags?: string[];
}

/**
 * Declares a name common knowledge. The floor forbids the names of every
 * subject a holder has not learned, which is right for people and secrets and
 * wrong for landmarks: a tavern that appears in one secret meeting becomes
 * unmentionable to the whole town, and the host's own scene description stops
 * passing its own pre-flight check.
 *
 * Tag the tavern `public` and its NAME stops being withheld. Nothing else
 * changes: what happened there is still forbidden, and every model-supplied
 * token, record key and record value stays subject to the floor. This is a
 * deliberate, authored, per-entity weakening — `doctor` counts them.
 */
export const PUBLIC_TAG = "public";

/** Names and aliases of entities declared common knowledge, lowercased. */
function publicTokensOf(entities: EntityLike[]): Set<string> {
  const out = new Set<string>();
  for (const e of entities) {
    if (!e.tags?.includes(PUBLIC_TAG)) continue;
    out.add(e.name.toLowerCase());
    for (const a of e.aliases) out.add(a.toLowerCase());
  }
  return out;
}

export interface TokenWorld {
  events: NarrativeEvent[];
  records: OfficialRecord[];
  entities: EntityLike[];
}

const textualValue = (v: { type: string } & Record<string, unknown>): string | null => {
  if (v.type === "STRING" || v.type === "ENUM") return String(v["value"]);
  return null;
};

function namesOf(entities: EntityLike[], ids: Iterable<EntityID | undefined>): string[] {
  const byId = new Map(entities.map(e => [String(e.id), e] as const));
  const out: string[] = [];
  for (const id of ids) {
    if (id === undefined) continue;
    const e = byId.get(String(id));
    if (e) out.push(e.name, ...e.aliases);
  }
  return out;
}

/**
 * Supplied tokens + the engine floor (#25): participant/place/object names and
 * aliases for events; subject names, key, and textual value for records.
 * `verb` is excluded — taxonomy strings do not occur in prose and only add
 * false positives. The measured basis: the prototype's containment ran on
 * hand-authored lowercase phrases; the floor covers what is mechanically
 * nameable, the model covers the distinctive surface.
 */
export function surfaceTokensOf(subject: NarrativeEvent | OfficialRecord, entities: EntityLike[]): string[] {
  const tokens = new Set<string>(subject.surfaceTokens);
  if ("eventId" in subject) {
    for (const name of namesOf(entities, [
      ...subject.participants,
      subject.placeId,
      ...subject.acts.map(a => a.objectId),
      ...subject.acts.map(a => a.actorId)
    ])) tokens.add(name);
  } else {
    for (const name of namesOf(entities, [subject.entityId, subject.authoredBy])) tokens.add(name);
    tokens.add(subject.key);
    const value = textualValue(subject.value);
    if (value !== null) tokens.add(value);
  }
  return [...tokens];
}

/**
 * Commit-time validation (#25): a supplied token absent from `circumstance`
 * and every textual act value cannot leak — it can only false-positive against
 * innocent prose — so it is rejected. Returns the invalid tokens.
 */
export function validateSuppliedTokens(e: NarrativeEvent): string[] {
  const haystacks = [
    e.circumstance.toLowerCase(),
    ...e.acts.map(a => (a.value ? textualValue(a.value) : null))
      .filter((v): v is string => v !== null)
      .map(v => v.toLowerCase())
  ];
  return e.surfaceTokens.filter(t => !haystacks.some(h => h.includes(t.toLowerCase())));
}

/**
 * Every token from every event/record this holder has NOT learned. Decided
 * from state, before any call — not a validator on the model's output; a
 * statement about what was handed over.
 *
 * Two things are never forbidden: a token the holder legitimately holds, even
 * if it also appears in something they do not hold; and the name of an entity
 * authored `public` (see `PUBLIC_TAG`).
 */
export function forbiddenTokensFor(world: TokenWorld, beliefs: Belief[]): string[] {
  const held = new Set(beliefs.map(b => `${b.subject.kind}:${b.subject.id}`));
  const forbidden = new Set<string>();
  const allowed = new Set<string>();
  for (const e of world.events) {
    const target = held.has(`EVENT:${e.eventId}`) ? allowed : forbidden;
    for (const t of surfaceTokensOf(e, world.entities)) target.add(t.toLowerCase());
  }
  for (const r of world.records) {
    const target = held.has(`RECORD:${r.recordId}`) ? allowed : forbidden;
    for (const t of surfaceTokensOf(r, world.entities)) target.add(t.toLowerCase());
  }
  const publicTokens = publicTokensOf(world.entities);
  return [...forbidden].filter(t => !allowed.has(t) && !publicTokens.has(t));
}

export interface ContainmentResult {
  pass: boolean;
  forbidden: string[];
  present: string[];
}

export function checkContainment(forbidden: string[], text: string): ContainmentResult {
  const hay = text.toLowerCase();
  const present = forbidden.filter(t => hay.includes(t.toLowerCase()));
  return { pass: present.length === 0, forbidden, present };
}

/**
 * §11 phase D — the pre-flight assertion over the composed payload. The host
 * composes whatever it wants and submits the final string; SNEQ answers
 * whether it contains a token this holder cannot hold. Default posture: throw.
 */
export function assertContainment(
  world: TokenWorld, beliefs: Belief[], holderId: HolderId, text: string
): ContainmentResult {
  const result = checkContainment(forbiddenTokensFor(world, beliefs), text);
  if (!result.pass) throw new SneqContainmentError(String(holderId), result.forbidden, result.present);
  return result;
}
