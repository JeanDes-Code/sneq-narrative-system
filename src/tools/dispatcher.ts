import { schemas, type ToolName, ToolNames } from "./schemas.js";
import { SneqUnknownEntityError } from "../errors.js";
import type { EntityID, ConstraintId, SceneId, HolderId } from "../domain/ids.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { RegleContrainte } from "../domain/potentialite.js";
import type { ConstraintRole } from "../atomic/types.js";
import type { ResolutionResult, SuggestionResult } from "../resolver/resolver.js";
import type { HolderContext } from "../core/holder-context.js";
import type { CommitNarrativeResult } from "../atomic/commit-narrative.js";
import type { CommitNarrativeBundle } from "../core/commit-narrative.js";
import type { WorldHealth } from "../core/tick.js";

export interface HolderContextArgs {
  holderId?: HolderId;
  entityId?: EntityID;
  about?: EntityID;
  topK?: number;
}

/** The bundle minus what the engine owns: campaign, day and turn are never caller-set. */
export type ToolCommitBundle = Omit<CommitNarrativeBundle, "campaignId">;

export interface ToolCallContext {
  resolveEntity(opts: { mention: string; type?: EntityType }): Promise<ResolutionResult>;
  suggestExisting(mention: string, type: EntityType): Promise<SuggestionResult>;
  getEntity(entityId: EntityID): Promise<Entity | null>;
  getHolderContext(args: HolderContextArgs): Promise<HolderContext>;
  mentionEntity(input: { canonicalName: string; type: EntityType; aliases?: string[]; description: string; force?: boolean; public?: boolean }): Promise<import("../campaign.js").MentionResult>;
  commitNarrative(bundle: ToolCommitBundle): Promise<CommitNarrativeResult>;
  addConstraint(input: { entityId: EntityID; attributeKey: string; rule: RegleContrainte; justification: string; role: ConstraintRole }): Promise<{ constraintId: ConstraintId }>;
  setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }>;
  advanceTurn(input: { summary?: string; days?: number }): Promise<{ turnNumber: number; worldDay: number; health: WorldHealth }>;
  validateNarration(input: { narration: string; type?: EntityType; strict?: boolean; holderId?: HolderId }): Promise<import("../hooks/narration-gate.js").ValidationReport>;
}

/**
 * Fields that must hold a real entity id, per tool. `sneq__get_entity` is deliberately
 * absent: `null` is its honest answer to "is this id known?", and an explicit null is
 * not a silent failure. The guard exists for the calls where a bad id used to be
 * swallowed — a scene declared with nobody in it, a fact filed against nothing.
 *
 * `sneq__get_holder_context` guards `entityId` inside the context instead, because the
 * cascade needs to distinguish "unknown entity" from "known entity with no holder".
 */
const GUARDED_ENTITY_FIELDS: Partial<Record<ToolName, { single?: string[]; list?: string[] }>> = {
  sneq__add_constraint: { single: ["entityId"] },
  sneq__set_scene: { single: ["locationEntityId"], list: ["presentEntityIds"] },
};

/**
 * Sequential on purpose: the first offending field is the one worth reporting, and a
 * scene rarely carries enough entities for the round-trips to matter.
 */
async function assertEntityIdsResolve(
  toolName: ToolName,
  args: Record<string, unknown>,
  ctx: ToolCallContext,
): Promise<void> {
  const guarded = GUARDED_ENTITY_FIELDS[toolName];
  if (!guarded) return;

  for (const field of guarded.single ?? []) {
    const value = args[field] as string;
    if (await ctx.getEntity(value as EntityID)) continue;
    throw new SneqUnknownEntityError(toolName, field, value);
  }
  for (const field of guarded.list ?? []) {
    const values = (args[field] ?? []) as string[];
    for (const [i, value] of values.entries()) {
      if (await ctx.getEntity(value as EntityID)) continue;
      throw new SneqUnknownEntityError(toolName, `${field}[${i}]`, value);
    }
  }
}

/**
 * Every entity id a bundle carries, in one sweep (§12.2 rule 1). `commit_narrative`
 * is the single write, so a name typed into an id field here would poison the ledger
 * itself — append-only means there is no taking it back.
 */
