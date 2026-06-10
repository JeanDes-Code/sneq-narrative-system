import { describe, it, expect } from "vitest";
import { Router, createDefaultDeps } from "../../src/router/router.js";
import { replayProvider, type ReplayProvider } from "../fixtures/replay-provider.js";
import type { Provider, RouterConfig } from "../../src/router/interface.js";

function makeRouter(opts: {
  heavy: ReplayProvider[];
  light?: ReplayProvider[];
  embed?: ReplayProvider[];
}): Router {
  const lightChain = opts.light ?? opts.heavy;
  const embedChain = opts.embed ?? opts.heavy;
  const cfg: RouterConfig = {
    tiers: {
      heavy:      { primary: opts.heavy[0]!.ref, fallbacks: opts.heavy.slice(1).map(p => p.ref) },
      light:      { primary: lightChain[0]!.ref, fallbacks: lightChain.slice(1).map(p => p.ref) },
      embeddings: { primary: embedChain[0]!.ref, fallbacks: embedChain.slice(1).map(p => p.ref) }
    },
    defaults: { timeoutMs: 5000, maxRetries: 0 }
  };
  const all = [...opts.heavy, ...(opts.light ?? []), ...(opts.embed ?? [])];
  return new Router(cfg, { resolveProvider: (ref) => all.find(p => p.ref === ref)! });
}

describe("Router", () => {
  it("returns primary response on success", async () => {
    const p = replayProvider("m1", [{ kind: "chat", response: { text: "hello" } }]);
    const router = makeRouter({ heavy: [p] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("hello");
  });

  it("falls back on 429 quota", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "QUOTA", status: 429, message: "rate-limited" }]);
    const p2 = replayProvider("m2", [{ kind: "chat", response: { text: "from p2" } }]);
    const router = makeRouter({ heavy: [p1, p2] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("from p2");
    expect(r.modelUsed).toBe("m2");
  });

  it("falls back on 5xx", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "SERVER", status: 503, message: "down" }]);
    const p2 = replayProvider("m2", [{ kind: "chat", response: { text: "ok" } }]);
    const router = makeRouter({ heavy: [p1, p2] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("ok");
  });

  it("disables a provider after AUTH error and skips it on next call", async () => {
    const p1 = replayProvider("m1", [
      { kind: "error", code: "AUTH", status: 401, message: "bad key" }
    ]);
    const p2 = replayProvider("m2", [
      { kind: "chat", response: { text: "fallback-1" } },
      { kind: "chat", response: { text: "fallback-2" } }
    ]);
    const router = makeRouter({ heavy: [p1, p2] });
    await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    const r2 = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r2.text).toBe("fallback-2");
    expect(p1.callCount()).toBe(1);
    expect(p2.callCount()).toBe(2);
  });

  it("throws RouterExhaustedError when chain exhausted", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "QUOTA", status: 429, message: "x" }]);
    const p2 = replayProvider("m2", [{ kind: "error", code: "QUOTA", status: 429, message: "y" }]);
    const router = makeRouter({ heavy: [p1, p2] });
    await expect(router.chat("heavy", { messages: [{ role: "user", content: "hi" }] }))
      .rejects.toThrow(/exhausted/i);
  });

  it("embed() routes to the embeddings tier", async () => {
    const p = replayProvider("emb-m", [{ kind: "embed", vectors: [[0.1, 0.2, 0.3]] }]);
    const router = makeRouter({ heavy: [p] });
    const r = await router.embed({ texts: ["hi"] });
    expect(r.vectors).toHaveLength(1);
    expect(r.dim).toBe(3);
    expect(Array.from(r.vectors[0]!)).toEqual([
      expect.closeTo(0.1, 5), expect.closeTo(0.2, 5), expect.closeTo(0.3, 5)
    ]);
  });
});

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
    const brokenDeps = createDefaultDeps({
      _importProvider: async () => { throw new Error("Cannot find module '@anthropic-ai/sdk'"); }
    });
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
        resolveProvider(ref): Provider | Promise<Provider> {
          if (ref.provider === "anthropic") return brokenDeps.resolveProvider(ref);
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
