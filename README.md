# @sneq/engine

Turn-based narrative-state engine for AI-narrated games. TypeScript bookkeeping library. The consumer owns the GM loop; this package owns canonical world state.

> Status: V2 in development. See `docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md` for the design spec.

## Install

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

## Wiring as agent tools

```ts
import { Engine } from "@sneq/engine";

const tools = Engine.tools.anthropic;     // ready for the Anthropic SDK
const tools2 = Engine.tools.openai;       // ready for OpenAI-compatible endpoints
const tools3 = Engine.tools.gemini;       // ready for Google GenAI

// When the model emits a tool call:
const result = await campaign.handleToolCall(name, args);
```

## Documentation

- **`docs/api.md`** — full API reference (generated from JSDoc / TypeDoc)
- **`skills/sneq-narrative-engine.md`** — agent skill (drop into your Hermes / Claude Code skills dir)
- **`docs/superpowers/specs/`** — design specs
- **`docs/superpowers/plans/`** — implementation plans

## Stack policy

This package's default router excludes OpenAI and xAI/Grok. The `custom` provider escape hatch lets the host wire anything they want; the defaults reflect the author's stack rules.

## License

MIT