async function assertBundleIdsResolve(bundle: ToolCommitBundle, ctx: ToolCallContext): Promise<void> {
  const seen = new Map<string, string>();   // entityId → the field that first named it
  const note = (field: string, id: string | undefined) => {
    if (id !== undefined && !seen.has(id)) seen.set(id, field);
  };

  if (bundle.event) {
    note("event.placeId", bundle.event.placeId);
    bundle.event.participants.forEach((p, i) => note(`event.participants[${i}]`, p));
    bundle.event.acts.forEach((a, i) => {
      note(`event.acts[${i}].actorId`, a.actorId);
      note(`event.acts[${i}].objectId`, a.objectId);
      note(`event.acts[${i}].sets.entityId`, a.sets?.entityId);
    });
  }
  (bundle.records ?? []).forEach((r, i) => {
    note(`records[${i}].entityId`, r.entityId);
    note(`records[${i}].authoredBy`, r.authoredBy);
  });
  (bundle.carriages ?? []).forEach((c, i) => {
    note(`carriages[${i}].fromPlaceId`, c.fromPlaceId);
    note(`carriages[${i}].toPlaceId`, c.toPlaceId);
  });
  (bundle.inventions ?? []).forEach((inv, i) => note(`inventions[${i}].entityId`, inv.entityId));
  (bundle.holders ?? []).forEach((h, i) => {
    if (h.kind === "GROUP") { note(`holders[${i}].placeId`, h.placeId); note(`holders[${i}].realmId`, h.realmId); }
    else note(`holders[${i}].entityId`, h.entityId);
  });

  for (const [id, field] of seen) {
    if (await ctx.getEntity(id as EntityID)) continue;
    throw new SneqUnknownEntityError("sneq__commit_narrative", field, id);
  }
}

export async function dispatchToolCall(name: string, rawArgs: unknown, ctx: ToolCallContext): Promise<unknown> {
  if (!(ToolNames as readonly string[]).includes(name)) {
    throw new Error(`unknown tool: ${name}`);
  }
  const toolName = name as ToolName;
  const schema = schemas[toolName];
  const args = schema.parse(rawArgs) as Record<string, unknown>;
  await assertEntityIdsResolve(toolName, args, ctx);

  switch (toolName) {
    case "sneq__lookup_entity":
      return ctx.resolveEntity({
        mention: args["mention"] as string,
        ...(args["type"] !== undefined ? { type: args["type"] as EntityType } : {})
      });
    case "sneq__get_entity":
      return ctx.getEntity(args["entityId"] as EntityID);
    case "sneq__get_holder_context":
      return ctx.getHolderContext({
        ...(args["holderId"] !== undefined ? { holderId: args["holderId"] as HolderId } : {}),
        ...(args["entityId"] !== undefined ? { entityId: args["entityId"] as EntityID } : {}),
        ...(args["about"] !== undefined ? { about: args["about"] as EntityID } : {}),
        ...(args["topK"] !== undefined ? { topK: args["topK"] as number } : {})
      });
    case "sneq__suggest_existing":
      return ctx.suggestExisting(args["mention"] as string, args["type"] as EntityType);
    case "sneq__mention_entity":
      return ctx.mentionEntity({
        canonicalName: args["canonicalName"] as string,
        type: args["type"] as EntityType,
        ...(args["aliases"] !== undefined ? { aliases: args["aliases"] as string[] } : {}),
        ...(args["force"] !== undefined ? { force: args["force"] as boolean } : {}),
        ...(args["public"] !== undefined ? { public: args["public"] as boolean } : {}),
        description: args["description"] as string
      });
    case "sneq__commit_narrative": {
      const bundle = args as unknown as ToolCommitBundle;
      await assertBundleIdsResolve(bundle, ctx);
      return ctx.commitNarrative(bundle);
    }
    case "sneq__add_constraint":
      return ctx.addConstraint({
        entityId: args["entityId"] as EntityID,
        attributeKey: args["attributeKey"] as string,
        rule: args["rule"] as RegleContrainte,
        justification: args["justification"] as string,
        role: args["role"] as ConstraintRole
      });
    case "sneq__set_scene":
      return ctx.setScene({
        locationEntityId: args["locationEntityId"] as EntityID,
        presentEntityIds: args["presentEntityIds"] as EntityID[],
        description: args["description"] as string
      });
    case "sneq__advance_turn":
      return ctx.advanceTurn({
        ...(args["summary"] !== undefined ? { summary: args["summary"] as string } : {}),
        ...(args["days"] !== undefined ? { days: args["days"] as number } : {})
      });
    case "sneq__validate_narration":
      return ctx.validateNarration({
        narration: args["narration"] as string,
        ...(args["type"] !== undefined ? { type: args["type"] as EntityType } : {}),
        ...(args["strict"] !== undefined ? { strict: args["strict"] as boolean } : {}),
        ...(args["holderId"] !== undefined ? { holderId: args["holderId"] as HolderId } : {})
      });
  }
}

// Re-export needed types so consumers can import from a single place
export type { Scene } from "../domain/scene.js";
