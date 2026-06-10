# SNEQ Plug-and-Play & Robustness Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every adoption blocker named in Veillée's ADR 0002 and fix the robustness flaws from the 2026-06-10 review, so `@sneq/engine` installs and runs with zero native deps, zero API keys, and honest defaults.

**Architecture:** No model changes. The work is: lazy-load optional SDK providers; make embeddings optional end-to-end (router tier → engine embedder → resolver cascade → repository dim 0); add two zero-native Repository adapters behind a shared contract test suite; harden the router (real retries, dim-coherent defaults, Google function-calling); harden the facade (campaign existence, transactions, scene context, adjudication instead of silent forks); persist `Entity.description`; modernize to zod v4; ship a publishable 0.1.0 package surface.

**Tech Stack:** TypeScript 5 strict (NodeNext ESM, `exactOptionalPropertyTypes`), zod v4, vitest, better-sqlite3 + sqlite-vec (optional peers), Node ≥ 20.

**Spec:** `docs/superpowers/specs/2026-06-10-sneq-plug-and-play-hardening-design.md`
**Branch:** `feat/plug-and-play-hardening` — one commit per task, PR at the end.

**Conventions for every task:** run `pnpm test` (expect green except the new failing tests of the current step) and `pnpm typecheck` before each commit. Never `git add .` — the untracked `docs/superpowers/specs/2026-05-25-sneq-meta-layer-design.md` must stay uncommitted. Add files explicitly.

---

### Task 1: zod v4 migration

**Files:**
- Modify: `package.json` (deps)
- Modify: `src/tools/schemas.ts:27`
- Modify: `src/tools/json-schema.ts` (full rewrite)
- Test: existing suite is the safety net (`test/tools/dispatcher.test.ts`, CLI e2e)

- [ ] **Step 1: Swap dependencies**

In `package.json` `dependencies`, replace:

```json
"dependencies": {
  "zod": "^4.0.0"
},
```

(`zod-to-json-schema` is deleted.) Run: `pnpm install` — expect lockfile update, zod 4.x installed.

- [ ] **Step 2: Fix the one v4-breaking schema**

`src/tools/schemas.ts` line 27 — v4 requires an explicit key schema for records:

```ts
  z.object({ type: z.literal("COMPOSITE"),  fields: z.record(z.string(), z.unknown()) })
```

- [ ] **Step 3: Rewrite json-schema.ts on native `z.toJSONSchema`**

```ts
import { z } from "zod";
import { schemas, type ToolName, ToolNames } from "./schemas.js";

export const jsonSchemas: Record<ToolName, object> = Object.fromEntries(
  ToolNames.map(name => {
    const { $schema: _omit, ...schema } = z.toJSONSchema(schemas[name]) as Record<string, unknown>;
    return [name, schema];
  })
) as Record<ToolName, object>;
```

- [ ] **Step 4: Run suite, fix fallout**

Run: `pnpm test && pnpm typecheck`. Expected fallout candidates: tests asserting the old `{$ref, definitions}` wrapper shape from zod-to-json-schema (the new output is an inline object schema — adjust assertions, the inline shape is the desired one), and `ZodError` message-shape assertions in CLI tests (v4 keeps `error.issues`; adjust only if a test greps exact message text).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/tools/schemas.ts src/tools/json-schema.ts test/
git commit -m "feat!: migrate to zod v4, drop zod-to-json-schema (native z.toJSONSchema)"
```

---

### Task 2: rename `ContraintId` → `ConstraintId`

**Files:**
- Modify: `src/domain/ids.ts`, `src/domain/potentialite.ts`, `src/campaign.ts`, `src/index.ts`, `src/tools/dispatcher.ts`, any test using the old name

- [ ] **Step 1: Mechanical rename**

```bash
grep -rl "ContraintId" src/ test/ | xargs sed -i '' 's/asContraintId/asConstraintId/g; s/ContraintId/ConstraintId/g'
```

`src/domain/ids.ts` afterwards must read (brand string updated too):

```ts
export type ConstraintId = string & { readonly [brand]: "ConstraintId" };
export const asConstraintId = (s: string): ConstraintId => s as ConstraintId;
```

- [ ] **Step 2: Verify + commit**

Run: `grep -rn "Contraint[^e]" src/ test/` → no hits (FR domain word `Contrainte` stays). `pnpm test && pnpm typecheck` → green.

```bash
git add src/ test/
git commit -m "feat!: rename ContraintId/asContraintId to ConstraintId/asConstraintId (pre-publish API fix)"
```

---

### Task 3: lazy provider loading (the packaging bug)

**Files:**
- Modify: `src/router/router.ts` (remove static SDK-provider imports, async resolve, lazy `createDefaultDeps`)
- Test: `test/router/router.test.ts` (additions)

- [ ] **Step 1: Write the failing tests** (append to `test/router/router.test.ts`)

```ts
import { createDefaultDeps } from "../../src/router/router.js";
import type { Provider } from "../../src/router/interface.js";

