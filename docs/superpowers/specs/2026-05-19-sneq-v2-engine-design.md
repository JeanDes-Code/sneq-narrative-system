---
title: SNEQ V2 Engine — Design
date: 2026-05-19
status: approved-for-planning
author: Jean Desauw (brainstormed with Nemo)
supersedes-partially: SNEQ/01..08 (v1 design docs in `SNEQ/`)
language: en
---

# SNEQ V2 Engine — Design Document

## TL;DR

A single TypeScript package, `@sneq/engine`, that ships a **bookkeeping-only narrative engine** built on the SNEQ v1 conceptual model (quantum-state attributes: `INDÉFINI → CONTRAINT → FIGÉ`).

V2 reframes v1 for **turn-based AI-narrated games** (TTRPG apps, Discord GM agents) instead of the real-time RPG framing in v1's chapter 5. The engine doesn't own a GM loop — consumers do. The engine owns: domain (RC + CP + GCN), persistence, entity resolution across sessions, multi-provider AI routing with quota-aware fallback, and a stable tool-call protocol for fact ingestion.

The package ships its own API documentation (`docs/api.md`, generated from JSDoc) and an Anthropic-style agent skill file (`skills/sneq-narrative-engine.md`) so both TypeScript apps and agent runtimes can integrate.

Pre-generation / caching from v1 is **deferred** behind a no-op extension hook. Consumer bindings (TTRPG app, Hermes-Agent) are **deferred** to their own future specs.

---

## 1. Context

`SNEQ/` (in the repo root) contains the v1 design docs (8 markdown files, ~133 KB of spec) describing a "Système Narratif à État Quantique" — a constraint-driven narrative engine where unobserved attributes stay undefined and collapse into permanent facts on player observation.

V1 is conceptually solid but written for a real-time RPG-Maker-style consumer, with an elaborate pre-generation / cache subsystem (chapter 5) optimized for sub-200ms response times. Jean's actual targets are turn-based dialog: a single-player TTRPG app where the AI plays GM, and a Hermes-Agent on Discord acting as GM across a campaign. Both tolerate 2–5 s LLM latency easily and need cross-session persistence as a hard requirement.

V1 also has a meaningful gap Jean flagged in brainstorming: **entity resolution across sessions**. When the player returns to a location three sessions later, or the GM mentions "the blacksmith," the engine must decide whether this is an entity already in the canonical store or a new one. V1 has no machinery for this.

V2 addresses both: it recalibrates for turn-based use, adds an entity-resolution subsystem, and formalizes the provider/fallback abstraction that v1 only hand-waved.

---

## 2. Locked Decisions

| # | Decision |
|---|----------|
| 1 | **Scope**: this spec covers the engine only (domain + router + resolver). TTRPG app and Hermes-Agent bindings are out-of-scope and will get their own future specs. |
| 2 | **Latency model**: turn-based first; real-time pre-generation reachable later via an extension hook, not built in V2. |
| 3 | **Language / runtime**: TypeScript, Node 20+, ESM-first. Single package `@sneq/engine`. |
| 4 | **Persistence**: `Repository` interface + reference SQLite adapter using `better-sqlite3` + `sqlite-vec`. Convex / Postgres adapters are documented as future work, not built. |
| 5 | **Entity resolution**: layered cascade — alias → vector (`sqlite-vec`) → LLM judge (light tier) → user-prompt callback. |
| 6 | **AI routing**: a `Router` abstraction with three task tiers (`heavy`, `light`, `embeddings`), each having `primary` + ordered `fallbacks`. Quota-aware fallback on 429 / auth / 5xx / timeout / malformed-response. |
| 7 | **Engine role**: bookkeeping library, not GM. Consumer owns the GM loop. Engine exposes facts/entities/constraints + a tool-call dispatcher. |
| 8 | **Fact protocol**: LLM tool calls (consumer wires engine-exported tool schemas into their LLM call). |
| 9 | **Multi-tenancy**: single Engine manages many campaigns, scoped via `campaignId`. Facade pattern: `engine.campaign(id).…`. |

