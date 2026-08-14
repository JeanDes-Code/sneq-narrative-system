import type { EntityID, CampaignId, EventId, RecordId, CarriageId } from "./ids.js";
import type { CarriageRoute } from "./record.js";

/**
 * What travels (§2.4). An OFFICIAL carriage with originRealm !==
 * destinationRealm delivers nothing — a structural halt, not an attenuation.
 */
export interface Carriage {
  carriageId: CarriageId;
  campaignId: CampaignId;
  subject: { kind: "EVENT"; id: EventId } | { kind: "RECORD"; id: RecordId };
  /** NAMED → traceable, interceptable. */
  carrier: string;
  route: CarriageRoute;
  fromPlaceId: EntityID;
  toPlaceId: EntityID;
  /** Engine-stamped at dispatch from fromPlaceId (#26) — never caller-supplied. */
  originRealm: EntityID;
  /** Engine-stamped at dispatch from toPlaceId (#26). */
  destinationRealm: EntityID;
  departedDay: number;
  /** The GAME supplies this number; SNEQ owns no map. */
  travelDays: number;
  minStanding?: number;
}

/**
 * Append-only — interception is gameplay, with provenance. Arrival is
 * derived: departedDay + travelDays + Σ delays; CANCEL never arrives;
 * DISCREDIT degrades reliability without touching arrival.
 */
export interface CarriageEffect {
  effectId: string;
  campaignId: CampaignId;
  carriageId: CarriageId;
  /** The bribe/ambush IS an event. */
  causedByEventId: EventId;
  day: number;
  effect:
    | { kind: "DELAY"; days: number }
    | { kind: "CANCEL" }
    | { kind: "DISCREDIT" };
}

/** Game-owned distances; lazy — a route exists once the fiction establishes it (#15). */
export interface DispatchRoute {
  fromPlaceId: EntityID;
  toPlaceId: EntityID;
  travelDays: number;
  route: CarriageRoute;
}

export interface DispatchRule {
  minGravity: 1 | 2 | 3;
  route: CarriageRoute;
  targets: "ALL_KNOWN_COMMUNITIES" | EntityID[];
  carrierLabel: string;
}

/**
 * Auto-dispatch by game rule (§2.4). Lives in campaign state (#15); evolves
 * via additive bundle policy and the show/set-dispatch-policy CLI pair.
 */
export interface DispatchPolicy {
  routes: DispatchRoute[];
  rules: DispatchRule[];
}
