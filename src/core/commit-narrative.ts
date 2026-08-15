import type { NarrativeEvent, EventAct } from "../domain/event.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Carriage, CarriageEffect, DispatchPolicy } from "../domain/carriage.js";
import type { CarriageRoute } from "../domain/record.js";
import type { GroupHolder, Holder } from "../domain/holder.js";
import type { ProvisionalInvention, InventionTransition, PromotionEvidence } from "../domain/invention.js";
import type { CanonicalAttribute } from "../domain/attribute.js";
import type { Potentialite } from "../domain/potentialite.js";
import type { CampaignId, CarriageId, ConstraintId, EntityID, EventId, FactId, InventionId, RecordId } from "../domain/ids.js";
import { SneqContradictionError, SneqValidationError, type IntraCommitConflict } from "../errors.js";
import { validateSuppliedTokens } from "./containment.js";
import { decidePromotion, detectUptake } from "./promotion.js";

export interface CommitEventInput {
  eventId: EventId;
  placeId?: EntityID;
  gravity: 0 | 1 | 2 | 3;
  acts: EventAct[];
  circumstance: string;
  participants: EntityID[];
  surfaceTokens: string[];
}

export interface CommitCarriageInput {
  carriageId: CarriageId;
  subject: { kind: "EVENT"; id: EventId } | { kind: "RECORD"; id: RecordId };
  carrier: string;
  route: CarriageRoute;
  fromPlaceId: EntityID;
  toPlaceId: EntityID;
  travelDays: number;
  minStanding?: number;
}

export interface CommitNarrativeBundle {
  campaignId: CampaignId;
  operationId: string;
  /** REQUIRED (#20): the fiction declares its own elapsed time, every turn. 0 is legal. */
  daysElapsed: number;
  event?: CommitEventInput;
  records?: Array<Omit<OfficialRecord, "campaignId" | "day" | "turn">>;
  carriages?: CommitCarriageInput[];
  carriageEffects?: Array<Omit<CarriageEffect, "campaignId">>;
  inventions?: Array<Omit<ProvisionalInvention, "campaignId" | "introducedAtTurn" | "introducedOnDay" | "status" | "lastReferencedTurn">>;
  promotionEvidence?: Array<{ inventionId: InventionId; evidence: PromotionEvidence }>;
  holders?: Holder[];
  /** Additive (#15): routes and rules accrete, they never replace. */
  policy?: Partial<DispatchPolicy>;
  /**
   * The player's raw text this turn (§11 phase A). The engine substring-searches
   * it for every provisional invention's known `surfaceTokens` and adds the
   * `PLAYER_UPTAKE` evidence itself (#25) — promotion is detected at commit
   * time, never claimed by the model (§2.6).
   *
   * Uptake needs an event to point at, so this only fires when the bundle
   * carries one: the utterance belongs on the ledger before it can promote
   * anything. Before 0.5.0 no tool, CLI command or bundle field ever handed
   * SNEQ this text, which is what made the model the judge of its own
   * inventions.
   */
  playerUtterance?: string;
}

export interface CommitContext {
  campaignId: CampaignId;
  worldDay: number;
  latestTurn: number;
  policy: DispatchPolicy;
  /** Realm membership of known places (#26); absent place → default realm. */
  places: Array<{ id: EntityID; realmId?: EntityID }>;
  defaultRealmId: EntityID;
  /** Known community groups — ALL_KNOWN_COMMUNITIES targets. */
  communities: GroupHolder[];
  canon: CanonicalAttribute[];
  /** All PROVISIONAL inventions (for promotion + competition). */
  inventions: ProvisionalInvention[];
  potentialites: Potentialite[];
  maxDispatchFanout: number;
}

export interface CommitHealth {
  /** No rule matched the event — a policy hole (§6.1). */
  uncovered: boolean;
  /** A rule fired but no route reaches the target — a map hole (§6.1). */
  unroutable: Array<{ toPlaceId: EntityID; carrierLabel: string }>;
  /** Targets dropped by the fan-out cap (#15) — counted, never silent. */
  truncated: number;
}

export interface CommitPlan {
  newWorldDay: number;
  turn: number;
  event?: NarrativeEvent;
  records: OfficialRecord[];
  carriages: Carriage[];
  carriageEffects: CarriageEffect[];
  inventions: ProvisionalInvention[];
  transitions: InventionTransition[];
  canonicalUpdates: CanonicalAttribute[];
  holders: Holder[];
  policyUpdate?: DispatchPolicy;
  quarantined: ConstraintId[];
  health: CommitHealth;
}

