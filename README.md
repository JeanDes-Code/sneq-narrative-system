# sneq-engine

[![npm version](https://img.shields.io/npm/v/sneq-engine)](https://www.npmjs.com/package/sneq-engine)
[![npm total downloads](https://img.shields.io/npm/d18m/sneq-engine)](https://www.npmjs.com/package/sneq-engine)

A TypeScript engine for AI-narrated games. Track canonical entities, commit narrative events, and query what each character knows.

Your host controls the prompt and narration. SNEQ stores world state, resolves entity mentions, and tracks how news reaches characters.
Use it from a Node.js app or through the JSON CLI from an agent runtime such as Hermes-Agent.

Node.js 20+, ESM only. The only required dependency is `zod`; storage and provider SDKs are optional peers.
The package is pre-1.0. Read [UPGRADING.md](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/UPGRADING.md) before updating an existing campaign, including patch releases with stricter validation.

## What problem this solves

An AI Game Master can invent a blacksmith in one turn and contradict that character in the next.
It can also give a distant character news they never learned.
SNEQ gives the host a record of the world and a separate view of what each character knows.

SNEQ stands for *Système Narratif à État Quantique*. Invented details can stay provisional until a validated promotion makes them canon.
The original design lives in [SNEQ/](https://github.com/JeanDes-Code/sneq-narrative-system/tree/main/SNEQ/); the current knowledge model is specified in [the stratified knowledge spec](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/docs/tech/9-sneq-v04-stratified-knowledge-spec-2026-08-06.md).

## What the engine does

- Resolves mentions through aliases, vectors, an LLM judge, then user adjudication. Without embeddings, resolution starts with exact names and aliases.
- Returns `needsAdjudication` and candidates when `mentionEntity` finds an unresolved ambiguity. The host chooses an existing entity or explicitly creates another.
- Derives knowledge for a holder, meaning a character or group. Witnesses know an event; others learn through delivered news or accessible records.
- Tracks a world clock and news delivery over routes declared by the host, with travel time, standing and realm rules.
- Commits a narrative bundle atomically, with replay protection through `operationId`. The event ledger is append-only; current attributes are derived from it.
- Keeps inventions provisional until promotion passes the engine's rules. Player uptake comes from `playerUtterance`; the model cannot submit its own `PLAYER_UPTAKE` evidence.
- Checks composed prompts and narration for known forbidden tokens. The host calls `assertContainment` before generation and `validateNarration({ holderId, narration })` before showing the result.
- Exposes ten model tools, a JSON CLI and `doctor` diagnostics for campaign state and authoring gaps.

Containment checks match tokens; they do not detect every paraphrase or semantic contradiction.
The host must use the checks and decide how to repair or block a rejected narration.

## Install

```bash
npm install sneq-engine
# or: pnpm add sneq-engine
```

To hack on the engine itself, clone the repo and see [Development](#development).

Optional peers, **only for what you actually use** (the core import never touches them):

| You use | Install |
|---|---|
| `sneq-engine/memory` or `sneq-engine/json` | nothing |
| `sneq-engine/sqlite` without vectors (`embeddingDim: 0`) | `better-sqlite3@^11` |
| `sneq-engine/sqlite` with vector resolution | `better-sqlite3@^11 sqlite-vec@^0.1` |
| DeepSeek / Mistral / Together / OpenRouter / any OpenAI-compatible | nothing (fetch-based) |
| the Anthropic provider | `"@anthropic-ai/sdk@>=0.30.0 <1"` |
| the Google GenAI provider | `"@google/generative-ai@>=0.21.0 <1"` |

## Quick start without API keys

Create an entity, find it by alias, commit an event, and read the witness's knowledge.
The in-memory store needs no native modules. Save this as `demo.mjs` and run `node demo.mjs` after installing the package.

```js
import { Engine, asCampaignId, asEventId, defaultRouterConfig } from "sneq-engine";
import { memoryRepository } from "sneq-engine/memory";

// Keep the chat tiers, but omit embeddings for alias-only resolution.
const { heavy, light } = defaultRouterConfig().tiers;
const engine = new Engine({
  repository: memoryRepository(),
  router: { tiers: { heavy, light } },
});

try {
  const campaign = await engine.createCampaign({
    id: asCampaignId("demo"), name: "Valmure", embeddingDim: 0,
  });

  const smith = await campaign.mentionEntity({
    canonicalName: "Aldric",
    type: "PERSONNAGE",
    aliases: ["the blacksmith"],
    description: "The village blacksmith.",
  });
  if (smith.needsAdjudication) {
    throw new Error("Choose an existing entity or confirm a new one before continuing.");
  }

  const resolved = await campaign.resolveEntity({ mention: "the blacksmith" });
  console.log(resolved.match?.name); // Aldric

  await campaign.commitNarrative({
    operationId: "demo-event-1", // Reuse on retry; the last 100 IDs are retained.
    daysElapsed: 1,
    event: {
      eventId: asEventId("ev-demo-1"),
      gravity: 1,
      circumstance: "Aldric burns the missing ledger.",
      participants: [smith.entityId],
      surfaceTokens: ["the missing ledger"],
      acts: [{ actorId: smith.entityId, verb: "BURNS" }],
    },
  });

  const context = await campaign.getHolderContext({ entityId: smith.entityId });
  console.log(context.day);                  // 1
  console.log(context.beliefs[0]?.certainty); // WITNESSED
} finally {
  await engine.close();
}
```

This example makes no provider calls. Ambiguous alias matches may call the LLM judge when credentials are configured.
Without keys, unresolved ambiguity goes back to the caller. Alias-only resolution does not find semantic near-duplicates with unrelated names.

The built-in repositories retain the last 100 committed operation IDs per campaign. Retries outside that window are not deduplicated.

An event's `verb` describes the action for the host. To change a canonical attribute, include an explicit `sets` payload on the act.

## Persistent storage and vector resolution

Replace the memory adapter in the example with either of these stores:

```ts
import { jsonFileRepository } from "sneq-engine/json";

const jsonStore = jsonFileRepository({ path: "./save.json", embeddingDim: 0 });
```

Or, after installing `better-sqlite3@^11`:

```ts
import { sqliteRepository } from "sneq-engine/sqlite";

const sqliteStore = sqliteRepository({ path: "./campaign.db", embeddingDim: 0 });
```

Pass the chosen store as `repository` in `new Engine(...)`. Reopen a saved campaign with `engine.campaign(asCampaignId("demo"))` instead of creating it again.
JSON saves support one process; do not use them with concurrent writers. SQLite uses a native module, so its supported Node versions depend on `better-sqlite3`.

To add vector resolution, configure a `router.tiers.embeddings` provider and install `sqlite-vec@^0.1` if using SQLite.
The provider output, repository and campaign must use the same nonzero `embeddingDim`.
Omitting the embeddings tier **and** using `embeddingDim: 0` gives alias-only operation; setting the dimension alone does not disable provider calls.
Use `setEmbeddingDim` and `reindexEmbeddings` for an existing store; see [the API reference](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/docs/api.md).

The router supports `heavy`, `light` and optional `embeddings` tiers, each with retry and fallback settings.
DeepSeek, Mistral, Together and OpenRouter use the fetch-based `openai-compatible` adapter.
Anthropic and Google GenAI use their optional SDK peers; `custom` accepts a host-provided adapter.
The default router excludes OpenAI and xAI/Grok by choice. Hosts can supply their own router configuration.

## Distributed stores and atomic writes

Local repositories provide transactions:

```ts
new Engine({
  repository: sqliteRepository({ path: "./canon.db" }),
  router: routerConfig,
});
```

A distributed store cannot transport `Repository.transaction(fn)` atomically across several HTTP
calls. Supply a `RepositoryAccess` plus an explicit `AtomicWriteStrategy` instead:

```ts
import { Engine, Router } from "sneq-engine";
import type { AtomicWriteStrategy, RepositoryAccess } from "sneq-engine";

const sharedRouter = new Router(routerConfig, routerDeps);
const repository: RepositoryAccess = distributedRepository;
const writeStrategy: AtomicWriteStrategy = distributedAtomicWrites;

const engine = new Engine({
  repository,
  writeStrategy,
  router: routerConfig,
  routerInstance: sharedRouter,
});

engine.routerClient() === sharedRouter; // true; the host and canon share one Router
```

The strategy owns the atomic execution of `setScene`, `advanceTurn`, entity confirmation,
constraint append (`addConstraint`), and canonical entity creation (`createEntity`).
Pure command decisions are available from `sneq-engine/atomic` so an adapter can run
SNEQ's rules inside its store transaction without importing a framework into the engine.
`decideCommitNarrative` exposes the rules for promotion, dispatch and contradiction checks to these adapters.

`commit_narrative` itself needs a real transaction, and there is no honest way to fake one:
an access-only store implements it against `decideCommitNarrative`.

Every command carries an `operationId` generated once per logical engine call and stable across its
retries. **For these individual commands, the built-in strategy does not deduplicate on it**; the built-in repository-backed strategy ignores
the field and is an in-process `Repository.transaction(fn)`. If you need exactly-once semantics over a
transport that can lose a response after the store committed, your distributed strategy implements the
dedup, keyed on that ID, and returns the original result. The token exists so you can; it is not a
guarantee you inherit.

Canonical creation is optimistic: `mentionEntity()` reads a per-campaign `entityRevision`, resolves and
embeds outside any transaction, then asks the strategy to `createEntity` only if the revision is
unchanged. If canon moved under it the create returns `stale` and the engine re-resolves against the
newer world before retrying (bounded, then `SneqConcurrentEntityCreationError`). A distributed strategy
must **not** record a non-terminal `stale` result in its idempotency store; only terminal
create/existing/conflict results are deduplicated.

For asynchronous web adjudication, `mentionEntity()` still returns `needsAdjudication`. A later
request can confirm the selected existing entity and persist the mention as a player-observed alias:

```ts
await campaign.confirmEntityMatch({
  mention: "the captain",
  entityId: selectedEntityId,
  type: "PERSONNAGE",
});
```

This complements the synchronous `UserPromptRegistry`; it does not replace it. File-backed agents
such as Hermes can continue using their current prompt handler and repository configuration.

## CLI usage

The CLI uses SQLite. Install its peer alongside the package; the library's memory and JSON adapters do not change the CLI storage backend.

```bash
npm install sneq-engine better-sqlite3@^11
```

For a keyless campaign, save the following as `sneq.config.json`. The router still requires chat tiers, but this configuration has no embeddings tier.

```json
{
  "router": {
    "tiers": {
      "heavy": {
        "primary": { "provider": "openai-compatible", "baseUrl": "https://api.deepseek.com/v1", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "deepseek-chat" },
        "fallbacks": []
      },
      "light": {
        "primary": { "provider": "openai-compatible", "baseUrl": "https://api.deepseek.com/v1", "apiKeyEnv": "DEEPSEEK_API_KEY", "model": "deepseek-chat" },
        "fallbacks": []
      }
    }
  }
}
```

Run these commands in a fresh directory containing that config:

```bash
npx sneq-engine init-campaign --db ./campaign.db --campaign demo \
  --config ./sneq.config.json --embedding-dim 0 --args '{"name":"Valmure"}'

npx sneq-engine mention-entity --db ./campaign.db --campaign demo \
  --config ./sneq.config.json \
  --args '{"canonicalName":"Aldric","type":"PERSONNAGE","aliases":["the blacksmith"],"description":"The village blacksmith."}'

npx sneq-engine lookup-entity --db ./campaign.db --campaign demo \
  --config ./sneq.config.json --args '{"mention":"the blacksmith"}'

npx sneq-engine prepare-turn --db ./campaign.db --campaign demo \
  --config ./sneq.config.json

npx sneq-engine doctor --db ./campaign.db --campaign demo \
  --config ./sneq.config.json
```

`lookup-entity` returns Aldric's generated ID and name. Use that ID in later calls; entity names are not IDs.
Pass `--config` on every invocation. Existing databases remember their vector dimension, but the CLI loads router settings on each call.

Commands return one line of JSON on stdout, including errors. Help prints plain text.
Exit codes are `0` for success, `1` for user or validation errors, and `2` for internal errors.
`doctor` exits `1` when a check fails; warnings alone do not fail the command.

Use `--args` or JSON on stdin for tool arguments. `--holder`, `--entity` and `--days` are convenience flags for supported commands.
`prepare-turn` returns the scene and clock; add `--holder` or `--entity` to include that holder's knowledge.
`advance-turn --days N` advances out-of-band time; in-fiction time belongs in `commit-narrative.daysElapsed`.

Run `npx sneq-engine --help` for the command list, or `npx sneq-engine <command> --help` for its arguments.
The [agent guide](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/skills/sneq-narrative-engine.md) explains when to call each tool.

## Wiring as agent tools

```ts
import { Engine } from "sneq-engine";
import type { CampaignContext } from "sneq-engine";

// Get the tool schemas in the shape your model wants (10 advertised tools):
const anthropicTools = Engine.tools.anthropic;
const compatibleTools = Engine.tools.openai;
const geminiTools    = Engine.tools.gemini;

// With a CampaignContext from the quick start, dispatch each model tool call:
async function handleToolCall(campaign: CampaignContext, name: string, args: unknown) {
  return campaign.handleToolCall(name, args);
}
```

Call host-only methods such as `ingestPlayerInput`, `assertContainment` and `upsertHolder` from your orchestration code.
The model tools alone do not run the full turn pipeline.
Pass `holderId` to `validateNarration` to include containment; without it, the method only checks entity mentions.
Existing holders cannot change standing through `commit_narrative`; host authoring uses `upsertHolder`.
Pass raw `playerUtterance` for player uptake instead of adding `PLAYER_UPTAKE` to `promotionEvidence`.

The full tool reference (when to call what, in narrative terms) lives in [`skills/sneq-narrative-engine.md`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/skills/sneq-narrative-engine.md). The authoritative signatures live in [`docs/api.md`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/docs/api.md).

## Architecture

The host runs the turn pipeline. Model tools expose part of it; host code composes the prompt and enforces the checks.

```text
Player input -> ingestPlayerInput
            -> getHolderContext
            -> renderContextBlock / filterTranscript
            -> assertContainment on the composed prompt
            -> your LLM call
            -> validateNarration({ holderId, narration })
            -> commitNarrative

Out-of-band time -> advanceTurn({ days })

Engine / CampaignContext
    -> pure core decisions
    -> atomic execution
    -> repository (SQLite, memory, JSON, or a host adapter)
```

The repository contract has no event mutation method. `CanonicalAttribute` is a deterministic projection of the ledger.
`deriveBeliefs` computes knowledge from events, records, deliveries, holders and the current day; beliefs are not stored.
The [turn pipeline test](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/test/turn-pipeline.test.ts) exercises the phases together.

## Documentation

| File | Audience |
|---|---|
| [`UPGRADING.md`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/UPGRADING.md) | Existing consumers (CLI agents like Hermes, in-process apps); version migration guide, agent-executable |
| [`docs/api.md`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/docs/api.md) | TypeScript developers; full API reference (TypeDoc-generated) |
| [`skills/sneq-narrative-engine.md`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/skills/sneq-narrative-engine.md) | Claude Code / Hermes / agent runtimes; when to invoke which tool |
| [`docs/superpowers/specs/`](https://github.com/JeanDes-Code/sneq-narrative-system/tree/main/docs/superpowers/specs/) | V2 design spec (markdown + HTML brief) |
| [`docs/superpowers/plans/`](https://github.com/JeanDes-Code/sneq-narrative-system/tree/main/docs/superpowers/plans/) | Implementation plan with per-task TDD steps |
| [`SNEQ/`](https://github.com/JeanDes-Code/sneq-narrative-system/tree/main/SNEQ/) | Original v1 design docs (in French); the conceptual foundation |

## Limits

- Without embeddings, entity resolution uses exact names and aliases. It cannot catch every duplicate a model invents.
- Containment uses known tokens. It cannot prove that arbitrary prose respects a character's knowledge.
- News needs authored routes. A new campaign has default dispatch rules but no routes; `doctor` reports missing delivery paths.
- Beliefs are derived on every read. Cost grows with the ledger; no belief cache ships.
- Use one SQLite database per campaign when vector-search scale matters. The current sqlite-vec filtering degrades with large shared databases.
- SQLite, memory and JSON adapters ship. Distributed stores need their own adapter and atomic write strategy.
- The session model assumes one player character. No built-in party orchestration, narration loop, HTTP server or MCP gateway ships.
- `PreGenerationHook` has a no-op default. There is no built-in prediction cache.

## Project structure

```
SNEQ/                           v1 design docs (French)
src/                            engine source
  domain/                       branded IDs, Entity, AttributValue, GCN
  domain/{event,record,holder,carriage,belief,invention} ledger and holder knowledge
  core/                         pure: derive-beliefs, containment, promotion,
                                holder-resolution, holder-context, projection,
                                commit-narrative, tick, doctor, migrate-legacy
  atomic/                       the single write's executor + bootstrap
  repository/{interface,sqlite/,memory/,json/} Repository contract + 3 adapters
  router/{interface,router,providers/,defaults} Router and provider adapters (SDKs lazy-loaded)
  resolver/{resolver,judge,thresholds,normalize} Layered cascade (degrades keyless)
  tools/{schemas,json-schema,adapters,dispatcher} Tool-call protocol
  hooks/{user-prompt,pre-generation} Extension points
  engine.ts, campaign.ts        Facade + CampaignContext
  config.ts, logger.ts, errors.ts, index.ts
test/                           unit and repository contract tests + an opt-in integration smoke
docs/                           generated API + design specs + plans
skills/                         agent-discoverable skill
```

## Development

```bash
pnpm install --frozen-lockfile
pnpm typecheck       # full project tsc --noEmit
pnpm build           # emit dist/ before the CLI smoke
pnpm test            # unit tests (excludes integration smoke)
pnpm docs:build      # regenerate docs/api.md from TypeDoc (CI fails on a stale diff)
SNEQ_INTEGRATION_SMOKE=1 pnpm test    # include integration smoke (needs API keys)
```

## Feedback

Building a game or an agent campaign with SNEQ? Share it in [Discussions](https://github.com/JeanDes-Code/sneq-narrative-system/discussions).
Report bugs and missing behavior in an [issue](https://github.com/JeanDes-Code/sneq-narrative-system/issues), or write to contact@jean-desauw.fr.

## License

MIT. See [`LICENSE`](https://github.com/JeanDes-Code/sneq-narrative-system/blob/main/LICENSE).

## Acknowledgments

Built by Jean Desauw with Claude Code, from the original SNEQ design documents.
