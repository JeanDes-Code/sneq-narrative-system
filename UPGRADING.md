# Upgrading sneq-engine

Written to be consumed by **humans and agents** (Hermes-Agent, Claude Code sessions,
scripts). Find the version you are coming from, apply its section, then run the
verification commands at the bottom.

Versions are listed newest first. There is no 0.4.0 — 0.4 was an internal milestone and
the whole design landed as one release.

---

## 0.6.0 — the model stops writing its own standing

**No database migration. No schema change. No tool added or removed.** If your
integration never wrote `standing` from a narration bundle, upgrading is `npm i` and
nothing else.

Coming from 0.5.0 rather than 0.5.1? Apply the 0.5.1 notes at the end of this section
too.

### Breaking — `commit_narrative`'s `holders[]`

The bundle may **create** a holder. It may not change the `standing` of one that
already exists. The refusal is a `SneqValidationError` and it rejects the **whole
bundle** — event, records, inventions and all — so a caller that hits this writes
nothing at all that turn.

Three shapes are refused, all on a holder the campaign already has:

| Refused | Why it counts as re-pricing |
|---|---|
| `standing` differs from the stored value | the direct case, in either direction |
| `standingOverride` differs, on an `INDIVIDUAL` | `deriveBeliefs` collapses both fields into one value — same channel, different field name |
| `standingOverride` **omitted** where one is stored | the upsert writes the whole holder, so omitting the field erases it |
| `kind` differs from the stored holder's | changes which field carries standing, so it re-prices by construction |

**What to do.** If you re-send whole holder records every turn as a convenience, stop
sending the ones that already exist — or catch `SneqValidationError` and retry without
them. If you genuinely need to change a holder's standing, that is a host act:

```ts
await campaign.upsertHolder({ ...holder, standing: 0.9 });
```

```sh
sneq-engine upsert-holder --campaign <id> --args '{"kind":"GROUP","holderId":"...","standing":0.9,...}'
```

The host path is unchanged and keeps full authority. Only the narration loop lost the
write.

**Why.** `standing` gates carriage delivery and feeds salience, so a model that can
raise it hands itself the news the `minStanding` gate was withholding. §5.3 ruled holder
authoring a host concern and then put creation in the bundle; this puts the line back
between those two halves.

### Breaking — `CommitContext`, for out-of-tree adapters only

Ignore this unless you call the exported `decideCommitNarrative` yourself (the §13
Convex adapter shape). `CommitContext.communities: GroupHolder[]` is now
`CommitContext.holders: Holder[]`, and the `ALL_KNOWN_COMMUNITIES` targets are derived
inside.

```diff
  const plan = decideCommitNarrative(bundle, {
    campaignId, worldDay, latestTurn, policy, places, defaultRealmId,
-   communities: holders.filter(h => h.kind === "GROUP"),
+   holders,
    canon, inventions, potentialites, maxDispatchFanout
  });
```

Pass **every** holder, not the groups. A pure decision cannot tell a creation from an
edit against a list it was never handed, and an adapter that kept passing the narrow
list would skip the standing guard in silence. That is why this is a compile error and
not an optional field.

### Added — one new `doctor` line

`gravity-distribution` appears in `doctor`'s report. It reports the histogram of your
events' gravity, and WARNs on two degenerate shapes: everything at `0` (dispatch only
fires above 0, so no carriage ever leaves) and everything at the top band (the fan-out
cap chooses who hears what instead of your policy). Below 8 events it reports as `INFO`
and judges nothing.

It is a WARN, never a FAIL, so `sneq-engine doctor` still exits 0. Nothing that gated
on the exit code changes behaviour.

### If you are coming from 0.5.0 and skipped 0.5.1

0.5.1 tightened two token checks, and both are breaking for a caller that was sending
weak tokens:

- An invention's `surfaceTokens` must occur in its `sourceNarration` **and** must not be
  a stopword or fragment. Fail-closed and atomic: one bad token rejects the bundle.
- Model-supplied tokens that cannot carry a secret are dropped from the containment
  forbidden set at read time. This *loosens* `assertContainment` and stops
  `filterTranscript` silently dropping legitimate entries.

Catch `SneqValidationError` around `commitNarrative` and re-ask rather than letting it
surface.

---

## 0.5.0 — stratified knowledge (one release, one break)

