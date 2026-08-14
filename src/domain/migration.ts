import type { AttributValue, CategorieAttribut } from "./attribute.js";
import type { Observation } from "./observation.js";
import type { CampaignId, EntityID, FactId } from "./ids.js";

/**
 * The 0.3-era `AttributFige` row, kept only as the shape the migration reads
 * off an old store (§2.6 — one release, one break: the live contract holds
 * `CanonicalAttribute` and nothing else, and there is no alias). Nothing writes
 * this type after the migration epoch.
 */
export interface LegacyFact {
  factId: FactId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
  turn: number;
}

export type MigrationFindingKind =
  | "TYPE_MISMATCH_WITH_CANON"
  | "EMPTY_DOIT_ETRE"
  | "MIXED_VALUE_TYPES"
  | "RANGE_ON_NON_NUMBER"
  | "REGEX_ON_NON_STRING";

/**
 * A mis-encoded constraint found by the migration audit (#23). Flagged, never
 * auto-fixed (guessing) and never deleted (data loss); `doctor` re-reads these.
 */
export interface MigrationFinding {
  campaignId: CampaignId;
  entityId: EntityID;
  attributeKey: string;
  constraintId: string;
  kind: MigrationFindingKind;
  detail: string;
}