Stack rule (carried from `~/.claude/Contexts/about-me.md`): **no OpenAI, no xAI/Grok** — anywhere, ever. Built-in providers exclude both.

---

## 3. Architecture Overview

```
                  ┌─────────────────────────────┐
   consumer  ───► │   Engine (facade)            │
   (Hermes,       │   engine.campaign(id).…      │
    TTRPG app)    └──────┬──────────────────────┘
                         │
       ┌─────────┬───────┼──────────┬──────────┬──────────┐
       ▼         ▼       ▼          ▼          ▼          ▼
  ┌────────┐ ┌─────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌──────────┐
  │ Domain │ │ GCN │ │Resolver│ │ Router │ │Tools │ │Hooks     │
  │RC + CP │ │     │ │cascade │ │tiers   │ │schemas│ │(pre-gen, │
  └────────┘ └─────┘ └────────┘ └───┬────┘ └──────┘ │ extract) │
                                    │               └──────────┘
                              ┌─────┴──────┐
                              ▼            ▼
                        ┌──────────┐ ┌────────────┐
                        │Provider  │ │ Repository │
                        │interface │ │ interface  │
                        └────┬─────┘ └─────┬──────┘
                             ▼             ▼
                       ref. adapters: OpenAI-compatible / SQLite+vec
```

**Public surface**: the `Engine` class. Other classes are internal but importable for advanced consumers.

**Reference adapters** live in subpath exports (`@sneq/engine/sqlite`, `@sneq/engine/openai-compat`) and `peerDependenciesMeta`-mark their backing modules as optional, so a consumer on Convex doesn't pull in `better-sqlite3`.

---

## 4. Core Domain Model

Carries forward unchanged from v1: `Entity`, `AttributFige`, `Potentialite`, `Contrainte`, `NoeudGCN`, `AreteGCN`, the three-state attribute machine (`INDÉFINI → CONTRAINT → FIGÉ`, no reverse), and the v1 attribute / relation taxonomies (`IDENTITE`, `PSYCHOLOGIE`, `HISTORIQUE`, `SOCIAL`, `COMPETENCE`, `SECRET`, `ETAT`, `POSSESSION`; relations `SOCIAL` / `CAUSAL` / `SPATIAL` / `TEMPOREL` / `CONCEPTUEL`).

V2 additions:

| Addition | Purpose |
|---|---|
| `campaignId` discriminator on every persisted record | Multi-campaign isolation in a shared store |
| `Entity.embedding: Float32Array` (lazy, refreshed on material change) | Powers resolver layer 2 |
| `Entity.aliases: Alias[]` upgraded from `string[]` to `{ text, source, observedAt }[]` | Resolver layer 1 + provenance |
| New entity type `SCENE` | Snapshot of "where the player currently is"; bounds context retrieval and propagation |
| `Turn` record (campaign-scoped, monotonic integer) | Replaces v1's wall-clock `GameTimestamp`. In-fiction calendar (day, season, etc.) lives as ordinary attributes on a `WORLD` entity, not in engine bookkeeping. |
| `Observation.source` enum: `GM_NARRATION \| PLAYER_UTTERANCE \| DICE_ROLL \| SYSTEM` | V1 assumed only player-driven observation; turn-based needs to track both directions. |

V1's `Resolution` strategies (`REINTERPRETATION`, `REVELATION`, `RETCON_DOUX`, `REJET`) carry over. State-machine guard remains absolute: a `FIGÉ` attribute is never modified.

---

## 5. Entity Resolution Subsystem

The single biggest v2 addition. The cascade:

