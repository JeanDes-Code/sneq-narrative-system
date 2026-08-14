import type { EntityID, CampaignId, EventId } from "./ids.js";
import type { AttributValue, CategorieAttribut } from "./attribute.js";

/**
 * The act's declared canonical effect (#27): an act projects into
 * `CanonicalAttribute` ONLY through this — the engine never interprets `verb`.
 */
export interface ActEffect {
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
}

export interface EventAct {
  actorId: EntityID;
  /** Structured, never prose. Carries no projection semantics (#27). */
  verb: string;
  objectId?: EntityID;
  value?: AttributValue;
  sets?: ActEffect;
}

export interface NarrativeEvent {
  eventId: EventId;
  campaignId: CampaignId;
  /** World clock (§4). */
  day: number;
  /** Ordering within a day. */
  turn: number;
  placeId?: EntityID;
  gravity: 0 | 1 | 2 | 3;
  /** THE ACTS — immutable; the repository exposes no mutation path (§2.1). */
  acts: EventAct[];
  /** THE SCENE — prose; the only thing REINTERPRETATION may reframe. */
  circumstance: string;
  participants: EntityID[];
  /** The containment/canary alphabet — model-supplied + engine floor (#25). */
  surfaceTokens: string[];
}
