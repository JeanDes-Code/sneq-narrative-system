import type { EntityID, CampaignId, EventId, RecordId, InventionId } from "./ids.js";
import type { AttributValue, CategorieAttribut } from "./attribute.js";

export type InventionStatus = "PROVISIONAL" | "PROMOTED" | "REJECTED" | "SUPERSEDED";

/**
 * What the GM invents without warrant (§2.6). Promotes to canon only when
 * something comes to depend on it. No evaporation by deletion: a stale
 * provisional falls out of prompts by salience, not out of storage.
 */
export interface ProvisionalInvention {
  inventionId: InventionId;
  campaignId: CampaignId;
  entityId: EntityID;
  attributeKey: string;
  /** Value-bearing — the thing Potentialite structurally cannot hold. */
  value: AttributValue;
  category: CategorieAttribut;
  sourceNarration: string;
  /** Provenance, NEVER a promotion threshold. */
  confidence: number;
  introducedAtTurn: number;
  introducedOnDay: number;
  status: InventionStatus;
  lastReferencedTurn: number;
  /** Uptake alphabet: known-token substring search over player utterances (#25). */
  surfaceTokens: string[];
}

export type PromotionEvidence =
  | { kind: "PLAYER_UPTAKE"; eventId: EventId }
  | { kind: "WORLD_CONSEQUENCE"; eventId: EventId }
  | { kind: "RECONFIRMATION"; eventId: EventId }
  | { kind: "OFFICIAL_RECORD"; recordId: RecordId };

/** Append-only audit. */
export interface InventionTransition {
  inventionId: InventionId;
  campaignId: CampaignId;
  from: InventionStatus;
  to: Exclude<InventionStatus, "PROVISIONAL">;
  /** World day of the transition — the fold orders promotions by (atDay, atTurn) (#27). */
  atDay: number;
  atTurn: number;
  evidence?: PromotionEvidence;
  supersededBy?: InventionId;
}
