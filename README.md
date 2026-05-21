# sneq-narrative-system

A narrative-state engine for AI-narrated games — TTRPGs with an AI Game Master, AI-driven RPGs, agent-played campaigns on Discord, anything where the AI invents the world and you don't want it forgetting what it invented.

> **Status:** V2 alpha. Working end-to-end; not yet published to npm; bindings to specific consumers (TTRPG app, Hermes-Agent on Discord) are separate follow-ups.

---

## What problem this solves

When an LLM plays GM, two things break over a real campaign:

1. **It forgets.** Three sessions in, the blacksmith's name has drifted, the village your character liberated has a different geography, the secret it hinted at last week has been silently rewritten.
2. **It forks canon.** Even within a single session, the model will happily invent a "captain of the guard" who is structurally the same person as the captain you met in chapter one — under a different name, with a different personality, in a different city.

`@sneq/engine` is a **bookkeeping library** that sits next to your GM agent. You drive the narration; the engine tracks canonical entities, facts, scenes, and turns, resolves new mentions against the existing world, and refuses to let the model fork reality.

It implements the SNEQ model — **Système Narratif à État Quantique** — a constraint-driven narrative engine where attributes stay undefined until the player observes them, then collapse into permanent facts that propagate constraints to the rest of the world. The original v1 design lives in [`SNEQ/`](./SNEQ/). This repo implements V2, recalibrated for turn-based dialog rather than the real-time RPG framing of v1.

## What V2 ships

- **Bookkeeping library** in TypeScript (Node 20+, ESM). No GM logic; you stay in control of prose.
- **Multi-campaign** — one Engine instance, many campaigns, scoped by `campaignId`.
- **Layered entity resolution** — `alias → vector → LLM judge → user-prompt` cascade for "is this the same NPC as 3 sessions ago?".
- **Provider router** with three task tiers (`heavy` / `light` / `embeddings`), each with primary + fallback chain, quota-aware. Built-in adapters for DeepSeek, Mistral, Together, OpenRouter, Anthropic, Google GenAI, and a `custom` escape hatch.
- **SQLite + sqlite-vec persistence** (file-based, zero ops). Repository interface is pluggable — Convex / Postgres adapters can be added later.
- **Tool-call protocol** — Zod-validated tool schemas + ready-to-drop-in adapter shapes for Anthropic, OpenAI-compatible, and Gemini SDKs.
- **Agent-discoverable skill** — drop [`skills/sneq-narrative-engine.md`](./skills/sneq-narrative-engine.md) into a Claude Code / Hermes-Agent skills dir and the agent learns when to call which engine tool.

## Stack policy

The default router excludes **OpenAI** and **xAI/Grok**. The `custom` provider escape hatch lets the host wire whatever they want — but the shipped defaults reflect a deliberate stack choice. See [`docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md`](./docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md) §6 for the full rationale.

## Install

Not yet on npm. To use it now, clone and `pnpm link` or build and import locally.

```bash
git clone https://github.com/JeanDes-Code/sneq-narrative-system.git
cd sneq-narrative-system
pnpm install
pnpm approve-builds       # approve native builds for better-sqlite3 + esbuild
pnpm test                 # 51 tests should pass
pnpm build                # produces dist/
```

Once published the install will be:

```bash
pnpm add @sneq/engine
# Plus the peer deps you actually use:
pnpm add better-sqlite3 sqlite-vec       # for the reference SQLite repository
pnpm add @anthropic-ai/sdk               # if using the Anthropic provider
pnpm add @google/generative-ai           # if using Google GenAI
```

## Quick start

```ts
import { Engine, defaultRouterConfig, asCampaignId } from "@sneq/engine";
import { sqliteRepository } from "@sneq/engine/sqlite";

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

## CLI usage (out-of-process consumers)

For agents that can't (or don't want to) embed the TypeScript library — Hermes-Agent
on Discord, scripts in other languages, smoke-test sessions — install the package and
use the `sneq-engine` binary. Every call reads/writes a single line of JSON on stdout.

```bash
# Create a campaign
sneq-engine init-campaign --db ./campaign.db --campaign sang-artemis \
  --args '{"name":"Le Sang dArtemis","embeddingDim":768}'

# Resolve a mention
sneq-engine lookup-entity --db ./campaign.db --campaign sang-artemis \
  --args '{"mention":"the blacksmith","type":"PERSONNAGE"}'

