# sneq-narrative-system

A narrative-state engine for AI-narrated games — TTRPGs with an AI Game Master, AI-driven RPGs, agent-played campaigns on Discord, anything where the AI invents the world and you don't want it forgetting what it invented.

> **Status:** V2 — published on npm as [`sneq-engine`](https://www.npmjs.com/package/sneq-engine). Bindings to specific consumers (TTRPG app, Hermes-Agent on Discord) are separate follow-ups.

---

## What problem this solves

When an LLM plays GM, two things break over a real campaign:

1. **It forgets.** Three sessions in, the blacksmith's name has drifted, the village your character liberated has a different geography, the secret it hinted at last week has been silently rewritten.
2. **It forks canon.** Even within a single session, the model will happily invent a "captain of the guard" who is structurally the same person as the captain you met in chapter one — under a different name, with a different personality, in a different city.

`sneq-engine` is a **bookkeeping library** that sits next to your GM agent. You drive the narration; the engine tracks canonical entities, facts, scenes, and turns, resolves new mentions against the existing world, and refuses to let the model fork reality.

It implements the SNEQ model — **Système Narratif à État Quantique** — a constraint-driven narrative engine where attributes stay undefined until the player observes them, then collapse into permanent facts that propagate constraints to the rest of the world. The original v1 design lives in [`SNEQ/`](./SNEQ/). This repo implements V2, recalibrated for turn-based dialog rather than the real-time RPG framing of v1.

## What V2 ships

- **Bookkeeping library** in TypeScript (Node 20+, ESM). No GM logic; you stay in control of prose.
- **Multi-campaign** — one Engine instance, many campaigns, scoped by `campaignId`.
- **Layered entity resolution** — `alias → vector → LLM judge → user-prompt` cascade for "is this the same NPC as 3 sessions ago?". Runs **keyless** in a degraded alias-only mode (omit the embeddings tier, `embeddingDim: 0`) — useful for demos, prototypes, and providers without an embeddings endpoint (DeepSeek).
- **Anti-fork guard** — `mention_entity` refuses to silently create a near-duplicate when resolution is ambiguous: it returns `needsAdjudication: true` + candidates so the caller decides (re-use an id, or re-call with `force: true`).
- **Provider router** with three task tiers (`heavy` / `light` / optional `embeddings`), each with primary + fallback chain and real retry/backoff. Built-in adapters for DeepSeek, Mistral, Together, OpenRouter (fetch-based, zero deps), plus Anthropic and Google GenAI (lazy-loaded — their SDKs are genuinely optional peers), and a `custom` escape hatch.
- **Three repository adapters** behind one contract: SQLite + sqlite-vec (file-based, zero ops), in-memory (`sneq-engine/memory`, zero deps, brute-force cosine), and JSON-file (`sneq-engine/json`, atomic write-through, human-readable saves). The shared contract test suite is the seam's specification.
- **Tool-call protocol** — Zod-validated tool schemas + ready-to-drop-in adapter shapes for Anthropic, OpenAI-compatible, and Gemini SDKs (10 advertised tools).
- **Agent-discoverable skill** — drop [`skills/sneq-narrative-engine.md`](./skills/sneq-narrative-engine.md) into a Claude Code / Hermes-Agent skills dir and the agent learns when to call which engine tool.

## Stack policy

The default router excludes **OpenAI** and **xAI/Grok**. The `custom` provider escape hatch lets the host wire whatever they want — but the shipped defaults reflect a deliberate stack choice. See [`docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md`](./docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md) §6 for the full rationale.

## Install

```bash
pnpm add sneq-engine      # only hard dependency: zod
# or, for the CLI alone:
npm i -g sneq-engine      # puts the `sneq-engine` binary on your PATH
```

To hack on the engine itself, clone the repo and see [Development](#development).

Optional peers, **only for what you actually use** (the core import never touches them):

| You use | Install |
|---|---|
| `sneq-engine/memory` or `sneq-engine/json` | nothing |
| `sneq-engine/sqlite` without vectors (`embeddingDim: 0`) | `better-sqlite3` |
| `sneq-engine/sqlite` with vector resolution | `better-sqlite3 sqlite-vec` |
| DeepSeek / Mistral / Together / OpenRouter / any OpenAI-compatible | nothing (fetch-based) |
| the Anthropic provider | `@anthropic-ai/sdk` |
| the Google GenAI provider | `@google/generative-ai` |

## Quick start — zero config, zero keys

No API keys, no native modules: the in-memory adapter plus alias-only resolution.
This is the smallest thing that works — perfect for a demo mode or a prototype.

```ts
import { Engine, asCampaignId } from "sneq-engine";
import { memoryRepository } from "sneq-engine/memory";

const engine = new Engine({
  repository: memoryRepository(),         // or jsonFileRepository({ path: "./save.json" })
  router: { tiers: {
    heavy: { primary: { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" }, fallbacks: [] },
    light: { primary: { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" }, fallbacks: [] }
    // no embeddings tier → alias-only resolution, no embeddings key needed
  } }
});

const campaign = await engine.createCampaign({
  id: asCampaignId("demo"), name: "Demo", embeddingDim: 0   // 0 = no vectors
});
```

With a chat key present the LLM judge still disambiguates multi-alias hits; with no
keys at all the engine stays fully functional on exact-alias resolution.

## Quick start — full cascade (SQLite + vectors)

```ts
import { Engine, defaultRouterConfig, asCampaignId } from "sneq-engine";
import { sqliteRepository } from "sneq-engine/sqlite";

const engine = new Engine({
  repository: sqliteRepository({ path: "./my-campaign.db", embeddingDim: 768 }),
  router: defaultRouterConfig()
});

const campaign = await engine.createCampaign({
  id: asCampaignId("campaign-1"),
  name: "The Forgeron of Valmure",
  embeddingDim: 768
});

// Player says "I look for the blacksmith"
const r = await campaign.resolveEntity({ mention: "the blacksmith" });
if (r.match) {
  console.log("Known:", r.match.name);
} else {
  await campaign.mentionEntity({
    canonicalName: "Aldric Fervent",
    type: "PERSONNAGE",
    aliases: ["the blacksmith"],
    description: "A grizzled smith with haunted eyes."
  });
}
```

## Distributed stores — opt-in atomic writes

Local repositories keep the historical API unchanged:

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

engine.routerClient() === sharedRouter; // true — the host and canon share one Router
```

The strategy owns the atomic execution of `registerFact`, `setScene`, `advanceTurn`, entity
confirmation, constraint append (`addConstraint`), and canonical entity creation (`createEntity`).
Pure command decisions are available from `sneq-engine/atomic` so an adapter can run
SNEQ's rules inside its store transaction without importing a framework into the engine.

Every command carries an `operationId` generated once per logical engine call. A distributed strategy
must atomically deduplicate retries of that ID and return the original result; this covers a committed
store mutation whose transport response was lost. The local repository-backed strategy remains an
in-process `Repository.transaction(fn)` implementation.

Canonical creation is optimistic: `mentionEntity()` reads a per-campaign `entityRevision`, resolves and
embeds outside any transaction, then asks the strategy to `createEntity` only if the revision is
unchanged. If canon moved under it the create returns `stale` and the engine re-resolves against the
newer world before retrying (bounded, then `SneqConcurrentEntityCreationError`). A distributed strategy
must **not** record a non-terminal `stale` result in its idempotency store — only terminal
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

## CLI usage (out-of-process consumers)

For agents that can't (or don't want to) embed the TypeScript library — Hermes-Agent
on Discord, scripts in other languages, smoke-test sessions — install the package and
use the `sneq-engine` binary. Every call reads/writes a single line of JSON on stdout.

```bash
# Create a campaign
sneq-engine init-campaign --db ./campaign.db --campaign forge-de-valmure \
  --args '{"name":"La Forge de Valmure","embeddingDim":768}'

# Resolve a mention
sneq-engine lookup-entity --db ./campaign.db --campaign forge-de-valmure \
  --args '{"mention":"the blacksmith","type":"PERSONNAGE"}'

# Register a fact (observation provenance via --source preset)
sneq-engine register-fact --db ./campaign.db --campaign forge-de-valmure \
  --source gm-narration \
  --args '{"entityId":"ent_abc","attributeKey":"metier","category":"HISTORIQUE","value":{"type":"STRING","value":"capitaine"}}'

# Args via stdin work too
echo '{"entityId":"ent_abc"}' | sneq-engine get-entity --db ./campaign.db --campaign forge-de-valmure

# Probe whether a campaign is initialized (no throw on missing)
sneq-engine campaign-exists --db ./campaign.db --campaign forge-de-valmure

# Atomic wake-up bundle: scene + present entities + their facts in one call
sneq-engine prepare-turn --db ./campaign.db --campaign forge-de-valmure

# Validate a candidate narration before flushing to the player
sneq-engine validate-narration --db ./campaign.db --campaign forge-de-valmure \
  --args '{"narration":"Mira rejoint Aldric à Valmure.","strict":true}'
```

- 14 commands: the 9 tool dispatcher entries (`lookup-entity`, `get-entity`, `get-relevant-facts`, `suggest-existing`, `mention-entity`, `register-fact`, `add-constraint`, `set-scene`, `advance-turn`) plus three conveniences (`init-campaign`, `get-scene`, `campaign-exists`), one defensive validation command (`validate-narration`), and one orchestration command (`prepare-turn`).
- Exit codes: `0` on success, `1` on user/validation errors, `2` on internal errors.
- Errors emit `{"error":"…","code":"…","details":…}` on stdout — never on stderr.
- Provider keys (`ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, etc.) are read from env.
  Use `--config <path>` to override the router config.
- `--embedding-dim` is only needed at `init-campaign` (existing DBs remember their dim).
  The default derives from the config's embeddings primary (768 with the default config);
  pass `0` for alias-only campaigns with no embeddings provider at all.
- Run `sneq-engine --help` or `sneq-engine <command> --help` for usage details.
- Full spec: [`docs/superpowers/specs/2026-05-20-sneq-cli-design.md`](docs/superpowers/specs/2026-05-20-sneq-cli-design.md) (initial CLI) + [`docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md`](docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md) (defensive features).

## Wiring as agent tools

```ts
import { Engine } from "sneq-engine";

// Get the tool schemas in the shape your model wants (10 advertised tools):
const anthropicTools = Engine.tools.anthropic;
const openaiTools    = Engine.tools.openai;
const geminiTools    = Engine.tools.gemini;

// Pass into your model call. When the model emits a tool call, dispatch it:
const result = await campaign.handleToolCall(name, args);
```

The full tool reference (when to call what, in narrative terms) lives in [`skills/sneq-narrative-engine.md`](./skills/sneq-narrative-engine.md). The authoritative signatures live in [`docs/api.md`](./docs/api.md).

## Architecture

```
        ┌─────────────────────────────────┐
consumer│   Engine (facade)               │
 (your  │   engine.campaign(id).…         │
   GM)  └─────┬───────────────────────────┘
              │
   ┌───────┬──┴────┬─────────┬────────┬────────┐
   ▼       ▼       ▼         ▼        ▼        ▼
 Domain   GCN  Resolver   Router   Tools    Hooks
 RC + CP        cascade    tiers   schemas  (askUser,
                                            pre-gen)
                            │
                  ┌─────────┴────────┐
                  ▼                  ▼
              Provider          Repository
              interface         interface
                  │                  │
        OpenAI-compat /         SQLite + sqlite-vec
        Anthropic /             (reference adapter)
        Google GenAI /
        custom
```

## Documentation

| File | Audience |
|---|---|
| [`UPGRADING.md`](./UPGRADING.md) | Existing consumers (CLI agents like Hermes, in-process apps) — version migration guide, agent-executable |
| [`docs/api.md`](./docs/api.md) | TypeScript developers — full API reference (TypeDoc-generated) |
| [`skills/sneq-narrative-engine.md`](./skills/sneq-narrative-engine.md) | Claude Code / Hermes / agent runtimes — when to invoke which tool |
| [`docs/superpowers/specs/`](./docs/superpowers/specs/) | V2 design spec (markdown + HTML brief) |
| [`docs/superpowers/plans/`](./docs/superpowers/plans/) | Implementation plan with per-task TDD steps |
| [`SNEQ/`](./SNEQ/) | Original v1 design docs (in French) — the conceptual foundation |

## Known deferred scope

V2 is intentionally minimal. The following are out-of-scope for this version and tracked for follow-ups:

- **Attribute collapse (generate-then-commit)** — there is no `collapse` tool or method. Consumers compose it from exported primitives: `Router.chat` (heavy tier) + `validateValue` + `registerFact`.
- **Pre-generation cache** — the v1 spec's elaborate predictor/cache for real-time RPGs. `PreGenerationHook` interface exists with a no-op default; the full implementation is a future version.
- **Convex / Postgres repository adapters** — SQLite, in-memory, and JSON-file ship; the `Repository` contract test suite (`test/repository/contract.ts`) is the specification for new adapters.
- **One DB per campaign is the blessed layout** — the sqlite-vec prefilter degrades on shared multi-campaign databases with many entities; the CLI examples already follow this.
- **Multi-PC / party support** — V2 assumes single-PC sessions.
- **HTTP / MCP gateway** — engine is in-process. Wrap trivially later if needed.
- **Consumer bindings** — TTRPG single-player app and Hermes-Agent MCP / skill integrations get their own follow-up specs.

## Project structure

```
SNEQ/                           v1 design docs (French)
src/                            engine source
  domain/                       branded IDs, Entity, AttributValue, GCN, etc.
  core/                         state machine, propagation, validation (pure)
  repository/{interface,sqlite/,memory/,json/} Repository contract + 3 adapters
  router/{interface,router,providers/,defaults} Router + 4 providers (SDK ones lazy-loaded)
  resolver/{resolver,judge,thresholds,normalize} Layered cascade (degrades keyless)
  tools/{schemas,json-schema,adapters,dispatcher} Tool-call protocol
  hooks/{user-prompt,pre-generation} Extension points
  engine.ts, campaign.ts        Facade + CampaignContext
  config.ts, logger.ts, errors.ts, index.ts
test/                           235 unit tests (incl. the repository contract suite) + 1 env-gated integration smoke
docs/                           generated API + design specs + plans
skills/                         agent-discoverable skill
```

## Development

```bash
pnpm test            # unit tests (excludes integration smoke)
pnpm typecheck       # full project tsc --noEmit
pnpm build           # emit dist/
pnpm docs            # regenerate docs/api.md from TypeDoc
SNEQ_INTEGRATION_SMOKE=1 pnpm test    # include integration smoke (needs API keys)
```

## License

MIT — see [`LICENSE`](./LICENSE).

## Acknowledgments

Built with Claude Code (Opus 4.7, 1M context) over a long brainstorm → spec → plan → subagent-driven-execution session. The v1 SNEQ design docs were Jean's starting input; the V2 design, plan, and implementation were produced collaboratively with the AI. The Anthropic [superpowers plugin](https://github.com/anthropics) provided the brainstorming / planning / execution skills.
