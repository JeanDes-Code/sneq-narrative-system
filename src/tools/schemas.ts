import { z } from "zod";

export const ToolNames = [
  "sneq__lookup_entity",
  "sneq__get_entity",
  "sneq__get_relevant_facts",
  "sneq__suggest_existing",
  "sneq__mention_entity",
  "sneq__register_fact",
  "sneq__add_constraint",
  "sneq__collapse_attribute",
  "sneq__set_scene",
  "sneq__advance_turn"
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
  z.object({ type: z.literal("COMPOSITE"),  fields: z.record(z.unknown()) })
]);

const category = z.enum(["IDENTITE","PSYCHOLOGIE","HISTORIQUE","SOCIAL","COMPETENCE","SECRET","ETAT","POSSESSION"]);

const observation = z.object({
  source: z.enum(["GM_NARRATION","PLAYER_UTTERANCE","DICE_ROLL","SYSTEM"]),
  method: z.enum(["DIALOGUE_DIRECT","DOCUMENT","OBSERVATION_VISUELLE","DEDUCTION_CONFIRMEE","AVEU","DEMONSTRATION"]),
  emittedBy: z.string().optional(),
  sceneId: z.string().optional(),
  fiabilite: z.enum(["CERTAINE","TEMOIGNAGE","RUMEUR_CONFIRMEE"]),
  excerpt: z.string().optional(),
  timestamp: z.number()
});

export const schemas = {
  sneq__lookup_entity: z.object({
    mention: z.string(),
    type: entityType.optional(),
    sceneId: z.string().optional()
  }),
  sneq__get_entity: z.object({ entityId: z.string() }),
  sneq__get_relevant_facts: z.object({
    entityId: z.string(),
    attributeKeys: z.array(z.string()).optional(),
    depth: z.number().int().min(0).max(3).optional()
  }),
  sneq__suggest_existing: z.object({
    mention: z.string(),
    type: entityType
  }),
  sneq__mention_entity: z.object({
    canonicalName: z.string(),
    type: entityType,
    aliases: z.array(z.string()).optional(),
    sceneId: z.string().optional(),
    description: z.string()
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
  sneq__collapse_attribute: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    profondeur: z.enum(["MINIMAL", "STANDARD", "DETAILLE"]).optional(),
    registre: z.enum(["NEUTRE","DRAMATIQUE","HUMORISTIQUE","SOMBRE"]).optional()
  }),
  sneq__set_scene: z.object({
    locationEntityId: z.string(),
    presentEntityIds: z.array(z.string()),
    description: z.string()
  }),
  sneq__advance_turn: z.object({ summary: z.string().optional() })
} as const;

export const toolDescriptions: Record<ToolName, string> = {
  sneq__lookup_entity: "Resolve a mention to an existing entity in the canonical store. Returns match, candidates, and which layer of the resolver answered.",
  sneq__get_entity: "Fetch an entity by id with its full set of figed (canonical) attributes.",
  sneq__get_relevant_facts: "List canonical facts about an entity, optionally narrowed by attribute keys or graph depth.",
  sneq__suggest_existing: "Before introducing a new entity by name, surface existing candidates so canonical reality doesn't fork. Use BEFORE mention_entity.",
  sneq__mention_entity: "Introduce or re-use an entity. Always returns isNew and resolvedTo so the caller knows which it got.",
  sneq__register_fact: "Append a canonical (figed) attribute to an entity. Returns contradictions instead of throwing - the caller adjudicates.",
  sneq__add_constraint: "Add a soft or strict constraint to a non-figed attribute.",
  sneq__collapse_attribute: "Drive an LLM call (heavy tier) to fill a specific attribute, validate, inscribe, propagate. Engine-internal LLM use.",
  sneq__set_scene: "Declare the current scene: where the player is and which entities are present.",
  sneq__advance_turn: "Bump the campaign's monotonic turn counter, optionally with a one-line summary."
};