```
                 resolveEntity(mention, type?, sceneContext?)
                                  │
                                  ▼
  L1 ──► Alias / canonical-name exact match (case + diacritic normalized)
          │ hit (confidence ≥ 0.95)  ──► return
          │ miss
          ▼
  L2 ──► Vector similarity over Entity.embedding (sqlite-vec ANN)
          │ filter: same campaignId + same type + optional scene-locality boost
          │ top-K = 5
          │ if top1 ≥ τ_HIGH (default 0.88) AND gap to top2 ≥ Δ (default 0.05)
          │     ──► return as confident match
          │ if top1 < τ_LOW (default 0.65)
          │     ──► no plausible candidates ──► return null (treat as NEW)
          │ else (ambiguous band): pass top-K to L3
          ▼
  L3 ──► LLM judge (light tier)
          │ Prompt: "Given mention M in scene S, which (if any) of candidates [c1..ck] is it?"
          │ Returns: best match index or "none" + reasoning
          │ if confident ──► return
          │ if unsure   ──► escalate L4
          ▼
  L4 ──► User-prompt callback (configurable)
          │ Consumer-supplied async fn: askUser({ mention, candidates }) → Entity | null
          │ TTRPG app: shows a UI picker. Hermes: asks the player in-chat.
          │ If consumer didn't register a handler: log warning, treat as new entity.
```

**Result shape**:

```typescript
interface ResolutionResult {
  match: Entity | null
  confidence: number
  candidates: Entity[]    // top-K from L2, even if L1 hit
  layerUsed: "alias" | "vector" | "judge" | "user-prompt" | "none"
  reasoning?: string      // from L3, if invoked
}
```

**Generation-direction resolver** (`suggestExisting`): same machinery, called *before* the GM commits to a new NPC name. Returns `{ candidates, recommendsNew }` so the GM can pick an existing entity instead of accidentally forking canonical reality.

**Embedding refresh policy**:
- Recomputed when a new figé attribute of category `IDENTITE`, `HISTORIQUE`, or `SOCIAL` is added
- Or when ≥ N attributes (default `5`, configurable) have changed since last refresh
- Or explicitly via `engine.recomputeEmbedding(entityId)`
- Always uses the `embeddings` tier (cheap)

**Thresholds (`τ_HIGH`, `τ_LOW`, `Δ`, refresh threshold) are per-campaign configurable** via `EngineConfig.resolver`. Defaults are tuned for cosine similarity normalized to `[0, 1]` over ~50–200 entities per type per campaign; one-shots might want more aggressive auto-matching, long campaigns more conservative. The numeric defaults assume a Gemini-class embedding distribution; if the consumer wires a model with materially different similarity statistics, the defaults may need re-tuning.

---

## 6. Router & Provider Abstraction

```typescript
interface RouterConfig {
  tiers: {
    heavy:      ProviderChain  // collapse generation, narration-grade reasoning
    light:      ProviderChain  // resolver judge, validation, classification
    embeddings: ProviderChain  // entity embeddings
  }
  defaults?: {
    timeoutMs?: number              // default 30_000
    maxRetries?: number             // per-provider before fallback; default 1
    backoff?: { strategy: "exponential" | "fixed"; baseMs: number }
  }
}

interface ProviderChain {
  primary:   ProviderRef
  fallbacks: ProviderRef[]   // tried in order on quota / auth / 5xx / malformed
}

interface ProviderRef {
  provider: "openai-compatible" | "anthropic" | "google-genai" | "custom"
  baseUrl?: string           // for openai-compatible: DeepSeek, Mistral, Together, OpenRouter, Ollama, …
  apiKeyEnv: string          // name of env var holding the key — never the literal key
  model: string              // model identifier (config string; no compile-time enum)
  maxTokens?: number
  temperature?: number
  quotaHint?: {              // optional metadata for the router
    requestsPerMinute?: number
    requestsPerDay?: number
    isFreeTier?: boolean
  }
}
```

**Fallback triggers** (any of these moves to the next provider in the chain):
- HTTP 429 (quota / rate limit)
- HTTP 401 / 403 (auth) — also disables the provider for the remainder of the session
- HTTP 5xx — after the configured `maxRetries`
- Network / timeout — after the configured `maxRetries`
- Malformed response (cannot parse expected shape) — after a single retry

**Provider-disabled state** is per-process, in-memory, lasts until session end (or a configurable cooldown). Not persisted.

