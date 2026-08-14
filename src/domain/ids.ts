declare const brand: unique symbol;

export type EntityID    = string & { readonly [brand]: "EntityID" };
export type CampaignId  = string & { readonly [brand]: "CampaignId" };
export type FactId      = string & { readonly [brand]: "FactId" };
export type ConstraintId = string & { readonly [brand]: "ConstraintId" };
export type SceneId     = string & { readonly [brand]: "SceneId" };
export type EventId     = string & { readonly [brand]: "EventId" };
export type RecordId    = string & { readonly [brand]: "RecordId" };
export type HolderId    = string & { readonly [brand]: "HolderId" };
export type CarriageId  = string & { readonly [brand]: "CarriageId" };
export type InventionId = string & { readonly [brand]: "InventionId" };

export const asEntityID    = (s: string): EntityID    => s as EntityID;
export const asCampaignId  = (s: string): CampaignId  => s as CampaignId;
export const asFactId      = (s: string): FactId      => s as FactId;
export const asConstraintId = (s: string): ConstraintId => s as ConstraintId;
export const asSceneId     = (s: string): SceneId     => s as SceneId;
export const asEventId     = (s: string): EventId     => s as EventId;
export const asRecordId    = (s: string): RecordId    => s as RecordId;
export const asHolderId    = (s: string): HolderId    => s as HolderId;
export const asCarriageId  = (s: string): CarriageId  => s as CarriageId;
export const asInventionId = (s: string): InventionId => s as InventionId;
