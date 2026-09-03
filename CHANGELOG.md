# Changelog

Notable changes per release. Migration steps live in [`UPGRADING.md`](./UPGRADING.md) —
this file says *what* changed, that one says *what to do about it*.

Versions follow semver with the pre-1.0 caveat: a minor bump may break.

## 0.6.1 — the model stops writing its own uptake

### Breaking

- **`commit_narrative` refuses a caller-supplied `PLAYER_UPTAKE`**
  ([#52](https://github.com/JeanDes-Code/sneq-narrative-system/issues/52)).
  `PLAYER_UPTAKE` is the one promotion kind the engine derives itself:
  `detectUptake` searches `playerUtterance` for each provisional invention's
  `surfaceTokens`. The comment above the merge said a caller could not fake it
  past that detection. It could. The merge deduped by `inventionId` only and
  never read the kind, so a hand-written `PLAYER_UPTAKE` for an invention the
  engine did not detect passed straight through.

  It did not widen what can be promoted. `decidePromotion` never reads the kind
  either, so a faked `PLAYER_UPTAKE` promoted exactly what a truthful
  `WORLD_CONSEQUENCE` would. What it corrupted is the audit trail: the
  `InventionTransition` recorded a promotion route that never happened, and
  anything asking *why did this become canon* got a wrong answer. That is the
  model writing an effect, the same class as 0.5.1's token guard and 0.6.0's
  `standing` guard.

  Refusal takes the same posture as both: `SneqValidationError`, fail-closed and
  atomic. One faked entry rejects the whole bundle, a rejected bundle writes
  nothing, and the message names the corrective call. Whether the engine also
  detected uptake for that invention makes no difference; the entry is refused
  either way.

  Breaking for a caller that hand-wrote `PLAYER_UPTAKE` as a convenience. Drop
  the entry and pass the player's raw text as `playerUtterance`; the engine
  derives the evidence. The other three kinds, `WORLD_CONSEQUENCE`,
  `RECONFIRMATION` and `OFFICIAL_RECORD`, are unchanged: only the world can
  witness those, so the caller still supplies them.

## 0.6.0 — the model stops writing its own standing

0.5.0 closed the hole where the model chose what would promote its own
inventions. This closes the other one it left open, and adds the counter that
was missing on the one channel the model *should* own.

Both changes come from [#46](https://github.com/JeanDes-Code/sneq-narrative-system/issues/46),
filed while integrating the engine into a real campaign.

### Breaking

- **`commit_narrative`'s `holders[]` may create a holder, never re-price one.**
  `standing` gates carriage delivery and is 40% of the `socialPosition` salience
  factor. The bundle let a model write it on a holder that **already exists**, so
  a model could raise a holder's standing and thereby hand itself the news the
  `minStanding` gate was withholding. That is the model writing an effect.

  §5.3 already ruled holder authoring a host concern *and then* put holder
  creation in the bundle. Both halves are in the code, and together they undo the
  first. The line now runs between them: create yes, re-price no.
  `campaign.upsertHolder` and the CLI `upsert-holder` command keep full
  authority — nothing about the host path changed.

  Refusal is loud and fail-closed, in the same posture as 0.5.1's invention-token
  guard: one re-priced holder rejects the whole bundle, a rejected bundle writes
  nothing, and the message names `upsert-holder` as the corrective call.

  `standingOverride` is guarded identically. `deriveBeliefs` collapses both
  fields into a single value, so they are one effects channel wearing two field
  names. Two further ways to move that channel are refused too: **erasing** an
  existing override (the upsert writes the whole holder, so omitting the field
  wipes it), and **flipping** an existing holder's `kind`.

  Breaking for a caller that re-sent whole holder records on every turn. A caller
  should catch `SneqValidationError` and drop the holder from the bundle, or move
  the write to `upsertHolder`.

- **`CommitContext.communities` becomes `CommitContext.holders`.** Only affects
  out-of-tree adapters calling the exported `decideCommitNarrative` (§13's Convex
  adapter). It is now `Holder[]` — every holder, not just the groups — and the
  `ALL_KNOWN_COMMUNITIES` targets are derived inside. A pure decision cannot tell
  a creation from an edit against a list it was never handed. The break is a
  compile error, which is the point: an adapter that silently passed the old
  narrow list would have skipped the guard entirely.

### Added

- **`doctor` counts the gravity distribution.** `gravity` is 40% of salience and
  gates all auto-dispatch, and no counter ever looked at the answers. `doctor`
  counted uncovered and unroutable routes but never the distribution that
  produces them.

  This does **not** police it. A 0–3 band is a closed question, which is the
  shape the consuming doctrine licenses, and nothing in the ledger can derive how
  much a thing mattered — that is a narrative judgement and the model is the
  right source for it. So: count it, do not lock it, the move already made for
  `OUT_OF_BAND` and the `public` tag.

  The new `gravity-distribution` check reports the histogram always, and WARNs on
  the two degenerate shapes: **everything at `0`** (dispatch only fires above 0,
  so no carriage ever leaves and the world goes silently deaf — no other counter
  shows this) and **everything at the top band** (every event clears every rule,
  so the fan-out cap chooses who hears what instead of your policy).

  WARN rather than FAIL, deliberately: every FAIL in that file names a corrective
  call, and no call fixes a narrator's judgement — you fix the prompt. The CLI
  exits 1 on FAIL only, so this line is read, never enforced.

  Below 8 events it reports the histogram as `INFO` and judges nothing. Three
  events all at `0` is a quiet afternoon, not a deaf world, and a fresh campaign
  should not open with a warning it cannot act on. `INFO` stays out of the
  roll-up.

### Refused, with reasons

Two asks from #46 were declined and should not be re-opened without new evidence.
**`standing` derived rather than stored**: there is no ledger signal for social
position, and inventing one would mean the engine deciding what raises a person
in the world's eyes — fiction semantics SNEQ owns none of. **`sharedWith` on
`HolderContext`**: it reports another holder's knowledge state, which is the
exact class of thing the seam exists to withhold, and it is O(holders at place ×
ledger) on every read. If wanted later it should be an explicit opt-in call, not
a field riding every read.

## 0.5.1 — the model stops choosing its own promotion trigger

A patch, and one of the three is a real hole in 0.5.0's central claim.

### Fixed

- **An invention's `surfaceTokens` are validated at commit** ([#46](https://github.com/JeanDes-Code/sneq-narrative-system/issues/46)).
  Those tokens are the alphabet `detectUptake` searches the player's utterance
  for, and a match promotes the invention into canon. They arrive from the
  model, and nothing looked at them — so the model chose the string whose later
  appearance would make its own invention true. An invention tagged `"le"` was
  promoted by the next French sentence the player typed.

  Two guards, because neither catches the other's case. **Provenance**: the
  token must occur in `sourceNarration`, so it can only be something the player
  actually read. **Distinctiveness**: it must not be a stopword or a fragment,
  reusing the 204-entry list already in `core/stopwords.ts`. Provenance alone
  does not close it — `sourceNarration` is model-supplied too, and `"le"` occurs
  in nearly all French prose, so it passes a presence check trivially.

  This raises the floor; it does not make the channel safe. A common noun that
  is not a stopword still passes, and catching that needs a frequency model the
  engine does not have. The durable answer is to stop detecting uptake from raw
  prose at all.

  Breaking for a caller that was sending junk tokens — deliberately, and in the
  same posture as the event-side check it mirrors. Note the rejection is
  **fail-closed and atomic**: one bland token rejects the whole bundle, not just
  the offending invention. That is the right direction for a field whose
  permissive default created the hole, but a caller should catch
  `SneqValidationError` and re-ask rather than let it surface.

- **The forbidden set drops tokens that cannot carry a secret** ([#46](https://github.com/JeanDes-Code/sneq-narrative-system/issues/46)).
  The same list, on the containment side. Model-supplied `surfaceTokens` reach
  the forbidden set from events and records too, and a record's `key` and
  `value` join it automatically — none of those paths checked distinctiveness.
  One `"le"` on one event forbade the commonest word in French for every holder
  who had not learned that event: `assertContainment` threw on harmless
  payloads, and `filterTranscript` dropped legitimate entries **in silence**.

  Filtered at read time rather than rejected at commit, deliberately. A record
  key like `"age"` is legitimate data that merely makes a poor token, and
  filtering also repairs campaigns whose ledgers already hold such tokens.
  Removing them cannot leak — a stopword conveys nothing, which is what makes
  it a stopword.

  It does mean an entity whose *entire* name is a stopword or two letters long
  is not protected by substring containment. It never was: blocking every
  payload containing `"or"` is refusal to answer, not protection.

- **`build` now cleans first.** `tsc` never removes outputs whose source has
  been deleted, so `dist/` accumulated orphans across releases and `npm pack`
  carried them. The 0.5.0 tarball came within one command of shipping
  `dist/core/propagation.js` — the machinery its own README says was removed.
  `prepublishOnly` runs `build`, so it inherits the clean.

- **Peer ranges no longer freeze the minor.** `^0.30.0` means `<0.31` for a `0.x`
  package, so `@anthropic-ai/sdk` was bounded against `0.117.1` published, and
  `@google/generative-ai` against `0.24.1` — an `ERESOLVE` for any consumer on a
  current SDK. Both widened to `>=x.y.0 <1`. The providers use only
  `messages.create`, `getGenerativeModel` and `embedContent`, stable across the
  range. Present since 0.3.0, not a 0.5.0 regression.

## 0.5.0 — stratified knowledge

The release the whole `v0.4` design work was for. One breaking release; there is no
0.4.0, and no migration window.

Design of record: [`docs/tech/9-sneq-v04-stratified-knowledge-spec-2026-08-06.md`](./docs/tech/9-sneq-v04-stratified-knowledge-spec-2026-08-06.md).
Build order: [`docs/tech/10-v05-build-handoff-2026-08-14.md`](./docs/tech/10-v05-build-handoff-2026-08-14.md).

### The change in one paragraph

Knowledge stopped being global. An event happens at a place on a world **day**; whoever
was there witnesses it; everybody else learns it only when news physically reaches them,
along a declared route, at a declared speed, subject to standing and realm borders. So
there is no longer any call that answers *what is true* — every read of world knowledge is
for a named **holder**, and a character cannot leak a fact the API never handed over.

### Added

- **The turn pipeline (§11)**, on `CampaignContext`: `ingestPlayerInput`,
  `getHolderContext`, `renderContextBlock`, `filterTranscript`, `assertContainment`,
  `validateNarration` (holder-aware), `commitNarrative`, `advanceTurn({ days })`.
- **`sneq__get_holder_context { holderId | entityId, about?, topK? }`** — the only read of
  world knowledge, and it is always somebody's. The `entityId` form runs the resolution
  cascade in the engine and names the road it took.
- **`sneq__commit_narrative`** — the whole turn as one atomic bundle, idempotent by
  `operationId`. Replaces five order-sensitive writes in an agent loop.
- **A ledger**: events, official records, holders, carriages, carriage effects, provisional
  inventions and invention transitions. Append-only — the repository contract exposes no
  mutation method, and the contract test asserts the absence of one.
- **`CanonicalAttribute` as a deterministic fold** over that ledger, with exactly three
  producers: an act's explicit `sets`, a promoted invention, and migrated legacy facts.
  `rebuild(ledger) === projection` is a contract test.
- **A world clock.** `commit_narrative.daysElapsed` is required; `advance_turn --days` moves
  it out of band.
- **`sneq-engine doctor`** — a conformance checklist that says *why* a campaign is
  misbehaving. Exits 1 on a FAIL so a wrapper can gate on it.
- **Four CLI commands**: `doctor`, `upsert-holder`, `show-dispatch-policy`,
  `set-dispatch-policy`. Plus `--holder`, `--entity`, `--days`, and `--source out-of-band`.
- **`setEmbeddingDim` + `reindexEmbeddings`** on the repository contract — moving a campaign
  between embedding dimensions is a supported migration instead of "start a new campaign".
- **The public-token exemption.** Tag an entity `public` and its *name* stops being withheld
  by the containment floor. What happened to it is still withheld.
- **New errors, each with its own CLI exit code**: `SneqUnknownHolderError`,
  `SneqEmbeddingDimError`, and `SneqContainmentError` on the CLI as `CONTAINMENT_VIOLATION`.

### Changed

- **`sneq__get_entity` returns identity only** — and now says so. It never returned
  attributes; the description claimed it did, and agents believed it.
- **`sneq__add_constraint` requires a `role`.** 0.3 hardcoded `INFERENCE_IA` for every
  constraint, which left `REGLE_MONDE` with no producer at all. Constraints are now read for
  real: they gate invention promotion.
- **`sneq__validate_narration` can block.** Its report gains a `verdict` of `PASS` /
  `REPAIR` / `BLOCK`, an optional containment result, and a `repairHint`. `strict` is read
  for the first time — it was accepted at the schema and the hook and consulted nowhere.
- **`prepare-turn` returns the frame only** when no holder is named: day, turn, scene,
  present entities by identity. Add `--holder`/`--entity` for that holder's knowledge.
- **A canon-contradicted invention is silently rejected.** No error, no interrupt. Replacing
  a value on a key is state evolution, not a conflict — history lives in the ledger.
- **Promotion is detected by the engine.** Pass the player's raw text as
  `commit_narrative.playerUtterance`; caller-supplied `PLAYER_UPTAKE` evidence cannot
  outrank the detection that runs at commit.
- `advanceTurn(summary)` → `advanceTurn({ summary?, days? })`, returning `worldDay` and a
  world-health report.
- The skill file was **rewritten, not updated**, including its frontmatter `description` —
  the routing trigger that decides whether an agent loads it at all.

### Removed

- **`sneq__get_relevant_facts`** — the omniscient read. Keeping it would have made the whole
  seam decorative.
- **`sneq__register_fact`** — it asked a stochastic process to invent a stable
  `attributeKey` across a 400-turn campaign, and let GM narration walk into canon unchecked.
- **`AttributFige`**, with no alias. Use `CanonicalAttribute`; the old shape survives only
  as `LegacyFact`, the migration's read type.
- **`Repository.appendFact` / `getFigedAttributes` / `queryFacts`** and `FactQuery`.
- **`propagate`** and its types. Constraint propagation through the relation graph had zero
  call sites. A character reacts when they *learn*, which is what the belief layer models.
- `decideRegisterFact` and the `RegisterFact*` types from `sneq-engine/atomic`. Use
  `decideCommitNarrative`.

### Fixed

- **A migrated 0.3 campaign was never bootstrapped** — no default realm entity, no default
  group, so the holder cascade had no floor and nothing could be derived for anybody. A
  migrated campaign was unplayable. Found by the `doctor` gate during the build.
- **`operationId` now does what the docs always said.** It was written seven times and read
  zero, while being documented as shipped idempotency. `commit_narrative` is idempotent on
  it for real, through a bounded per-campaign ring.

### Migration

SQLite schema v6, JSON save format v2, both automatic on open and neither additive:
`figed` becomes `canonical_attributes`, per-entity day-0 events are synthesized, observation
blobs are rewritten, and constraints are audited for value-type coherence (findings flagged,
never auto-fixed, never deleted). **The migration never runs twice — back up your file.**

Full steps, including the out-of-tree Convex work: [`UPGRADING.md`](./UPGRADING.md).

## 0.3.1 — honest surface

Tagged for history; **never published to npm**. 0.5.0 overtook it, and publishing a package
whose skill file and tool descriptions break days later would have been the exact confusion
0.5.0 exists to clean up.

No new features. This release made the package stop claiming things it did not do.

### Changed

- **Breaking, deliberately:** the tools that take an `EntityID` now reject a value this
  campaign does not know, throwing `SneqUnknownEntityError` (CLI: `ENTITY_NOT_FOUND`, exit
  1). `EntityID` is a compile-time brand, so nothing checked it at runtime: a model typing
  `"la taverne du Cerf"` into an id field was accepted, the scene was declared with nobody
  in it, every later read came back empty, and no error was raised. `sneq__get_entity` is
  untouched — `null` is its honest answer, and an explicit null was never a silent failure.
- **All ten tool descriptions rewritten** to state what they return, what they do *not*
  return, the failure mode the caller must handle, and the call that has to come first.
- **`operationId` documented honestly**: the engine did not deduplicate on it, and the
  built-in strategy ignored the field. The code was right; the docs, including the published
  `docs/api.md`, were wrong.

### Fixed

- `docs/api.md` shipped **795 dead links** into a gitignored directory, and it is in
  `package.json#files`, so a broken copy went to npm. Root cause: the documented `pnpm docs`
  never ran the script — `docs` is one of npm's own commands, so pnpm proxied it and opened
  the homepage in a browser, exit 0. The script is now `docs:build`, it runs in CI, and the
  assembler refuses to write a file containing a dead link.

## 0.2.0

Tagged. See `git log v0.2.0`.

## 0.1.0

First tagged release. See [`UPGRADING.md`](./UPGRADING.md) for the migration notes that
shipped with it.
