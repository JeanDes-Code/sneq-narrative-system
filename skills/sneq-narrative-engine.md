---
name: sneq-narrative-engine
description: When the agent acts as Game Master and must narrate from one character's point of view without leaking what they cannot know. Use for per-holder knowledge ("what does this NPC know?"), canonical entities and world days, news that travels by carriage and arrives late, and the single atomic write that records a turn. Load it BEFORE naming anyone, BEFORE composing a prompt for an NPC, and AFTER narrating — nothing you say is in the world until you commit it.
---

# SNEQ Narrative Engine — Agent Skill

`sneq-engine` keeps the world's bookkeeping so you can narrate. It is a library, not a GM: you write the prose, it decides who is entitled to know what, and it records what happened.

**The one sentence that shapes everything else:** there is no way to ask SNEQ what is *true*. Every read of world knowledge is for a named **holder**. That is not a gap in the API — it is the design. A character cannot leak a fact the engine never handed you.

If you go looking for a "get everything" read, you will not find one, and improvising around its absence is the exact failure this engine was built to remove.

## Five disciplines

Everything below is an application of these.

1. **Holder discipline.** Every read is for someone. `get_holder_context` takes a holder or an entity, never neither. If it comes back with no beliefs, that is an answer: narrate their ignorance. Do not fill it in.
2. **Id discipline.** A name is never an id. `"la taverne du Cerf"` is a name; `lieu_1754...` is an id. The tools that write reject a name and tell you which call produces the id. Passing a name used to succeed silently and leave the scene empty — for months, in production.
3. **One bundle.** Writes are a single `commit_narrative` call, not five ordered ones. All of it lands or none of it does.
4. **Two clocks.** `turn` is your conversation. `day` is the world. Narration alone moves neither. The world moves because you said how much time passed.
5. **Promotion is the engine's job.** You never decide that an invented detail has become canon. You hand over the player's raw words; the engine decides.

## The turn, end to end

```ts
// A — the player speaks. The engine reads their words for you.
const ingest = await campaign.ingestPlayerInput({ entityId: playerCharacterId, text: playerText });

// B — what THIS character knows, ranked, with an explain line.
const ctx = await campaign.getHolderContext({ entityId: npcId, topK: 20 });

// C — compose your own prompt; SNEQ owns the decisions, you own the prose.
const payload = [renderContextBlock(ctx), previousTurns, playerText].join("\n\n");

// D — the pre-flight assertion. Throws if the payload carries a token this
//     holder never learned. Do this BEFORE the model call, not after.
await campaign.assertContainment({ entityId: npcId, text: payload });

// E — your LLM call. SNEQ is not involved.
const narration = await yourModel(payload);

// F — the gate. Blocks a leak; asks for one rewrite when names do not resolve.
const report = await campaign.validateNarration({ holderId: ctx.holderId, narration, strict: true });
if (report.verdict === "BLOCK") { /* do not show it, do not reword it */ }

// G — the single write.
await campaign.commitNarrative({
  operationId: crypto.randomUUID(),
  daysElapsed: 0,                 // REQUIRED. How much world time this turn took.
  playerUtterance: playerText,    // the engine detects promotions from this
  event: { /* … */ }
});

// H — out-of-band time only: downtime, a session break, a skipped week.
await campaign.advanceTurn({ days: 7 });
```

Phases D and F are not the same check. **D proves the fact was never handed over.** F catches a leak in what came back. D is the one that carries the guarantee; F is the safety net.

## The tools

Ten of them. Consult `docs/api.md` for exact parameter shapes; this is the *when* and *why*. Every tool description is also shipped to you on each call — read those too, they are kept honest.

### Reading

