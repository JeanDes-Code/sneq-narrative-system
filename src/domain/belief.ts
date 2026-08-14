import type { HolderId, EventId, RecordId } from "./ids.js";
import type { Fiabilite, ObservationMethod } from "./observation.js";

export type BeliefCertainty = "WITNESSED" | "TOLD" | "INFERRED";

export interface SalienceFactors {
  gravity: number;
  recency: number;
  personalInvolvement: number;
  socialPosition: number;
  propagationDelay: number;
}

/**
 * What a holder knows (§2.5) — derived, NEVER stored. A pure function of
 * (events, records, carriages, effects, holders, today). WITNESSED beliefs are
 * not negotiable by later records: the player floor generalized to every NPC.
 */
export interface Belief {
  holderId: HolderId;
  subject: { kind: "EVENT"; id: EventId } | { kind: "RECORD"; id: RecordId };
  content: string;
  learnedOnDay: number;
  viaCarrier?: string;
  /** From event.participants — "you were there" is not negotiable. */
  certainty: BeliefCertainty;
  /** The 0.3 vocabulary, finally on the right object (#18). */
  fiabilite: Fiabilite;
  method: ObservationMethod;
  salience: number;
  factors: SalienceFactors;
}
