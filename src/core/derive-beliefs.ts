import type { NarrativeEvent } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Carriage, CarriageEffect } from "../domain/carriage.js";
import type { Holder, GroupHolder } from "../domain/holder.js";
import type { Belief, BeliefCertainty, SalienceFactors } from "../domain/belief.js";
import type { Fiabilite, ObservationMethod } from "../domain/observation.js";
import type { HolderId } from "../domain/ids.js";
import { computeSalience, DEFAULT_SALIENCE_WEIGHTS, type SalienceWeights } from "./salience.js";

export interface BeliefWorld {
  events: NarrativeEvent[];
  records: OfficialRecord[];
  carriages: Carriage[];
  carriageEffects: CarriageEffect[];
  holders: Holder[];
  /** The bootstrap default group (§2.3) — LEGACY_CANON events are known here (#17). */
  defaultGroupId: HolderId;
  salienceWeights?: SalienceWeights;
}

/** Derived arrival: departedDay + travelDays + Σ DELAY; null = CANCELled. */
function arrivalDay(c: Carriage, effects: CarriageEffect[]): number | null {
  let day = c.departedDay + c.travelDays;
  for (const fx of effects) {
    if (fx.carriageId !== c.carriageId) continue;
    if (fx.effect.kind === "CANCEL") return null;
    if (fx.effect.kind === "DELAY") day += fx.effect.days;
  }
  return day;
}

function isDiscredited(c: Carriage, effects: CarriageEffect[]): boolean {
  return effects.some(fx => fx.carriageId === c.carriageId && fx.effect.kind === "DISCREDIT");
}

function degrade(f: Fiabilite): Fiabilite {
  if (f === "CERTAINE") return "TEMOIGNAGE";
  return "RUMEUR_CONFIRMEE";
}

const isLegacyCanon = (e: NarrativeEvent) => e.acts.some(a => a.verb === "LEGACY_CANON");

interface Learned {
  subject: Belief["subject"];
  content: string;
  learnedOnDay: number;
  subjectDay: number;
  gravity: number;
  certainty: BeliefCertainty;
  fiabilite: Fiabilite;
  method: ObservationMethod;
  viaCarrier?: string;
  participant: boolean;
}

/**
 * What a holder knows (§2.5): a pure function of
 * (events, records, carriages, effects, holders, today). Never stored.
 *
 * The matrix (§7.2): participants know immediately with WITNESSED; a group
 * witnesses events at its own place; everything else arrives by carriage —
 * nothing early, OFFICIAL halts at a realm border regardless of standing,
 * RUMOUR crosses but still waits, `minStanding` filters strata, DELAY shifts,
 * CANCEL kills, DISCREDIT degrades fiabilite only. LEGACY_CANON events are
 * known to the campaign default group (and, by inheritance, the player) from
 * day 0 (#17) — pre-0.4 canon was omniscient; old data keeps old semantics.
 */
