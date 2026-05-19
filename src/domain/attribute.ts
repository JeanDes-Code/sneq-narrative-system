import type { EntityID } from "./ids.js";
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

export interface AttributFige {
  factId: string;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
  turn: number;
}
