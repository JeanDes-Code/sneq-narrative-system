import type { EntityID, SceneId } from "./ids.js";

export type ObservationSource =
  | "GM_NARRATION"
  | "PLAYER_UTTERANCE"
  | "DICE_ROLL"
  | "SYSTEM";

export type ObservationMethod =
  | "DIALOGUE_DIRECT"
  | "DOCUMENT"
  | "OBSERVATION_VISUELLE"
  | "DEDUCTION_CONFIRMEE"
  | "AVEU"
  | "DEMONSTRATION";

export type Fiabilite = "CERTAINE" | "TEMOIGNAGE" | "RUMEUR_CONFIRMEE";

export interface Observation {
  source: ObservationSource;
  method: ObservationMethod;
  emittedBy?: EntityID;
  sceneId?: SceneId;
  fiabilite: Fiabilite;
  excerpt?: string;
  timestamp: number;
}
