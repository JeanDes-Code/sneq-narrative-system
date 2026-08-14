import { z } from "zod";

/**
 * Ten tools (§5.2). `get_relevant_facts` and `register_fact` are gone: the
 * first was the omniscient read this design exists to remove, the second asked
 * a stochastic process to invent a stable attribute key and then let
 * GM_NARRATION walk straight into canon.
 */
export const ToolNames = [
  "sneq__lookup_entity",
  "sneq__get_entity",
  "sneq__get_holder_context",
  "sneq__suggest_existing",
  "sneq__mention_entity",
  "sneq__commit_narrative",
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
  source: z.enum(["GM_NARRATION","PLAYER_UTTERANCE","DICE_ROLL","SYSTEM","OUT_OF_BAND"]),
  method: z.enum(["DIALOGUE_DIRECT","DOCUMENT","OBSERVATION_VISUELLE","DEDUCTION_CONFIRMEE","AVEU","DEMONSTRATION"]),
  emittedBy: z.string().optional(),
  sceneId: z.string().optional(),
  excerpt: z.string().optional(),
  timestamp: z.number()
});

const actEffect = z.object({
  entityId: z.string(),
  key: z.string(),
  value: attributValue,
  category
});

const eventAct = z.object({
  actorId: z.string(),
  verb: z.string(),
  objectId: z.string().optional(),
  value: attributValue.optional(),
  /** The ONLY road from an act into canon (#27) — the engine never reads `verb`. */
  sets: actEffect.optional()
});

const carriageRoute = z.enum(["OFFICIAL", "RUMOUR"]);

const commitEvent = z.object({
  eventId: z.string(),
  placeId: z.string().optional(),
  gravity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  acts: z.array(eventAct),
  circumstance: z.string(),
  participants: z.array(z.string()),
  surfaceTokens: z.array(z.string())
});

const commitRecord = z.object({
  recordId: z.string(),
  entityId: z.string(),
  key: z.string(),
  value: attributValue,
  category,
  authoredBy: z.string(),
  aboutEventId: z.string().optional(),
  route: carriageRoute,
  observation,
  surfaceTokens: z.array(z.string())
});

const commitCarriage = z.object({
  carriageId: z.string(),
  subject: z.union([
    z.object({ kind: z.literal("EVENT"),  id: z.string() }),
    z.object({ kind: z.literal("RECORD"), id: z.string() })
  ]),
  carrier: z.string(),
  route: carriageRoute,
  fromPlaceId: z.string(),
  toPlaceId: z.string(),
  travelDays: z.number(),
  minStanding: z.number().optional()
});

const commitCarriageEffect = z.object({
  carriageId: z.string(),
  effect: z.union([
    z.object({ kind: z.literal("DELAY"),     days: z.number() }),
    z.object({ kind: z.literal("CANCEL") }),
    z.object({ kind: z.literal("DISCREDIT") })
  ]),
  declaredOnDay: z.number()
});

const commitInvention = z.object({
  inventionId: z.string(),
  entityId: z.string(),
  attributeKey: z.string(),
  value: attributValue,
  category,
  sourceNarration: z.string(),
  confidence: z.number(),
  surfaceTokens: z.array(z.string())
});

const promotionEvidence = z.object({
  inventionId: z.string(),
  evidence: z.union([
    z.object({ kind: z.literal("PLAYER_UPTAKE"),     eventId:  z.string() }),
    z.object({ kind: z.literal("WORLD_CONSEQUENCE"), eventId:  z.string() }),
    z.object({ kind: z.literal("RECONFIRMATION"),    eventId:  z.string() }),
    z.object({ kind: z.literal("OFFICIAL_RECORD"),   recordId: z.string() })
  ])
});

const holder = z.union([
  z.object({
    kind: z.literal("GROUP"),
    holderId: z.string(),
    community: z.string(),
    stratum: z.string(),
    realmId: z.string(),
    placeId: z.string(),
    standing: z.number()
  }),
  z.object({
    kind: z.literal("INDIVIDUAL"),
    holderId: z.string(),
    entityId: z.string(),
    baseGroupId: z.string(),
    derogationReason: z.enum(["PARTICIPANT", "PERSONAL_STAKE", "PLAYER"]),
    standingOverride: z.number().optional()
  })
]);

