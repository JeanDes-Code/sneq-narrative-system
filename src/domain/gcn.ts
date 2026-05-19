import type { EntityID } from "./ids.js";
import type { EntityType } from "./entity.js";
import type { CategorieAttribut, AttributValue } from "./attribute.js";

export type RelationSociale =
  | "FAMILLE" | "AMITIE" | "INIMITIE" | "HIERARCHIE"
  | "ROMANTIQUE" | "PROFESSIONNELLE" | "APPARTENANCE";

export type RelationCausale =
  | "A_CAUSE" | "A_PERMIS" | "A_EMPECHE"
  | "CONSEQUENCE_DE" | "MOTIVE_PAR" | "REVELEE_PAR";

export type RelationSpatiale =
  | "CONTIENT" | "ADJACENT" | "ORIGINE" | "RESIDE" | "FREQUENTE";

export type RelationTemporelle = "PRECEDE" | "PENDANT" | "DECLENCHE";

export type RelationConceptuelle =
  | "SYMBOLISE" | "CONTRASTE" | "PARALLELE" | "SECRET_LIE";

export type TypeRelation =
  | { categorie: "SOCIAL";     sousType: RelationSociale }
  | { categorie: "CAUSAL";     sousType: RelationCausale }
  | { categorie: "SPATIAL";    sousType: RelationSpatiale }
  | { categorie: "TEMPOREL";   sousType: RelationTemporelle }
  | { categorie: "CONCEPTUEL"; sousType: RelationConceptuelle };

export interface NoeudGCN {
  entityId: EntityID;
  type: EntityType;
  etatActuel: "INCONNU" | "PARTIELLEMENT_CONNU" | "BIEN_CONNU";
  poidsNarratif: number;
  tags: string[];
}

export type EtatArete = "INDEFINI" | "CONTRAINT" | "FIGE";

export interface AreteGCN {
  key: string;
  source: EntityID;
  cible: EntityID;
  typeRelation: TypeRelation;
  directionnalite: "UNIDIRECTIONNELLE" | "BIDIRECTIONNELLE";
  forcePropagation: number;
  etatArete: EtatArete;
  attributs: Record<string, AttributValue>;
}

export interface DeclencheurPropagation {
  entiteType?: EntityType[];
  attribut?: string[];
  categorieAttribut?: CategorieAttribut[];
}

export type ActionTypePropagation =
  | "AJOUTER_CONTRAINTE"
  | "MODIFIER_FORCE_RELATION"
  | "CREER_RELATION"
  | "MARQUER_POUR_REEVALUATION";

export interface ReglePropagation {
  id: string;
  nom: string;
  declencheur: DeclencheurPropagation;
  actionType: ActionTypePropagation;
  cibleType: "RELATION_DIRECTE" | "CHEMIN" | "TAG";
  cibleParams: Record<string, unknown>;
  priorite: number;
}