**Built-in provider types shipped in V2**:

- `openai-compatible` — covers DeepSeek (`api.deepseek.com`), Mistral (`api.mistral.ai`), Together AI, OpenRouter, Groq inference (the chip company — distinct from xAI Grok), local Ollama (`localhost:11434`), and any future OpenAI-compat endpoint
- `anthropic` — direct Anthropic API via the official SDK
- `google-genai` — Gemini direct (Flash, Pro)
- `custom` — escape hatch: consumer supplies `(req: ProviderRequest) => Promise<ProviderResponse>`

**Explicitly not shipped**: OpenAI, xAI/Grok. Per Jean's stack policy. Note the disambiguation: *Groq* (inference platform, chip company) is fine; *Grok* (xAI's model) is banned.

**Sensible default chain** (returned by `Engine.defaultRouterConfig()`):

- `heavy`: DeepSeek chat → Gemini Pro → Anthropic Haiku (paid floor)
- `light`: Gemini Flash → Mistral small → DeepSeek chat
- `embeddings`: Gemini text-embedding → Mistral embed

The exact model identifier strings (e.g. `"deepseek-chat"`, `"gemini-2.5-flash"`) are configuration values. The engine doesn't pin them in a compile-time enum — the consumer can update strings without bumping the engine version. This matters because provider model versions move faster than the engine release cadence.

---

## 7. Fact Protocol — Tool Call Schemas

The engine exports a stable set of tool definitions consumed by the GM's LLM call. The GM's LLM emits tool calls; the consumer dispatches them through `campaign.handleToolCall(name, args)`.

```typescript
// ── READ ─────────────────────────────────────────────────────────────
sneq__lookup_entity      ({ mention, type?, sceneId? }) → ResolutionResult
sneq__get_entity         ({ entityId }) → EntityFull
sneq__get_relevant_facts ({ entityId, attributeKeys?, depth? }) → AttributFige[]
sneq__suggest_existing   ({ mention, type })   // generation-direction resolver
                           → { candidates: Entity[]; recommendsNew: boolean }

// ── REGISTER ─────────────────────────────────────────────────────────
sneq__mention_entity     ({ canonicalName, type, aliases?, sceneId?, description })
                           → { entityId, isNew: boolean, resolvedTo?: entityId }
sneq__register_fact      ({ entityId, attributeKey, value, observation })
                           → { factId, contradictions: AttributFige[] }
sneq__add_constraint     ({ entityId, attributeKey, rule, justification })
                           → { constraintId }

// ── COLLAPSE (engine drives an LLM call internally) ──────────────────
sneq__collapse_attribute ({ entityId, attributeKey, options? })
                           → { value, reasoning, propagation: PropagationResult }

// ── SCENE / TURN ─────────────────────────────────────────────────────
sneq__set_scene          ({ locationEntityId, presentEntityIds[], description })
                           → { sceneId, turnNumber }
sneq__advance_turn       ({ summary? }) → { turnNumber }
```

**Deliberate split**: `sneq__register_fact` returns `contradictions[]` instead of throwing. The engine validates; the consumer's GM adjudicates (regen / reinterpret / reject). This honors the bookkeeping-library decision.

**Schemas exported three ways**:

1. As `Tool` objects ready to drop into Anthropic / OpenAI-compat / Gemini tool arrays
2. As Zod schemas (`Engine.tools.zod.mentionEntity`) for typed consumers
3. As JSON Schema strings (`Engine.tools.jsonSchema.mentionEntity`) for adapters

The agent skill file (`skills/sneq-narrative-engine.md`) documents **when** to call each tool in narrative terms (e.g. *"call `sneq__mention_entity` before narrating any NPC by name so you know if you're introducing or re-using one"*), and references `docs/api.md` for the authoritative signatures.

---

## 8. Repository & Storage

