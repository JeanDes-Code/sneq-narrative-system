import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { Engine } from "../../src/engine.js";
import { sqliteRepository } from "../../src/repository/sqlite/factory.js";
import type { RouterConfig, Provider, ProviderRef, ChatRequest, EmbeddingRequest } from "../../src/router/interface.js";
import { run } from "../../src/cli/run.js";
import { parseArgv } from "../../src/cli/parse-argv.js";

function makeFakeRouter(vec = [0.1, 0.2, 0.3]): { config: RouterConfig; deps: { resolveProvider(ref: ProviderRef): Provider } } {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "fake" };
  const provider: Provider = {
    ref,
    async chat(_req: ChatRequest) {
      return { text: "", toolCalls: [], modelUsed: ref.model, providerUsed: "custom" };
    },
    async embed(_req: EmbeddingRequest) {
      return { vectors: [new Float32Array(vec)], dim: vec.length, modelUsed: ref.model, providerUsed: "custom" };
    }
  };
  const config: RouterConfig = {
    tiers: {
      heavy: { primary: ref, fallbacks: [] },
      light: { primary: ref, fallbacks: [] },
      embeddings: { primary: ref, fallbacks: [] }
    },
    defaults: { timeoutMs: 1000, maxRetries: 0 }
  };
  return { config, deps: { resolveProvider: () => provider } };
}

function captureStdout(): { stream: Writable; lines: string[] } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(chunk.toString());
      cb();
    }
  });
  return { stream, lines };
}

function emptyStdin(): Readable {
  const r = new Readable({ read() {} });
  r.push(null);
  return r;
}

function makeEngine(dbPath: string) {
  const router = makeFakeRouter();
  return new Engine({
    repository: sqliteRepository({ path: dbPath, embeddingDim: 3 }),
    router: router.config,
    _routerDeps: router.deps
  });
}

describe("CLI e2e — init-campaign", () => {
  let tmp: string;
  let dbPath: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-cli-"));
    dbPath = join(tmp, "c.db");
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("creates a campaign and emits {campaignId, created: true}", async () => {
    const engine = makeEngine(dbPath);
    const out = captureStdout();
    const invocation = parseArgv([
      "init-campaign", "--db", dbPath, "--campaign", "c1",
      "--args", '{"name":"Campaign One","embeddingDim":3}'
    ]);
    const code = await run(invocation, { stdin: emptyStdin(), stdout: out.stream, engine });
    expect(code).toBe(0);
    const payload = JSON.parse(out.lines.join("").trim());
    expect(payload).toEqual({ campaignId: "c1", created: true });
    await engine.close();
  });

  it("errors with CAMPAIGN_ALREADY_EXISTS if invoked twice", async () => {
    const engine = makeEngine(dbPath);
    const inv = parseArgv([
      "init-campaign", "--db", dbPath, "--campaign", "c1",
      "--args", '{"name":"Once","embeddingDim":3}'
    ]);
    await run(inv, { stdin: emptyStdin(), stdout: captureStdout().stream, engine });
    const out2 = captureStdout();
    const code = await run(inv, { stdin: emptyStdin(), stdout: out2.stream, engine });
    expect(code).toBe(1);
    expect(JSON.parse(out2.lines.join("").trim()).code).toBe("CAMPAIGN_ALREADY_EXISTS");
    await engine.close();
  });
});