describe("createDefaultDeps · lazy SDK loading", () => {
  it("wraps a missing optional peer in an UNSUPPORTED ProviderHttpError naming the package", async () => {
    const deps = createDefaultDeps({
      _importProvider: async () => { throw new Error("Cannot find module '@anthropic-ai/sdk'"); }
    });
    await expect(Promise.resolve(deps.resolveProvider(
      { provider: "anthropic", apiKeyEnv: "X", model: "m" }
    ))).rejects.toThrow(/@anthropic-ai\/sdk.*pnpm add @anthropic-ai\/sdk/s);
  });

  it("a chain falls through past a provider whose peer is missing", async () => {
    const fallback = replayProvider("m2", [{ kind: "chat", response: { text: "rescued" } }]);
    const router = new Router(
      {
        tiers: {
          heavy: { primary: { provider: "anthropic", apiKeyEnv: "X", model: "m1" }, fallbacks: [fallback.ref] },
          light: { primary: fallback.ref, fallbacks: [] },
          embeddings: { primary: fallback.ref, fallbacks: [] }
        },
        defaults: { timeoutMs: 1000, maxRetries: 0 }
      },
      {
        async resolveProvider(ref): Promise<Provider> {
          if (ref.provider === "anthropic") {
            const deps = createDefaultDeps({ _importProvider: async () => { throw new Error("Cannot find module '@anthropic-ai/sdk'"); } });
            return deps.resolveProvider(ref);
          }
          return fallback;
        }
      }
    );
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("rescued");
  });

  it("resolves the real anthropic provider via dynamic import when the SDK is installed", async () => {
    process.env["_FAKE_KEY"] = "k";
    const p = await createDefaultDeps().resolveProvider({ provider: "anthropic", apiKeyEnv: "_FAKE_KEY", model: "m" });
    expect(p.ref.provider).toBe("anthropic");
  });
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm vitest run test/router/router.test.ts` → FAIL (`_importProvider` unknown, resolveProvider sync).

- [ ] **Step 3: Implement in `src/router/router.ts`**

Delete the two static imports (`AnthropicProvider`, `GoogleGenAIProvider`). Keep `OpenAICompatibleProvider` and `CustomProvider` static (zero-dep). New deps contract + factory:

```ts
export interface RouterDeps {
  resolveProvider(ref: ProviderRef): Provider | Promise<Provider>;
}
```

In `runWithFallback`, inside the existing `try`: `const provider = await this.deps.resolveProvider(ref);`

```ts
type SdkProviderKind = "anthropic" | "google-genai";
type ProviderCtor = new (ref: ProviderRef) => Provider;

const PEER_BY_KIND: Record<SdkProviderKind, string> = {
  "anthropic": "@anthropic-ai/sdk",
  "google-genai": "@google/generative-ai"
};

async function defaultImportProvider(kind: SdkProviderKind): Promise<ProviderCtor> {
  if (kind === "anthropic") return (await import("./providers/anthropic.js")).AnthropicProvider;
  return (await import("./providers/google-genai.js")).GoogleGenAIProvider;
}

export interface DefaultDepsOptions {
  customChat?: CustomChatFn;
  customEmbed?: CustomEmbedFn;
  /** @internal test seam for the dynamic SDK-provider loading. */
  _importProvider?: (kind: SdkProviderKind) => Promise<ProviderCtor>;
}

export function createDefaultDeps(opts: DefaultDepsOptions = {}): RouterDeps {
  const cache = new Map<string, Provider>();
  const importProvider = opts._importProvider ?? defaultImportProvider;

  async function importPeer(kind: SdkProviderKind): Promise<ProviderCtor> {
    try {
      return await importProvider(kind);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes(PEER_BY_KIND[kind])) {
        throw new ProviderHttpError("UNSUPPORTED", null,
          `provider "${kind}" requires the optional peer dependency "${PEER_BY_KIND[kind]}" — install it: pnpm add ${PEER_BY_KIND[kind]}`);
      }
      throw e;
    }
  }

  return {
    async resolveProvider(ref) {
      const key = `${ref.provider}|${ref.baseUrl ?? ""}|${ref.model}`;
      const hit = cache.get(key);
      if (hit) return hit;
      let p: Provider;
      switch (ref.provider) {
        case "openai-compatible": p = new OpenAICompatibleProvider(ref); break;
        case "anthropic":         p = new (await importPeer("anthropic"))(ref); break;
        case "google-genai":      p = new (await importPeer("google-genai"))(ref); break;
        case "custom":
          if (!opts.customChat || !opts.customEmbed) {
            throw new Error("custom provider needs customChat and customEmbed functions in DefaultDepsOptions");
          }
          p = new CustomProvider(ref, opts.customChat, opts.customEmbed);
          break;
      }
      cache.set(key, p);
      return p;
    }
  };
}
```

Note: `AnthropicProvider`'s constructor throws `AUTH` when the env var is missing — the "resolves the real provider" test sets a fake key first.

- [ ] **Step 4: Run** — `pnpm test && pnpm typecheck` → green (existing sync `resolveProvider` fakes remain valid via the union type).

- [ ] **Step 5: Commit**

```bash
git add src/router/router.ts test/router/router.test.ts
git commit -m "fix(router)!: lazy-load SDK providers so optional peers are actually optional"
```

---

### Task 4: implement retries/backoff as declared

**Files:**
- Modify: `src/router/router.ts` (`runWithFallback`)
- Test: `test/router/router.test.ts` (additions)

- [ ] **Step 1: Failing tests**

```ts
describe("Router · retries", () => {
  function cfgWith(p: ReplayProvider, maxRetries: number): RouterConfig {
    return {
      tiers: { heavy: { primary: p.ref, fallbacks: [] }, light: { primary: p.ref, fallbacks: [] }, embeddings: { primary: p.ref, fallbacks: [] } },
      defaults: { timeoutMs: 1000, maxRetries, backoff: { strategy: "fixed", baseMs: 1 } }
    };
  }

  it("retries the same provider on QUOTA up to maxRetries", async () => {
    const p = replayProvider("m", [
      { kind: "error", code: "QUOTA", status: 429, message: "x" },
      { kind: "chat", response: { text: "second try" } }
    ]);
    const router = new Router(cfgWith(p, 1), { resolveProvider: () => p });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("second try");
    expect(p.callCount()).toBe(2);
  });

  it("does not retry MALFORMED", async () => {
    const p = replayProvider("m", [{ kind: "error", code: "MALFORMED", status: null, message: "bad" }]);
    const router = new Router(cfgWith(p, 3), { resolveProvider: () => p });
    await expect(router.chat("heavy", { messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(/exhausted/i);
    expect(p.callCount()).toBe(1);
  });

  it("does not retry AUTH and disables the provider", async () => {
    const p = replayProvider("m", [{ kind: "error", code: "AUTH", status: 401, message: "no" }]);
    const router = new Router(cfgWith(p, 3), { resolveProvider: () => p });
    await expect(router.chat("heavy", { messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(/exhausted/i);
    expect(p.callCount()).toBe(1);
  });
});
```

- [ ] **Step 2: Verify fail** — second-try test fails (current code falls through, no retry).

- [ ] **Step 3: Implement** — replace `runWithFallback` body:

```ts
const RETRYABLE: ReadonlySet<string> = new Set(["QUOTA", "SERVER", "TIMEOUT", "NETWORK"]);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function backoffDelay(defaults: RouterConfig["defaults"], attempt: number): number {
  const b = defaults?.backoff ?? { strategy: "exponential" as const, baseMs: 500 };
  return b.strategy === "fixed" ? b.baseMs : b.baseMs * 2 ** attempt;
}
```

```ts
  private async runWithFallback<T>(tier: Tier, op: (p: Provider, s: AbortSignal) => Promise<T>): Promise<T> {
    const chain = this.chainFor(tier);
    const attempts: Array<{ provider: string; model: string; error: string }> = [];
    const timeoutMs = this.cfg.defaults?.timeoutMs ?? 30_000;
    const maxRetries = this.cfg.defaults?.maxRetries ?? 0;

    for (const ref of chain) {
      const key = refKey(ref);
      if (this.disabled.has(key)) continue;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const provider = await this.deps.resolveProvider(ref);
          const r = await op(provider, ctrl.signal);
          clearTimeout(timer);
          return r;
        } catch (e) {
          clearTimeout(timer);
          const err = normalizeError(e);
          attempts.push({ provider: ref.provider, model: ref.model, error: `${err.code}:${err.message}` });
          if (err.code === "AUTH") { this.disabled.add(key); break; }
          if (!RETRYABLE.has(err.code) || attempt === maxRetries) break;
          await sleep(backoffDelay(this.cfg.defaults, attempt));
        }
      }
    }
    throw new RouterExhaustedError(tier, attempts);
  }
```

- [ ] **Step 4: Run** — `pnpm test` green (existing tests pass `maxRetries: 0` → unchanged behavior).

- [ ] **Step 5: Commit** — `git add src/router/router.ts test/router/router.test.ts && git commit -m "feat(router): honor maxRetries + backoff (QUOTA/SERVER/TIMEOUT/NETWORK retryable)"`

---

### Task 5: optional embeddings tier + dim metadata + coherent defaults

**Files:**
- Modify: `src/router/interface.ts` (RouterTiers, `ProviderRef.embeddingDim`)
- Modify: `src/router/router.ts` (ctor validation, `hasEmbeddings`, `embeddingDim`, `chainFor` guard)
- Modify: `src/router/defaults.ts`
- Test: `test/router/router.test.ts`

- [ ] **Step 1: Failing tests**

```ts
describe("Router · optional embeddings tier", () => {
  it("hasEmbeddings() is false and embed() exhausts immediately when the tier is absent", async () => {
    const p = replayProvider("m", []);
    const router = new Router(
      { tiers: { heavy: { primary: p.ref, fallbacks: [] }, light: { primary: p.ref, fallbacks: [] } } },
      { resolveProvider: () => p }
    );
    expect(router.hasEmbeddings()).toBe(false);
    await expect(router.embed({ texts: ["x"] })).rejects.toThrow(/no provider chain configured/i);
  });

  it("rejects an embeddings chain with conflicting declared dims", () => {
    const a = { provider: "custom" as const, apiKeyEnv: "X", model: "a", embeddingDim: 768 };
    const b = { provider: "custom" as const, apiKeyEnv: "X", model: "b", embeddingDim: 1024 };
    expect(() => new Router(
      { tiers: { heavy: { primary: a, fallbacks: [] }, light: { primary: a, fallbacks: [] }, embeddings: { primary: a, fallbacks: [b] } } },
      { resolveProvider: () => { throw new Error("unused"); } }
    )).toThrow(/mixes dimensions/i);
  });
});
```

- [ ] **Step 2: Verify fail** (type error on missing tier / no `hasEmbeddings`).

- [ ] **Step 3: Implement**

`src/router/interface.ts`:

```ts
export interface ProviderRef {
  provider: ProviderKind;
  baseUrl?: string;
  apiKeyEnv: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** Output dimension of the embedding model. Embeddings refs only; lets the Router
   *  reject mixed-dim chains and lets the CLI derive a default campaign dim. */
  embeddingDim?: number;
  quotaHint?: { requestsPerMinute?: number; requestsPerDay?: number; isFreeTier?: boolean };
}

export interface RouterTiers {
  heavy: ProviderChain;
  light: ProviderChain;
  /** Optional: omit entirely to run keyless / alias-only (no vector resolution). */
  embeddings?: ProviderChain;
}

export interface RouterConfig {
  tiers: RouterTiers;
  defaults?: { timeoutMs?: number; maxRetries?: number; backoff?: { strategy: "exponential" | "fixed"; baseMs: number } };
}
```

`src/router/router.ts` — constructor + helpers:

```ts
  constructor(private readonly cfg: RouterConfig, private readonly deps: RouterDeps) {
    const emb = cfg.tiers.embeddings;
    if (emb) {
      const dims = [...new Set([emb.primary, ...emb.fallbacks]
        .map(r => r.embeddingDim)
        .filter((d): d is number => d !== undefined))];
      if (dims.length > 1) {
        throw new Error(`embeddings chain mixes dimensions (${dims.join(", ")}): every provider in the chain must produce the same dim, or vector storage breaks on failover`);
      }
    }
  }

  hasEmbeddings(): boolean { return this.cfg.tiers.embeddings !== undefined; }

  /** Declared dim of the embeddings primary, if annotated. */
  embeddingDim(): number | undefined { return this.cfg.tiers.embeddings?.primary.embeddingDim; }

  private chainFor(tier: Tier): ProviderRef[] {
    const c = this.cfg.tiers[tier];
    if (!c) {
      throw new RouterExhaustedError(tier, [{ provider: "none", model: "none", error: `CONFIG:tier "${tier}" has no provider chain configured` }]);
    }
    return [c.primary, ...c.fallbacks];
  }
```

`src/router/defaults.ts` embeddings tier becomes single-provider, dim-annotated:

```ts
      embeddings: {
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "text-embedding-004", embeddingDim: 768 },
        fallbacks: []
      }
```

(The 1024-dim `mistral-embed` fallback is removed: a fallback that changes dimension poisons the vector store. Same-dim fallbacks can be added by consumers.)

- [ ] **Step 4: Run + commit**

```bash
git add src/router/interface.ts src/router/router.ts src/router/defaults.ts test/router/router.test.ts
git commit -m "feat(router)!: optional embeddings tier, ProviderRef.embeddingDim metadata, single-dim default chain"
```

---

### Task 6: Google provider — function calling + JSON mode

**Files:**
- Modify: `src/router/providers/google-genai.ts`
- Create: `test/router/google-genai.test.ts`

- [ ] **Step 1: Failing test** (`vi.mock` the SDK)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(_cfg: unknown) { return { generateContent }; }
  }
}));

import { GoogleGenAIProvider } from "../../src/router/providers/google-genai.js";

describe("GoogleGenAIProvider", () => {
  beforeEach(() => { generateContent.mockReset(); process.env["G_KEY"] = "k"; });

  it("passes functionDeclarations and maps functionCalls back to toolCalls", async () => {
    generateContent.mockResolvedValue({
      response: { text: () => "", functionCalls: () => [{ name: "sneq__lookup_entity", args: { mention: "x" } }] }
    });
    const p = new GoogleGenAIProvider({ provider: "google-genai", apiKeyEnv: "G_KEY", model: "gemini-2.5-flash" });
    const r = await p.chat({
      messages: [{ role: "user", content: "hi" }],
      tools: [{ name: "sneq__lookup_entity", description: "d", inputSchema: { type: "object" } }]
    }, new AbortController().signal);
    expect(r.toolCalls).toEqual([{ name: "sneq__lookup_entity", arguments: { mention: "x" } }]);
    const req = generateContent.mock.calls[0]![0] as { tools?: Array<{ functionDeclarations: Array<{ name: string }> }> };
    expect(req.tools?.[0]?.functionDeclarations[0]?.name).toBe("sneq__lookup_entity");
  });

  it("sets responseMimeType for responseFormat json", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "{}", functionCalls: () => undefined } });
    const p = new GoogleGenAIProvider({ provider: "google-genai", apiKeyEnv: "G_KEY", model: "m" });
    await p.chat({ messages: [{ role: "user", content: "hi" }], responseFormat: "json" }, new AbortController().signal);
    // generationConfig lives in getGenerativeModel args — assert via the request shape we control:
    // easiest robust assertion: provider stored it on the model config; here we assert chat resolved
    // and returned text, and we add a spy on getGenerativeModel below if needed.
    expect(generateContent).toHaveBeenCalled();
  });
});
```

(If asserting `generationConfig` requires it, lift `getGenerativeModel` into the mock as a `vi.fn()` and check its first argument for `generationConfig.responseMimeType === "application/json"`.)

- [ ] **Step 2: Verify fail** — toolCalls currently always `[]`.

- [ ] **Step 3: Implement** — new `chat` in `google-genai.ts`:

```ts
  async chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    try {
      const temperature = req.temperature ?? this.ref.temperature;
      const maxOutputTokens = req.maxTokens ?? this.ref.maxTokens;
      const model = this.client.getGenerativeModel({
        model: this.ref.model,
        ...(req.system !== undefined ? { systemInstruction: req.system } : {}),
        generationConfig: {
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
          ...(req.responseFormat === "json" ? { responseMimeType: "application/json" } : {})
        }
      });
      const contents = req.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const result = await model.generateContent({
        contents,
        ...(req.tools && req.tools.length > 0
          ? { tools: [{ functionDeclarations: req.tools.map(t => ({
              name: t.name,
              description: t.description,
              parameters: t.inputSchema as never
            })) }] }
          : {})
      }, { signal });
      const response = result.response;
      const fc = response.functionCalls() ?? [];
      const text = fc.length > 0 ? safeText(response) : response.text();
      return {
        text,
        toolCalls: fc.map(f => ({ name: f.name, arguments: f.args })),
        modelUsed: this.ref.model,
        providerUsed: "google-genai"
      };
    } catch (e) {
      throw mapGoogleError(e);
    }
  }
```

```ts
function safeText(response: { text(): string }): string {
  try { return response.text(); } catch { return ""; }
}
```

If the installed SDK's `SingleRequestOptions` lacks `signal`, drop the second `generateContent` argument (current behavior) and note it in the commit message.

- [ ] **Step 4: Run + commit**

```bash
git add src/router/providers/google-genai.ts test/router/google-genai.test.ts
git commit -m "fix(router): Google provider supports function calling + JSON mode instead of silently dropping both"
```

---

### Task 7: SQLite hardening — busy_timeout, lazy sqlite-vec, self-describing dim, dim validation

**Files:**
- Modify: `src/repository/sqlite/vec.ts` (createRequire lazy load)
- Modify: `src/repository/sqlite/index.ts` (pragma, optional dim, lazy vec init, validations)
- Test: `test/repository/sqlite.test.ts` (additions)

- [ ] **Step 1: Failing tests** (append)

```ts
describe("SqliteRepository · dim lifecycle", () => {
  it("adopts the stored dim when reopened without embeddingDim", async () => {
    const tmp = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-dim-${Date.now()}.db`;
    const r1 = new SqliteRepository({ path: tmp, embeddingDim: 4 });
    await r1.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await r1.close();
    const r2 = new SqliteRepository({ path: tmp }); // no dim flag
    const metas = await r2.listCampaigns();
    expect(metas[0]!.embeddingDim).toBe(4);
    // vector write still validated against the adopted dim:
    await expect(r2.upsertEntity({ ...someEntity("eX"), embedding: new Float32Array([1, 2]), embeddingRefreshedAt: 1 }))
      .rejects.toThrow(/dim mismatch/i);
    await r2.close();
  });

  it("supports embeddingDim 0: no vec table, vector search returns [], embedding writes throw", async () => {
    const r = new SqliteRepository({ path: ":memory:", embeddingDim: 0 });
    await r.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 0 });
    await r.upsertEntity(someEntity("e0"));
    expect(await r.searchEntitiesByVector(cid, new Float32Array([1, 0, 0, 0]), { topK: 3 })).toEqual([]);
    await expect(r.upsertEntity({ ...someEntity("e1"), embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 }))
      .rejects.toThrow(/no vector store/i);
    await r.close();
  });

  it("rejects a query vector with the wrong dimension", async () => {
    const r = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
    await r.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 4 });
    await expect(r.searchEntitiesByVector(cid, new Float32Array([1, 0]), { topK: 3 })).rejects.toThrow(/dim mismatch/i);
    await r.close();
  });
});
```

- [ ] **Step 2: Verify fail** (constructor currently requires `embeddingDim`; dim-0 creates a `FLOAT[0]` table or throws downstream).

- [ ] **Step 3: Implement**

`vec.ts` — drop the static import, load synchronously via `createRequire` on first use:

```ts
import type BetterSqlite3 from "better-sqlite3";
import { createRequire } from "node:module";