```typescript
interface Repository {
  // Entities
  upsertEntity         (e: Entity): Promise<void>
  getEntity            (campaignId, entityId): Promise<Entity | null>
  findEntitiesByAlias  (campaignId, aliasNormalized, type?): Promise<Entity[]>
  searchEntitiesByVector(campaignId, vec: Float32Array, opts): Promise<EntityWithScore[]>

  // Facts (RC)
  appendFact           (f: AttributFige): Promise<{ factId: string }>
  getFigedAttributes   (campaignId, entityId): Promise<AttributFige[]>
  queryFacts           (campaignId, query: FactQuery): Promise<AttributFige[]>

  // Potentialities (CP)
  upsertPotentialite   (p: Potentialite): Promise<void>
  removePotentialite   (campaignId, entityId, attribut): Promise<void>
  getPotentialite      (campaignId, entityId, attribut): Promise<Potentialite | null>

  // GCN
  upsertNode           (n: NoeudGCN): Promise<void>
  upsertEdge           (a: AreteGCN): Promise<void>
  neighbors            (campaignId, entityId, depth: number): Promise<{ node, edge }[]>

  // Turns / Scenes
  appendTurn           (t: Turn): Promise<void>
  currentScene         (campaignId): Promise<Scene | null>

  // Transactional
  transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T>
}
```

**`transaction` is mandatory**, not optional, because `appendFact` + `removePotentialite` + GCN propagation must succeed atomically. Future Repository implementations must honor it; SQLite handles it trivially via `BEGIN/COMMIT`.

**Reference adapter — `SqliteRepository`**:

- `better-sqlite3` (sync, predictable, de-facto Node SQLite)
- `sqlite-vec` extension for vector search (drop-in `MATCH` queries; replaces the need for a separate vector DB)
- Single file per Engine instance, configurable path; multiple campaigns share one file, scoped via `campaignId` columns and indexes
- WAL mode, single-writer (fine for turn-based)
- Migrations baked into the adapter (versioned, idempotent, run on construction)

Schema sketch:

```sql
CREATE TABLE entities      (campaign_id TEXT, id TEXT, type TEXT, name TEXT,
                            aliases JSON, embedding BLOB, created_at INTEGER, …,
                            PRIMARY KEY (campaign_id, id));
CREATE TABLE figed         (campaign_id TEXT, entity_id TEXT, attribute_key TEXT,
                            value JSON, observation JSON, turn INTEGER,
                            PRIMARY KEY (campaign_id, entity_id, attribute_key));
CREATE TABLE potentialites (campaign_id TEXT, entity_id TEXT, attribute_key TEXT,
                            etat TEXT, constraints JSON,
                            PRIMARY KEY (campaign_id, entity_id, attribute_key));
CREATE TABLE edges         (campaign_id TEXT, src TEXT, dst TEXT, type TEXT,
                            attrs JSON, etat TEXT,
                            PRIMARY KEY (campaign_id, src, dst, type));
CREATE TABLE turns         (campaign_id TEXT, turn_number INTEGER, summary TEXT,
                            scene_id TEXT, created_at INTEGER,
                            PRIMARY KEY (campaign_id, turn_number));
CREATE TABLE scenes        (campaign_id TEXT, id TEXT, location_id TEXT,
                            present JSON, description TEXT,
                            PRIMARY KEY (campaign_id, id));
CREATE VIRTUAL TABLE entity_vec USING vec0(entity_id TEXT, embedding FLOAT[D]);
-- Indices on campaign_id for all tables.
```

The dimension `D` is fixed at virtual-table creation time and applies to every campaign in this SQLite file. This means **all campaigns in one SQLite file must use the same embedding provider/model**. If a consumer needs to mix embedding models, they must use separate Repository instances (different files). This constraint is documented for consumers and surfaced as a startup check: if the configured embeddings tier reports a different dimension than the table, the engine throws at construction.

**Out of scope**: Convex, Postgres, Redis adapters. The Repository interface is the documented contract; outside-contributed adapters can follow.

---

## 9. Public API Surface

Single `Engine` class. Multi-campaign via a facade. All methods async.

