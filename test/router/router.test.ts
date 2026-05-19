import { describe, it, expect } from "vitest";
import { Router } from "../../src/router/router.js";
import { replayProvider, type ReplayProvider } from "../fixtures/replay-provider.js";
import type { RouterConfig } from "../../src/router/interface.js";

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
