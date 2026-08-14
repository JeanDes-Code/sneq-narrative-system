import type { Belief } from "../domain/belief.js";
import type { NarrativeEvent } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { ProvisionalInvention } from "../domain/invention.js";
import type { EntityID, HolderId, InventionId } from "../domain/ids.js";
import type { ResolutionRoad } from "./holder-resolution.js";
import { detectUptake } from "./promotion.js";
import { checkContainment, forbiddenTokensFor, type TokenWorld } from "./containment.js";

/**
 * Phase B's answer (§11). Everything an agent needs to write one turn for one
 * holder, and nothing it needs to write the turn for somebody else.
 *
 * The three states of #21's null doctrine are distinguishable here and never
 * conflated: an unknown id throws before this type is built; no scene is a
 * literal `scene: null` on the frame; a holder who knows nothing is
 * `beliefs: []` **plus** an `explain` line that says so. The Cassius Vorentius
 * bug was a plausible-empty standing in for a null.
 */
export interface HolderContext {
  holderId: HolderId;
  /** Which road of the §2.3 cascade answered — the reply always names it (#21). */
  road: ResolutionRoad;
  /** Present when the caller asked by entity: the entity the cascade started from. */
  resolvedFrom?: EntityID;
  day: number;
  turn: number;
  /** Ranked by salience, highest first. Empty is an answer, not a failure. */
  beliefs: Belief[];
  /** How many beliefs `topK` dropped — a truncated read is never silent. */
  omitted: number;
  /** Why the list looks the way it does, in one sentence. Always present. */
  explain: string;
}

/** Does this belief's subject touch `entityId` at all? Used by `about`. */
function subjectTouches(
  belief: Belief,
  entityId: EntityID,
  events: NarrativeEvent[],
  records: OfficialRecord[],
): boolean {
  if (belief.subject.kind === "EVENT") {
    const e = events.find(x => x.eventId === belief.subject.id);
    if (!e) return false;
    return e.participants.includes(entityId)
      || e.placeId === entityId
      || e.acts.some(a => a.actorId === entityId || a.objectId === entityId || a.sets?.entityId === entityId);
  }
  const r = records.find(x => x.recordId === belief.subject.id);
  if (!r) return false;
  return r.entityId === entityId || r.authoredBy === entityId;
}

export interface HolderContextInput {
  holderId: HolderId;
  road: ResolutionRoad;
  resolvedFrom?: EntityID;
  day: number;
  turn: number;
  beliefs: Belief[];
  events: NarrativeEvent[];
  records: OfficialRecord[];
  about?: EntityID;
  topK?: number;
}

/**
 * Filter, rank and explain — the pure half of phase B. `deriveBeliefs` has
 * already decided what this holder knows; this decides what to hand over.
 *
 * `about` filters on an event→entity walk done here rather than through an
 * index: `Belief.subject` is EVENT | RECORD, and the contract has no
 * event→entity index (a gap §13 names). Over a campaign's ledger the walk is
 * cheap; if it ever stops being cheap, that index is the fix, not a cache.
 */
export function buildHolderContext(input: HolderContextInput): HolderContext {
  const all = input.beliefs;
  const scoped = input.about === undefined
    ? all
    : all.filter(b => subjectTouches(b, input.about!, input.events, input.records));
  const ranked = [...scoped].sort((a, b) => b.salience - a.salience);
  const kept = input.topK === undefined ? ranked : ranked.slice(0, input.topK);

  return {
    holderId: input.holderId,
    road: input.road,
    ...(input.resolvedFrom !== undefined ? { resolvedFrom: input.resolvedFrom } : {}),
    day: input.day,
    turn: input.turn,
    beliefs: kept,
    omitted: ranked.length - kept.length,
    explain: explainOf(input, all.length, scoped.length, kept.length),
  };
}

