import type { NarrativeEvent } from "../domain/event.js";
import type { Carriage, CarriageEffect } from "../domain/carriage.js";
import type { OfficialRecord } from "../domain/record.js";
import type { Repository } from "../repository/interface.js";
import type { CampaignId } from "../domain/ids.js";

export interface WorldHealthInput {
  events: NarrativeEvent[];
  carriages: Carriage[];
  carriageEffects: CarriageEffect[];
  records: OfficialRecord[];
  worldDay: number;
  /** Consecutive same-day commits before the frozen-clock detector trips. */
  k?: number;
}

export interface WorldHealth {
  /** Carriages neither arrived nor cancelled as of worldDay. */
  inTransit: number;
  /**
   * `day` unchanged across the last K commits while ≥ 1 carriage is in
   * transit (#20) — carriages exist and never land, invisible to a
   * zero-carriage count; also catches a model that habitually answers
   * `daysElapsed: 0`.
   */
  frozenClock: boolean;
  /** #22 — the escape hatch is audited, not locked. */
  outOfBandRecords: number;
}

function arrivalDay(c: Carriage, effects: CarriageEffect[]): number | null {
  let day = c.departedDay + c.travelDays;
  for (const fx of effects) {
    if (fx.carriageId !== c.carriageId) continue;
    if (fx.effect.kind === "CANCEL") return null;
    if (fx.effect.kind === "DELAY") day += fx.effect.days;
  }
  return day;
}

export function worldHealth(input: WorldHealthInput): WorldHealth {
  const k = input.k ?? 10;
  const inTransit = input.carriages.filter(c => {
    const arrival = arrivalDay(c, input.carriageEffects);
    return arrival !== null && arrival > input.worldDay;
  }).length;

  const lastK = input.events.slice(-k);
  const frozenClock =
    inTransit > 0 &&
    lastK.length >= k &&
    lastK.every(e => e.day === lastK[0]!.day);

  const outOfBandRecords = input.records.filter(r => r.observation.source === "OUT_OF_BAND").length;
  return { inTransit, frozenClock, outOfBandRecords };
}

/**
 * Phase H (§11), reduced to what pure derivation leaves it: the out-of-band
 * clock road (#20 — downtime, session breaks; in-fiction time travels on
 * `commit_narrative.daysElapsed`) plus the world-health report. Arrivals and
 * salience decay are read-time facts of `deriveBeliefs`; policy dispatch
 * happens at commit.
 */
export async function tick(
  repo: Repository,
  campaignId: CampaignId,
  opts: { days: number; k?: number }
): Promise<{ worldDay: number; health: WorldHealth }> {
  const current = await repo.getWorldDay(campaignId);
  const worldDay = current + opts.days;
  if (opts.days > 0) await repo.setWorldDay(campaignId, worldDay);
  const [events, carriages, carriageEffects, records] = await Promise.all([
    repo.getEvents(campaignId),
    repo.listCarriages(campaignId, {}),
    repo.listCarriageEffects(campaignId),
    repo.getRecords(campaignId)
  ]);
  return {
    worldDay,
    health: worldHealth({ events, carriages, carriageEffects, records, worldDay, ...(opts.k !== undefined ? { k: opts.k } : {}) })
  };
}
