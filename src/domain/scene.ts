import type { CampaignId, EntityID, SceneId } from "./ids.js";

export interface Scene {
  campaignId: CampaignId;
  id: SceneId;
  locationId: EntityID;
  presentEntityIds: EntityID[];
  description: string;
  createdAtTurn: number;
}
