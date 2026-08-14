import type { EntityID, CampaignId, EventId, RecordId } from "./ids.js";
import type { AttributValue, CategorieAttribut } from "./attribute.js";
import type { Observation } from "./observation.js";

export type CarriageRoute = "OFFICIAL" | "RUMOUR";

/**
 * What power claims (§2.2). A record contradicting its event is legal data,
 * not an error — the gap is the game. Records accumulate; never replaced.
 * Records never project into canon (#27): their only road is
 * OFFICIAL_RECORD promotion evidence.
 */
export interface OfficialRecord {
  recordId: RecordId;
  campaignId: CampaignId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  /** The power that issued it. */
  authoredBy: EntityID;
  /** Absent = pure assertion. */
  aboutEventId?: EventId;
  route: CarriageRoute;
  /** Provenance only — fiabilite lives on Belief (#18). */
  observation: Observation;
  day: number;
  turn: number;
  /** Containment alphabet, same producer rule as events (#25). */
  surfaceTokens: string[];
}