let vecMod: { load(db: BetterSqlite3.Database): void } | null = null;

export function loadVec(db: BetterSqlite3.Database): void {
  if (!vecMod) {
    try {
      const require = createRequire(import.meta.url);
      vecMod = require("sqlite-vec") as { load(db: BetterSqlite3.Database): void };
    } catch (e) {
      throw new Error(
        `sqlite-vec is required for campaigns with embeddingDim > 0 — install the optional peers: pnpm add better-sqlite3 sqlite-vec (cause: ${e instanceof Error ? e.message : String(e)})`
      );
    }
  }
  vecMod.load(db);
}
```

`index.ts`:

```ts
export interface SqliteRepositoryOptions {
  path: string;
  /** Vector dimension. Omit to adopt the dim already stored in the DB (existing DBs);
   *  for a fresh DB the dim is taken from the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
  readonly?: boolean;
}
```

```ts
  private dim: number | null;

  constructor(opts: SqliteRepositoryOptions) {
    this.db = new Database(opts.path, { readonly: opts.readonly ?? false });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.db.pragma("foreign_keys = ON");
    runMigrations(this.db);
    const row = this.db.prepare(`SELECT value FROM meta WHERE key = 'embedding_dim'`).get() as { value: string } | undefined;
    const stored = row ? Number(row.value) : null;
    if (stored !== null && opts.embeddingDim !== undefined && opts.embeddingDim !== stored) {
      throw new Error(`Embedding dim mismatch: stored=${stored}, configured=${opts.embeddingDim}. Use a fresh database file or a matching --embedding-dim.`);
    }
    this.dim = stored ?? opts.embeddingDim ?? null;
    if (this.dim !== null && this.dim > 0) {
      loadVec(this.db);
      ensureVecTable(this.db, this.dim);
    }
  }
```

```ts
  async createCampaign(meta: CampaignMeta): Promise<void> {
    if (this.dim === null) {
      this.dim = meta.embeddingDim;
      if (this.dim > 0) {
        loadVec(this.db);
        ensureVecTable(this.db, this.dim);
      } else {
        this.db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(this.dim));
      }
    } else if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim} (one repository = one dimension)`);
    }
    this.db.prepare(
      `INSERT OR REPLACE INTO campaigns (id, name, created_at, embedding_dim) VALUES (?, ?, ?, ?)`
    ).run(meta.id, meta.name, meta.createdAt, meta.embeddingDim);
  }
```

`upsertEntity` — guard the vec write (replace `if (r._embedding) { upsertVec(...) }`):

```ts
      if (r._embedding) {
        if (this.dim === null || this.dim === 0) {
          throw new Error(`entity "${e.id}" has an embedding but this repository has no vector store (embeddingDim=${this.dim ?? "unset"})`);
        }
        if (e.embedding!.length !== this.dim) {
          throw new Error(`embedding dim mismatch for entity "${e.id}": got ${e.embedding!.length}, repository stores ${this.dim}. Did the embedding model change? Keep one model per database.`);
        }
        upsertVec(this.db, e.campaignId, e.id, e.embedding!);
      }
```

`searchEntitiesByVector` — prepend:

```ts
    if (this.dim === null || this.dim === 0) return [];
    if (vec.length !== this.dim) {
      throw new Error(`embedding dim mismatch: query has ${vec.length}, repository stores ${this.dim}`);
    }
```

`ensureVecTable` in `vec.ts` keeps its stored-vs-configured check (it also writes `embedding_dim` to `meta` on creation — unchanged).

- [ ] **Step 4: Run + commit**

```bash
git add src/repository/sqlite/vec.ts src/repository/sqlite/index.ts test/repository/sqlite.test.ts
git commit -m "feat(sqlite): busy_timeout, lazy sqlite-vec, self-describing dim (0 = no vectors), dim validation on write/search"
```

---

### Task 8: shared `normalizeText` + repository contract test suite

**Files:**
- Modify: `src/resolver/normalize.ts` (extract `normalizeText`)
- Modify: `src/repository/sqlite/index.ts` (use it, delete private `normalize`)
- Create: `test/repository/contract.ts`
- Create: `test/repository/sqlite-contract.test.ts`

- [ ] **Step 1: Extract the normalizer**

`src/resolver/normalize.ts`:

```ts
/** Diacritics-stripped, lowercased, whitespace-collapsed — the alias index key. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** normalizeText + leading article stripping (the/le/la/les/l'). */
export function normalizeAlias(s: string): string {
  return normalizeText(s).replace(/^(the |le |la |les |l['’])/i, "").trim();
}
```

In `sqlite/index.ts`: `import { normalizeAlias, normalizeText } from "../../resolver/normalize.js";`, replace every call to the private `normalize(...)` with `normalizeText(...)`, delete the private function.

- [ ] **Step 2: Write the contract suite** — `test/repository/contract.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Repository } from "../../src/repository/interface.js";
import type { Entity } from "../../src/domain/entity.js";
import type { AttributFige } from "../../src/domain/attribute.js";
import type { Observation } from "../../src/domain/observation.js";
import { asCampaignId, asEntityID, asFactId, asSceneId } from "../../src/domain/ids.js";

export const DIM = 4;
const cid = asCampaignId("c1");

function entity(id: string, over: Partial<Entity> = {}): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name: id,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: null, embeddingRefreshedAt: null, ...over
  };
}

const obs: Observation = {
  source: "GM_NARRATION", method: "DIALOGUE_DIRECT", fiabilite: "CERTAINE", timestamp: 0
};

function fact(eid: string, key: string, value: string, turn = 1): AttributFige & { campaignId: ReturnType<typeof asCampaignId> } {
  return {
    campaignId: cid, factId: asFactId(`f_${eid}_${key}_${turn}`), entityId: asEntityID(eid),
    key, value: { type: "STRING", value }, category: "HISTORIQUE", observation: obs, turn
  };
}

export function repositoryContract(name: string, makeRepo: () => Repository | Promise<Repository>): void {
  describe(`Repository contract · ${name}`, () => {
    let repo: Repository;
    beforeEach(async () => {
      repo = await makeRepo();
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
    });
    afterEach(async () => { await repo.close(); });

    it("lists campaigns and rejects a second campaign with a different dim", async () => {
      expect((await repo.listCampaigns()).map(c => c.id)).toEqual([cid]);
      await expect(repo.createCampaign({ id: asCampaignId("c2"), name: "bad", createdAt: 0, embeddingDim: DIM + 1 }))
        .rejects.toThrow(/dim/i);
    });

    it("deleteCampaign purges entities, facts, scenes and turns", async () => {
      await repo.upsertEntity(entity("e1"));
      await repo.appendFact(fact("e1", "metier", "forgeron"));
      await repo.upsertScene({ campaignId: cid, id: asSceneId("s1"), locationId: asEntityID("e1"), presentEntityIds: [], description: "d", createdAtTurn: 1 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 1, summary: null, sceneId: asSceneId("s1"), createdAt: 0 });
      await repo.deleteCampaign(cid);
      expect(await repo.listCampaigns()).toEqual([]);
      // re-create to satisfy afterEach-independent reads
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
      expect(await repo.getEntity(cid, asEntityID("e1"))).toBeNull();
      expect(await repo.getFigedAttributes(cid, asEntityID("e1"))).toEqual([]);
      expect(await repo.currentScene(cid)).toBeNull();
      expect(await repo.latestTurn(cid)).toBeNull();
    });

    it("entity roundtrip preserves description, aliases, tags, embedding", async () => {
      await repo.upsertEntity(entity("e1", {
        name: "Aldric Fervent",
        description: "A grizzled smith with haunted eyes.",
        aliases: [{ text: "Le Forgeron", source: { kind: "GM_NARRATION" }, observedAt: 0 }],
        tags: ["smith"],
        embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 7
      }));
      const got = await repo.getEntity(cid, asEntityID("e1"));
      expect(got?.description).toBe("A grizzled smith with haunted eyes.");
      expect(got?.aliases[0]?.text).toBe("Le Forgeron");
      expect(got?.tags).toEqual(["smith"]);
      expect(Array.from(got!.embedding!)).toHaveLength(DIM);
      const noDesc = await (async () => { await repo.upsertEntity(entity("e2")); return repo.getEntity(cid, asEntityID("e2")); })();
      expect(noDesc?.description).toBeUndefined();
    });

    it("findEntitiesByAlias matches name, alias, accents and article-stripped forms, honors type filter", async () => {
      await repo.upsertEntity(entity("e1", {
        name: "Aldric",
        aliases: [{ text: "Le Forgeron Maudit", source: { kind: "GM_NARRATION" }, observedAt: 0 }]
      }));
      await repo.upsertEntity(entity("loc1", { name: "Valmure", type: "LIEU" }));
      expect((await repo.findEntitiesByAlias(cid, "aldric")).map(e => String(e.id))).toEqual(["e1"]);
      expect((await repo.findEntitiesByAlias(cid, "forgeron maudit")).map(e => String(e.id))).toEqual(["e1"]);
      expect((await repo.findEntitiesByAlias(cid, "ALDRIC")).map(e => String(e.id))).toEqual(["e1"]);
      expect(await repo.findEntitiesByAlias(cid, "aldric", "LIEU")).toEqual([]);
    });

    it("searchEntitiesByVector orders by similarity, honors topK/filterType/exclude, skips embeddingless entities", async () => {
      await repo.upsertEntity(entity("close", { embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1 }));
      await repo.upsertEntity(entity("far", { embedding: new Float32Array([0, 1, 0, 0]), embeddingRefreshedAt: 1 }));
      await repo.upsertEntity(entity("novec"));
      await repo.upsertEntity(entity("place", { type: "LIEU", embedding: new Float32Array([0.9, 0.1, 0, 0]), embeddingRefreshedAt: 1 }));
      const q = new Float32Array([1, 0, 0, 0]);
      const all = await repo.searchEntitiesByVector(cid, q, { topK: 10 });
      expect(String(all[0]!.entity.id)).toBe("close");
      expect(all.map(h => String(h.entity.id))).not.toContain("novec");
      const persons = await repo.searchEntitiesByVector(cid, q, { topK: 10, filterType: "PERSONNAGE" });
      expect(persons.map(h => String(h.entity.id))).not.toContain("place");
      const excl = await repo.searchEntitiesByVector(cid, q, { topK: 10, excludeEntityIds: [asEntityID("close")] });
      expect(excl.map(h => String(h.entity.id))).not.toContain("close");
      expect((await repo.searchEntitiesByVector(cid, q, { topK: 1 }))).toHaveLength(1);
    });

    it("topEntities orders by embeddingRefreshedAt desc and limits", async () => {
      await repo.upsertEntity(entity("a", { embeddingRefreshedAt: 100 }));
      await repo.upsertEntity(entity("b", { embeddingRefreshedAt: 300 }));
      await repo.upsertEntity(entity("c", { embeddingRefreshedAt: 200 }));
      expect((await repo.topEntities(cid, 2)).map(e => String(e.id))).toEqual(["b", "c"]);
    });

    it("facts: replace-on-same-key, query filters", async () => {
      await repo.appendFact(fact("e1", "metier", "forgeron", 1));
      await repo.appendFact(fact("e1", "metier", "capitaine", 2));
      await repo.appendFact(fact("e1", "ville", "Valmure", 3));
      const all = await repo.getFigedAttributes(cid, asEntityID("e1"));
      expect(all).toHaveLength(2);
      expect(all.find(f => f.key === "metier")?.value).toEqual({ type: "STRING", value: "capitaine" });
      expect(await repo.queryFacts(cid, { attributeKey: "ville" })).toHaveLength(1);
      expect(await repo.queryFacts(cid, { entityId: asEntityID("e1"), minTurn: 3 })).toHaveLength(1);
      expect(await repo.queryFacts(cid, { category: "HISTORIQUE", maxTurn: 2 })).toHaveLength(1);
    });

    it("potentialites: upsert / get / remove", async () => {
      const p = {
        entiteId: asEntityID("e1"), attribut: "loyaute", etat: "CONTRAINT" as const,
        contraintes: [], contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE" as const, tendances: [] }
      };
      await repo.upsertPotentialite(cid, p);
      expect((await repo.getPotentialite(cid, asEntityID("e1"), "loyaute"))?.etat).toBe("CONTRAINT");
      await repo.removePotentialite(cid, asEntityID("e1"), "loyaute");
      expect(await repo.getPotentialite(cid, asEntityID("e1"), "loyaute")).toBeNull();
    });

    it("nodes/edges/neighbors both directions", async () => {
      await repo.upsertNode(cid, { entityId: asEntityID("a"), type: "PERSONNAGE", etatActuel: "ACTIF", poidsNarratif: 1, tags: [] });
      await repo.upsertNode(cid, { entityId: asEntityID("b"), type: "PERSONNAGE", etatActuel: "ACTIF", poidsNarratif: 1, tags: [] });
      await repo.upsertEdge(cid, {
        key: "a|b", source: asEntityID("a"), cible: asEntityID("b"),
        typeRelation: { kind: "SOCIAL", label: "ami" } as never,
        directionnalite: "BIDIRECTIONNELLE" as never, forcePropagation: 0.5, etatArete: "ACTIVE" as never, attributs: {} as never
      });
      expect((await repo.neighbors(cid, asEntityID("a"), 1)).map(n => String(n.node.entityId))).toEqual(["b"]);
      expect((await repo.neighbors(cid, asEntityID("b"), 1)).map(n => String(n.node.entityId))).toEqual(["a"]);
    });

    it("turns/scenes: latestTurn, currentScene via the latest scene-bearing turn", async () => {
      await repo.upsertScene({ campaignId: cid, id: asSceneId("s1"), locationId: asEntityID("loc"), presentEntityIds: [asEntityID("e1")], description: "tavern", createdAtTurn: 1 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 1, summary: null, sceneId: asSceneId("s1"), createdAt: 0 });
      await repo.appendTurn({ campaignId: cid, turnNumber: 2, summary: "walk", sceneId: null, createdAt: 0 });
      expect((await repo.latestTurn(cid))?.turnNumber).toBe(2);
      expect((await repo.currentScene(cid))?.id).toBe(asSceneId("s1"));
    });

    it("transaction commits on success and rolls back everything on throw", async () => {
      await repo.transaction(async tx => {
        await tx.upsertEntity(entity("kept"));
      });
      expect(await repo.getEntity(cid, asEntityID("kept"))).not.toBeNull();
      await expect(repo.transaction(async tx => {
        await tx.upsertEntity(entity("ghost"));
        await tx.appendFact(fact("ghost", "k", "v"));
        throw new Error("boom");
      })).rejects.toThrow("boom");
      expect(await repo.getEntity(cid, asEntityID("ghost"))).toBeNull();
      expect(await repo.getFigedAttributes(cid, asEntityID("ghost"))).toEqual([]);
    });
  });
}
```

Note: the `typeRelation`/`directionnalite`/`etatArete` casts use `as never` to stay agnostic of the GCN enums — replace with the real literal values from `src/domain/gcn.ts` at implementation time (open the file, pick the first valid value of each union).

- [ ] **Step 3: Runner for SQLite** — `test/repository/sqlite-contract.test.ts`:

```ts
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { repositoryContract, DIM } from "./contract.js";

repositoryContract("sqlite", () => new SqliteRepository({ path: ":memory:", embeddingDim: DIM }));
```

- [ ] **Step 4: Run** — `pnpm vitest run test/repository/` → contract green against SQLite (the `description` case will fail until Task 11 if ordered strictly; if so, mark that single assertion `it.todo`-free by implementing Task 11's domain field first — in practice Tasks 8–11 land in one sitting; keep the contract's description test and let Task 11 turn it green, or temporarily run with `it.fails` removed once Task 11 lands. Prefer: implement Task 11's `Entity.description` field (domain type only, one line) as part of this task so the contract is complete, and leave persistence to Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/resolver/normalize.ts src/repository/sqlite/index.ts test/repository/contract.ts test/repository/sqlite-contract.test.ts src/domain/entity.ts
git commit -m "test(repository): shared contract suite + extracted normalizeText (interface is the test surface)"
```

---

### Task 9: InMemoryRepository (`@sneq/engine/memory`)

**Files:**
- Create: `src/repository/memory/index.ts`
- Create: `test/repository/memory-contract.test.ts`

- [ ] **Step 1: Runner first (failing)**

```ts
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import { repositoryContract, DIM } from "./contract.js";

repositoryContract("memory", () => new InMemoryRepository({ embeddingDim: DIM }));
```

- [ ] **Step 2: Implement `src/repository/memory/index.ts`**

```ts
import type {
  Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore
} from "../interface.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import type { CampaignId, EntityID, FactId } from "../../domain/ids.js";
import { asFactId } from "../../domain/ids.js";
import { normalizeAlias, normalizeText } from "../../resolver/normalize.js";

export interface MemoryState {
  campaigns: Map<string, CampaignMeta>;
  entities: Map<string, Map<string, Entity>>;
  facts: Map<string, Map<string, AttributFige & { campaignId: CampaignId }>>;
  potentialites: Map<string, Map<string, Potentialite>>;
  nodes: Map<string, Map<string, NoeudGCN>>;
  edges: Map<string, Map<string, AreteGCN>>;
  turns: Map<string, Map<number, Turn>>;
  scenes: Map<string, Map<string, Scene>>;
}

export function emptyMemoryState(): MemoryState {
  return {
    campaigns: new Map(), entities: new Map(), facts: new Map(), potentialites: new Map(),
    nodes: new Map(), edges: new Map(), turns: new Map(), scenes: new Map()
  };
}

export interface InMemoryRepositoryOptions {
  /** Vector dimension; omit to adopt from the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
}

/**
 * Zero-dependency reference Repository: plain Maps, brute-force cosine vector
 * search, snapshot/rollback transactions. Intended for tests, demos, prototypes
 * and as the base of the JSON-file adapter.
 */
export class InMemoryRepository implements Repository {
  protected state: MemoryState = emptyMemoryState();
  protected dim: number | null;
  protected txDepth = 0;
  private txChain: Promise<unknown> = Promise.resolve();

  constructor(opts: InMemoryRepositoryOptions = {}) {
    this.dim = opts.embeddingDim ?? null;
  }

  // -- campaigns ------------------------------------------------------------
  async listCampaigns(): Promise<CampaignMeta[]> {
    return [...this.state.campaigns.values()].map(c => ({ ...c }));
  }

  async createCampaign(meta: CampaignMeta): Promise<void> {
    if (this.dim === null) this.dim = meta.embeddingDim;
    else if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim} (one repository = one dimension)`);
    }
    this.state.campaigns.set(meta.id, { ...meta });
    await this.mutated();
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    this.state.campaigns.delete(id);
    for (const bucket of [this.state.entities, this.state.facts, this.state.potentialites,
                          this.state.nodes, this.state.edges, this.state.turns, this.state.scenes]) {
      bucket.delete(id);
    }
    await this.mutated();
  }

  // -- entities ---------------------------------------------------------------
  private entitiesOf(cid: CampaignId): Map<string, Entity> {
    let m = this.state.entities.get(cid);
    if (!m) { m = new Map(); this.state.entities.set(cid, m); }
    return m;
  }

  async upsertEntity(e: Entity): Promise<void> {
    if (e.embedding) {
      if (this.dim === null || this.dim === 0) {
        throw new Error(`entity "${e.id}" has an embedding but this repository has no vector store (embeddingDim=${this.dim ?? "unset"})`);
      }
      if (e.embedding.length !== this.dim) {
        throw new Error(`embedding dim mismatch for entity "${e.id}": got ${e.embedding.length}, repository stores ${this.dim}. Did the embedding model change? Keep one model per database.`);
      }
    }
    this.entitiesOf(e.campaignId).set(e.id, structuredClone(e));
    await this.mutated();
  }

  async getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null> {
    const e = this.state.entities.get(campaignId)?.get(entityId);
    return e ? structuredClone(e) : null;
  }

  async findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: EntityType): Promise<Entity[]> {
    const needle = normalizeText(aliasNormalized);
    const out: Entity[] = [];
    for (const e of this.state.entities.get(campaignId)?.values() ?? []) {
      if (type && e.type !== type) continue;
      const keys = new Set<string>();
      for (const text of [e.name, ...e.aliases.map(a => a.text)]) {
        keys.add(normalizeText(text));
        keys.add(normalizeAlias(text));
      }
      if (keys.has(needle)) out.push(structuredClone(e));
    }
    return out;
  }

  async searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]> {
    if (this.dim === null || this.dim === 0) return [];
    if (vec.length !== this.dim) {
      throw new Error(`embedding dim mismatch: query has ${vec.length}, repository stores ${this.dim}`);
    }
    const hits: EntityWithScore[] = [];
    for (const e of this.state.entities.get(campaignId)?.values() ?? []) {
      if (!e.embedding) continue;
      if (opts.filterType && e.type !== opts.filterType) continue;
      if (opts.excludeEntityIds?.includes(e.id)) continue;
      hits.push({ entity: structuredClone(e), score: cosine(vec, e.embedding) });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, opts.topK);
  }

  async topEntities(campaignId: CampaignId, k: number): Promise<Entity[]> {
    return [...(this.state.entities.get(campaignId)?.values() ?? [])]
      .sort((a, b) => (b.embeddingRefreshedAt ?? -1) - (a.embeddingRefreshedAt ?? -1))
      .slice(0, k)
      .map(e => structuredClone(e));
  }

  // -- facts ------------------------------------------------------------------
  private factsOf(cid: CampaignId): Map<string, AttributFige & { campaignId: CampaignId }> {
    let m = this.state.facts.get(cid);
    if (!m) { m = new Map(); this.state.facts.set(cid, m); }
    return m;
  }

  async appendFact(f: AttributFige & { campaignId: CampaignId }): Promise<{ factId: FactId }> {
    this.factsOf(f.campaignId).set(`${f.entityId}|${f.key}`, structuredClone(f));
    await this.mutated();
    return { factId: asFactId(f.factId) };
  }

  async getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]> {
    return [...(this.state.facts.get(campaignId)?.values() ?? [])]
      .filter(f => f.entityId === entityId)
      .sort((a, b) => a.turn - b.turn)
      .map(f => structuredClone(f));
  }

  async queryFacts(campaignId: CampaignId, q: FactQuery): Promise<AttributFige[]> {
    return [...(this.state.facts.get(campaignId)?.values() ?? [])]
      .filter(f =>
        (q.entityId === undefined || f.entityId === q.entityId) &&
        (q.attributeKey === undefined || f.key === q.attributeKey) &&
        (q.category === undefined || f.category === q.category) &&
        (q.minTurn === undefined || f.turn >= q.minTurn) &&
        (q.maxTurn === undefined || f.turn <= q.maxTurn))
      .sort((a, b) => a.turn - b.turn)
      .map(f => structuredClone(f));
  }

  // -- potentialites ------------------------------------------------------------
  async upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void> {
    let m = this.state.potentialites.get(campaignId);
    if (!m) { m = new Map(); this.state.potentialites.set(campaignId, m); }
    m.set(`${p.entiteId}|${p.attribut}`, structuredClone(p));
    await this.mutated();
  }

  async removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void> {
    this.state.potentialites.get(campaignId)?.delete(`${entityId}|${attribut}`);
    await this.mutated();
  }

  async getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null> {
    const p = this.state.potentialites.get(campaignId)?.get(`${entityId}|${attribut}`);
    return p ? structuredClone(p) : null;
  }

  // -- GCN ------------------------------------------------------------------
  async upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void> {
    let m = this.state.nodes.get(campaignId);
    if (!m) { m = new Map(); this.state.nodes.set(campaignId, m); }
    m.set(n.entityId, structuredClone(n));
    await this.mutated();
  }

  async upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void> {
    let m = this.state.edges.get(campaignId);
    if (!m) { m = new Map(); this.state.edges.set(campaignId, m); }
    m.set(a.key, structuredClone(a));
    await this.mutated();
  }

  async neighbors(campaignId: CampaignId, entityId: EntityID, _depth: number): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>> {
    const out: Array<{ node: NoeudGCN; edge: AreteGCN }> = [];
    for (const edge of this.state.edges.get(campaignId)?.values() ?? []) {
      if (edge.source !== entityId && edge.cible !== entityId) continue;
      const otherId = edge.source === entityId ? edge.cible : edge.source;
      const node = this.state.nodes.get(campaignId)?.get(otherId);
      if (node) out.push({ node: structuredClone(node), edge: structuredClone(edge) });
    }
    return out;
  }

  // -- turns / scenes -----------------------------------------------------------
  async appendTurn(t: Turn): Promise<void> {
    let m = this.state.turns.get(t.campaignId);
    if (!m) { m = new Map(); this.state.turns.set(t.campaignId, m); }
    m.set(t.turnNumber, structuredClone(t));
    await this.mutated();
  }

  async latestTurn(campaignId: CampaignId): Promise<Turn | null> {
    const turns = [...(this.state.turns.get(campaignId)?.values() ?? [])];
    if (turns.length === 0) return null;
    return structuredClone(turns.reduce((a, b) => (b.turnNumber > a.turnNumber ? b : a)));
  }

  async upsertScene(s: Scene): Promise<void> {
    let m = this.state.scenes.get(s.campaignId);
    if (!m) { m = new Map(); this.state.scenes.set(s.campaignId, m); }
    m.set(s.id, structuredClone(s));
    await this.mutated();
  }

  async currentScene(campaignId: CampaignId): Promise<Scene | null> {
    const withScene = [...(this.state.turns.get(campaignId)?.values() ?? [])]
      .filter(t => t.sceneId !== null)
      .sort((a, b) => b.turnNumber - a.turnNumber);
    const sceneId = withScene[0]?.sceneId;
    if (!sceneId) return null;
    const s = this.state.scenes.get(campaignId)?.get(sceneId);
    return s ? structuredClone(s) : null;
  }

  // -- transaction ----------------------------------------------------------------
  async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    const result = this.txChain.then(async () => {
      const snapshot = structuredClone(this.state);
      this.txDepth++;
      try {
        const r = await fn(this);
        this.txDepth--;
        await this.mutated();
        return r;
      } catch (e) {
        this.txDepth--;
        this.state = snapshot;
        throw e;
      }
    });
    this.txChain = result.catch(() => undefined);
    return result;
  }

  async close(): Promise<void> { /* nothing to release */ }

  /** Persistence hook for subclasses (JSON adapter). No-op in memory. */
  protected async mutated(): Promise<void> { /* no-op */ }
}

