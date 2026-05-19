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
  nomConnu: boolean;
  aliases: Alias[];
  createdAt: number;
  embedding: Float32Array | null;
  embeddingRefreshedAt: number | null;
  tags: string[];
}
