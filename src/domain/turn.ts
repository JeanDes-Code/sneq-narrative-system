import type { CampaignId, SceneId } from "./ids.js";

export interface Turn {
  campaignId: CampaignId;
  turnNumber: number;
  summary: string | null;
  sceneId: SceneId | null;
  createdAt: number;
}