/**
 * The single write (§5.1), as a pure decision — the `decideCommitNarrative`
 * §13 asked for, so the out-of-tree Convex adapter shares SNEQ's rules instead
 * of re-deriving them. The executor applies the plan in one transaction.
 */
export function decideCommitNarrative(bundle: CommitNarrativeBundle, ctx: CommitContext): CommitPlan {
  if (typeof bundle.daysElapsed !== "number" || Number.isNaN(bundle.daysElapsed)) {
    throw new SneqValidationError([{
      type: "FORMAT",
      message: "daysElapsed is required on every commit (#20): the fiction declares its own elapsed time — 0 is legal, absence is not"
    }]);
  }
  if (bundle.daysElapsed < 0) {
    throw new SneqValidationError([{ type: "FORMAT", message: `daysElapsed cannot be negative (${bundle.daysElapsed}) — the world clock never runs backward (§4)` }]);
  }

  const newWorldDay = ctx.worldDay + bundle.daysElapsed;
  const turn = ctx.latestTurn + 1;
  const realmOf = (placeId: EntityID): EntityID =>
    ctx.places.find(p => p.id === placeId)?.realmId ?? ctx.defaultRealmId;

  // -- event: token validation (#25) + intra-commit conflict (#27) ------------
  let event: NarrativeEvent | undefined;
  const canonicalByKey = new Map<string, CanonicalAttribute>();
  if (bundle.event) {
    event = { ...bundle.event, campaignId: bundle.campaignId, day: newWorldDay, turn };
    const invalid = validateSuppliedTokens(event);
    if (invalid.length > 0) {
      throw new SneqValidationError([{
        type: "FORMAT",
        message: `surfaceTokens not found in the event's content: ${invalid.map(t => JSON.stringify(t)).join(", ")} — a token absent from content cannot leak, it can only false-positive (#25)`
      }]);
    }
    const seen = new Map<string, string>();
    for (const act of event.acts) {
      if (!act.sets) continue;
      const slot = `${act.sets.entityId}|${act.sets.key}`;
      const encoded = JSON.stringify(act.sets.value);
      const prior = seen.get(slot);
      if (prior !== undefined && prior !== encoded) {
        const conflict: IntraCommitConflict = {
          entityId: act.sets.entityId, key: act.sets.key,
          values: [JSON.parse(prior), act.sets.value], eventId: event.eventId
        };
        throw new SneqContradictionError([conflict],
          `event "${event.eventId}" sets "${act.sets.key}" to two different values in one commit — a self-contradicting bundle (#27)`);
      }
      seen.set(slot, encoded);
      canonicalByKey.set(slot, {
        factId: `proj_${act.sets.entityId}_${act.sets.key}` as FactId,
        entityId: act.sets.entityId, key: act.sets.key,
        value: act.sets.value, category: act.sets.category,
        turn, day: newWorldDay, source: { kind: "EVENT", eventId: event.eventId }
      });
    }
  }

  // -- carriages: explicit (engine-stamped, #26) then policy dispatch (#15) ---
  const carriages: Carriage[] = (bundle.carriages ?? []).map(c => ({
    ...c, campaignId: bundle.campaignId,
    originRealm: realmOf(c.fromPlaceId), destinationRealm: realmOf(c.toPlaceId),
    departedDay: newWorldDay
  }));

  const health: CommitHealth = { uncovered: false, unroutable: [], truncated: 0 };
  if (event && event.gravity > 0) {
    const matching = ctx.policy.rules.filter(r => event!.gravity >= r.minGravity);
    if (matching.length === 0) health.uncovered = true;
    for (const rule of matching) {
      const from = event.placeId;
      if (from === undefined) continue;
      const targetPlaces: EntityID[] = rule.targets === "ALL_KNOWN_COMMUNITIES"
        ? [...new Set(ctx.communities.map(g => g.placeId).filter(p => p !== from))]
        : rule.targets;
      const routed: Array<{ toPlaceId: EntityID; travelDays: number }> = [];
      for (const to of targetPlaces) {
        const route = ctx.policy.routes.find(r => r.fromPlaceId === from && r.toPlaceId === to && r.route === rule.route);
        if (!route) { health.unroutable.push({ toPlaceId: to, carrierLabel: rule.carrierLabel }); continue; }
        routed.push({ toPlaceId: to, travelDays: route.travelDays });
      }
      // Near-first, deterministic: news travels near first (#15).
      routed.sort((a, b) => a.travelDays - b.travelDays || String(a.toPlaceId).localeCompare(String(b.toPlaceId)));
      const room = Math.max(0, ctx.maxDispatchFanout - carriages.length);
      const kept = routed.slice(0, room);
      health.truncated += routed.length - kept.length;
      for (const t of kept) {
        carriages.push({
          carriageId: `k_${event.eventId}_${t.toPlaceId}` as CarriageId,
          campaignId: bundle.campaignId,
          subject: { kind: "EVENT", id: event.eventId },
          carrier: rule.carrierLabel, route: rule.route,
          fromPlaceId: from, toPlaceId: t.toPlaceId,
          originRealm: realmOf(from), destinationRealm: realmOf(t.toPlaceId),
          departedDay: newWorldDay, travelDays: t.travelDays
        });
      }
    }
  }

  // -- records + inventions ---------------------------------------------------
  const records: OfficialRecord[] = (bundle.records ?? []).map(r => ({
    ...r, campaignId: bundle.campaignId, day: newWorldDay, turn
  }));
  const inventions: ProvisionalInvention[] = (bundle.inventions ?? []).map(i => ({
    ...i, campaignId: bundle.campaignId,
    introducedAtTurn: turn, introducedOnDay: newWorldDay,
    status: "PROVISIONAL", lastReferencedTurn: turn
  }));

  // -- promotions (§2.6): the collapse loop, with quarantine (#23) ------------
  // Engine-detected uptake first (#25, §11 phase A), then whatever evidence the
  // caller supplied for the three kinds only the world can witness. A caller
  // cannot fake PLAYER_UPTAKE past this: the detection re-runs here from the
  // raw text and dedups by inventionId.
  const detected: Array<{ inventionId: InventionId; evidence: PromotionEvidence }> = [];
  if (bundle.playerUtterance !== undefined && event) {
    for (const inventionId of detectUptake(bundle.playerUtterance, ctx.inventions, turn)) {
      detected.push({ inventionId, evidence: { kind: "PLAYER_UPTAKE", eventId: event.eventId } });
    }
  }
  const seenInvention = new Set<string>(detected.map(d => String(d.inventionId)));
  const allEvidence = [
    ...detected,
    ...(bundle.promotionEvidence ?? []).filter(e => !seenInvention.has(String(e.inventionId)))
  ];

  const transitions: InventionTransition[] = [];
  const quarantined: ConstraintId[] = [];
  for (const { inventionId, evidence } of allEvidence) {
    const invention = ctx.inventions.find(i => i.inventionId === inventionId);
    if (!invention || invention.status !== "PROVISIONAL") continue;
    const constraints = ctx.potentialites
      .filter(p => p.entiteId === invention.entityId && p.attribut === invention.attributeKey)
      .flatMap(p => p.contraintes);
    const competing = ctx.inventions.filter(i =>
      i.entityId === invention.entityId && i.attributeKey === invention.attributeKey && i.inventionId !== inventionId);
    const decision = decidePromotion(invention, {
      canon: ctx.canon, constraints, evidence, atDay: newWorldDay, atTurn: turn, competing
    });
    quarantined.push(...decision.quarantined);
    transitions.push(decision.transition);
    if (decision.outcome === "PROMOTED") {
      transitions.push(...decision.superseded);
      canonicalByKey.set(`${invention.entityId}|${invention.attributeKey}`, {
        factId: `proj_${invention.entityId}_${invention.attributeKey}` as FactId,
        entityId: invention.entityId, key: invention.attributeKey,
        value: invention.value, category: invention.category,
        turn, day: newWorldDay,
        source: { kind: "PROMOTED_INVENTION", inventionId: invention.inventionId }
      });
    }
  }

  // -- additive policy merge (#15) --------------------------------------------
  let policyUpdate: DispatchPolicy | undefined;
  if (bundle.policy && ((bundle.policy.routes?.length ?? 0) > 0 || (bundle.policy.rules?.length ?? 0) > 0)) {
    policyUpdate = {
      routes: [...ctx.policy.routes, ...(bundle.policy.routes ?? [])],
      rules: [...ctx.policy.rules, ...(bundle.policy.rules ?? [])]
    };
  }

  return {
    newWorldDay, turn,
    ...(event !== undefined ? { event } : {}),
    records, carriages,
    carriageEffects: (bundle.carriageEffects ?? []).map(fx => ({ ...fx, campaignId: bundle.campaignId })),
    inventions, transitions,
    canonicalUpdates: [...canonicalByKey.values()],
    holders: bundle.holders ?? [],
    ...(policyUpdate !== undefined ? { policyUpdate } : {}),
    quarantined, health
  };
}
