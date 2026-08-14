import type { EntityID, EventId, FactId, InventionId } from "./ids.js";
import type { Observation } from "./observation.js";

export type AttributValue =
  | { type: "STRING";     value: string }
  | { type: "NUMBER";     value: number }
  | { type: "BOOLEAN";    value: boolean }
  | { type: "ENTITY_REF"; id: EntityID }
  | { type: "ENTITY_SET"; ids: EntityID[] }
  | { type: "ENUM";       value: string; enumType: string }
  | { type: "COMPOSITE";  fields: Record<string, AttributValue> };

export type CategorieAttribut =
  | "IDENTITE"
  | "PSYCHOLOGIE"
  | "HISTORIQUE"
  | "SOCIAL"
  | "COMPETENCE"
  | "SECRET"
  | "ETAT"
  | "POSSESSION";

/** 0.3-era canonical fact. Dies with `register_fact` (slice 4); no alias (§2.6). */
export interface AttributFige {
  factId: FactId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
  turn: number;
}

/** Exactly the three producers of the projection rule (#27). */
export type CanonicalSource =
  | { kind: "EVENT"; eventId: EventId }
  | { kind: "PROMOTED_INVENTION"; inventionId: InventionId }
  | { kind: "LEGACY_FACT" };

/**
 * Current-state projection over the ledger (§2.6, #27) — replace-on-key is
 * state evolution; history lives in events and invention transitions.
 * Written only by the projection fold, never directly.
 */
export interface CanonicalAttribute {
  factId: FactId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  /** Present on LEGACY_FACT copies; EVENT/PROMOTED_INVENTION rows carry provenance in `source`. */
  observation?: Observation;
  turn: number;
  day: number;
  source: CanonicalSource;
}
