import type { Repository } from "../repository/interface.js";
import type { EntityID, EventId } from "../domain/ids.js";
import { asEntityID } from "../domain/ids.js";
import {
  decideCommitNarrative,
  type CommitNarrativeBundle, type CommitHealth
} from "../core/commit-narrative.js";
import { detectUptake } from "../core/promotion.js";
import { DEFAULT_MAX_DISPATCH_FANOUT } from "../config.js";

export interface CommitNarrativeOptions {
  /** The campaign's default realm entity (#26). Bootstrap creates it as `realm_default`. */
  defaultRealmId?: EntityID;
  maxDispatchFanout?: number;
  now?: () => number;
}

export interface CommitNarrativeResult {
  replayed: boolean;
  newWorldDay: number;
  turn: number;
  eventId?: EventId;
  carriages: number;
  promoted: number;
  quarantined: string[];
  health: CommitHealth;
}

/**
 * The single atomic write (§5.1): gather → decide (pure, shared rules) →
 * apply, all inside one repository transaction. Idempotent by `operationId`
 * (#29): a retry replays the recorded result — exactly one event, one time
 * advance, one transition set, however many times the caller retries.
 */
export async function commitNarrative(
  repo: Repository,
  bundle: CommitNarrativeBundle,
  opts: CommitNarrativeOptions = {}
): Promise<CommitNarrativeResult> {
  const cid = bundle.campaignId;
  return repo.transaction(async tx => {
    const prior = await tx.findOperation(cid, bundle.operationId);
    if (prior !== null) return { ...(prior as Omit<CommitNarrativeResult, "replayed">), replayed: true };

    const [worldDay, latestTurn, policy, holders, canon, provisionals] = await Promise.all([
      tx.getWorldDay(cid),
      tx.latestTurn(cid),
      tx.getDispatchPolicy(cid),
      tx.listHolders(cid),
      tx.getCanonicalAttributes(cid),
      tx.listInventions(cid, "PROVISIONAL")
    ]);
    const communities = holders.filter(h => h.kind === "GROUP");

    // Realm membership of every place this bundle touches (#26).
    const placeIds = new Set<EntityID>();
    if (bundle.event?.placeId) placeIds.add(bundle.event.placeId);
    for (const c of bundle.carriages ?? []) { placeIds.add(c.fromPlaceId); placeIds.add(c.toPlaceId); }
    for (const g of communities) placeIds.add(g.placeId);
    const places: Array<{ id: EntityID; realmId?: EntityID }> = [];
    for (const id of placeIds) {
      const e = await tx.getEntity(cid, id);
      places.push({ id, ...(e?.realmId !== undefined ? { realmId: e.realmId } : {}) });
    }

    // Constraints only for the keys promotion will consult — engine-detected
    // uptake included, so a detected promotion is gated by the same constraints
    // a caller-supplied one is.
    const potentialites = [];
    const candidateIds = new Set((bundle.promotionEvidence ?? []).map(e => String(e.inventionId)));
    if (bundle.playerUtterance !== undefined) {
      for (const id of detectUptake(bundle.playerUtterance, provisionals, (latestTurn?.turnNumber ?? 0) + 1)) {
        candidateIds.add(String(id));
      }
    }
    for (const inventionId of candidateIds) {
      const invention = provisionals.find(i => String(i.inventionId) === inventionId);
      if (!invention) continue;
      const p = await tx.getPotentialite(cid, invention.entityId, invention.attributeKey);
      if (p) potentialites.push(p);
    }

    const plan = decideCommitNarrative(bundle, {
      campaignId: cid, worldDay,
      latestTurn: latestTurn?.turnNumber ?? 0,
      policy, places,
      defaultRealmId: opts.defaultRealmId ?? asEntityID("realm_default"),
      holders, canon, inventions: provisionals, potentialites,
      maxDispatchFanout: opts.maxDispatchFanout ?? DEFAULT_MAX_DISPATCH_FANOUT
    });

    if (plan.event) await tx.appendEvent(plan.event);
    for (const r of plan.records) await tx.appendRecord(r);
    for (const c of plan.carriages) await tx.appendCarriage(c);
    for (const fx of plan.carriageEffects) await tx.appendCarriageEffect(fx);
    for (const i of plan.inventions) await tx.appendInvention(i);
    for (const t of plan.transitions) await tx.appendInventionTransition(t);
    for (const row of plan.canonicalUpdates) await tx.upsertCanonicalAttribute(cid, row);
    for (const h of plan.holders) await tx.upsertHolder(h);
    if (plan.policyUpdate) await tx.setDispatchPolicy(cid, plan.policyUpdate);
    if (plan.newWorldDay !== worldDay) await tx.setWorldDay(cid, plan.newWorldDay);
    const scene = await tx.currentScene(cid);
    await tx.appendTurn({
      campaignId: cid, turnNumber: plan.turn, summary: null,
      sceneId: scene?.id ?? null, createdAt: (opts.now ?? Date.now)()
    });

    const result: Omit<CommitNarrativeResult, "replayed"> = {
      newWorldDay: plan.newWorldDay, turn: plan.turn,
      ...(plan.event !== undefined ? { eventId: plan.event.eventId } : {}),
      carriages: plan.carriages.length,
      promoted: plan.transitions.filter(t => t.to === "PROMOTED").length,
      quarantined: plan.quarantined.map(String),
      health: plan.health
    };
    await tx.recordOperation(cid, bundle.operationId, result);
    return { ...result, replayed: false };
  });
}
