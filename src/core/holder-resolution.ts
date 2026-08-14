import type { Holder, IndividualHolder } from "../domain/holder.js";
import type { NarrativeEvent } from "../domain/event.js";
import type { EntityID, HolderId } from "../domain/ids.js";
import { asHolderId } from "../domain/ids.js";

export type ResolutionRoad = "DECLARED_INDIVIDUAL" | "AUTO_PARTICIPANT" | "DEFAULT_GROUP";

export interface HolderResolutionInput {
  holders: Holder[];
  events: NarrativeEvent[];
  defaultGroupId: HolderId;
}

export interface HolderResolution {
  holder: Holder;
  /** The reply always names the road (#21) — the agent knows who answered and why. */
  road: ResolutionRoad;
  /** Present only on AUTO_PARTICIPANT: the lazily created holder, for the caller to persist. */
  materialized?: IndividualHolder;
}

/**
 * The cascade (§2.3, #21): declared INDIVIDUAL → lazy auto-PARTICIPANT (#28) →
 * campaign default group. Participation IS the declared reason, and the fiction
 * touching the NPC is the trigger — a holder row exists only for entities the
 * fiction actually asks about, so the cost is bounded by real play, never cast
 * size. LEGACY_CANON participation does not derogate: the migration epoch is
 * shared knowledge, not drama.
 */
export function resolveHolder(entityId: EntityID, input: HolderResolutionInput): HolderResolution {
  const declared = input.holders.find(h => h.kind === "INDIVIDUAL" && h.entityId === entityId);
  if (declared) return { holder: declared, road: "DECLARED_INDIVIDUAL" };

  const participated = input.events.some(e =>
    e.participants.includes(entityId) && !e.acts.some(a => a.verb === "LEGACY_CANON"));
  const defaultGroup = input.holders.find(h => h.holderId === input.defaultGroupId);
  if (!defaultGroup) {
    throw new Error(`campaign default group "${input.defaultGroupId}" not found — bootstrap must seed it (§2.3)`);
  }

  if (participated) {
    const materialized: IndividualHolder = {
      kind: "INDIVIDUAL",
      holderId: asHolderId(`h_participant_${entityId}`),   // deterministic — same entity, same holder, forever
      campaignId: defaultGroup.campaignId,
      entityId,
      baseGroupId: input.defaultGroupId,
      derogationReason: "PARTICIPANT"
    };
    return { holder: materialized, road: "AUTO_PARTICIPANT", materialized };
  }

  return { holder: defaultGroup, road: "DEFAULT_GROUP" };
}