```typescript
class Engine {
  constructor(config: EngineConfig)

  campaign(id: CampaignId): CampaignContext
  listCampaigns(): Promise<CampaignMeta[]>
  createCampaign(meta: NewCampaignInput): Promise<CampaignContext>
  deleteCampaign(id: CampaignId): Promise<void>

  // Static helpers
  static defaultRouterConfig(): RouterConfig
  static loadConfigFromFile(path: string): EngineConfig    // .json / .yaml / .ts
  static get tools(): ToolBundle                           // exported tool schemas
}

interface CampaignContext {
  readonly id: CampaignId
  readonly meta: CampaignMeta

  // Resolution
  resolveEntity   (mention: string, opts?: ResolveOpts): Promise<ResolutionResult>
  suggestExisting (mention: string, type: EntityType):   Promise<SuggestionResult>

  // Reads
  getEntity        (entityId): Promise<EntityFull | null>
  getRelevantFacts (entityId, opts?): Promise<AttributFige[]>
  currentScene     (): Promise<Scene | null>

  // Writes
  mentionEntity    (input): Promise<{ entityId; isNew; resolvedTo? }>
  registerFact     (input): Promise<{ factId; contradictions: AttributFige[] }>
  addConstraint    (input): Promise<{ constraintId }>
  collapseAttribute(entityId, attributeKey, opts?): Promise<CollapseResult>

  // Scene / turn
  setScene         (input): Promise<{ sceneId; turnNumber }>
  advanceTurn      (summary?: string): Promise<{ turnNumber }>

  // Tool-call dispatcher — single integration point for consumers
  handleToolCall   (name: string, args: unknown): Promise<unknown>

  // Extension points
  registerPreGenerationHook(hook: PreGenerationHook): Disposable
  registerUserPromptHandler(handler: AskUserFn):     Disposable
}

interface EngineConfig {
  repository: Repository | { kind: "sqlite"; path: string }
  router:     RouterConfig
  resolver?: {
    tauHigh?: number
    tauLow?: number
    gapDelta?: number
    embeddingRefreshThreshold?: number
  }
  logger?: Logger
}
```

**Streaming** is not surfaced on the engine API itself; if a consumer wants token-level streaming for collapse generation, they can pass `onToken` in the per-call options to `collapseAttribute`. Default is batch.

**`handleToolCall`** is the one-call integration: pass the tool-call name and args, get the result. Routes internally to the appropriate `CampaignContext` method.

---

## 10. Error Handling & Validation

**Three error classes**:

```typescript
class SneqValidationError    extends Error { details: ValidationFailure[] }
class SneqContradictionError extends Error { contradictions: AttributFige[] }
class SneqProviderError      extends Error { tier: Tier; exhausted: boolean }
```

**Validation pipeline** (carries v1 forward, refined):

1. **Format** — value matches `AttributValue` discriminated union
2. **Strict-constraint** — every `[STRICT]` constraint respected
3. **RC contradiction** — does this contradict an existing FIGÉ fact?
4. **Semantic** — light-tier LLM judges "does this make sense?" (off by default; on for `SECRET` / `HISTORIQUE`, where coherence is fragile)
5. **Soft-constraint** — recorded as warnings, non-blocking

**Failure handling for `collapseAttribute`**:

| Failure | Default response | Configurable? |
|---|---|---|
| Format invalid | Regen with strengthened format instruction, ≤ 2 retries | yes (retries) |
| Strict constraint violated | Regen with explicit "you violated X" emphasis, ≤ 2 retries | yes (retries) |
| RC contradiction | Throw `SneqContradictionError` — consumer's GM decides | always thrown |
| Provider chain exhausted | Throw `SneqProviderError` after the fallback chain is empty | n/a |
| Semantic check failed | Log warning, return the result | yes (strict mode toggle) |

**`registerFact` does not throw on contradiction.** It returns `{ contradictions: [...] }`. The engine validates; the consumer adjudicates. This is the v2 deliberate split.

**Logging**: structured (JSON), single `logger` injection, defaults to no-op. Every LLM call, every fallback hop, every resolution decision logs with a campaign-scoped trace ID.

---

## 11. Testing Strategy

