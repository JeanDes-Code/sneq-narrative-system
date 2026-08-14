import type { EntityID, CampaignId, HolderId } from "./ids.js";

export type DerogationReason = "PARTICIPANT" | "PERSONAL_STAKE" | "PLAYER";

/**
 * Groups are the default (§2.3): a town has strata, not three hundred
 * memories. Holders are created lazily, never authored upfront.
 */
export interface GroupHolder {
  kind: "GROUP";
  holderId: HolderId;
  campaignId: CampaignId;
  community: string;
  stratum: string;
  /** The realm entity (#26) — realms are entities, not strings. */
  realmId: EntityID;
  placeId: EntityID;
  /** 0..1 */
  standing: number;
}

/**
 * An individual inherits their base group and adds only what their declared
 * derogation justifies. PARTICIPANT holders are auto-materialized lazily at
 * cascade time (#28); PERSONAL_STAKE is always an authoring act.
 */
export interface IndividualHolder {
  kind: "INDIVIDUAL";
  holderId: HolderId;
  campaignId: CampaignId;
  entityId: EntityID;
  baseGroupId: HolderId;
  derogationReason: DerogationReason;
  standingOverride?: number;
}

export type Holder = GroupHolder | IndividualHolder;