**Read this before you touch anything: the TL;DR of the 0.1.0 section below is no longer
true.** It promised *"your existing database files keep working untouched (the schema
migration is automatic and additive)"*. Under 0.5.0 the migration is still automatic, but
it is **not additive**: `figed` becomes `canonical_attributes`, the JSON save format bumps
to version 2, and per-entity day-0 events are synthesized. **Back up your database file
before opening it with 0.5.0.** The migration never runs twice, so there is no way to
re-run it against a copy afterwards.

### What changed, in one paragraph

Knowledge stopped being global. An event happens at a place on a world **day**; whoever
was there witnesses it; everybody else learns it only when news physically reaches them.
So there is no longer any call that answers *what is true* — every read of world knowledge
is for a named **holder**, and that is the point: a character cannot leak a fact the API
never handed over.

### Breaking — tools

| Gone | Replacement |
|---|---|
| `sneq__get_relevant_facts` | `sneq__get_holder_context { holderId \| entityId, about?, topK? }` — the same information, scoped to somebody. There is no unscoped form. |
| `sneq__register_fact` | `sneq__commit_narrative` — the whole turn as one atomic bundle. |

Changed: `sneq__get_entity` returns identity only and now says so (it never returned
attributes; the description claimed it did). `sneq__advance_turn` gains `days`.
`sneq__add_constraint` **requires** a `role` (`REGLE_MONDE` / `INFERENCE_IA` /
`FAIT_CANONIQUE` / `RELATION`) — 0.3 hardcoded `INFERENCE_IA` for everything, which left
`REGLE_MONDE` with no producer at all. `sneq__validate_narration` accepts `holderId`, and
its report gains a `verdict` of `PASS` / `REPAIR` / `BLOCK`.

The count stays at ten.

### Breaking — CLI (14 → 18 commands)

| Was | Now |
|---|---|
| `register-fact` | `commit-narrative` |
| `get-relevant-facts` | `get-holder-context` (requires `--holder` or `--entity`) |
| — | `upsert-holder`, `show-dispatch-policy`, `set-dispatch-policy`, `doctor` |

- `prepare-turn` **changed shape**. Holderless it returns the frame only — `{ day, turn,
  scene, presentEntities, holder: null }`. It no longer carries facts. Pass
  `--holder`/`--entity` and it also carries that holder's knowledge.
