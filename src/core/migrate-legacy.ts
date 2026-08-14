import type { AttributValue, CanonicalAttribute } from "../domain/attribute.js";
import type { NarrativeEvent, EventAct } from "../domain/event.js";
import type { Potentialite, Contrainte } from "../domain/potentialite.js";
import type { Observation } from "../domain/observation.js";
import type { CampaignId, EntityID } from "../domain/ids.js";
import { asEventId } from "../domain/ids.js";

export type { MigrationFinding, MigrationFindingKind, LegacyFact } from "../domain/migration.js";
import type { MigrationFinding, MigrationFindingKind, LegacyFact } from "../domain/migration.js";

export interface LegacyCampaignInput {
  campaignId: CampaignId;
  /** 0.3-era facts; observation blobs may still carry the stale `fiabilite` key. */
  facts: Array<LegacyFact & { campaignId: CampaignId }>;
  potentialites: Potentialite[];
}

export interface LegacyMigrationOutput {
  /** One LEGACY_FACT row per fact, at the day-0 migration epoch (§4). */
  canonicalAttributes: CanonicalAttribute[];
  /** One day-0 LEGACY_CANON event per entity (#17) — the ledger backing that
   *  keeps `rebuild(ledger) === projection` free of a LEGACY_FACT special case. */
  legacyEvents: NarrativeEvent[];
  /** The same facts with the stale `fiabilite` key stripped (#18). */
  cleanedFacts: Array<LegacyFact & { campaignId: CampaignId }>;
  findings: MigrationFinding[];
}

function cleanObservation(obs: Observation): Observation {
  const { fiabilite: _stale, ...rest } = obs as Observation & { fiabilite?: unknown };
  return rest;
}

/**
 * The v0.4 migration epoch, as one pure function — shared by the SQLite v5
 * migration and the JSON v1 loader so the two cannot drift. Deterministic:
 * every synthesized id derives from content.
 */
export function migrateLegacyCampaign(input: LegacyCampaignInput): LegacyMigrationOutput {
  const canonicalAttributes: CanonicalAttribute[] = [];
  const cleanedFacts: Array<LegacyFact & { campaignId: CampaignId }> = [];
  const byEntity = new Map<string, Array<LegacyFact & { campaignId: CampaignId }>>();

  for (const f of input.facts) {
    const cleaned = { ...f, observation: cleanObservation(f.observation) };
    cleanedFacts.push(cleaned);
    canonicalAttributes.push({
      factId: cleaned.factId, entityId: cleaned.entityId, key: cleaned.key,
      value: cleaned.value, category: cleaned.category, observation: cleaned.observation,
      turn: cleaned.turn, day: 0, source: { kind: "LEGACY_FACT" }
    });
    const list = byEntity.get(cleaned.entityId) ?? [];
    list.push(cleaned);
    byEntity.set(cleaned.entityId, list);
  }

  const legacyEvents: NarrativeEvent[] = [...byEntity.entries()].map(([entityId, facts]) => {
    const acts: EventAct[] = facts.map(f => ({
      actorId: f.entityId,
      verb: "LEGACY_CANON",
      sets: { entityId: f.entityId, key: f.key, value: f.value, category: f.category }
    }));
    return {
      eventId: asEventId(`evt_legacy_${entityId}`),
      campaignId: input.campaignId,
      day: 0, turn: 0, gravity: 0,   // gravity 0: below every bootstrap dispatch rule (#15) — no carriage storm
      acts,
      circumstance: "Legacy canon imported from the pre-0.5 fact store — the migration epoch (§4).",
      participants: [entityId as EntityID],
      surfaceTokens: []
    };
  });

  const canonByKey = new Map<string, AttributValue>();
  for (const row of canonicalAttributes) {
    canonByKey.set(`${row.entityId}|${row.key}`, row.value);
  }

  const findings: MigrationFinding[] = [];
  const flag = (p: Potentialite, c: Contrainte, kind: MigrationFindingKind, detail: string) => {
    findings.push({
      campaignId: input.campaignId, entityId: p.entiteId, attributeKey: p.attribut,
      constraintId: c.id, kind, detail
    });
  };

  for (const p of input.potentialites) {
    const canon = canonByKey.get(`${p.entiteId}|${p.attribut}`);
    for (const c of p.contraintes) {
      const r = c.regle;
      if (r.type === "DOIT_ETRE" || r.type === "NE_PEUT_PAS_ETRE") {
        if (r.type === "DOIT_ETRE" && r.valeurs.length === 0) {
          flag(p, c, "EMPTY_DOIT_ETRE", "DOIT_ETRE with no values matches nothing — unsatisfiable for every value");
          continue;
        }
        const types = new Set(r.valeurs.map(v => v.type));
        if (types.size > 1) {
          flag(p, c, "MIXED_VALUE_TYPES", `values mix types: ${[...types].join(", ")}`);
          continue;
        }
        if (canon && r.valeurs.length > 0 && !types.has(canon.type)) {
          flag(p, c, "TYPE_MISMATCH_WITH_CANON",
            `constraint values are ${[...types].join(",")} but the canonical value is ${canon.type} — equalValue fails closed and the gate rejects every value`);
        }
      } else if (r.type === "RANGE_NUMERIQUE") {
        if (canon && canon.type !== "NUMBER") {
          flag(p, c, "RANGE_ON_NON_NUMBER", `RANGE_NUMERIQUE over a ${canon.type} canonical value`);
        }
      } else if (r.type === "REGEX") {
        if (canon && canon.type !== "STRING") {
          flag(p, c, "REGEX_ON_NON_STRING", `REGEX over a ${canon.type} canonical value`);
        }
      }
    }
  }

  return { canonicalAttributes, legacyEvents, cleanedFacts, findings };
}
