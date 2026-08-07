import { schemas, type ToolName, ToolNames } from "./schemas.js";
import { SneqUnknownEntityError } from "../errors.js";
import type { EntityID, FactId, ConstraintId, SceneId } from "../domain/ids.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { AttributFige, AttributValue, CategorieAttribut } from "../domain/attribute.js";
import type { Observation } from "../domain/observation.js";
import type { RegleContrainte } from "../domain/potentialite.js";
import type { ResolutionResult, SuggestionResult } from "../resolver/resolver.js";

export interface ToolCallContext {
  resolveEntity(opts: { mention: string; type?: EntityType }): Promise<ResolutionResult>;
  suggestExisting(mention: string, type: EntityType): Promise<SuggestionResult>;
  getEntity(entityId: EntityID): Promise<Entity | null>;
  getRelevantFacts(entityId: EntityID, opts?: { attributeKeys?: string[]; depth?: 0 | 1 }): Promise<AttributFige[]>;
  mentionEntity(input: { canonicalName: string; type: EntityType; aliases?: string[]; description: string; force?: boolean }): Promise<import("../campaign.js").MentionResult>;
  registerFact(input: { entityId: EntityID; attributeKey: string; value: AttributValue; category: CategorieAttribut; observation: Observation }): Promise<{ factId: FactId | null; contradictions: AttributFige[] }>;
  addConstraint(input: { entityId: EntityID; attributeKey: string; rule: RegleContrainte; justification: string }): Promise<{ constraintId: ConstraintId }>;
  setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }>;
  advanceTurn(summary?: string): Promise<{ turnNumber: number }>;
  validateNarration(input: { narration: string; type?: EntityType; strict?: boolean }): Promise<import("../hooks/narration-gate.js").ValidationReport>;
}

/**
 * Fields that must hold a real entity id, per tool. `sneq__get_entity` is deliberately
 * absent: `null` is its honest answer to "is this id known?", and an explicit null is
 * not a silent failure. The guard exists for the calls where a bad id used to be
 * swallowed — a scene declared with nobody in it, a fact filed against nothing.
 */
const GUARDED_ENTITY_FIELDS: Partial<Record<ToolName, { single?: string[]; list?: string[] }>> = {
  sneq__get_relevant_facts: { single: ["entityId"] },
  sneq__register_fact: { single: ["entityId"] },
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
    case "sneq__get_relevant_facts":
      return ctx.getRelevantFacts(args["entityId"] as EntityID, {
        ...(args["attributeKeys"] !== undefined ? { attributeKeys: args["attributeKeys"] as string[] } : {}),
        ...(args["depth"] !== undefined ? { depth: args["depth"] as 0 | 1 } : {})
      });
    case "sneq__suggest_existing":
      return ctx.suggestExisting(args["mention"] as string, args["type"] as EntityType);
    case "sneq__mention_entity":
      return ctx.mentionEntity({
        canonicalName: args["canonicalName"] as string,
        type: args["type"] as EntityType,
        ...(args["aliases"] !== undefined ? { aliases: args["aliases"] as string[] } : {}),
        ...(args["force"] !== undefined ? { force: args["force"] as boolean } : {}),
        description: args["description"] as string
      });
    case "sneq__register_fact":
      return ctx.registerFact({
        entityId: args["entityId"] as EntityID,
        attributeKey: args["attributeKey"] as string,
        value: args["value"] as AttributValue,
        category: args["category"] as CategorieAttribut,
        observation: args["observation"] as Observation
      });
    case "sneq__add_constraint":
      return ctx.addConstraint({
        entityId: args["entityId"] as EntityID,
        attributeKey: args["attributeKey"] as string,
        rule: args["rule"] as RegleContrainte,
        justification: args["justification"] as string
      });
    case "sneq__set_scene":
      return ctx.setScene({
        locationEntityId: args["locationEntityId"] as EntityID,
        presentEntityIds: args["presentEntityIds"] as EntityID[],
        description: args["description"] as string
      });
    case "sneq__advance_turn":
      return ctx.advanceTurn(args["summary"] as string | undefined);
    case "sneq__validate_narration":
      return ctx.validateNarration({
        narration: args["narration"] as string,
        ...(args["type"] !== undefined ? { type: args["type"] as EntityType } : {}),
        ...(args["strict"] !== undefined ? { strict: args["strict"] as boolean } : {})
      });
  }
}

// Re-export needed types so consumers can import from a single place
export type { Scene } from "../domain/scene.js";