- Three flags do not travel through `--args`: `--holder`, `--entity`, `--days`.
- `--source` gains `out-of-band` (#22) and now applies to `commit-narrative`'s `records[]`,
  filling in only where a record brought no observation of its own. Before 0.5.0 `--source`
  was wired solely to `register-fact`; without this change your provenance presets would
  have died silently with that command.
- New error codes: `HOLDER_NOT_FOUND`, `CONTAINMENT_VIOLATION`, `EMBEDDING_DIM_MISMATCH`.
  All exit 1 — they are your call to fix, not engine bugs.

### Breaking — TypeScript API

| Change | Migration |
|---|---|
| `AttributFige` deleted, no alias | Use `CanonicalAttribute`. The old shape survives only as `LegacyFact`, the migration's read type. |
| `Repository.appendFact` / `getFigedAttributes` / `queryFacts` and `FactQuery` removed | Read `getCanonicalAttributes(campaignId, entityId?)`. Write through `commitNarrative`. |
| `campaign.registerFact` removed | `campaign.commitNarrative(bundle)`. |
| `campaign.getRelevantFacts` removed | `campaign.getHolderContext({ holderId \| entityId })`. |
| `campaign.prepareTurn()` returns a new shape | See the CLI note above. |
| `campaign.advanceTurn(summary)` → `advanceTurn({ summary?, days? })` | Wrap the argument; the result gains `worldDay` and `health`. |
| `decideRegisterFact`, `RegisterFact*` types removed from `sneq-engine/atomic` | Use `decideCommitNarrative` — it is how an out-of-tree store shares the single write's rules. |
| `propagate`, `PropagationInput`, `PropagationResult`, `ContraintePropagee` removed | Constraint propagation through the relation graph is gone. It had zero call sites. A character reacts when they *learn*, which is what the belief layer models. |
| `ValidationReport` gains a required `verdict` | Any hand-written `NarrationGateHook` must return one. |
| `ValidationContext.existingFiged` → `existingCanon: CanonicalAttribute[]` | Rename and retype. Still unread by the validator. |
| `AtomicWriteStrategy.registerFact` removed | Drop it from your strategy object. |

**New, worth adopting:** `ingestPlayerInput`, `getHolderContext`, `filterTranscript`,
`assertContainment`, `commitNarrative`, `tick`/`advanceTurn({days})`, `doctor`,
`renderContextBlock`, and `setEmbeddingDim` + `reindexEmbeddings`.

### The two clocks

`turn` is your conversation. `day` is the world. **`commit_narrative.daysElapsed` is
required** — the fiction declares its own elapsed time every turn, and `0` is legal.
`advance-turn --days N` is for out-of-band time only: downtime, a session break.

A campaign that always answers `daysElapsed: 0` will have carriages on the road forever.
`doctor` has a check for exactly that.

### Promotion is the engine's job

Pass the player's raw text as `commit_narrative.playerUtterance`. The engine
substring-searches it for the surface tokens of every provisional invention and promotes
what the player took up. Do **not** hand-write `PLAYER_UPTAKE` evidence: the detection
re-runs at commit and yours will not outrank it.

An invention contradicted by canon is now **silently rejected** — no error, no interrupt.
0.3's `register_fact` returned contradictions to adjudicate; that path is gone. Replacing a
value on a key is state evolution, not a conflict.

### One thing to author on day one

The containment floor withholds the **names** of an unlearned event's place and
participants. That is right for people and secrets and wrong for landmarks: the first
secret meeting at a tavern makes the tavern's name unmentionable to the whole town, and
your own scene description stops passing `assertContainment`.

Tag the places everybody has heard of:

```bash
sneq-engine mention-entity --db <your.db> --campaign <id> \
  --args '{"canonicalName":"La Forge","type":"LIEU","description":"…","public":true}'
```

What happened there is still withheld — `public` frees the name and nothing else. Never
set it on a person, or on anything whose existence is the secret. `doctor` lists them back,
because each one is a deliberate hole in the floor.

### Storage migration

- **SQLite**: schema v6. `figed` → `canonical_attributes` (copied as `LEGACY_FACT`), new
  ledger tables, `operations` ring, `migration_findings`, `Entity.realmId`. Persisted
  `observation` blobs are rewritten to drop the stale `fiabilite` key. Constraints are
  audited for value-type coherence; findings are **flagged, never auto-fixed and never
  deleted** — `doctor` reads them back.
- **JSON**: save format `1 → 2`, with a v1 loader running the same pure migration core.
- **Both** now run the §2.3 campaign bootstrap on a migrated campaign: a default realm
  entity, a default group holder, and a default dispatch rule with zero routes. Without
  the default group there is no floor to the holder cascade and nobody can hold anything.
- The migration **never re-runs on reopen**.

### Convex (out of tree)

Grimoire's adapter is not migrated by any of the above. It needs, in its own repo:

- Seven new tables: `events`, `records`, `holders`, `carriages`, `carriage_effects`,
  `inventions`, `invention_transitions`; plus `canonical_attributes` (replacing `figed`),
  `migration_findings`, and an `operations` ring for `operationId` dedup.
- An index on `(campaign_id, to_place_id, arrival_day)` for carriage arrival queries.
- A `commitNarrativeAtomic` mutation. Build it on **`decideCommitNarrative`** rather than
  re-deriving promotion, dispatch and contradiction by hand — that export exists for this.
- A backfill copying `figed` rows as `LEGACY_FACT` canonical rows plus one day-0
  `LEGACY_CANON` event per entity.
- The `payload as AttributFige` casts make this gap invisible to TypeScript. Grep for them.

### Embedding dimension (§14)

`embeddingDim` used to be chosen at campaign creation and then immutable, with no reindex
path anywhere in the contract — which is very likely why every measured consumer picked
`0`. Two new contract methods make moving between rungs a supported migration:

```ts
await repo.setEmbeddingDim(campaignId, 768);   // clears stored vectors — they are unreadable at the new dim
await repo.reindexEmbeddings(campaignId, vectors);   // every entity, re-embedded by the new model
```

Between the two calls the campaign resolves by alias alone: degraded, never wrong. Note
`sqlite-vec` holds one dimension per **file**, so SQLite refuses rather than destroying
another campaign's vectors — move the campaign to its own file, or reindex them together.

### 0.5.0 upgrade procedure (agent-executable)

```bash
cd <sneq-narrative-system checkout>
git pull
cp <your.db> <your.db>.pre-0.5.0-backup   # the migration does not run twice
pnpm install && pnpm build                # 528 tests: pnpm test

# Opening the DB runs the migration. Then ask what is wrong with it:
sneq-engine doctor --db <your.db> --campaign <id>          # exit 1 on a FAIL

# The frame still comes back, in its new shape:
sneq-engine prepare-turn --db <your.db> --campaign <id>

# And the read that replaces get-relevant-facts:
sneq-engine get-holder-context --db <your.db> --campaign <id> --entity <entityId>
```

Then update your call sites per the tables above, and **replace your copy of
`skills/sneq-narrative-engine.md`** — it was rewritten, not edited. Its frontmatter
`description` changed too, which is what decides whether an agent loads it at all.

---

## 0.3.1 and the pre-1.0 changes after 0.1.0

These landed on top of 0.1.0. If you are coming from 0.5.0 you have them already.

- **`0.3.1` — Honest surface (one breaking check).** No new features; this release makes
  the package stop claiming things it does not do.

  **Breaking, deliberately:** `sneq__set_scene`, `sneq__register_fact`,
  `sneq__add_constraint` and `sneq__get_relevant_facts` now reject an `entityId` this
  campaign does not know, throwing `SneqUnknownEntityError` (CLI: code `ENTITY_NOT_FOUND`,
  exit 1). Before, a value that was not an entity id — typically a model typing a name
  like `"la taverne du Cerf"` — was accepted: `EntityID` is a compile-time brand and
  nothing checked it at runtime. The scene was declared with nobody in it, every later
  read came back empty, and no error was raised. **If your integration passed names, it
  was silently doing nothing and now says so**, naming the field, the value and the call
  to make first. `sneq__get_entity` is untouched: `null` is its honest answer for an
  unknown id, and an explicit null was never a silent failure.

  **`operationId` is not what the docs said.** The engine does **not** deduplicate on it,
  and the built-in repository-backed strategy ignores the field. If you built a
  distributed `AtomicWriteStrategy` assuming the engine handled retries, it did not — the
  dedup is yours to implement, keyed on that token. Nothing changed in the code here; the
  documentation was wrong, including `docs/api.md` as published.

  **Tool descriptions rewritten.** All ten now state what they return, what they do
  **not** return, the failure mode to handle, and the call that must precede them. Two
  corrections matter to an agent: `sneq__get_entity` never returned canonical attributes
  (its description claimed it did), and `sneq__add_constraint` propagates nothing — no
  other entity is touched and no fact is derived.

  **`docs/api.md`** is regenerated, and its ~1000 cross-references — which pointed into a
  gitignored, unpackaged directory — are now in-document anchors. CI regenerates it and
  fails on a diff.

- **`0.3.0` — Provider usage metadata (additive).** `ChatResponse` and `EmbeddingResponse`
  gained an optional `usage?: ProviderUsage` field, exported from the package root.
  The OpenAI-compatible provider now parses the wire `usage` object and camelCases it:
  `promptTokens`, `completionTokens`, `totalTokens`, `promptCacheHitTokens`,
  `promptCacheMissTokens`, `reasoningTokens`. Every field is optional — a provider that
  omits a field yields `undefined` for it (**never zero**), and a provider that omits the
  whole `usage` object yields `usage: undefined`. No consumer action required; read it
  when you need metering.
- `collapse-attribute`, `sneq__collapse_attribute`, and `CampaignContext.collapseAttribute` were
  **removed**. They never succeeded in 0.1.0 (they threw / exited 1). The CLI now reports
  `collapse-attribute` as an unknown command. Compose the equivalent yourself: `Router.chat`
  (heavy tier) + `validateValue` + `registerFact`.
- `getRelevantFacts(..., { depth })` now accepts only `0 | 1`; a `depth` of `2`/`3` fails
  validation. Repository `neighbors(campaignId, entityId)` dropped its unused `depth` argument and
  is explicitly direct-only.
- Custom `AtomicWriteStrategy` implementations must add `addConstraint` and `createEntity`, plus the
  new `entityRevision(campaignId)` repository method and the entity-revision / idempotency semantics
  documented in the README. A non-terminal `stale` create result must not be recorded in an
  idempotency store.
- Stale or closed `CampaignContext` references now throw `SneqCampaignContextInvalidatedError`
  instead of reaching repository state. Repository adapters reject campaign-scoped writes whose
  parent campaign does not exist (`SneqCampaignNotFoundError`).

---

## 0.1.0 — out-of-process consumers (the `sneq-engine` CLI — e.g. Hermes-Agent)

### 1.1 MUST handle — `mention-entity` can refuse to create (anti-fork guard)

Before 0.1.0, an ambiguous mention silently created a near-duplicate entity. Now the
engine returns an adjudication request instead, **exit code 0** (it is a valid result,
not an error):

```json
{"entityId":null,"isNew":false,"needsAdjudication":true,"candidates":[{"entityId":"personnage_…","name":"Garde Nord","type":"PERSONNAGE"}]}
```

**What to do when you receive it:**
1. If one of the `candidates` IS the entity you meant → use that candidate's `entityId`
   directly (do not call `mention-entity` again).
2. If it is genuinely a new entity → re-call `mention-entity` with the same args plus
   `"force": true`.
3. If you cannot decide → ask the player out-of-character, then do 1 or 2.

**Never** pass `entityId: null` downstream (e.g. into `register-fact`) — it will fail
validation. If your code does `result.entityId` unconditionally after `mention-entity`,
add the `needsAdjudication` branch first. This is the only result-shape change in 0.1.0.

### 1.2 CHECK — default embeddings chain is now Google-only

The default router config's embeddings chain was `Google text-embedding-004 (768) →
Mistral mistral-embed (1024)`. The Mistral fallback is **removed**: a fallback that
changes vector dimension poisons the vector store on failover. Decision table:

| Your situation | Action |
|---|---|
| `GOOGLE_GENAI_API_KEY` is set, DB created with dim 768 | Nothing — default config works. |
| Only `MISTRAL_API_KEY` is set (you relied on the fallback) | Provide `--config <file>` with Mistral as the embeddings **primary**, `"embeddingDim": 1024` on its ref. Example below. |
| Your DB was created with dim 1024 (old CLI default) | Same as above — your vectors are 1024 (Mistral); pin Mistral as primary. The DB keeps working; the dim is remembered. |
| You don't want embeddings at all | Init new campaigns with `--embedding-dim 0`; resolution becomes alias-only (see 1.3). |

Mistral-primary config file (`sneq-config.json`, pass via `--config`):

```json
{
  "router": {
    "tiers": {
      "heavy":  { "primary": { "provider": "openai-compatible", "baseUrl": "https://api.deepseek.com/v1", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "deepseek-chat" }, "fallbacks": [] },
      "light":  { "primary": { "provider": "openai-compatible", "baseUrl": "https://api.mistral.ai/v1", "apiKeyEnv": "MISTRAL_API_KEY", "model": "mistral-small-latest" }, "fallbacks": [] },
      "embeddings": { "primary": { "provider": "openai-compatible", "baseUrl": "https://api.mistral.ai/v1", "apiKeyEnv": "MISTRAL_API_KEY", "model": "mistral-embed", "embeddingDim": 1024 }, "fallbacks": [] }
    }
  }
}
```

Note the `embeddingDim` field on the embeddings ref: it is how `init-campaign` derives
its default dim from your config, and how the router rejects mixed-dim chains.

### 1.3 IMPROVED — `--embedding-dim` is only needed at init now

Existing databases remember their dimension: every command except `init-campaign` adopts
the stored dim automatically. If your invocations pass `--embedding-dim` on every call
(the old code forced you to), you can delete the flag everywhere except `init-campaign` —
keeping it is also fine as long as it matches the stored value (a mismatch is a clear
exit-1 error, not corruption).

For **new** campaigns, the init default changed: it derives from the config's embeddings
primary (**768** with the default config — the old hardcoded 1024 contradicted the 768
default provider and broke on the first write). If your config has no `embeddingDim`
metadata, `init-campaign` without the flag now exits 1 asking for an explicit value
instead of guessing.

`--embedding-dim 0` is now valid: no vectors, no `sqlite-vec` needed, alias-only
resolution. In that mode, register aliases eagerly — they are the entire lookup surface.

### 1.4 Compatible / additive (no action needed)

- **Database files**: opened DBs are migrated automatically (one additive
  `ALTER TABLE entities ADD COLUMN description`). No export/import, no re-init.
- **Legacy args**: `sceneId` in `lookup-entity` / `mention-entity` args is ignored
  (silently stripped), not rejected. Scene context now reaches the disambiguation judge
  automatically from the current scene — keep `set-scene` up to date.
- **Entity payloads** (`get-entity`, `prepare-turn`, candidates) now include a
  `description` field. Additive; ignore it or use it.
- **`mention-entity` args** accept optional `"force": true` (see 1.1).
- **Errors got more useful**: provider-exhausted messages now include per-attempt details.
- **Latency note**: the router now actually retries (default: 1 retry on
  QUOTA/SERVER/TIMEOUT/NETWORK with exponential backoff), so a failing call can take
  longer before erroring than in 0.0.x. Exit codes and the JSON-on-stdout contract are
  unchanged.
- **Re-read the skill file**: `skills/sneq-narrative-engine.md` changed (adjudication
  flow, degraded mode, collapse removal). If your agent loads it at session start,
  refresh your copy after pulling.

### 1.5 Upgrade procedure (agent-executable)

```bash
cd <sneq-narrative-system checkout>
git pull
pnpm install && pnpm build          # 528 tests: pnpm test (optional but recommended)
# Probe an existing campaign WITHOUT --embedding-dim (must succeed and show the stored dim):
sneq-engine campaign-exists --db <your.db> --campaign <id>
# Wake-up bundle still works:
sneq-engine prepare-turn --db <your.db> --campaign <id>
```

Then update your own call sites per 1.1 (mandatory) and 1.2 (if Mistral-only), and
refresh your copy of the skill file.

---

## 0.1.0 — in-process consumers (TypeScript `import "sneq-engine"`)

Breaking changes (pre-publish window — nothing on npm consumed 0.0.x):

| Change | Migration |
|---|---|
| `mentionEntity` returns the `MentionResult` union | Narrow on `needsAdjudication` before using `entityId`. |
| `lookup`/`mention` lost `sceneId`; `MentionInput` gained `force?` | Delete the arg; scene context is automatic from `currentScene()`. |
| `RouterConfig.tiers.embeddings` is optional; `RouterDeps.resolveProvider` may return a `Promise` | Existing sync fakes/configs remain valid (union types). Omit the embeddings tier for keyless mode. |
| `asContraintId`/`ContraintId` → `asConstraintId`/`ConstraintId` | Rename. |
| `SqliteRepositoryOptions.embeddingDim` is optional | Omit to adopt the stored dim; `0` = no vectors. |
| zod peer is v4 | If you import `toolSchemas` (zod objects), you need zod ^4. JSON Schemas (`toolJsonSchemas`) are zod-free. |
| Advertised tool sets are 10 tools (`ADVERTISED_TOOL_NAMES`, now equal to `ToolNames`) | `collapse_attribute` is gone from every surface (see the unreleased section above); the dispatcher rejects it as an unknown tool. |
| Writes throw `SneqCampaignNotFoundError` for never-created campaigns | Create campaigns before writing (you should already). |

New capabilities worth adopting: `sneq-engine/memory` and `sneq-engine/json`
repositories (zero native deps), keyless mode, `Entity.description`, real retries.

---

## Verification matrix

| Check | Command | Expect |
|---|---|---|
| Build is current | `pnpm build && sneq-engine --help` | help lists **18** commands |
| The campaign survived the migration | `sneq-engine doctor --db <db> --campaign <id>` | no check with `"status":"FAIL"` (exit 0) |
| The seam is intact | `sneq-engine --help` | no `get-relevant-facts`, no `register-fact` — there is no unscoped world read |
| Existing DB opens without the dim flag | `sneq-engine campaign-exists --db <db> --campaign <id>` | `{"exists":true,…,"embeddingDim":<stored>}` |
| Migration applied | `sneq-engine get-entity --db <db> --campaign <id> --args '{"entityId":"<known>"}'` | entity JSON (with `description` null/absent for old rows) |
| Adjudication handled | trigger an ambiguous `mention-entity` in a test campaign | your code branches on `needsAdjudication` instead of using `null` |
| Embeddings path | `sneq-engine mention-entity … ` on a vector campaign | no dim-mismatch error; if `PROVIDER_ERROR`, revisit §1.2 |
| Standing is host-only (0.6.0) | commit a bundle whose `holders[]` re-sends an existing holder with a different `standing` | `SneqValidationError` naming `upsert-holder`, and the ledger unchanged — no event, no clock advance |
| The host still owns it (0.6.0) | `sneq-engine upsert-holder --db <db> --campaign <id> --args '{…,"standing":0.9}'` then `sneq-engine doctor …` | the write lands; standing is not model-writable, it is not read-only |
| Gravity is counted (0.6.0) | `sneq-engine doctor --db <db> --campaign <id>` | a `gravity-distribution` check is present; `WARN` on it does not change the exit code |

Spec with full rationale: `docs/superpowers/specs/2026-06-10-sneq-plug-and-play-hardening-design.md`.
