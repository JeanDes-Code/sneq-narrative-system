import type { NarrativeEvent } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Belief } from "../domain/belief.js";
import type { EntityID, HolderId } from "../domain/ids.js";
import { SneqContainmentError } from "../errors.js";
import { STOPWORDS } from "./stopwords.js";

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
  const { identity, declared } = tokenPartsOf(subject, entities);
  return [...new Set([...declared, ...identity])];
}

/**
 * The same tokens, split by where they came from.
 *
 * `identity` is what the engine derived from an entity's name or aliases;
 * `declared` is everything the subject states about itself — model-supplied
 * `surfaceTokens`, a record's key, a record's textual value. The public
 * exemption may only free the first kind: a secret whose *value* happens to
 * spell a public entity's name is still a secret, and exempting it by string
 * match would hand it over.
 */
function tokenPartsOf(
  subject: NarrativeEvent | OfficialRecord,
  entities: EntityLike[]
): { identity: string[]; declared: string[] } {
  const declared = new Set<string>(subject.surfaceTokens);
  const identity = new Set<string>();
  if ("eventId" in subject) {
    for (const name of namesOf(entities, [
      ...subject.participants,
      subject.placeId,
      ...subject.acts.map(a => a.objectId),
      ...subject.acts.map(a => a.actorId)
    ])) identity.add(name);
  } else {
    for (const name of namesOf(entities, [subject.entityId, subject.authoredBy])) identity.add(name);
    declared.add(subject.key);
    const value = textualValue(subject.value);
    if (value !== null) declared.add(value);
  }
  return { identity: [...identity], declared: [...declared] };
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

export type InventionTokenRejection = {
  token: string;
  /** The model never said it — a trigger invented purely to be a trigger. */
  reason: "ABSENT_FROM_SOURCE"
  /** A stopword or a fragment: it matches almost any sentence, so a match proves nothing. */
        | "NOT_DISTINCTIVE";
};

/** Below this, a token is a fragment rather than a name. */
const MIN_TOKEN_LENGTH = 3;

/**
 * Can this string carry a secret at all?
 *
 * A stopword or a two-letter fragment cannot. It appears in innocent prose
 * constantly, so its presence is evidence of nothing — which cuts both ways:
 * as an uptake trigger it promotes on noise, and as a forbidden token it
 * blocks on noise. One list settles both.
 */
function isDistinctive(token: string): boolean {
  const t = token.trim().toLowerCase();
  return t.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(t);
}

/**
 * Commit-time validation of an invention's uptake alphabet (#46).
 *
 * These tokens are what `detectUptake` searches the player's utterance for, and
 * a match promotes the invention into canon. They arrive from the model, and
 * until 0.5.1 nothing looked at them — so the model chose the string whose
 * later appearance would make its own invention true. Tag one `"le"` and the
 * next French sentence the player types promotes it.
 *
 * Two guards, because each catches what the other cannot:
 *
 * - **Provenance.** The token must occur in `sourceNarration`, so it can only
 *   be something the player actually read. This is the event-side argument
 *   (`validateSuppliedTokens`) applied to the other half of the bundle.
 * - **Distinctiveness.** The token must not be a stopword and must not be a
 *   fragment. Provenance alone cannot catch this: `sourceNarration` is
 *   model-supplied too, and `"le"` occurs in nearly all French prose, so it
 *   passes a presence check trivially.
 *
 * **What this does not do.** It raises the floor; it does not make the channel
 * safe. A common noun that is not a stopword — `"porte"`, `"nord"` — still
 * passes, and detecting that would need a frequency model this engine does not
 * have. The durable answer is to stop detecting uptake from raw prose at all
 * and carve it from an act instead; this guard is what holds until then.
 */
export function validateInventionTokens(
  invention: { sourceNarration: string; surfaceTokens: string[] }
): InventionTokenRejection[] {
  const source = invention.sourceNarration.toLowerCase();
  const out: InventionTokenRejection[] = [];
  for (const token of invention.surfaceTokens) {
    const normalized = token.trim().toLowerCase();
    // Distinctiveness first: it is the more actionable message, and a stopword
    // is usually present in the source as well, so provenance would pass it.
    if (!isDistinctive(token)) {
      out.push({ token, reason: "NOT_DISTINCTIVE" });
      continue;
    }
    if (!source.includes(normalized)) {
      out.push({ token, reason: "ABSENT_FROM_SOURCE" });
    }
  }
  return out;
}

/**
 * Every token from every event/record this holder has NOT learned. Decided
 * from state, before any call — not a validator on the model's output; a
 * statement about what was handed over.
 *
 * Three things are never forbidden. A token the holder legitimately holds, even
 * if it also appears in something they do not hold. The name of an entity
 * authored `public` (see `PUBLIC_TAG`) — but only where that token is purely
 * an identity: if any unlearned subject also *declares* the same string as its
 * own surface token, key or value, the exemption does not apply to it, because
 * freeing the name would free the secret spelled the same way.
 *
 * And anything that cannot carry a secret (#46). Model-supplied tokens reach
 * this set from events and records as well as inventions, a record's `key` and
 * `value` join it automatically, and none of those paths checked
 * distinctiveness. One `"le"` on one event forbade the commonest word in the
 * language for every holder who had not learned it — `assertContainment` threw
 * on harmless payloads and `filterTranscript` dropped legitimate entries in
 * silence.
 *
 * Removing them cannot leak: a stopword conveys nothing, which is what makes it
 * a stopword. It does mean an entity whose *entire* name is a stopword or two
 * letters long is not protected by substring containment — and it never was.
 * Blocking every payload containing `"or"` is not protection, it is refusal to
 * answer; the engine declines to pretend otherwise.
 */
export function forbiddenTokensFor(world: TokenWorld, beliefs: Belief[]): string[] {
  const held = new Set(beliefs.map(b => `${b.subject.kind}:${b.subject.id}`));
  const forbidden = new Set<string>();
  const allowed = new Set<string>();
  /** Tokens an unlearned subject states about itself — never exemptible. */
  const declaredByUnlearned = new Set<string>();

  const walk = (subject: NarrativeEvent | OfficialRecord, isHeld: boolean) => {
    const target = isHeld ? allowed : forbidden;
    const { identity, declared } = tokenPartsOf(subject, world.entities);
    for (const t of identity) target.add(t.toLowerCase());
    for (const t of declared) {
      target.add(t.toLowerCase());
      if (!isHeld) declaredByUnlearned.add(t.toLowerCase());
    }
  };
  for (const e of world.events) walk(e, held.has(`EVENT:${e.eventId}`));
  for (const r of world.records) walk(r, held.has(`RECORD:${r.recordId}`));

  const publicTokens = publicTokensOf(world.entities);
  return [...forbidden].filter(t =>
    isDistinctive(t) &&
    !allowed.has(t) &&
    !(publicTokens.has(t) && !declaredByUnlearned.has(t)));
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
