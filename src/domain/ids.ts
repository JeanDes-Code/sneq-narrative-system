declare const brand: unique symbol;

export type EntityID    = string & { readonly [brand]: "EntityID" };
export type CampaignId  = string & { readonly [brand]: "CampaignId" };
export type FactId      = string & { readonly [brand]: "FactId" };
export type ConstraintId = string & { readonly [brand]: "ConstraintId" };
export type SceneId     = string & { readonly [brand]: "SceneId" };

export const asEntityID    = (s: string): EntityID    => s as EntityID;
export const asCampaignId  = (s: string): CampaignId  => s as CampaignId;
export const asFactId      = (s: string): FactId      => s as FactId;
export const asConstraintId = (s: string): ConstraintId => s as ConstraintId;
export const asSceneId     = (s: string): SceneId     => s as SceneId;
