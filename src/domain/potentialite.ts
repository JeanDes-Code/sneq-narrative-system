import type { EntityID, ContraintId, FactId } from "./ids.js";
import type { AttributValue, CategorieAttribut } from "./attribute.js";

export type EtatAttribut = "INDEFINI" | "CONTRAINT" | "FIGE";

export type ContrainteSource =
  | { kind: "FAIT_CANONIQUE"; factId: FactId }
  | { kind: "RELATION";       edgeKey: string }
  | { kind: "REGLE_MONDE";    ruleId: string }
  | { kind: "INFERENCE_IA";   confidence: number };

export type RegleContrainte =
  | { type: "DOIT_ETRE";       valeurs: AttributValue[] }
  | { type: "NE_PEUT_PAS_ETRE";valeurs: AttributValue[] }
  | { type: "IMPLIQUE";        condition: string; consequence: string }
  | { type: "CORRELE_AVEC";    autreEntite: EntityID; autreAttribut: string }
  | { type: "RANGE_NUMERIQUE"; min?: number; max?: number }
  | { type: "REGEX";           pattern: string };

export interface Contrainte {
  id: ContraintId;
  source: ContrainteSource;
  createdAt: number;
  regle: RegleContrainte;
  justificationNarrative: string;
}

export interface Tendance {
  description: string;
  poids: number;
}

export interface ContexteGeneratif {
  categorieAttribut: CategorieAttribut;
  tendances: Tendance[];
}

export interface Potentialite {
  entiteId: EntityID;
  attribut: string;
  etat: Exclude<EtatAttribut, "FIGE">;
  contraintes: Contrainte[];
  contexteGeneratif: ContexteGeneratif;
}