const dispatchPolicy = z.object({
  routes: z.array(z.object({
    fromPlaceId: z.string(),
    toPlaceId: z.string(),
    route: carriageRoute,
    travelDays: z.number(),
    minStanding: z.number().optional()
  })).optional(),
  rules: z.array(z.object({
    minGravity: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    targets: z.union([z.literal("ALL_KNOWN_COMMUNITIES"), z.array(z.string())]),
    route: carriageRoute,
    carrierLabel: z.string()
  })).optional()
});

/** Exactly one of holderId / entityId (#21) — the reply names which road answered. */
const holderContextArgs = z.object({
  holderId: z.string().optional(),
  entityId: z.string().optional(),
  about: z.string().optional(),
  topK: z.number().int().positive().optional()
}).refine(
  a => (a.holderId === undefined) !== (a.entityId === undefined),
  { message: "pass exactly one of holderId or entityId — holderId reads a holder directly, entityId runs the §2.3 cascade" }
);

export const schemas = {
  sneq__lookup_entity: z.object({
    mention: z.string(),
    type: entityType.optional()
  }),
  sneq__get_entity: z.object({ entityId: z.string() }),
  sneq__get_holder_context: holderContextArgs,
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
  sneq__commit_narrative: z.object({
    operationId: z.string(),
    /** REQUIRED (#20). 0 is legal; absence is not. */
    daysElapsed: z.number(),
    event: commitEvent.optional(),
    records: z.array(commitRecord).optional(),
    carriages: z.array(commitCarriage).optional(),
    carriageEffects: z.array(commitCarriageEffect).optional(),
    inventions: z.array(commitInvention).optional(),
    promotionEvidence: z.array(promotionEvidence).optional(),
    holders: z.array(holder).optional(),
    policy: dispatchPolicy.optional(),
    /** The raw player text (§11 phase A): the engine detects uptake from it, the caller never claims it. */
    playerUtterance: z.string().optional()
  }),
  sneq__add_constraint: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    rule: z.unknown(),
    justification: z.string(),
    /** REQUIRED (#19): who is speaking. 0.3 hardcoded INFERENCE_IA for everything. */
    role: z.union([
      z.object({ role: z.literal("REGLE_MONDE"),    ruleId: z.string() }),
      z.object({ role: z.literal("INFERENCE_IA"),   confidence: z.number() }),
      z.object({ role: z.literal("FAIT_CANONIQUE"), factId: z.string() }),
      z.object({ role: z.literal("RELATION"),       edgeKey: z.string() })
    ])
  }),
  sneq__set_scene: z.object({
    locationEntityId: z.string(),
    presentEntityIds: z.array(z.string()),
    description: z.string()
  }),
  sneq__advance_turn: z.object({
    summary: z.string().optional(),
    /** Out-of-band time only (#20): downtime and session breaks, never the fiction's own elapsed time. */
    days: z.number().int().nonnegative().optional()
  }),
  sneq__validate_narration: z.object({
    narration: z.string(),
    type: entityType.optional(),
    strict: z.boolean().optional(),
    /** Who the narration is for. With it the gate runs containment and can BLOCK. */
    holderId: z.string().optional()
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
    "Resolve a free-text mention to an entity that already exists in canon. Returns { match, candidates, layerUsed, confidence } — match is null when nothing resolved. Does NOT return facts, attributes or beliefs, and does NOT create anything. Failure mode: match null with a non-empty candidates list means ambiguous, not absent — pick one or ask the player; do not invent a new entity. The scene description is fed to the disambiguation judge for you.",
  sneq__get_entity:
    "Fetch an entity's identity by id: name, type, aliases, description, realm. Identity only — it does NOT return canonical attributes, facts or beliefs, and it never has. To learn what somebody knows, call get_holder_context. Returns null for an id this campaign does not know, which is an answer, not an error. Call lookup_entity or mention_entity first to obtain the id.",
  sneq__get_holder_context:
    "The only read of world knowledge on this surface, and it is always somebody's. Pass exactly one of holderId or entityId — the entityId form runs the resolution cascade (declared individual, else auto-participant, else the campaign default group) and the reply names the holder it resolved to and by which road. Returns { holderId, road, day, turn, beliefs, omitted, explain }: what this holder has learned, ranked by salience, filtered by `about` and capped by `topK`. There is NO way to ask what is actually true — the tool does not exist, and improvising one is the failure this engine was built to remove. Three distinct answers, never conflate them: an unknown id is an error; a holder who has learned nothing returns beliefs: [] with an explain line saying so; a missing scene is a literal null on prepare-turn. An empty belief list means narrate their ignorance, not fill it in.",
  sneq__suggest_existing:
    "Before naming a new entity, surface the existing ones it might already be, so canon does not fork. Returns { candidates, recommendsNew }. Creates nothing and writes nothing. Use BEFORE mention_entity whenever you are about to introduce a name you have not used in this session.",
  sneq__mention_entity:
    "Introduce an entity, or re-use the one it turns out to be. Returns { entityId, isNew, resolvedTo }. Failure mode to handle: needsAdjudication=true means the engine refused to silently create a near-duplicate — surface the candidates to the player or pick one yourself, then either pass the chosen entityId onward or re-call with force:true to create a genuinely distinct entity. Never force:true just to make the call succeed.",
  sneq__commit_narrative:
    "The single write: one bundle, atomic, all of it or none of it. Carries the turn's event, records, carriages, carriage effects, provisional inventions, promotion evidence, holders and dispatch policy additions. daysElapsed is REQUIRED — the fiction declares its own elapsed time every turn; 0 is legal, leaving it out is not, and a campaign that always answers 0 will be caught by the frozen-clock check. Returns { replayed, newWorldDay, turn, eventId, carriages, promoted, quarantined, health }. Retry with the same operationId and you get the recorded result back, not a second write. Two things you do NOT control: an act reaches canon only through its explicit `sets` (the engine never interprets `verb`), and promotion of a provisional invention is detected by the engine from `playerUtterance` — pass the player's raw text and let it decide. An assertion with no act to hang on lands in the provisional layer whatever you label it.",
  sneq__add_constraint:
    "Record a constraint narrowing what an unsettled attribute may later become. Returns { constraintId }. `role` is required and says who is speaking: REGLE_MONDE is a declared rule of the world, INFERENCE_IA is your own guess and carries its confidence. Constraints are consulted for real now — they gate invention promotion — so a wrong one silently stops a fact from ever entering canon. Nothing propagates: no other entity is touched and no value is derived. A constraint that could only ever reject on type is quarantined by the engine and reported by doctor. Rejects an id that is not a known entity — call lookup_entity or mention_entity first.",
  sneq__set_scene:
    "Declare where the player is and who is present, and bump the turn counter. locationEntityId and every presentEntityIds element must be engine-issued entity ids — a name like \"la taverne du Cerf\" is rejected with a message telling you which call to make first. Getting this wrong used to succeed silently and leave the scene empty. Call mention_entity for anyone new before declaring the scene.",
  sneq__advance_turn:
    "Bump the turn counter, and optionally move the world clock by `days`. Returns { turnNumber, worldDay, health }. Use `days` for out-of-band time only — downtime, a session break, a skipped week. The fiction's own elapsed time belongs on commit_narrative.daysElapsed, because that is the call that carries the events the time applies to. Moving the clock here also lands any carriage whose journey ends in the interval.",
  sneq__validate_narration:
    "Check a candidate narration before showing it to the player. Returns { ok, verdict, extractedNames, issues, containment?, repairHint? }. verdict is PASS, REPAIR (unresolved proper nouns and strict was set — hand repairHint back to the model for ONE rewrite) or BLOCK. Pass holderId to get the check that matters: the narration is tested against what that holder may know, and a leak returns BLOCK. Do not reword a BLOCK — the information should never have been available to compose with, so a rewrite of the same leak is still a leak. Without holderId this only checks that proper nouns resolve, and says nothing about entitlement."
};
