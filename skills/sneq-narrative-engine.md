---
name: sneq-narrative-engine
description: When the agent acts as Game Master for a TTRPG / narrative campaign and needs to track canonical entities, facts, scenes, and turns across sessions. Use BEFORE narrating any named NPC, location, object, faction, or event so canonical reality doesn't fork. Use AFTER every narration step to register what was just established.
---

# SNEQ Narrative Engine — Agent Skill

This skill teaches you to use the `@sneq/engine` library to maintain canonical world state for a TTRPG campaign across sessions. The engine is a **bookkeeping library**, not a GM — you (the agent) drive the narration. The engine tracks entities, facts, constraints, and scenes; resolves entity mentions to existing records; and prevents you from accidentally forking canonical reality.

## When to use this skill

- The user opens a new or existing TTRPG campaign and asks you to GM
- The user mentions a returning location or NPC ("we go back to the village")
- You are about to invent a new entity in narration (NPC, place, object, faction)
- You are about to commit a fact about an existing entity ("the blacksmith reveals he was a soldier")
- A scene changes (player enters a new location)

## When NOT to use

- The user is asking about the world out-of-character (use other context, not engine writes)
- Pure dice mechanics with no narrative consequence
- One-shot improv where persistence isn't wanted

## The core loop

Every GM turn follows this rhythm:

1. **Resolve mentions in the player's input.** For every named entity the player references ("I look for the blacksmith"), call `sneq__lookup_entity` first. The engine returns either a canonical match, a list of candidates, or null. If null, the player is naming something new — note that.
2. **Plan your narration.** Before committing to a new entity name, call `sneq__suggest_existing` to check whether you'd be forking canonical reality.
3. **Narrate.** Generate the prose you'd say to the player.
4. **Commit canon.** For each new entity introduced, call `sneq__mention_entity`. For each fact established (a profession, a trait, a possession, a secret), call `sneq__register_fact`.
5. **Update scene.** If the player moved, call `sneq__set_scene`. At the end of the turn, call `sneq__advance_turn` with a one-line summary.

## Tool reference

The full Zod / JSON Schema definitions are in `docs/api.md` of the `@sneq/engine` package — **always consult that file for authoritative parameter shapes**. What follows is the *when* and *why*.

### Read tools (call before narrating)

- **`sneq__lookup_entity({ mention, type?, sceneId? })`** — Resolve a player or your own mention to an existing entity. Returns `{ match, confidence, candidates, layerUsed }`. If `match` is null and `candidates` is empty, you are introducing something new.

- **`sneq__suggest_existing({ mention, type })`** — Before *you* invent a new entity name, ask the engine if there's already one you should re-use. Returns `{ candidates, recommendsNew }`. If `recommendsNew` is false, pick from candidates.

- **`sneq__get_entity({ entityId })`** — Pull the full record (canonical attributes + aliases). Use to remind yourself what's been committed about an NPC before describing them again.

- **`sneq__get_relevant_facts({ entityId, attributeKeys?, depth? })`** — Narrower: get canonical facts about an entity, optionally across the graph at small depth (1-2). Use to keep narration consistent with prior reveals.

### Register tools (call after narrating)

- **`sneq__mention_entity({ canonicalName, type, aliases?, description })`** — Introduce or re-use an entity. Returns `{ entityId, isNew, resolvedTo? }`. If `isNew` is false, you actually merged into an existing entity — adjust your narration if needed.

- **`sneq__register_fact({ entityId, attributeKey, value, category, observation })`** — Commit a canonical fact. The engine returns `{ factId, contradictions }` instead of throwing on conflict. If `contradictions` is non-empty, you've just claimed something that contradicts an earlier figed fact — you must decide: regenerate (drop the claim), reinterpret (the new claim is a lie / mistake by an NPC), or reject the player's premise.

- **`sneq__add_constraint({ entityId, attributeKey, rule, justification })`** — Add a soft constraint to a not-yet-figed attribute (e.g. "the captain's loyalty is probably to the duke"). Useful when you want to narrow possibilities without locking the canonical value.

### Scene / turn tools

- **`sneq__set_scene({ locationEntityId, presentEntityIds, description })`** — Declare the current location and present entities. Use whenever the player physically moves.

- **`sneq__advance_turn({ summary? })`** — Bump the turn counter at end-of-turn. The optional summary helps future sessions (and other GMs / agents) catch up.

## Configuration

The engine is wired up by the host application (TTRPG app, Hermes runtime), not by you. The host owns `EngineConfig` with the router config (which AI models are used for the resolver judge and any engine-internal LLM calls), the SQLite path, and the resolver thresholds. You don't change these — you just call the tools.

## Failure modes you handle

- **Resolution L4 (askUser):** if the engine's resolver can't decide between candidates and there's an `askUser` handler registered, the player will be asked in-chat. Wait for their answer.
- **Contradictions:** `register_fact` returning contradictions is normal — adjudicate explicitly, don't just retry.
- **Provider exhausted:** the engine throws if every model in a tier's fallback chain has failed. Surface this to the user as a system issue.

## V2 scope note

`sneq__collapse_attribute` currently throws — full collapse-with-validation-and-regeneration is deferred to a follow-up version. For now, when you need to "generate then commit" an attribute, compose it yourself: call your LLM with the heavy-tier router, validate the response, then `sneq__register_fact` if valid.

## Pointer

For the exact method signatures, parameter types, and return shapes: read `docs/api.md` from the `@sneq/engine` package. That file is the source of truth. This skill teaches you *when* to call them; the API doc teaches you *how*.
