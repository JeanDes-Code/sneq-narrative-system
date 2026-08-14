import type { NarrativeEvent } from "../domain/event.js";
import type { ProvisionalInvention, InventionTransition } from "../domain/invention.js";
import type { CanonicalAttribute } from "../domain/attribute.js";
import type { FactId } from "../domain/ids.js";
import { SneqContradictionError, type IntraCommitConflict } from "../errors.js";

export interface ProjectionInputs {
  /** In ledger order — as `getEvents` returns them: (day, turn, seq). */
  events: NarrativeEvent[];
  /** Promotion transitions with their inventions; non-PROMOTED transitions are ignored. */
  promotions: Array<{ invention: ProvisionalInvention; transition: InventionTransition }>;
  /** LEGACY_FACT rows from migration — the epoch floor, overridden by any later producer. */
  legacy: CanonicalAttribute[];
}

interface Entry {
  day: number;
  turn: number;
  /** Producer rank at identical (day, turn): legacy < event < promotion — the
   *  epoch floor precedes play; a promotion is detected at commit, after its event. */
  rank: 0 | 1 | 2;
  /** Ledger sequence within its producer stream. */
  seq: number;
  row: CanonicalAttribute;
}

/**
 * The deterministic fold (#27): `CanonicalAttribute` is a pure function of the
 * ledger, with exactly the three producers the `source` union names. Applied in
 * (day, turn, ledger sequence) order — last writer wins; replace-on-key is
 * state evolution. Two `sets` on the same key with different values inside one
 * event throw `SneqContradictionError`: a self-contradicting bundle is a
 * caller bug, not fiction. Records never project.
 *
 * `rebuild(ledger) === projection` is the contract this function IS — it is
 * also the SQLite v3→v4 migration tool (§5.4).
 */
export function rebuildProjection(inputs: ProjectionInputs): CanonicalAttribute[] {
  const entries: Entry[] = [];

  inputs.legacy.forEach((row, i) => {
    entries.push({ day: row.day, turn: row.turn, rank: 0, seq: i, row: { ...row } });
  });

  inputs.events.forEach((e, i) => {
    const seenInEvent = new Map<string, string>(); // key → JSON(value), intra-commit guard
    for (const act of e.acts) {
      const fx = act.sets;
      if (!fx) continue; // the engine never interprets `verb`
      const slot = `${fx.entityId}|${fx.key}`;
      const encoded = JSON.stringify(fx.value);
      const prior = seenInEvent.get(slot);
      if (prior !== undefined && prior !== encoded) {
        const conflict: IntraCommitConflict = {
          entityId: fx.entityId, key: fx.key,
          values: [JSON.parse(prior), fx.value], eventId: e.eventId
        };
        throw new SneqContradictionError(
          [conflict],
          `event "${e.eventId}" sets "${fx.key}" to two different values in one commit — a self-contradicting bundle`
        );
      }
      seenInEvent.set(slot, encoded);
      entries.push({
        day: e.day, turn: e.turn, rank: 1, seq: i,
        row: {
          factId: `proj_${fx.entityId}_${fx.key}` as FactId,
          entityId: fx.entityId, key: fx.key, value: fx.value, category: fx.category,
          turn: e.turn, day: e.day, source: { kind: "EVENT", eventId: e.eventId }
        }
      });
    }
  });

  inputs.promotions.forEach(({ invention, transition }, i) => {
    if (transition.to !== "PROMOTED") return;
    entries.push({
      day: transition.atDay, turn: transition.atTurn, rank: 2, seq: i,
      row: {
        factId: `proj_${invention.entityId}_${invention.attributeKey}` as FactId,
        entityId: invention.entityId, key: invention.attributeKey,
        value: invention.value, category: invention.category,
        turn: transition.atTurn, day: transition.atDay,
        source: { kind: "PROMOTED_INVENTION", inventionId: invention.inventionId }
      }
    });
  });

  entries.sort((a, b) => a.day - b.day || a.turn - b.turn || a.rank - b.rank || a.seq - b.seq);

  const projection = new Map<string, CanonicalAttribute>();
  for (const entry of entries) {
    projection.set(`${entry.row.entityId}|${entry.row.key}`, entry.row);
  }
  return [...projection.values()];
}
