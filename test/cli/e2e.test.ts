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

describe("CLI e2e — campaign precheck", () => {
  let tmp: string;
  let dbPath: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "sneq-cli-")); dbPath = join(tmp, "c.db"); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("errors with CAMPAIGN_NOT_FOUND for non-init commands when campaign missing", async () => {
    const engine = makeEngine(dbPath);
    const out = captureStdout();
    const inv = parseArgv([
      "get-entity", "--db", dbPath, "--campaign", "ghost",
      "--args", '{"entityId":"x"}'
    ]);
    const code = await run(inv, { stdin: emptyStdin(), stdout: out.stream, engine });
    expect(code).toBe(1);
    expect(JSON.parse(out.lines.join("").trim()).code).toBe("CAMPAIGN_NOT_FOUND");
    await engine.close();
  });
});

describe("CLI e2e — 10 tool commands", () => {
  let tmp: string;
  let dbPath: string;
  let engine: Engine;
  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-cli-"));
    dbPath = join(tmp, "c.db");
    engine = makeEngine(dbPath);
    const inv = parseArgv([
      "init-campaign", "--db", dbPath, "--campaign", "c1",
      "--args", '{"name":"Test","embeddingDim":3}'
    ]);
    await run(inv, { stdin: emptyStdin(), stdout: captureStdout().stream, engine });
  });
  afterEach(async () => {
    await engine.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  async function call(argv: string[], stdinPayload?: string): Promise<{ code: number; out: unknown }> {
    const out = captureStdout();
    const stdin = stdinPayload === undefined ? emptyStdin() : Readable.from([stdinPayload]);
    const code = await run(parseArgv(argv), { stdin, stdout: out.stream, engine });
    const text = out.lines.join("").trim();
    return { code, out: text ? JSON.parse(text) : null };
  }

  it("lookup-entity returns match:null for an unknown mention", async () => {
    const r = await call([
      "lookup-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"mention":"the smith","type":"PERSONNAGE"}'
    ]);
    expect(r.code).toBe(0);
    expect((r.out as { match: unknown }).match).toBeNull();
  });

  it("mention-entity creates a new entity", async () => {
    const r = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"A grizzled smith"}'
    ]);
    expect(r.code).toBe(0);
    expect((r.out as { isNew: boolean }).isNew).toBe(true);
  });

  it("register-fact fills observation from --source default", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "register-fact", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({
        entityId, attributeKey: "metier", category: "HISTORIQUE",
        value: { type: "STRING", value: "capitaine" }
      })
    ]);
    expect(r.code).toBe(0);
    expect((r.out as { factId: string | null }).factId).not.toBeNull();
  });

  it("register-fact accepts --source player-utterance", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "register-fact", "--db", dbPath, "--campaign", "c1",
      "--source", "player-utterance",
      "--args", JSON.stringify({
        entityId, attributeKey: "rumeur", category: "HISTORIQUE",
        value: { type: "STRING", value: "déserteur" }
      })
    ]);
    expect(r.code).toBe(0);
    const facts = await call([
      "get-relevant-facts", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({ entityId, attributeKeys: ["rumeur"] })
    ]);
    expect((facts.out as Array<{ observation: { fiabilite: string } }>)[0]?.observation.fiabilite).toBe("TEMOIGNAGE");
  });

  it("set-scene + advance-turn round-trip", async () => {
    const loc = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Forge","type":"LIEU","description":"a smoky forge"}'
    ]);
    const locId = (loc.out as { entityId: string }).entityId;
    const set = await call([
      "set-scene", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({
        locationEntityId: locId, presentEntityIds: [locId], description: "evening"
      })
    ]);
    expect(set.code).toBe(0);
    expect((set.out as { turnNumber: number }).turnNumber).toBeGreaterThan(0);
    const turn = await call([
      "advance-turn", "--db", dbPath, "--campaign", "c1",
      "--args", '{"summary":"ok"}'
    ]);
    expect((turn.out as { turnNumber: number }).turnNumber).toBeGreaterThan(
      (set.out as { turnNumber: number }).turnNumber
    );
  });

  it("get-entity returns the entity by id", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "get-entity", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({ entityId })
    ]);
    expect((r.out as { id: string; name: string }).name).toBe("Aldric");
  });

  it("suggest-existing returns recommendsNew:true on empty world", async () => {
    const r = await call([
      "suggest-existing", "--db", dbPath, "--campaign", "c1",
      "--args", '{"mention":"a smith","type":"PERSONNAGE"}'
    ]);
    expect((r.out as { recommendsNew: boolean }).recommendsNew).toBe(true);
  });

  it("get-relevant-facts returns [] for an entity with no facts", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "get-relevant-facts", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({ entityId })
    ]);
    expect(r.out).toEqual([]);
  });

  it("reads args from stdin when --args is absent", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1"
    ], '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}');
    expect((mention.out as { isNew: boolean }).isNew).toBe(true);
  });

  it("register-fact returns exit 0 with contradictions when fact already figed", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const baseArgs = (val: string) => JSON.stringify({
      entityId, attributeKey: "metier", category: "HISTORIQUE",
      value: { type: "STRING", value: val }
    });
    await call(["register-fact", "--db", dbPath, "--campaign", "c1", "--args", baseArgs("capitaine")]);
    const second = await call(["register-fact", "--db", dbPath, "--campaign", "c1", "--args", baseArgs("simple soldat")]);
    expect(second.code).toBe(0);
    expect((second.out as { factId: string | null; contradictions: unknown[] }).factId).toBeNull();
    expect((second.out as { contradictions: unknown[] }).contradictions.length).toBeGreaterThan(0);
  });
});