- **`sneq__get_holder_context({ holderId | entityId, about?, topK? })`** — the only world read there is. Pass exactly one id. The `entityId` form runs the resolution cascade (declared individual → auto-participant → the campaign's default group) and the reply names which road answered, so you always know who is speaking.

  Three answers, never conflate them:
  - an id nobody knows → **error**
  - a holder who has learned nothing → **`beliefs: []` plus an `explain` line saying so**
  - no scene declared → **a literal `scene: null` on `prepare-turn`**

  A plausible-looking empty list standing in for a missing read is how a campaign quietly forgets a character. The `explain` line exists so you can tell the difference.

- **`sneq__lookup_entity({ mention, type? })`** — resolve a mention to an entity that already exists. `match: null` with a non-empty `candidates` means *ambiguous*, not *absent*: pick one or ask the player. Do not invent.

- **`sneq__get_entity({ entityId })`** — identity only: name, type, aliases, description, realm. **No attributes, no facts, no beliefs.** It never returned those; the old description said it did, and agents believed it.

- **`sneq__suggest_existing({ mention, type })`** — before you name someone new, ask whether they already exist. Canon forks quietly otherwise.

### Writing

- **`sneq__commit_narrative({ operationId, daysElapsed, … })`** — the single write. Carries the turn's event, official records, carriages, provisional inventions, holders and dispatch policy additions. Atomic: all of it or none.

  - **`daysElapsed` is required.** Zero is legal — a conversation in one room takes no time. Leaving it out is not, and a campaign that always answers `0` will be caught by the frozen-clock check, because carriages will be on the road forever.
  - **`playerUtterance`** — hand over the player's raw text. The engine substring-searches it for the surface tokens of every provisional invention and promotes what the player took up. This is not yours to decide.
  - **An act reaches canon only through its explicit `sets`.** The engine never reads `verb`. `{ verb: "WALKS" }` records that it happened and changes nothing; `sets: { entityId, key, value, category }` changes canon. An assertion with no act to hang on lands in the provisional layer whatever you label it.
  - **Retry with the same `operationId`** and you get the recorded result back, not a second write.

- **`sneq__mention_entity({ canonicalName, type, description, aliases?, force? })`** — introduce or re-use. `needsAdjudication: true` means the engine refused to silently create a near-duplicate: pick a candidate's id, or re-call with `force: true` when it really is somebody new. Never `force: true` merely to make the call succeed.

- **`sneq__add_constraint({ entityId, attributeKey, rule, justification, role })`** — narrow what an unsettled attribute may become. **`role` is required**: `REGLE_MONDE` is a declared rule of the world, `INFERENCE_IA` is your own guess and carries its confidence. Constraints are consulted for real now — they gate promotion — so a wrong one silently stops a fact from ever becoming canon. Nothing propagates: no other entity is touched.

- **`sneq__set_scene({ locationEntityId, presentEntityIds, description })`** — where the player is and who is present. Ids, not names. Call `mention_entity` for anyone new first.

- **`sneq__advance_turn({ summary?, days? })`** — bump the turn, and with `days` move the world clock **out of band**: downtime, a session break. The fiction's own elapsed time belongs on `commit_narrative.daysElapsed`, because that is the call carrying the events the time applies to.

- **`sneq__validate_narration({ narration, holderId?, strict?, type? })`** — the gate. Returns a `verdict`:
  - **`PASS`** — show it.
  - **`REPAIR`** — proper nouns did not resolve and you asked for `strict`. Hand `repairHint` back to your model for **one** rewrite.
  - **`BLOCK`** — the narration says something this holder cannot know. **Do not reword it.** The information should never have been available to compose with, so a rewrite of the same leak is still a leak. Re-read the holder context; if the term genuinely belongs there, the derivation is wrong and that is a bug worth reporting.

  Without `holderId` this checks proper nouns only and says nothing about entitlement.

## What is gone, and why

| Gone | Because |
|---|---|
| `sneq__get_relevant_facts` | It was the omniscient read. Keeping it makes the whole seam decorative. |
| `sneq__register_fact` | It asked you to invent a stable `attributeKey` across a 400-turn campaign, and it let GM narration walk straight into canon. Both jobs now belong to `commit_narrative`. |
| "Narrate, then commit canon" as separate beats | Nothing ever checked that the commit happened, and in practice it did not. One bundle, one call. |
| Adjudicating contradictions | An invention contradicted by canon is now **silently rejected**. No error, no interrupt. Replacing a value on a key is state evolution, not a conflict — history lives in the ledger. |

## How news travels

The world is not omniscient either. An event happens at a place. Whoever was there **witnesses** it. Everyone else learns it only when something carries it to them: a **carriage** with a route, a travel time, and a minimum standing to be told at all. Official news halts at a realm border; rumour crosses but still takes the days it takes.

So a holder can be ignorant of something that happened yesterday two towns over, and that is correct — not a missing read. If you find yourself explaining why an NPC *ought* to know something, you are about to leak.

`doctor` will tell you when the world has gone deaf: rules that fire with no route to travel means the map has never been declared.

## When things go wrong

- **`ENTITY_NOT_FOUND`** — you passed a name where an id belongs. The message names the call that fixes it. This is your error, not the engine's.
- **`HOLDER_NOT_FOUND`** — no holder answers to that id. Different from "this holder knows nothing", which is a successful read.
- **`CONTAINMENT_VIOLATION`** — stop. The engine handed over something it should not have. Do not narrate around it.
- **`needsAdjudication`** — normal. Pick a candidate or `force: true`.
- **A model refused / a tier is exhausted** — a system issue, surface it.
- **Alias-only campaigns** (`embeddingDim: 0`) — resolution has no vector rung. Prefer established names and register aliases eagerly; they are the whole lookup surface.

When a campaign misbehaves and you cannot tell why, run `sneq-engine doctor --campaign <id>`. It checks that every id on the scene resolves, that events are still being written, that the clock is moving, that dispatch reaches anywhere, and that no constraint is quarantined. Each failure names what to do.

## Pointer

`docs/api.md` in the `sneq-engine` package carries the exact signatures and return shapes. It is generated from the source and CI fails on a stale copy, so it does not drift. This skill teaches you *when*; that file teaches you *how*.