| Layer | Tooling | What it covers |
|---|---|---|
| Pure logic | vitest | RC inscription, CP constraints, GCN propagation, state machine. Deterministic, no I/O. |
| Repository | vitest + `:memory:` SQLite | Migrations, transactions, vector search. |
| Resolver | vitest + fixture embeddings + mock judge | Each cascade layer + escalation paths. |
| Router | vitest + mock providers | Scripted 429 / 5xx / timeout / malformed → fallback chain + disabled-state cooldown. |
| Integration smoke | env-var-gated, not default CI | Tiny scripted campaign against a real provider chain. Catches prompt-format drift. |

**No "real LLM in CI" by default** — keeps the suite hermetic, fast, free.

V2 ships two fixture helpers:

- `replayProvider(fixtures)` — scripts a sequence of canned responses
- `recordProvider(realProvider, file)` — records once against a real provider, replays forever

---

## 12. Distribution & Documentation

Two documentation artifacts ship inside the package:

| Path | Audience | Format |
|---|---|---|
| `docs/api.md` | TypeScript / Node devs | TypeDoc-generated from JSDoc on the public API. Authoritative method signatures, parameter shapes, return types, config schema. Regenerated on release. |
| `skills/sneq-narrative-engine.md` | Hermes-Agent and Claude-Code-style agent runtimes | Anthropic-style skill: YAML frontmatter + markdown body. Explains **when** to invoke each tool in narrative terms, **which** config fields matter, and **references `docs/api.md`** for ground-truth signatures. |

Hermes-Agent integration pattern: copy `node_modules/@sneq/engine/skills/sneq-narrative-engine.md` into the agent's skills directory.

Both artifacts are part of the published npm payload (`files` field in `package.json`).

---

## 13. Out of Scope for V2

Deferred — picked up in follow-up specs once V2 is real and used:

- **Pre-generation / caching layer** (v1 chapter 5). The `PreGenerationHook` interface exists; default implementation is a no-op. The full predictor / worker pool / priority queue is **not built** in V2.
- **Consumer bindings**: TTRPG single-player app, Hermes-Agent MCP / skill integration. Each gets its own spec.
- **Convex / Postgres adapters**. Interface is the contract; adapters are future work.
- **Multi-PC / party support**. V2 assumes single-PC sessions.
- **Auto-summarization of long campaigns** (compressing old turns into history blocks).
- **Versioning / migration of figé facts** between campaigns or schema versions.
- **Web / HTTP gateway**. The engine stays in-process; wrap trivially later if needed.
- **GM personality / opinionated prompt library**. Consumer's problem.

---

## 14. Open Questions (none blocking V2)

Tracked here so V2 doesn't accidentally close them off:

- **Embedding model interoperability**: switching between embedding providers mid-campaign breaks vector comparability. V2 doesn't migrate; if the consumer changes provider, embeddings must be regenerated. Acceptable for now; a future migration tool can be a follow-up.
- **Resolver cold-start**: at campaign start, vector search has no data; L2 always misses. Acceptable; L1 (aliases) covers explicit names, and L3 (judge) is rarely needed early.
- **Soft-constraint propagation depth**: v1 recommends 2–3 hops with decay. V2 keeps that default but exposes the depth via `EngineConfig`. Defaults stand until evidence says otherwise.
- **GM-attributed claims vs. dice-attributed claims**: both go through `registerFact` with different `Observation.source`. V2 treats them the same way in validation; future versions may weight dice-derived facts as more authoritative.

---

## 15. References

- v1 design docs in this repo: `SNEQ/01_Introduction_et_Concept.md` … `SNEQ/08_Recapitulatif.md`
- Brainstorming transcript: this conversation, captured in `~/.claude/projects/-Users-jeandesauw-Documents-code-sideprojects-sneq-narrative-system/`
- Stack rules: `~/.claude/Contexts/about-me.md` (no OpenAI, no xAI/Grok)

---

*End of V2 design document. Next step: write implementation plan via `superpowers:writing-plans`.*