function explainOf(
  input: HolderContextInput,
  total: number,
  scoped: number,
  kept: number,
): string {
  const who = `holder "${input.holderId}" (resolved by ${input.road})`;
  if (total === 0) {
    return `${who} knows nothing on day ${input.day}: no event they witnessed, no carriage that has reached them, ` +
      `no record they are entitled to. This is an answer, not a missing read — do not narrate around it, ` +
      `and do not ask the engine what is true, because nothing on the tool surface answers that.`;
  }
  if (input.about !== undefined && scoped === 0) {
    return `${who} holds ${total} belief(s), none of them about "${input.about}". ` +
      `They have not learned anything concerning that subject — narrate their ignorance, do not fill it in.`;
  }
  const head = `${who} holds ${kept} belief(s)` +
    (input.about !== undefined ? ` about "${input.about}"` : "") +
    ` as of day ${input.day}, ranked by salience`;
  const tail = scoped > kept
    ? `; ${scoped - kept} lower-salience belief(s) were left out by topK=${input.topK}.`
    : `.`;
  return head + tail;
}

/**
 * Phase C — the prompt block, rendered by the engine so every consumer stops
 * writing its own (4/4 did). Deliberately plain text: the host owns the
 * prompt, SNEQ owns what may be in it.
 */
export function renderContextBlock(ctx: HolderContext): string {
  const lines: string[] = [];
  lines.push(`# What ${ctx.holderId} knows (day ${ctx.day}, turn ${ctx.turn})`);
  lines.push(`Only this may inform their behaviour. There is no "what is actually true" read; there never was one to find.`);
  lines.push("");
  if (ctx.beliefs.length === 0) {
    lines.push(`(nothing — ${ctx.explain})`);
    return lines.join("\n");
  }
  for (const b of ctx.beliefs) {
    const via = b.viaCarrier ? `, via ${b.viaCarrier}` : "";
    lines.push(`- ${b.content} [${b.certainty}, ${b.fiabilite}, learned day ${b.learnedOnDay}${via}]`);
  }
  if (ctx.omitted > 0) {
    lines.push("");
    lines.push(`(${ctx.omitted} lower-salience belief(s) omitted)`);
  }
  return lines.join("\n");
}

export interface TranscriptEntry {
  id: string;
  text: string;
}

export interface TranscriptFilterResult {
  kept: TranscriptEntry[];
  /** Each dropped entry with the tokens that condemned it — a redaction that explains itself. */
  dropped: Array<{ entry: TranscriptEntry; present: string[] }>;
}

/**
 * Phase C's other half (§11) — the leak that is measurable today. The host
 * holds a transcript; this says which entries THIS holder may see. Without it
 * the guarantee expires after one turn, because turn 2's prompt replays turn
 * 1's prose unfiltered (grimoire re-injects the last twelve journal entries
 * raw on every call).
 *
 * Drop, never rewrite: a summariser would be a model call inside the seam, and
 * the seam's whole claim is that it hands over nothing it has not checked.
 */
export function filterTranscript(
  world: TokenWorld,
  beliefs: Belief[],
  entries: TranscriptEntry[],
): TranscriptFilterResult {
  const forbidden = forbiddenTokensFor(world, beliefs);
  const kept: TranscriptEntry[] = [];
  const dropped: TranscriptFilterResult["dropped"] = [];
  for (const entry of entries) {
    const result = checkContainment(forbidden, entry.text);
    if (result.pass) kept.push(entry);
    else dropped.push({ entry, present: result.present });
  }
  return { kept, dropped };
}

export interface IngestedPlayerInput {
  holderId: HolderId;
  road: ResolutionRoad;
  /** Free-text mentions resolved against canon; `entityId: null` = unresolved, which is normal. */
  mentions: Array<{ mention: string; entityId: EntityID | null; confidence: number }>;
  /**
   * Provisional inventions this utterance takes up (§2.6) — detected here by
   * the engine, never claimed by the model. Hand them to `commit_narrative` as
   * `playerUtterance` and the same detection runs again at commit, which is
   * the one that counts.
   */
  uptake: InventionId[];
}

/** The detection half of phase A, pure. Resolution of mentions needs the resolver and stays in the context. */
export function detectPlayerUptake(
  text: string,
  inventions: ProvisionalInvention[],
  atTurn: number,
): InventionId[] {
  return detectUptake(text, inventions, atTurn);
}