export function deriveBeliefs(world: BeliefWorld, holderId: HolderId, today: number): Belief[] {
  const holder = world.holders.find(h => h.holderId === holderId);
  if (!holder) throw new Error(`holder "${holderId}" not found`);

  const group: GroupHolder | undefined = holder.kind === "GROUP"
    ? holder
    : (world.holders.find(h => h.holderId === (holder.kind === "INDIVIDUAL" ? holder.baseGroupId : "")) as GroupHolder | undefined);
  const standing = holder.kind === "INDIVIDUAL"
    ? (holder.standingOverride ?? group?.standing ?? 0)
    : holder.standing;
  const placeId = group?.placeId;

  const learned = new Map<string, Learned>();
  const hold = (l: Learned) => {
    const key = `${l.subject.kind}:${l.subject.id}`;
    const prior = learned.get(key);
    // WITNESSED is not negotiable; otherwise the earliest arrival wins.
    if (prior && (prior.certainty === "WITNESSED" || prior.learnedOnDay <= l.learnedOnDay)) return;
    if (prior && l.certainty !== "WITNESSED" && prior.learnedOnDay < l.learnedOnDay) return;
    learned.set(key, l);
  };

  for (const e of world.events) {
    if (e.day > today) continue;
    const base = {
      subject: { kind: "EVENT", id: e.eventId } as const,
      content: e.circumstance, subjectDay: e.day, gravity: e.gravity
    };
    const witnessed = (participant: boolean): Learned => ({
      ...base, learnedOnDay: e.day, certainty: "WITNESSED", fiabilite: "CERTAINE",
      method: "OBSERVATION_VISUELLE", participant
    });
    if (holder.kind === "INDIVIDUAL" && e.participants.includes(holder.entityId)) {
      hold(witnessed(true));
      continue;
    }
    // #17: the migration epoch is known to the default group; individuals based
    // on it inherit. Pre-0.4 canon was omniscient — old data keeps old semantics.
    if (isLegacyCanon(e) && (holder.holderId === world.defaultGroupId || group?.holderId === world.defaultGroupId)) {
      hold(witnessed(false));
      continue;
    }
    if (placeId !== undefined && e.placeId === placeId) {
      hold(witnessed(false));
    }
  }

  const recordsById = new Map(world.records.map(r => [String(r.recordId), r] as const));
  const eventsById = new Map(world.events.map(e => [String(e.eventId), e] as const));

  for (const c of world.carriages) {
    if (placeId === undefined || c.toPlaceId !== placeId) continue;
    if (c.route === "OFFICIAL" && c.originRealm !== c.destinationRealm) continue; // the structural halt (§2.4)
    if (c.minStanding !== undefined && standing < c.minStanding) continue;
    const arrival = arrivalDay(c, world.carriageEffects);
    if (arrival === null || arrival > today) continue;

    const baseFiabilite: Fiabilite = c.route === "OFFICIAL" ? "TEMOIGNAGE" : "RUMEUR_CONFIRMEE";
    const fiabilite = isDiscredited(c, world.carriageEffects) ? degrade(baseFiabilite) : baseFiabilite;

    if (c.subject.kind === "EVENT") {
      const e = eventsById.get(String(c.subject.id));
      if (!e) continue;
      hold({
        subject: { kind: "EVENT", id: e.eventId }, content: e.circumstance,
        learnedOnDay: arrival, subjectDay: e.day, gravity: e.gravity,
        certainty: "TOLD", fiabilite,
        method: c.route === "OFFICIAL" ? "DOCUMENT" : "DIALOGUE_DIRECT",
        viaCarrier: c.carrier, participant: false
      });
    } else {
      const r = recordsById.get(String(c.subject.id));
      if (!r) continue;
      const textual = r.value.type === "STRING" || r.value.type === "ENUM" ? r.value.value : JSON.stringify(r.value);
      hold({
        subject: { kind: "RECORD", id: r.recordId }, content: `${r.key}: ${textual}`,
        learnedOnDay: arrival, subjectDay: r.day, gravity: 0,
        certainty: "TOLD", fiabilite, method: r.observation.method,
        viaCarrier: c.carrier, participant: false
      });
    }
  }

  const weights = world.salienceWeights ?? DEFAULT_SALIENCE_WEIGHTS;
  const beliefs: Belief[] = [...learned.values()].map(l => {
    const factors: SalienceFactors = {
      gravity: l.gravity / 3,
      recency: 1 / (1 + (today - l.learnedOnDay)),
      personalInvolvement: l.participant ? 1 : 0,
      socialPosition: standing,
      propagationDelay: 1 / (1 + (l.learnedOnDay - l.subjectDay))
    };
    return {
      holderId, subject: l.subject, content: l.content,
      learnedOnDay: l.learnedOnDay,
      ...(l.viaCarrier !== undefined ? { viaCarrier: l.viaCarrier } : {}),
      certainty: l.certainty, fiabilite: l.fiabilite, method: l.method,
      salience: computeSalience(factors, weights), factors
    };
  });
  return beliefs.sort((a, b) => b.salience - a.salience);
}
