import { z } from "zod";

export const ToolNames = [
  "sneq__lookup_entity",
  "sneq__get_entity",
  "sneq__get_relevant_facts",
  "sneq__suggest_existing",
  "sneq__mention_entity",
  "sneq__register_fact",
  "sneq__add_constraint",
  "sneq__set_scene",
  "sneq__advance_turn",
  "sneq__validate_narration"
] as const;
export type ToolName = typeof ToolNames[number];

const entityType = z.enum(["PERSONNAGE", "LIEU", "OBJET", "FACTION", "EVENEMENT", "RELATION", "SCENE", "WORLD"]);

const attributValue: z.ZodType<unknown> = z.union([
  z.object({ type: z.literal("STRING"),     value: z.string() }),
  z.object({ type: z.literal("NUMBER"),     value: z.number() }),
  z.object({ type: z.literal("BOOLEAN"),    value: z.boolean() }),
  z.object({ type: z.literal("ENTITY_REF"), id: z.string() }),
  z.object({ type: z.literal("ENTITY_SET"), ids: z.array(z.string()) }),
  z.object({ type: z.literal("ENUM"),       value: z.string(), enumType: z.string() }),
  z.object({ type: z.literal("COMPOSITE"),  fields: z.record(z.string(), z.unknown()) })
]);

const category = z.enum(["IDENTITE","PSYCHOLOGIE","HISTORIQUE","SOCIAL","COMPETENCE","SECRET","ETAT","POSSESSION"]);

// Strict: a caller still sending `fiabilite` (removed, #18) fails loudly at
// the boundary instead of having the key silently dropped.
const observation = z.strictObject({
  source: z.enum(["GM_NARRATION","PLAYER_UTTERANCE","DICE_ROLL","SYSTEM"]),
  method: z.enum(["DIALOGUE_DIRECT","DOCUMENT","OBSERVATION_VISUELLE","DEDUCTION_CONFIRMEE","AVEU","DEMONSTRATION"]),
  emittedBy: z.string().optional(),
  sceneId: z.string().optional(),
  excerpt: z.string().optional(),
  timestamp: z.number()
});

export const schemas = {
  sneq__lookup_entity: z.object({
    mention: z.string(),
    type: entityType.optional()
  }),
  sneq__get_entity: z.object({ entityId: z.string() }),
  sneq__get_relevant_facts: z.object({
    entityId: z.string(),
    attributeKeys: z.array(z.string()).optional(),
    depth: z.union([z.literal(0), z.literal(1)]).optional()
  }),
  sneq__suggest_existing: z.object({
    mention: z.string(),
    type: entityType
  }),
  sneq__mention_entity: z.object({
    canonicalName: z.string(),
    type: entityType,
    aliases: z.array(z.string()).optional(),
    description: z.string(),
    force: z.boolean().optional()
  }),
  sneq__register_fact: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    value: attributValue,
    category: category,
    observation: observation
  }),
  sneq__add_constraint: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    rule: z.unknown(),
    justification: z.string()
  }),
  sneq__set_scene: z.object({
    locationEntityId: z.string(),
    presentEntityIds: z.array(z.string()),
    description: z.string()
  }),
  sneq__advance_turn: z.object({ summary: z.string().optional() }),
  sneq__validate_narration: z.object({
    narration: z.string(),
    type: entityType.optional(),
    strict: z.boolean().optional()
  })
} as const;

/**
 * Shipped to the model on every call, which makes this the highest-leverage
 * documentation in the package — and the only one guaranteed to be in context.
 * Each entry states what the tool returns, what it does NOT return, the failure
 * mode the caller must handle, and the call that has to come first.
 *
 * Every id below is an engine-issued entity id from `lookup_entity` or
 * `mention_entity`. A name is never an id: the tools that write reject one.
 */
export const toolDescriptions: Record<ToolName, string> = {
  sneq__lookup_entity:
    "Resolve a free-text mention to an entity that already exists in canon. Returns { match, candidates, layerUsed, confidence } — match is null when nothing resolved. Does NOT return facts or attributes, and does NOT create anything. Failure mode: match null with a non-empty candidates list means ambiguous, not absent — pick one or ask the player; do not invent a new entity. The scene description is fed to the disambiguation judge for you.",
  sneq__get_entity:
    "Fetch an entity's identity by id: name, type, aliases, description. Does NOT return canonical attributes or facts — it never has; use get_relevant_facts for those. Returns null for an id this campaign does not know, which is an answer, not an error. Call lookup_entity or mention_entity first to obtain the id.",
  sneq__get_relevant_facts:
    "List canonical facts about an entity, and with depth:1 also every fact of every direct neighbour. Returns them unfiltered and unranked — this is the whole truth, not what any character knows, so do not paste it into a scene where someone should be ignorant. Rejects an id that is not a known entity. Call lookup_entity or mention_entity first.",
  sneq__suggest_existing:
    "Before naming a new entity, surface the existing ones it might already be, so canon does not fork. Returns { candidates, recommendsNew }. Creates nothing and writes nothing. Use BEFORE mention_entity whenever you are about to introduce a name you have not used in this session.",
  sneq__mention_entity:
    "Introduce an entity, or re-use the one it turns out to be. Returns { entityId, isNew, resolvedTo }. Failure mode to handle: needsAdjudication=true means the engine refused to silently create a near-duplicate — surface the candidates to the player or pick one yourself, then either pass the chosen entityId onward or re-call with force:true to create a genuinely distinct entity. Never force:true just to make the call succeed.",
  sneq__register_fact:
    "Append a canonical fact to an entity — a permanent, campaign-wide truth. Returns { factId, contradictions }: when the entity already holds a different value for that key, factId is null, contradictions lists the conflict, and nothing was written. That is a normal result to adjudicate, not an error. Rejects an id that is not a known entity. Call lookup_entity or mention_entity first.",
  sneq__add_constraint:
    "Record a constraint on an attribute that has not been settled yet — it narrows what the value may later become. Returns { constraintId }. Nothing propagates: no other entity is touched, no fact is derived, no state is recomputed. The constraint is stored and consulted nowhere in this version. Rejects an id that is not a known entity.",
  sneq__set_scene:
    "Declare where the player is and who is present, and bump the turn counter. locationEntityId and every presentEntityIds element must be engine-issued entity ids — a name like \"la taverne du Cerf\" is rejected with a message telling you which call to make first. Getting this wrong used to succeed silently and leave the scene empty. Call mention_entity for anyone new before declaring the scene.",
  sneq__advance_turn:
    "Bump the campaign's monotonic turn counter, optionally with a one-line summary. Returns { turnNumber }. Does NOT move world time — there is no world clock in this version, so travel, delay and elapsed days are not modelled and no other state changes.",
  sneq__validate_narration:
    "Check a candidate narration against canon before showing it to the player. Returns { ok, extractedNames, issues } — the capitalised proper nouns found, and those that did not resolve to a known entity. It reports; it never blocks or rewrites. Does NOT check whether a character is entitled to know what the narration has them say, and does NOT catch a lowercase invention. The strict flag is accepted and currently ignored."
};
