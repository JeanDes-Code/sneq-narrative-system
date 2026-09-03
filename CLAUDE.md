# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`sneq-engine`, published on npm. A bookkeeping library for AI-narrated games. It tracks canonical entities, facts, scenes and turns, resolves new mentions against the existing world, and refuses to let the model fork canon. It never writes prose. The host owns the prompt and the LLM call.

ESM only, Node 20+, one hard dependency (`zod`). SQLite, the Anthropic SDK and the Google SDK are optional peers, lazy-loaded. The core import must never touch them.

## Commands

```bash
pnpm install --frozen-lockfile   # better-sqlite3 builds a native binary (pnpm-workspace.yaml allows it)
pnpm test                        # vitest, unit only (test/integration/** excluded)
pnpm test:watch
pnpm typecheck                   # tsc --noEmit over src + test
pnpm build                       # rm -rf dist && tsc -p tsconfig.build.json
pnpm docs:build                  # typedoc + scripts/build-api-md.mjs → docs/api.md
SNEQ_INTEGRATION_SMOKE=1 pnpm test   # adds the integration smoke; needs real provider keys
```

One test file, or one test by name:

```bash
pnpm vitest run test/core/commit-narrative.test.ts
pnpm vitest run -t "refuses a bundle that re-prices"
```

No lint script exists. Strictness comes from `tsconfig.json`: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`. Typecheck is the lint.

## Before a PR

CI runs typecheck, build, test on Node 20 and 22, then regenerates `docs/api.md` and fails on any diff. So:

- Run `pnpm docs:build` and commit the result whenever the public API moves. The script is `docs:build`, not `docs` (`pnpm docs` is npm's own command and exits 0 doing nothing useful).
- Re-export anything new and public from `src/index.ts`. Typedoc only sees what that file exports.
- One PR per change. Jean gates every merge. A git tag means "this commit is a release"; publishing to npm is a separate act Jean does by hand.
- A version bump touches three places: `package.json`, `SNEQ_ENGINE_VERSION` in `src/index.ts`, and the literal in `test/smoke.test.ts` under "exports version constant". Miss one and `pnpm test` fails on the mismatch.

## Architecture

The turn pipeline is the contract. The ten tools and the 18 CLI commands are bindings of it. Read `README.md` "Architecture" for the pipeline letters A to H.

**Three layers, strictly ordered.**

1. `src/domain/` holds branded IDs and data types. No logic.
2. `src/core/` is pure. Every function takes gathered state and returns a decision. Nothing in here touches a repository or a network. `decideCommitNarrative` in `src/core/commit-narrative.ts` is the rule set for the single write.
3. `src/atomic/` executes those decisions inside a repository transaction. `src/atomic/commit-narrative.ts` is gather, then decide (core), then write.

The split exists so an out-of-tree store (a Convex adapter, say) can run the same rules inside its own transaction. `sneq-engine/atomic` exports the decisions for that reason. Do not let repository calls leak into `src/core/`.

**The ledger is append-only.** Events, records, carriages, carriage effects, holders, inventions and invention transitions only get appended. `CanonicalAttribute` is a deterministic fold over the ledger. The repository contract has no event mutation method, and the contract test asserts that absence. Do not add one.

**Beliefs are never stored.** `deriveBeliefs` in `src/core/derive-beliefs.ts` is a pure function of the ledger plus today's day. There is no cache. Cost grows with ledger size, and `doctor` says so.

**The perspective seam.** `getHolderContext` is the only read of world knowledge, and it is always somebody's. There is no "what is true" call on the tool surface. `assertContainment` checks a composed prompt against that guarantee before the model call.

**The model must not write effects.** This is the recurring theme of 0.5.x and 0.6.0. Values the model supplies that change engine behaviour are either derived by the engine, refused loudly, or counted by `doctor`. The pattern for a refusal: fail-closed, whole bundle rejected, nothing written, `SneqValidationError` names the corrective call. See `CHANGELOG.md` for the `standing` and invention-token cases. #52 (a caller-supplied `PLAYER_UPTAKE` passed the merge) was another instance.

**Repository contract.** `src/repository/interface.ts` is the interface. Three adapters ship: `sqlite/` (better-sqlite3 + sqlite-vec), `memory/`, `json/`. `test/repository/contract.ts` and `ledger-contract.ts` are the shared suites. A new adapter is done when they pass. Each adapter test file just calls `repositoryContract(name, factory)`.

**Resolver cascade.** `src/resolver/`: alias, then vector, then LLM judge, then user prompt. With no embeddings tier (`embeddingDim: 0`) the vector rung disappears. This keyless mode is what most real deployments run. Test with it, not only with the full cascade.

**Router.** Three tiers: `heavy`, `light`, optional `embeddings`. Each tier is primary plus fallbacks with retry and backoff. Defaults in `src/router/defaults.ts` exclude OpenAI and xAI on purpose. The embeddings tier has one provider because the vector store is locked to one dimension per database.

**Facade.** `src/engine.ts` is `Engine`. `engine.campaign(id)` returns a `CampaignContext` (`src/campaign.ts`) that carries every tool method. `src/tools/dispatcher.ts` maps tool-call names to those methods, and `src/tools/schemas.ts` is the Zod source of truth for the tool arguments.

**CLI.** `src/cli.ts` plus `src/cli/`. One line of JSON on stdout per call, errors included. Exit 0 success, 1 user or validation error, 2 internal. `--holder`, `--entity` and `--days` are the only flags outside `--args`.

## Where the design lives

- `docs/tech/9-sneq-v04-stratified-knowledge-spec-2026-08-06.md` is the design of record for the ledger, beliefs, carriages and containment. Section numbers cited in code comments (§5.1, §7.2, §11) refer to it.
- `docs/tech/11-post-050-followups-2026-08-15.md` is the latest hand-off. Written for a session with no context.
- `docs/superpowers/specs/` and `plans/` are the earlier V2 design and build plans.
- `SNEQ/` is the v1 concept, in French. The vocabulary (`PERSONNAGE`, `Potentialite`, `GCN`, `nomConnu`) comes from there. Keep those identifiers as they are.
- `skills/sneq-narrative-engine.md` ships in the npm package. It tells an agent when to call which tool. Update it when tool semantics change.
- `UPGRADING.md` says what a consumer must do per version. `CHANGELOG.md` says what changed. Both ship in the package.

## Conventions worth knowing

- Tests mirror `src/` under `test/`. The concurrency and pipeline tests at `test/` root drive the facade end to end with the memory adapter.
- `test/fixtures/replay-provider.ts` is a scripted `Provider` for router tests that must not touch the network.
- Issues and code comments cite each other by number (#20, #25, #29). Keep the habit. When you fix a claim made in a comment, fix the comment too.
- `*.db` and `*.sqlite` are gitignored. Use `:memory:` in tests.
