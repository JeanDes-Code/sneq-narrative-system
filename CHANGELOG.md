# Changelog

Notable changes per release. Migration steps live in [`UPGRADING.md`](./UPGRADING.md) —
this file says *what* changed, that one says *what to do about it*.

Versions follow semver with the pre-1.0 caveat: a minor bump may break.

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