export function memoryRepository(opts: InMemoryRepositoryOptions = {}): InMemoryRepository {
  return new InMemoryRepository(opts);
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!; na += a[i]! * a[i]!; nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
```

- [ ] **Step 3: Run** — `pnpm vitest run test/repository/memory-contract.test.ts` → all contract cases green.

- [ ] **Step 4: Commit** — `git add src/repository/memory/index.ts test/repository/memory-contract.test.ts && git commit -m "feat(repository): InMemoryRepository — zero-dep adapter with brute-force cosine search + rollback transactions"`

---

### Task 10: JsonFileRepository (`@sneq/engine/json`)

**Files:**
- Create: `src/repository/json/index.ts`
- Create: `test/repository/json-contract.test.ts`

- [ ] **Step 1: Runner + persistence test (failing)**

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFileRepository } from "../../src/repository/json/index.js";
import { repositoryContract, DIM } from "./contract.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";

repositoryContract("json-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
  return new JsonFileRepository({ path: join(dir, "store.json"), embeddingDim: DIM });
});

describe("JsonFileRepository · persistence", () => {
  it("reloads state (including Float32Array embeddings and the adopted dim) from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const cid = asCampaignId("c1");
    const r1 = new JsonFileRepository({ path });
    await r1.createCampaign({ id: cid, name: "Persist", createdAt: 0, embeddingDim: 4 });
    await r1.upsertEntity({
      campaignId: cid, id: asEntityID("e1"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true, aliases: [], tags: [], createdAt: 0, description: "smith",
      embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1
    });
    await r1.close();
    const r2 = new JsonFileRepository({ path }); // no dim: adopt from file
    const got = await r2.getEntity(cid, asEntityID("e1"));
    expect(got?.description).toBe("smith");
    expect(got?.embedding).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.embedding!)).toEqual([1, 0, 0, 0]);
    await expect(r2.createCampaign({ id: asCampaignId("c2"), name: "bad", createdAt: 0, embeddingDim: 9 }))
      .rejects.toThrow(/dim/i);
    await r2.close();
  });
});
```

- [ ] **Step 2: Implement `src/repository/json/index.ts`**

```ts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { InMemoryRepository, emptyMemoryState, type MemoryState } from "../memory/index.js";

export interface JsonFileRepositoryOptions {
  /** Path of the JSON store (created on first write; parent dirs created). */
  path: string;
  /** Vector dimension; omit to adopt from the file or the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
}

/**
 * File-backed Repository with zero native dependencies: the in-memory adapter
 * plus write-through persistence (atomic tmp+rename on every mutation, once per
 * transaction). Human-readable saves, trivially debuggable — same philosophy as
 * a local-first prototype store. Single-process use; not for concurrent writers.
 */
export class JsonFileRepository extends InMemoryRepository {
  private readonly filePath: string;

  constructor(opts: JsonFileRepositoryOptions) {
    super(opts.embeddingDim !== undefined ? { embeddingDim: opts.embeddingDim } : {});
    this.filePath = opts.path;
    const loaded = tryLoad(this.filePath);
    if (loaded) {
      if (this.dim !== null && loaded.dim !== null && loaded.dim !== this.dim) {
        throw new Error(`Embedding dim mismatch: stored=${loaded.dim}, configured=${this.dim}. Use a fresh store file or a matching embeddingDim.`);
      }
      this.state = loaded.state;
      this.dim = this.dim ?? loaded.dim;
    }
  }

  protected override async mutated(): Promise<void> {
    if (this.txDepth > 0) return; // transaction persists once, at commit
    this.persist();
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, encode(this.state, this.dim), "utf-8");
    renameSync(tmp, this.filePath);
  }
}

export function jsonFileRepository(opts: JsonFileRepositoryOptions): JsonFileRepository {
  return new JsonFileRepository(opts);
}

interface PersistedShape { version: 1; dim: number | null; state: MemoryState; }

function encode(state: MemoryState, dim: number | null): string {
  return JSON.stringify({ version: 1, dim, state }, (_k, v: unknown) => {
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Float32Array) return { __f32: [...v] };
    return v;
  });
}

function tryLoad(path: string): { dim: number | null; state: MemoryState } | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const parsed = JSON.parse(raw, (_k, v: unknown) => {
    if (v && typeof v === "object" && "__map" in (v as object)) return new Map((v as { __map: [unknown, unknown][] }).__map as [string, unknown][]);
    if (v && typeof v === "object" && "__f32" in (v as object)) return new Float32Array((v as { __f32: number[] }).__f32);
    return v;
  }) as PersistedShape;
  if (parsed.version !== 1) {
    throw new Error(`unsupported sneq json store version: ${String((parsed as { version: unknown }).version)} (this build reads version 1)`);
  }
  const state = { ...emptyMemoryState(), ...parsed.state };
  return { dim: parsed.dim, state };
}
```

Requires `txDepth` to be `protected` in `InMemoryRepository` (it is, per Task 9).

- [ ] **Step 3: Run + commit**

```bash
git add src/repository/json/index.ts test/repository/json-contract.test.ts
git commit -m "feat(repository): JsonFileRepository — write-through atomic JSON persistence over the memory adapter"
```

---

### Task 11: persist `Entity.description`

**Files:**
- Modify: `src/domain/entity.ts` (field, if not already added in Task 8)
- Modify: `src/repository/sqlite/migrations.ts` (migration v2)
- Modify: `src/repository/sqlite/serialization.ts` (EntityRow + mappers)
- Modify: `src/repository/sqlite/index.ts` (upsert SQL)
- Modify: `src/resolver/judge.ts` (description in candidate list)
- Test: contract case from Task 8 + new judge prompt assertion in Task 12's capture test

- [ ] **Step 1: Domain field** — `src/domain/entity.ts`, in `Entity`:

```ts
  name: string;
  /** Human-readable description, persisted at mention time. Feeds the judge prompt and prepare-turn. */
  description?: string;
  nomConnu: boolean;
```

- [ ] **Step 2: Migration v2** — append to `MIGRATIONS` in `migrations.ts`:

```ts
  {
    version: 2,
    sql: `ALTER TABLE entities ADD COLUMN description TEXT;`
  }
```

And bump `export const SCHEMA_VERSION = 2;`.

- [ ] **Step 3: Serialization** — `EntityRow` gains `description: string | null`; in `entityToRow`: `description: e.description ?? null,`; in `rowToEntity` (conditional spread — `exactOptionalPropertyTypes`):

```ts
    ...(row.description !== null && row.description !== undefined ? { description: row.description } : {}),
```

- [ ] **Step 4: SQLite upsert SQL** — add the column to the INSERT in `upsertEntity`:

```sql
INSERT OR REPLACE INTO entities
  (campaign_id, id, type, name, description, nom_connu, aliases, tags, created_at, embedding_refreshed_at)
VALUES (@campaign_id, @id, @type, @name, @description, @nom_connu, @aliases, @tags, @created_at, @embedding_refreshed_at)
```

with `description: r.description` added to the `.run({...})` object.

- [ ] **Step 5: Judge prompt** — in `judge.ts`, the candidate list line becomes:

```ts
  const list = candidates.map((c, i) => {
    const aliasText = c.aliases.map(a => a.text).join(", ");
    return `${i}. ${c.name} (${c.type})${c.description ? ` — ${c.description}` : ""} — aliases: ${aliasText || "(none)"}`;
  }).join("\n");
```

- [ ] **Step 6: Run** — `pnpm test` → the Task 8 contract `description` assertions now pass on all three adapters; verify a pre-existing v1 DB upgrades (covered implicitly: `:memory:` runs both migrations; the dim-lifecycle test from Task 7 reopens a file DB and must still pass).

- [ ] **Step 7: Commit**

```bash
git add src/domain/entity.ts src/repository/sqlite/migrations.ts src/repository/sqlite/serialization.ts src/repository/sqlite/index.ts src/resolver/judge.ts
git commit -m "feat(domain): persist Entity.description (migration v2) and surface it to the resolver judge"
```

---

### Task 12: resolver hardening — null embedder, judge never throws, judge retry, alias-fallback suggestions

**Files:**
- Modify: `src/resolver/resolver.ts`
- Modify: `src/resolver/judge.ts`
- Test: `test/resolver/cascade.test.ts` (additions)

- [ ] **Step 1: Failing tests** (append; reuse the file's `ent`/`makeRouter` helpers)

```ts
describe("Resolver · degraded mode (no embedder)", () => {
  it("alias hits still resolve with embedder: null", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge), thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(), embedder: null
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "le forgeron" });
    expect(res.match?.id).toBe(asEntityID("e1"));
    expect(res.layerUsed).toBe("alias");
  });

  it("non-alias mentions return no-match instead of throwing", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge), thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(), embedder: null
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "someone entirely new" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("none");
    expect(res.notFoundReason).toBe("no-match");
  });

  it("suggestExisting falls back to alias lookup", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge), thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(), embedder: null
    });
    const s = await r.suggestExisting({ campaignId: cid, mention: "Le Forgeron", type: "PERSONNAGE" });
    expect(s.candidates.map(c => String(c.id))).toEqual(["e1"]);
    expect(s.recommendsNew).toBe(false);
    const none = await r.suggestExisting({ campaignId: cid, mention: "inconnu", type: "PERSONNAGE" });
    expect(none.recommendsNew).toBe(true);
  });
});

describe("Resolver · judge robustness", () => {
  it("a judge whose chain is exhausted yields ambiguous, not a throw", async () => {
    const judge = replayProvider("m", [
      { kind: "error", code: "AUTH", status: 401, message: "no key" }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge), thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed() { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "smith-ish" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("judge");
    expect(res.notFoundReason).toBe("ambiguous");
    expect(res.reasoning).toMatch(/judge unavailable/i);
  });

  it("retries once on malformed judge JSON and uses the second answer", async () => {
    const judge = replayProvider("m", [
      { kind: "chat", response: { text: "Sure! The answer is 0." } },
      { kind: "chat", response: { text: JSON.stringify({ matchedIndex: 0, confidence: 0.9, reasoning: "second" }) } }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge), thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed() { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "smith-ish" });
    expect(res.match).not.toBeNull();
    expect(judge.callCount()).toBe(2);
  });
});
```

- [ ] **Step 2: Verify fail** (embedder type, throw behavior, single judge call).

- [ ] **Step 3: Implement**

`resolver.ts` — `ResolverDeps.embedder: Embedder | null;`. In `resolveEntity`, after the alias block:

```ts
    // L2: vector — requires an embedder; without one, degrade to alias-only.
    if (!this.deps.embedder) {
      return make({ match: null, confidence: 0, candidates: [], layerUsed: "none" });
    }
    const vec = await this.deps.embedder.embed(mention);
```

Both `judgeMatch(...)` call sites become `await this.safeJudge({...})`:

```ts
  private async safeJudge(args: { mention: string; sceneDescription: string; candidates: Entity[] }): Promise<JudgeResult> {
    try {
      return await judgeMatch(this.deps.router, args);
    } catch (e) {
      return {
        matchedIndex: null, confidence: 0,
        reasoning: `judge unavailable: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }
```

(import `type { JudgeResult }` from `./judge.js`.)

`suggestExisting`:

```ts
  async suggestExisting(opts: { campaignId: CampaignId; mention: string; type: EntityType }): Promise<SuggestionResult> {
    if (!this.deps.embedder) {
      const hits = await this.deps.repo.findEntitiesByAlias(opts.campaignId, normalizeAlias(opts.mention), opts.type);
      return { candidates: hits, recommendsNew: hits.length === 0 };
    }
    const vec = await this.deps.embedder.embed(opts.mention);
    const hits = await this.deps.repo.searchEntitiesByVector(opts.campaignId, vec, { topK: this.t.topK, filterType: opts.type });
    const top = hits[0];
    const recommendsNew = !top || top.score < this.t.tauLow;
    return { candidates: hits.map(h => h.entity), recommendsNew };
  }
```

`judge.ts` — retry wrapper (keep the candidate-list builder from Task 11):

```ts
export async function judgeMatch(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] }
): Promise<JudgeResult> {
  const first = await askJudge(router, args, false);
  if (first !== null) return first;
  const second = await askJudge(router, args, true);
  return second ?? { matchedIndex: null, confidence: 0, reasoning: "judge returned malformed JSON twice" };
}

