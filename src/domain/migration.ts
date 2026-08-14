import type { CampaignId, EntityID } from "./ids.js";

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
