import type { EntityID, CampaignId } from "./ids.js";

export type EntityType =
  | "PERSONNAGE"
  | "LIEU"
  | "OBJET"
  | "FACTION"
  | "EVENEMENT"
  | "RELATION"
  | "SCENE"
  | "WORLD";

export interface Alias {
  text: string;
  source: AliasSource;
  observedAt: number;
}

export type AliasSource =
  | { kind: "PLAYER" }
  | { kind: "GM_NARRATION" }
  | { kind: "DOCUMENT"; documentId: EntityID }
  | { kind: "INFERENCE" };

export interface Entity {
  campaignId: CampaignId;
  id: EntityID;
  type: EntityType;
  name: string;
  /** Human-readable description, persisted at mention time. Feeds the judge prompt and prepare-turn. */
  description?: string;
  /**
   * For place entities: the realm entity this place belongs to (#26). Entity
   * metadata, not a canonical attribute — conquest is a metadata update.
   * Absent = the campaign's default realm (`realmOf` fallback).
   */
  realmId?: EntityID;
  nomConnu: boolean;
  aliases: Alias[];
  createdAt: number;
  embedding: Float32Array | null;
  embeddingRefreshedAt: number | null;
  tags: string[];
}