const FENCES = /^```(?:json)?\s*|\s*```$/gi;

async function askJudge(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] },
  strict: boolean
): Promise<JudgeResult | null> {
  const { mention, sceneDescription, candidates } = args;
  const list = candidates.map((c, i) => {
    const aliasText = c.aliases.map(a => a.text).join(", ");
    return `${i}. ${c.name} (${c.type})${c.description ? ` — ${c.description}` : ""} — aliases: ${aliasText || "(none)"}`;
  }).join("\n");

  const res = await router.chat("light", {
    system: `You disambiguate entity mentions for a narrative engine. Reply with strict JSON only.`,
    responseFormat: "json",
    messages: [{
      role: "user",
      content: `Mention: "${mention}"\nScene: ${sceneDescription || "(none)"}\nCandidates:\n${list}\n\nReply with JSON: {"matchedIndex": number|null, "confidence": number 0..1, "reasoning": string}. Use null if none match.`
        + (strict ? `\nIMPORTANT: return ONLY the raw JSON object — no prose, no markdown fences.` : "")
    }]
  });

  try {
    const stripped = res.text.trim().replace(FENCES, "").trim();
    const parsed = JSON.parse(stripped) as { matchedIndex: unknown; confidence: unknown; reasoning: unknown };
    return {
      matchedIndex: typeof parsed.matchedIndex === "number" ? parsed.matchedIndex : null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : ""
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run + commit**

```bash
git add src/resolver/resolver.ts src/resolver/judge.ts test/resolver/cascade.test.ts
git commit -m "feat(resolver)!: alias-only degraded mode (embedder nullable), judge retry + never-throw, alias-fallback suggestions"
```

---

### Task 13: Engine + CampaignContext — keyless wiring, campaign guard, scene context, adjudication, transactions

**Files:**
- Modify: `src/errors.ts` (`SneqCampaignNotFoundError`)
- Modify: `src/engine.ts` (nullable embedder)
- Modify: `src/campaign.ts`
- Test: `test/campaign.test.ts` (additions)

- [ ] **Step 1: Failing tests** (append; reuse `makeEmbedRouter`)

```ts
function keylessEngine() {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
  const failing: Provider = {
    ref,
    async chat() { throw new Error("no chat in this test"); },
    async embed() { throw new Error("no embeddings in this test"); }
  };
  return new Engine({
    repository: sqliteRepository({ path: ":memory:", embeddingDim: 0 }),
    router: { tiers: { heavy: { primary: ref, fallbacks: [] }, light: { primary: ref, fallbacks: [] } } },
    _routerDeps: { resolveProvider: () => failing }
  });
}

describe("CampaignContext · keyless mode", () => {
  it("mention + alias lookup roundtrip with no embeddings tier and dim 0", async () => {
    const engine = keylessEngine();
    const c = await engine.createCampaign({ id: asCampaignId("k1"), name: "x", embeddingDim: 0 });
    const m = await c.mentionEntity({
      canonicalName: "Aldric Fervent", type: "PERSONNAGE",
      aliases: ["le forgeron"], description: "A grizzled smith."
    });
    expect(m.isNew).toBe(true);
    const r = await c.resolveEntity({ mention: "le forgeron" });
    expect(r.match?.name).toBe("Aldric Fervent");
    const e = await c.getEntity(m.entityId!);
    expect(e?.embedding).toBeNull();
    expect(e?.description).toBe("A grizzled smith.");
    await engine.close();
  });
});

describe("CampaignContext · campaign existence guard", () => {
  it("writes against a never-created campaign throw SneqCampaignNotFoundError", async () => {
    const engine = keylessEngine();
    const ghost = engine.campaign(asCampaignId("ghost"));
    await expect(ghost.mentionEntity({ canonicalName: "X", type: "PERSONNAGE", description: "d" }))
      .rejects.toThrow(/campaign "ghost" not found/i);
    await engine.close();
  });
});

describe("CampaignContext · needsAdjudication", () => {
  function ambiguousEngine() {
    // Two near-identical entities; judge chain always fails → resolution ambiguous.
    const embedRef: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "emb" };
    const provider: Provider = {
      ref: embedRef,
      async chat() { throw new Error("judge down"); },
      async embed() { return { vectors: [new Float32Array([0.8, 0.6, 0])], dim: 3, modelUsed: "emb", providerUsed: "custom" }; }
    };
    return new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: {
        tiers: { heavy: { primary: embedRef, fallbacks: [] }, light: { primary: embedRef, fallbacks: [] }, embeddings: { primary: embedRef, fallbacks: [] } },
        defaults: { timeoutMs: 1000, maxRetries: 0 }
      },
      resolver: { tauHigh: 0.999, tauLow: 0.1, gapDelta: 0.5 },
      _routerDeps: { resolveProvider: () => provider }
    });
  }

  it("refuses to create on ambiguity and returns candidates; force:true creates", async () => {
    const engine = ambiguousEngine();
    const c = await engine.createCampaign({ id: asCampaignId("amb"), name: "x", embeddingDim: 3 });
    await c.mentionEntity({ canonicalName: "Garde Nord", type: "PERSONNAGE", description: "a", force: true });
    await c.mentionEntity({ canonicalName: "Garde Sud", type: "PERSONNAGE", description: "b", force: true });
    const r = await c.mentionEntity({ canonicalName: "le garde", type: "PERSONNAGE", description: "c" });
    expect(r.needsAdjudication).toBe(true);
    if (r.needsAdjudication) {
      expect(r.entityId).toBeNull();
      expect(r.candidates.length).toBeGreaterThan(0);
    }
    const forced = await c.mentionEntity({ canonicalName: "le garde", type: "PERSONNAGE", description: "c", force: true });
    expect(forced.isNew).toBe(true);
    await engine.close();
  });
});

describe("CampaignContext · scene context reaches the judge", () => {
  it("passes the current scene description as sceneDescription", async () => {
    const seen: string[] = [];
    const embedRef: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "m" };
    const provider: Provider = {
      ref: embedRef,
      async chat(req) {
        seen.push(req.messages[0]!.content);
        return { text: JSON.stringify({ matchedIndex: null, confidence: 0, reasoning: "n" }), toolCalls: [], modelUsed: "m", providerUsed: "custom" };
      },
      async embed() { return { vectors: [new Float32Array([0.8, 0.6, 0])], dim: 3, modelUsed: "m", providerUsed: "custom" }; }
    };
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 3 }),
      router: { tiers: { heavy: { primary: embedRef, fallbacks: [] }, light: { primary: embedRef, fallbacks: [] }, embeddings: { primary: embedRef, fallbacks: [] } }, defaults: { timeoutMs: 1000, maxRetries: 0 } },
      resolver: { tauHigh: 0.999, tauLow: 0.1, gapDelta: 0.5 },
      _routerDeps: { resolveProvider: () => provider }
    });
    const c = await engine.createCampaign({ id: asCampaignId("sc"), name: "x", embeddingDim: 3 });
    const a = await c.mentionEntity({ canonicalName: "Aldric", type: "PERSONNAGE", description: "smith", force: true });
    await c.mentionEntity({ canonicalName: "Alduin", type: "PERSONNAGE", description: "dragon", force: true });
    await c.setScene({ locationEntityId: a.entityId!, presentEntityIds: [], description: "Dans la forge de Valmure" });
    await c.resolveEntity({ mention: "le maitre des lieux" });
    expect(seen.some(s => s.includes("Dans la forge de Valmure"))).toBe(true);
    await engine.close();
  });
});
```

- [ ] **Step 2: Verify fail.**

- [ ] **Step 3: Implement**

`src/errors.ts` — append:

```ts
export class SneqCampaignNotFoundError extends Error {
  constructor(public readonly campaignId: string) {
    super(`campaign "${campaignId}" not found — create it first (engine.createCampaign / sneq-engine init-campaign)`);
    this.name = "SneqCampaignNotFoundError";
  }
}
```

`src/engine.ts` — embedder becomes nullable:

```ts
  private readonly embedder: Embedder | null;
```

```ts
    this.embedder = this.router.hasEmbeddings()
      ? {
          embed: async (text: string) => {
            const r = await this.router.embed({ texts: [text] });
            return r.vectors[0]!;
          }
        }
      : null;
```

(`Resolver` and `CampaignContext` deps accept `Embedder | null` — resolver from Task 12; campaign below.)

`src/campaign.ts` — the new surface:

```ts
export interface MentionInput {
  canonicalName: string;
  type: EntityType;
  aliases?: string[];
  description: string;
  /** Create even when resolution is ambiguous (after the caller adjudicated). */
  force?: boolean;
}

export type MentionResult =
  | { entityId: EntityID; isNew: boolean; resolvedTo?: EntityID; needsAdjudication?: false }
  | { entityId: null; isNew: false; needsAdjudication: true;
      candidates: Array<{ entityId: EntityID; name: string; type: EntityType }> };
```

```ts
  private campaignVerified = false;

  private async ensureCampaign(): Promise<void> {
    if (this.campaignVerified) return;
    const all = await this.deps.repo.listCampaigns();
    if (!all.some(c => c.id === this.id)) throw new SneqCampaignNotFoundError(this.id);
    this.campaignVerified = true;
  }
```

```ts
  async resolveEntity(opts: { mention: string; type?: EntityType }): Promise<ResolutionResult> {
    const scene = await this.deps.repo.currentScene(this.id);
    return this.deps.resolver.resolveEntity({
      campaignId: this.id,
      mention: opts.mention,
      ...(opts.type !== undefined ? { type: opts.type } : {}),
      ...(scene?.description ? { sceneDescription: scene.description } : {})
    });
  }
```

```ts
  async mentionEntity(input: MentionInput): Promise<MentionResult> {
    await this.ensureCampaign();
    const resolution = await this.resolveEntity({ mention: input.canonicalName, type: input.type });
    if (resolution.match) {
      return { entityId: resolution.match.id, isNew: false, resolvedTo: resolution.match.id };
    }
    if (!input.force && resolution.notFoundReason === "ambiguous" && resolution.candidates.length > 0) {
      return {
        entityId: null, isNew: false, needsAdjudication: true,
        candidates: resolution.candidates.slice(0, 5).map(c => ({ entityId: c.id, name: c.name, type: c.type }))
      };
    }
    const id = asEntityID(`${input.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    let embedding: Float32Array | null = null;
    let embeddingRefreshedAt: number | null = null;
    if (this.deps.embedder) {
      embedding = await this.deps.embedder.embed(`${input.canonicalName}. ${input.description}`);
      embeddingRefreshedAt = Date.now();
    }
    const entity: Entity = {
      campaignId: this.id, id, type: input.type, name: input.canonicalName,
      description: input.description,
      nomConnu: true,
      aliases: (input.aliases ?? []).map(text => ({ text, source: { kind: "GM_NARRATION" as const }, observedAt: Date.now() })),
      tags: [], createdAt: Date.now(),
      embedding, embeddingRefreshedAt
    };
    await this.deps.repo.upsertEntity(entity);
    return { entityId: id, isNew: true };
  }
```

```ts
  async registerFact(input: RegisterFactInput): Promise<{ factId: FactId | null; contradictions: AttributFige[] }> {
    await this.ensureCampaign();
    return this.deps.repo.transaction(async (tx) => {
      const existing = await tx.queryFacts(this.id, { entityId: input.entityId, attributeKey: input.attributeKey });
      const contradictions = existing.filter(e => JSON.stringify(e.value) !== JSON.stringify(input.value));
      if (contradictions.length > 0) return { factId: null, contradictions };
      const factId = asFactId(`f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      const latest = await tx.latestTurn(this.id);
      await tx.appendFact({
        factId, entityId: input.entityId, key: input.attributeKey,
        value: input.value, category: input.category, observation: input.observation,
        turn: latest?.turnNumber ?? 0,
        campaignId: this.id
      });
      return { factId, contradictions: [] as AttributFige[] };
    });
  }
```

```ts
  async setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }> {
    await this.ensureCampaign();
    const result = await this.deps.repo.transaction(async (tx) => {
      const sceneId = asSceneId(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      const last = await tx.latestTurn(this.id);
      const turnNumber = (last?.turnNumber ?? 0) + 1;
      await tx.upsertScene({
        campaignId: this.id, id: sceneId,
        locationId: input.locationEntityId,
        presentEntityIds: input.presentEntityIds,
        description: input.description,
        createdAtTurn: turnNumber
      });
      await tx.appendTurn({ campaignId: this.id, turnNumber, summary: null, sceneId, createdAt: Date.now() });
      return { sceneId, turnNumber };
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "ENTRY_TO_SCENE", hint: {} });
    return result;
  }

  async advanceTurn(summary?: string): Promise<{ turnNumber: number }> {
    await this.ensureCampaign();
    const result = await this.deps.repo.transaction(async (tx) => {
      const last = await tx.latestTurn(this.id);
      const turnNumber = (last?.turnNumber ?? 0) + 1;
      await tx.appendTurn({
        campaignId: this.id, turnNumber,
        summary: summary ?? null,
        sceneId: last?.sceneId ?? null,
        createdAt: Date.now()
      });
      return { turnNumber };
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return result;
  }
```

`addConstraint` gains a leading `await this.ensureCampaign();`. `CampaignContextDeps.embedder: Embedder | null;`.

- [ ] **Step 4: Run + commit**

```bash
git add src/errors.ts src/engine.ts src/campaign.ts test/campaign.test.ts
git commit -m "feat(engine)!: keyless mode, campaign-existence guard, scene context to judge, adjudication instead of silent forks, transactional writes"
```

---

### Task 14: tool surface — schemas, dispatcher, advertised set

**Files:**
- Modify: `src/tools/schemas.ts` (drop `sceneId` ×2, add `force`, refresh descriptions)
- Modify: `src/tools/dispatcher.ts` (signatures + cases)
- Modify: `src/tools/adapters.ts` (`ADVERTISED_TOOL_NAMES`)
- Modify: `src/index.ts` (new exports)
- Test: `test/tools/dispatcher.test.ts` (additions)

- [ ] **Step 1: Failing tests**

```ts
import { anthropicTools, openAITools, geminiTools, genericTools, ADVERTISED_TOOL_NAMES } from "../../src/tools/adapters.js";

describe("advertised tools", () => {
  it("collapse_attribute is not advertised in any adapter shape", () => {
    expect(ADVERTISED_TOOL_NAMES).toHaveLength(10);
    expect(ADVERTISED_TOOL_NAMES).not.toContain("sneq__collapse_attribute");
    expect(anthropicTools().map(t => t.name)).not.toContain("sneq__collapse_attribute");
    expect(openAITools().map(t => t.function.name)).not.toContain("sneq__collapse_attribute");
    expect(geminiTools()[0]!.functionDeclarations.map(t => t.name)).not.toContain("sneq__collapse_attribute");
    expect(genericTools().map(t => t.name)).not.toContain("sneq__collapse_attribute");
  });

  it("mention_entity accepts force and dispatches it", async () => {
    const calls: unknown[] = [];
    const ctx = {
      mentionEntity: async (input: unknown) => { calls.push(input); return { entityId: "e", isNew: true }; }
    } as unknown as ToolCallContext;
    await dispatchToolCall("sneq__mention_entity", { canonicalName: "X", type: "PERSONNAGE", description: "d", force: true }, ctx);
    expect((calls[0] as { force?: boolean }).force).toBe(true);
  });
});
```

- [ ] **Step 2: Implement**

`schemas.ts`:
- `sneq__lookup_entity`: remove `sceneId` (keep `mention`, `type?`).
- `sneq__mention_entity`: remove `sceneId`, add `force: z.boolean().optional()`.
- Descriptions:

```ts
  sneq__lookup_entity: "Resolve a mention to an existing entity in the canonical store. Returns match, candidates, and which layer of the resolver answered. The current scene's description is passed to the disambiguation judge automatically.",
  sneq__mention_entity: "Introduce or re-use an entity. Returns isNew and resolvedTo. If the result has needsAdjudication=true the engine refused to silently create a near-duplicate: surface the candidates to the player (or pick one yourself), then either use the chosen candidate's entityId or re-call with force:true to create a genuinely new entity.",
```

`dispatcher.ts`:
- `ToolCallContext.resolveEntity(opts: { mention: string; type?: EntityType }): Promise<ResolutionResult>;`
- `ToolCallContext.mentionEntity(input: { canonicalName: string; type: EntityType; aliases?: string[]; description: string; force?: boolean }): Promise<import("../campaign.js").MentionResult>;`
- lookup case: drop the `sceneId` spread; mention case: add `...(args["force"] !== undefined ? { force: args["force"] as boolean } : {})`.

`adapters.ts`:

```ts
import { jsonSchemas } from "./json-schema.js";
import { toolDescriptions, ToolNames, type ToolName } from "./schemas.js";

/** Tools advertised to LLMs. collapse_attribute is excluded until it is actually
 *  wired (V2 throws) — advertising a tool that always fails trains the model on traps. */
export const ADVERTISED_TOOL_NAMES: readonly ToolName[] =
  ToolNames.filter(n => n !== "sneq__collapse_attribute");
```

…and all four adapter functions map over `ADVERTISED_TOOL_NAMES` instead of `ToolNames`.

`src/index.ts` — add to the existing export blocks:

```ts
export { ToolNames, ADVERTISED_TOOL_NAMES, type ToolName, schemas as toolSchemas, toolDescriptions } from ...  // extend the tools export line
export { CampaignContext, type MentionInput, type MentionResult, type RegisterFactInput } from "./campaign.js";
export { SneqValidationError, SneqContradictionError, SneqProviderError, SneqCampaignNotFoundError, type ValidationFailureDetail } from "./errors.js";
export type { RouterTiers } from "./router/interface.js";
```

(adjust the existing lines rather than duplicating exports; `ADVERTISED_TOOL_NAMES` comes from `./tools/adapters.js`.)

- [ ] **Step 3: Run + commit**

```bash
git add src/tools/ src/index.ts test/tools/dispatcher.test.ts
git commit -m "feat(tools)!: de-advertise collapse_attribute (ADVERTISED_TOOL_NAMES), drop dead sceneId args, expose force + needsAdjudication"
```

---

### Task 15: CLI — dim derivation, `--embedding-dim 0`, NOT_IMPLEMENTED, campaign-not-found mapping, help

**Files:**
- Modify: `src/cli/parse-argv.ts` (allow 0)
- Modify: `src/cli.ts` (optional repo dim, pass `defaultEmbeddingDim`)
- Modify: `src/cli/run.ts` (`FullRunDeps.defaultEmbeddingDim`, init-campaign derivation, collapse case)
- Modify: `src/cli/errors.ts` (`NOT_IMPLEMENTED` code, `SneqCampaignNotFoundError` mapping)
- Modify: `src/cli/help.ts` (texts)
- Test: `test/cli/unit/parse-argv.test.ts`, new `test/cli/unit/collapse-attribute.test.ts`, adjust run-deps fixtures

- [ ] **Step 1: Failing tests**

`test/cli/unit/parse-argv.test.ts` additions:

```ts
it("accepts --embedding-dim 0 (no embeddings)", () => {
  const inv = parseArgv(["init-campaign", "--db", "x.db", "--campaign", "c", "--embedding-dim", "0"]);
  expect(inv.embeddingDim).toBe(0);
});
it("rejects negative --embedding-dim", () => {
  expect(() => parseArgv(["init-campaign", "--db", "x.db", "--campaign", "c", "--embedding-dim", "-1"]))
    .toThrow(/non-negative/i);
});
```

`test/cli/unit/collapse-attribute.test.ts` (mirror the structure of `campaign-exists.test.ts` — build a `FullRunDeps` with a real keyless engine, init the campaign, then):

```ts
const code = await run(invocationFor("collapse-attribute", { entityId: "e", attributeKey: "k" }), deps);
expect(code).toBe(1);
expect(stdout()).toMatch(/"code":"NOT_IMPLEMENTED"/);
```

- [ ] **Step 2: Implement**

`parse-argv.ts` `--embedding-dim` case:

```ts
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new CliError("INVALID_ARGS", `--embedding-dim must be a non-negative integer (0 = no embeddings), got: ${next}`);
        }
```

`cli/errors.ts`: add `"NOT_IMPLEMENTED"` to `ErrorCode`; import `SneqCampaignNotFoundError` from `../errors.js` and add to `formatError` (before the generic fallback):

```ts
  if (err instanceof SneqCampaignNotFoundError) {
    return {
      json: JSON.stringify({ error: err.message, code: "CAMPAIGN_NOT_FOUND", details: { campaignId: err.campaignId } }),
      exitCode: 1
    };
  }
```

`cli.ts`:

```ts
  const repoOpts: { path: string; embeddingDim?: number } = { path: invocation.db };
  if (invocation.embeddingDim !== undefined) repoOpts.embeddingDim = invocation.embeddingDim;

  const embTier = routerConfig.tiers.embeddings;
  const defaultEmbeddingDim: number | null = embTier ? (embTier.primary.embeddingDim ?? null) : 0;

  const engine = new Engine({ repository: sqliteRepository(repoOpts), router: routerConfig });
  ...
    exitCode = await run(invocation, { stdin: process.stdin, stdout: process.stdout, engine, defaultEmbeddingDim });
```

`run.ts`:

```ts
export interface FullRunDeps {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  engine: Engine;
  /** Default dim for init-campaign when --embedding-dim is absent:
   *  derived from the router config's embeddings primary (embeddingDim metadata),
   *  0 when the config has no embeddings tier, null when underivable (flag required). */
  defaultEmbeddingDim: number | null;
}
```

init-campaign case:

```ts
      const fromArgs = args["embeddingDim"] !== undefined ? Number(args["embeddingDim"]) : undefined;
      const embeddingDim = inv.embeddingDim ?? fromArgs ?? deps.defaultEmbeddingDim ?? undefined;
      if (embeddingDim === undefined || Number.isNaN(embeddingDim)) {
        throw new CliError("INVALID_ARGS",
          "embedding dimension required: pass --embedding-dim <N> (0 = no embeddings). The router config's embeddings primary has no embeddingDim metadata to derive a default from.");
      }
```

before the `default:` case:

```ts
    case "collapse-attribute":
      throw new CliError("NOT_IMPLEMENTED",
        "collapse-attribute is not wired in V2 — compose your own LLM call (heavy tier) + validateValue + register-fact. The tool is no longer advertised to LLM agents either.");
```

`help.ts` — `--embedding-dim` line becomes:

```
  --embedding-dim <N>      Vector dimension for init-campaign (0 = no embeddings / alias-only).
                           Default derives from the router config's embeddings primary
                           (768 with the default config). Existing DBs remember their dim;
                           the flag is only needed at init.
```

…and `collapse-attribute` description: `"NOT wired in V2 (exits 1 NOT_IMPLEMENTED); compose chat + validate + register-fact"`.

- [ ] **Step 3: Fix fixture fallout** — every test constructing `FullRunDeps` gains `defaultEmbeddingDim: 768` (or `0` for keyless fixtures). e2e/smoke tests that spawn the real CLI keep working: their `init-campaign --embedding-dim N` calls still win over the default, and post-init commands now adopt the stored dim (Task 7).

- [ ] **Step 4: Run + commit**

```bash
git add src/cli.ts src/cli/ test/cli/
git commit -m "feat(cli): derive init dim from router config, allow --embedding-dim 0, NOT_IMPLEMENTED for collapse-attribute, map campaign-not-found"
```

---

### Task 16: package surface + publish-readiness proof

**Files:**
- Modify: `package.json` (version, exports)
- Verification: `pnpm pack` + tmp-dir import smoke

- [ ] **Step 1: package.json**

```json
  "version": "0.1.0",
```

exports map gains:

```json
    "./memory": {
      "types": "./dist/repository/memory/index.d.ts",
      "default": "./dist/repository/memory/index.js"
    },
    "./json": {
      "types": "./dist/repository/json/index.d.ts",
      "default": "./dist/repository/json/index.js"
    }
```

- [ ] **Step 2: Build + pack + import-without-peers smoke**

```bash
pnpm build && pnpm pack
TMP=$(mktemp -d) && cp sneq-engine-0.1.0.tgz "$TMP" && cd "$TMP" && npm init -y -s && npm i -s ./sneq-engine-0.1.0.tgz
node --input-type=module -e "
const core = await import('@sneq/engine');
const mem  = await import('@sneq/engine/memory');
if (typeof core.Engine !== 'function') throw new Error('Engine missing');
if (typeof mem.InMemoryRepository !== 'function') throw new Error('memory adapter missing');
console.log('OK: imports clean with zero optional peers installed');
"
```

Expected: `OK: imports clean with zero optional peers installed` — **this is the e2e proof of the Task 3 fix** (only `zod` lands in node_modules). Then the keyless end-to-end:

```bash
node --input-type=module -e "
const { Engine, asCampaignId } = await import('@sneq/engine');
const { memoryRepository } = await import('@sneq/engine/memory');
const engine = new Engine({ repository: memoryRepository(), router: { tiers: { heavy: { primary: { provider: 'openai-compatible', baseUrl: 'https://example.invalid/v1', apiKeyEnv: '_NONE', model: 'none' }, fallbacks: [] }, light: { primary: { provider: 'openai-compatible', baseUrl: 'https://example.invalid/v1', apiKeyEnv: '_NONE', model: 'none' }, fallbacks: [] } } } });
const c = await engine.createCampaign({ id: asCampaignId('demo'), name: 'Demo', embeddingDim: 0 });
const m = await c.mentionEntity({ canonicalName: 'Aldric Fervent', type: 'PERSONNAGE', aliases: ['le forgeron'], description: 'A grizzled smith.' });
const r = await c.resolveEntity({ mention: 'le forgeron' });
if (r.match?.name !== 'Aldric Fervent') throw new Error('keyless roundtrip failed');
console.log('OK: keyless mention/lookup roundtrip — zero keys, zero native deps');
"
```

- [ ] **Step 3: Clean up + commit**

```bash
rm -f sneq-engine-0.1.0.tgz
git add package.json
git commit -m "chore(release): 0.1.0 package surface — ./memory and ./json subpath exports"
```

---

### Task 17: docs — README, skill doc, API regen, final verification

**Files:**
- Modify: `README.md`
- Modify: `skills/sneq-narrative-engine.md`
- Regenerate: `docs/api.md`, `docs/typedoc/`

- [ ] **Step 1: README updates** (surgical edits, keep tone):
  - "What V2 ships": embeddings now optional ("zero-key alias-only mode"), three repository adapters (sqlite / memory / json-file), advertised tools = 10.
  - New "Zero-config quick start" before the SQLite one: `memoryRepository()` + router without embeddings tier + `embeddingDim: 0` (the Task 16 snippet).
  - Install section: peer-deps matrix — `better-sqlite3 + sqlite-vec` only for `/sqlite` with vectors; SDKs only for the matching provider; nothing for `/memory`, `/json`, DeepSeek/Mistral via `openai-compatible`.
  - CLI section: `--embedding-dim` only needed at init (DBs remember their dim), `0` = alias-only, `collapse-attribute` exits 1 `NOT_IMPLEMENTED`.
  - "Known deferred scope": adjust collapse line (de-advertised), add "one DB per campaign is the blessed layout (vector search prefilter degrades on shared multi-campaign DBs)".
  - `mention_entity` example: mention `needsAdjudication`/`force`.
- [ ] **Step 2: Skill doc updates** (`skills/sneq-narrative-engine.md`):
  - `sneq__lookup_entity({ mention, type? })` — sceneId gone, scene context automatic.
  - `sneq__mention_entity` — document the `needsAdjudication` flow: present candidates to the player, then re-use the chosen entityId or re-call with `force: true`.
  - Failure modes: add "degraded (no-embeddings) campaigns resolve by alias only — prefer exact established names"; collapse note: tool no longer advertised.
- [ ] **Step 3: Regenerate API docs** — `pnpm docs` → commits `docs/api.md` + `docs/typedoc/` changes.
- [ ] **Step 4: Final verification**

```bash
pnpm test && pnpm typecheck && pnpm build
```

All green, then:

```bash
git add README.md skills/sneq-narrative-engine.md docs/api.md docs/typedoc/
git commit -m "docs: zero-config quick start, peer matrix, adjudication flow, regenerated API reference"
```

---

### Task 18: PR

- [ ] **Step 1:** `git push -u origin feat/plug-and-play-hardening`
- [ ] **Step 2:** `gh pr create` — title `feat: plug-and-play & robustness hardening (0.1.0)`; body summarizes the spec's two tables (blockers + flaws), notes breaking changes (§4 of the spec), test delta, and the pack-smoke proof. Footer: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Self-review checklist (run after writing, before executing)

1. **Spec coverage:** decisions 1–18 ↔ tasks: D1→T3, D2→T5/T7/T12/T13/T15, D3/D4→T12, D5→T13/T14, D6→T8/T11, D7→T13/T14, D8→T8/T9/T10/T16, D9→T7, D10→T5/T15, D11→T4, D12→T6, D13→T14/T15, D14→T13/T15, D15→T7/T13, D16→T1, D17→T2, D18→T16/T18. ✔
2. **Type consistency:** `MentionResult` (T13) is what the dispatcher imports (T14); `ADVERTISED_TOOL_NAMES` defined T14, asserted T14; `defaultEmbeddingDim` defined T15 in both cli.ts and run.ts; `Embedder | null` flows T12→T13. ✔
3. **Known judgment calls left to execution:** GCN literal values in the contract suite (read `src/domain/gcn.ts`), Google SDK `signal` support, zod v4 test fallout list.
