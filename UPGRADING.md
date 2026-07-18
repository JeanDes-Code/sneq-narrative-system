# Upgrading to sneq-engine 0.1.0

This guide is written to be consumed by **humans and agents** (Hermes-Agent, Claude Code
sessions, scripts). If you operate a system that calls `sneq-engine` or imports
`sneq-engine`, read the section that matches how you consume it, apply the checklist,
then run the verification commands at the bottom.

> **TL;DR for out-of-process (CLI) consumers:** your existing database files keep working
> untouched (the schema migration is automatic and additive). Two things need attention:
> (1) `mention-entity` can now return `entityId: null` with `needsAdjudication: true` —
> handle it; (2) the default embeddings chain is Google-only now — if you relied on the
> Mistral fallback, you need a config file. Everything else is compatible or strictly better.

---

## Unreleased pre-1.0 changes after 0.1.0

These land on top of 0.1.0 and are not yet published. If you track `main`:

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

## 1. Out-of-process consumers (the `sneq-engine` CLI — e.g. Hermes-Agent)

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
pnpm install && pnpm build          # 236 tests: pnpm test (optional but recommended)
# Probe an existing campaign WITHOUT --embedding-dim (must succeed and show the stored dim):
sneq-engine campaign-exists --db <your.db> --campaign <id>
# Wake-up bundle still works:
sneq-engine prepare-turn --db <your.db> --campaign <id>
```

Then update your own call sites per 1.1 (mandatory) and 1.2 (if Mistral-only), and
refresh your copy of the skill file.

---

## 2. In-process consumers (TypeScript `import "sneq-engine"`)

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

## 3. Verification matrix

| Check | Command | Expect |
|---|---|---|
| Build is current | `pnpm build && sneq-engine --help` | help lists 14 commands |
| Existing DB opens without the dim flag | `sneq-engine campaign-exists --db <db> --campaign <id>` | `{"exists":true,…,"embeddingDim":<stored>}` |
| Migration applied | `sneq-engine get-entity --db <db> --campaign <id> --args '{"entityId":"<known>"}'` | entity JSON (with `description` null/absent for old rows) |
| Adjudication handled | trigger an ambiguous `mention-entity` in a test campaign | your code branches on `needsAdjudication` instead of using `null` |
| Embeddings path | `sneq-engine mention-entity … ` on a vector campaign | no dim-mismatch error; if `PROVIDER_ERROR`, revisit §1.2 |

Spec with full rationale: `docs/superpowers/specs/2026-06-10-sneq-plug-and-play-hardening-design.md`.
