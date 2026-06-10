---
title: SNEQ Plug-and-Play & Robustness Hardening — Design
date: 2026-06-10
status: approved
author: Jean Desauw (review + decisions with Nemo/Fable-5)
depends-on:
  - 2026-05-19-sneq-v2-engine-design.md
  - 2026-05-20-sneq-cli-design.md
  - 2026-05-21-sneq-defensive-features-design.md
language: en
---

# SNEQ Plug-and-Play & Robustness Hardening — Design

## TL;DR

V2 alpha failed its first adoption test: the pilot consumer app declined integration and
documented why in its ADR 0002 — *"non publié sur npm, better-sqlite3 natif, embeddings qui
demandent des clés supplémentaires — une taxe d'intégration disproportionnée pour un proto."*
This spec removes the integration tax and fixes the robustness flaws found in the 2026-06-10
review, without changing the SNEQ model itself. Sequenced **before** the meta-layer spec
(2026-05-25), which builds on an installable foundation.

## 1. Problems being fixed

### Adoption blockers (Tier 1)

| # | Problem | Evidence |
|---|---|---|
| 1 | Importing `@sneq/engine` requires BOTH optional SDK peers — `router.ts` statically imports the anthropic/google providers, which statically import their SDKs. `peerDependenciesMeta.optional` is currently false in practice. | `src/router/router.ts:7-8`, `providers/anthropic.ts:1`, `providers/google-genai.ts:1` |
| 2 | Embeddings are mandatory in the core write path: `mentionEntity` always embeds, resolver L2 always embeds, `createCampaign` requires a dim. Zero-key operation is impossible; DeepSeek (the pilot app's provider) has no embeddings endpoint at all. | `src/campaign.ts:97`, `src/resolver/resolver.ts:76` |
| 3 | The `Repository` seam has one adapter (SQLite + sqlite-vec, both native). One adapter = hypothetical seam; no path for Next.js/serverless/zero-native consumers. | `src/repository/` |
| 4 | zod v3 + `zod-to-json-schema` while consumers are on zod v4 (the pilot app uses `z.toJSONSchema` natively). zod is exposed in the public API → version coupling leaks. | `package.json`, `src/tools/json-schema.ts` |
| 5 | Not published; `asContraintId` typo would freeze into the public API. | `src/domain/ids.ts:12` |

### Robustness flaws (Tier 2)

| # | Problem | Evidence |
|---|---|---|
| 6 | Default embeddings chain mixes dims (Google 768 → Mistral 1024) against a single-dim vec table; CLI `init-campaign` defaults to 1024 vs. the 768 primary → default happy path breaks on first write. Bonus bug: every non-init CLI call on a non-1024 DB must repeat `--embedding-dim` or `ensureVecTable` throws. | `src/router/defaults.ts:20-24`, `src/cli.ts:52`, `src/repository/sqlite/vec.ts:17` |
| 7 | `collapse_attribute` is advertised to the model in every adapter set but always throws. | `src/tools/adapters.ts`, `src/campaign.ts:152` |
| 8 | Google provider silently drops `tools` (always `toolCalls: []`) and `responseFormat` — and it's heavy-fallback #1 and light-primary. | `src/router/providers/google-genai.ts` |
| 9 | `maxRetries`/`backoff` declared in `RouterConfig`, set in defaults, never read. | `src/router/router.ts` |
| 10 | Judge failure forks canon: malformed judge JSON → resolve returns no match → `mentionEntity` silently creates a duplicate. No retry, no adjudication escape hatch. | `src/resolver/judge.ts:36`, `src/campaign.ts:92-95` |
| 11 | `mention_entity`'s required `description` is embedded then discarded — `Entity` has no description field. The judge and `get_entity` can never show it. | `src/domain/entity.ts`, `src/campaign.ts:96-104` |
| 12 | `resolveEntity` facade accepts `sceneId` and drops it; never passes `sceneDescription` — the judge always sees "(none)" via the tool path. | `src/campaign.ts:55-61` |
| 13 | No `busy_timeout` pragma; `Repository.transaction()` exists but `registerFact` (check-then-append) and `setScene`/`advanceTurn` (double writes) don't use it. | `src/repository/sqlite/index.ts` |
| 14 | Phantom-campaign writes: `engine.campaign(id)` never checks existence (CLI does, library doesn't); schema declares zero FOREIGN KEYs so the `foreign_keys = ON` pragma is a no-op. | `src/engine.ts:53`, `src/repository/sqlite/migrations.ts` |

### Tier 3
- Bless "one DB per campaign" (vec prefilter `LIMIT topK*10` degrades on shared DBs).
- README/skill-doc updates for everything above; regenerate `docs/api.md`.

## 2. Locked decisions

| # | Decision |
|---|---|
| 1 | **Lazy provider loading.** `RouterDeps.resolveProvider` returns `Provider \| Promise<Provider>`; `createDefaultDeps` dynamic-imports the anthropic/google provider modules only when a config references them. Missing peer → `ProviderHttpError("UNSUPPORTED", …)` naming the package to install; it falls through the chain and surfaces in `RouterExhaustedError.attempts`. `openai-compatible` and `custom` stay static (zero-dep). |
| 2 | **Embeddings become optional end-to-end.** `RouterConfig.tiers.embeddings?` is optional. `Engine` builds a `null` embedder when absent. Resolver with `embedder: null` skips L2/L3-from-vector (alias-only); `suggestExisting` falls back to alias lookup; `mentionEntity` stores `embedding: null`. `embeddingDim: 0` on a campaign means "no vectors". Zero keys = engine fully functional, alias-grade resolution. |
| 3 | **Judge calls never throw out of the resolver.** `judgeMatch` failures (router exhausted, network) are caught and mapped to an ambiguous non-match with reasoning `judge unavailable: …`. Combined with #2 this makes keyless operation non-throwing. |
| 4 | **Judge retries once** on malformed JSON with a stricter instruction and code-fence stripping; second failure → `matchedIndex: null`. |
| 5 | **`mentionEntity` refuses to create on ambiguity.** When resolution is `ambiguous` with live candidates and `force` is not set, return `{ entityId: null, isNew: false, needsAdjudication: true, candidates }` instead of silently creating. New optional `force: boolean` on the tool schema bypasses after adjudication. |
| 6 | **`Entity.description?: string` is persisted** (SQLite migration v2, additive `ALTER TABLE`). Judge prompt and `get_entity`/`prepare-turn` carry it. `mention_entity` input is unchanged (it already requires `description`). |
| 7 | **Scene context flows to the judge.** `CampaignContext.resolveEntity` reads `currentScene()` and passes `scene.description` as `sceneDescription`. The dead `sceneId` arg is removed from `lookup_entity` and `mention_entity` schemas + signatures (pre-publish window). |
| 8 | **Two new zero-native Repository adapters**: `InMemoryRepository` (brute-force cosine vector search, snapshot/rollback transactions via `structuredClone`) exported at `@sneq/engine/memory`, and `JsonFileRepository` (extends in-memory, write-through atomic tmp+rename persistence) at `@sneq/engine/json`. A shared **contract test suite** runs against all three adapters — the interface is the test surface. |
| 9 | **SQLite dim handling becomes lazy and self-describing.** `sqlite-vec` loads via `createRequire` only when a campaign with `embeddingDim > 0` exists/is created (so `@sneq/engine/sqlite` no longer hard-requires sqlite-vec). `SqliteRepositoryOptions.embeddingDim` becomes optional: existing DBs adopt their stored dim (kills the "repeat `--embedding-dim` on every CLI call" bug); fresh DBs defer vec-table creation to `createCampaign`. Vector writes/searches validate vector length against the stored dim with an actionable error. |
| 10 | **Default embeddings chain is single-provider** (Google `text-embedding-004`, annotated `embeddingDim: 768`; the 1024-dim Mistral fallback is removed). New `ProviderRef.embeddingDim?: number` metadata; Router constructor rejects embeddings chains with conflicting declared dims. CLI `init-campaign` derives its default dim from the config's embeddings primary (768 with default config; 0 when no embeddings tier; explicit `--embedding-dim` always wins; chain present but un-annotated → explicit flag required). |
| 11 | **Retries implemented as declared**: per-provider retry loop honoring `defaults.maxRetries` (retryable codes: QUOTA, SERVER, TIMEOUT, NETWORK; AUTH disables the provider) with exponential/fixed backoff from `defaults.backoff`. Fresh `AbortController` per attempt. |
| 12 | **Google provider implements function calling and JSON mode** (`functionDeclarations`, `responseMimeType: "application/json"`, `response.functionCalls()` mapping). |
| 13 | **`collapse_attribute` is de-advertised**: new `ADVERTISED_TOOL_NAMES` (10 tools) feeds all four adapter sets; `ToolNames`/dispatcher keep it for forward compat; CLI `collapse-attribute` returns a clean `NOT_IMPLEMENTED` (exit 1) instead of `INTERNAL_ERROR` (exit 2). |
| 14 | **Campaign existence is enforced in the library path**: `CampaignContext` lazily verifies the campaign exists on first mutating call (`SneqCampaignNotFoundError`, mapped to `CAMPAIGN_NOT_FOUND` in the CLI). No SQLite FK rewrite (table rebuilds not worth it). |
| 15 | **Atomicity**: `busy_timeout = 5000` pragma; `registerFact`, `setScene`, `advanceTurn` run inside `repo.transaction`. |
| 16 | **zod v4** across the board; `zod-to-json-schema` dropped for native `z.toJSONSchema()` (`$schema` key stripped). `z.record(z.unknown())` → `z.record(z.string(), z.unknown())`. |
| 17 | **Rename `ContraintId`/`asContraintId` → `ConstraintId`/`asConstraintId`** (ID names are English; FR domain nouns like `Contrainte` stay). |
| 18 | **Version 0.1.0**, exports map gains `./memory` and `./json`. Publish-readiness verified by a `pnpm pack` + install-in-tmp-without-peers smoke (import `@sneq/engine` and `/memory` with only the real deps present). Actual `npm publish` stays manual (Jean's account). |

## 3. Out of scope

- Postgres/Convex adapters, HTTP/MCP gateway, full `collapseAttribute`, local embedding models, telemetry sinks (no second adapter exists for any of those seams).
- The meta-layer spec (2026-05-25) — lands after this.
- `EntityID` → `EntityId` capitalization normalization (cosmetic churn across ~30 files; revisit pre-1.0).
- Pilot-app-side integration adapter (lives in the pilot repo, per its ADR 0002).

## 4. Consumer impact

Breaking changes are acceptable pre-publish (nothing consumes the lib yet besides Hermes via CLI, which keeps its contract):

- `RouterDeps.resolveProvider` may return a Promise (union type — existing sync fakes stay valid).
- `lookup_entity`/`mention_entity` lose the dead `sceneId` arg; `mention_entity` gains `force`.
- `mentionEntity` return type becomes a union with the `needsAdjudication` arm.
- `asContraintId` → `asConstraintId`.
- CLI: `--embedding-dim` accepts 0; flag no longer needed after init; `collapse-attribute` exits 1 with `NOT_IMPLEMENTED`.
- Advertised tool sets shrink from 11 to 10 (`collapse_attribute` hidden).

## 5. Next step

Implementation plan: `docs/superpowers/plans/2026-06-10-sneq-plug-and-play-hardening.md` (TDD, bite-sized tasks, one commit per task), executed on branch `feat/plug-and-play-hardening`, landing as a single PR.