# Register a fact (observation provenance via --source preset)
sneq-engine register-fact --db ./campaign.db --campaign sang-artemis \
  --source gm-narration \
  --args '{"entityId":"ent_abc","attributeKey":"metier","category":"HISTORIQUE","value":{"type":"STRING","value":"capitaine"}}'

# Args via stdin work too
echo '{"entityId":"ent_abc"}' | sneq-engine get-entity --db ./campaign.db --campaign sang-artemis

# Probe whether a campaign is initialized (no throw on missing)
sneq-engine campaign-exists --db ./campaign.db --campaign sang-artemis

# Atomic wake-up bundle: scene + present entities + their facts in one call
sneq-engine prepare-turn --db ./campaign.db --campaign sang-artemis

# Validate a candidate narration before flushing to the player
sneq-engine validate-narration --db ./campaign.db --campaign sang-artemis \
  --args '{"narration":"Anya rejoint Jean à Dragonsreach.","strict":true}'
```

- 15 commands: the 10 tool dispatcher entries (`lookup-entity`, `get-entity`, `get-relevant-facts`, `suggest-existing`, `mention-entity`, `register-fact`, `add-constraint`, `collapse-attribute`, `set-scene`, `advance-turn`) plus three conveniences (`init-campaign`, `get-scene`, `campaign-exists`), one defensive validation command (`validate-narration`), and one orchestration command (`prepare-turn`).
- Exit codes: `0` on success, `1` on user/validation errors, `2` on internal errors.
- Errors emit `{"error":"…","code":"…","details":…}` on stdout — never on stderr.
- Provider keys (`ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, etc.) are read from env.
  Use `--config <path>` to override the router config.
- Run `sneq-engine --help` or `sneq-engine <command> --help` for usage details.
- Full spec: [`docs/superpowers/specs/2026-05-20-sneq-cli-design.md`](docs/superpowers/specs/2026-05-20-sneq-cli-design.md) (initial CLI) + [`docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md`](docs/superpowers/specs/2026-05-21-sneq-defensive-features-design.md) (defensive features).

## Wiring as agent tools

```ts
import { Engine } from "@sneq/engine";

// Get the tool schemas in the shape your model wants:
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
| [`docs/api.md`](./docs/api.md) | TypeScript developers — full API reference (TypeDoc-generated) |
| [`skills/sneq-narrative-engine.md`](./skills/sneq-narrative-engine.md) | Claude Code / Hermes / agent runtimes — when to invoke which tool |
| [`docs/superpowers/specs/`](./docs/superpowers/specs/) | V2 design spec (markdown + HTML brief) |
| [`docs/superpowers/plans/`](./docs/superpowers/plans/) | Implementation plan with per-task TDD steps |
| [`SNEQ/`](./SNEQ/) | Original v1 design docs (in French) — the conceptual foundation |

## Known deferred scope

V2 is intentionally minimal. The following are out-of-scope for this version and tracked for follow-ups:

- **`collapseAttribute` throws** — full attribute-collapse-with-validation-and-regeneration is deferred. For now, consumers compose `Router.chat` + `validateValue` + `registerFact` themselves (both are exported).
- **Pre-generation cache** — the v1 spec's elaborate predictor/cache for real-time RPGs. `PreGenerationHook` interface exists with a no-op default; the full implementation is a future version.
- **Convex / Postgres repository adapters** — only SQLite is shipped. The `Repository` interface is the documented contract.
- **Multi-PC / party support** — V2 assumes single-PC sessions.
- **HTTP / MCP gateway** — engine is in-process. Wrap trivially later if needed.
- **Consumer bindings** — TTRPG single-player app and Hermes-Agent MCP / skill integrations get their own follow-up specs.

## Project structure

```
SNEQ/                           v1 design docs (French)
src/                            engine source
  domain/                       branded IDs, Entity, AttributValue, GCN, etc.
  core/                         state machine, propagation, validation (pure)
  repository/{interface,sqlite/} Repository contract + SQLite reference impl
  router/{interface,router,providers/,defaults} Router + 4 providers
  resolver/{resolver,judge,thresholds,normalize} Layered cascade
  tools/{schemas,json-schema,adapters,dispatcher} Tool-call protocol
  hooks/{user-prompt,pre-generation} Extension points
  engine.ts, campaign.ts        Facade + CampaignContext
  config.ts, logger.ts, errors.ts, index.ts
test/                           51 unit tests + 1 env-gated integration smoke
docs/                           generated API + V2 design spec + plan
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
