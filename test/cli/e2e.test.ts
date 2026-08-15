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
    expect(payload).toEqual({ campaignId: "c1", created: true, embeddingDim: 3 });
    await engine.close();
  });

  it("--embedding-dim flag overrides the default dim and is echoed in output", async () => {
    const router = makeFakeRouter(new Array(8).fill(0.1));
    const engine = new Engine({
      repository: sqliteRepository({ path: dbPath, embeddingDim: 8 }),
      router: router.config,
      _routerDeps: router.deps
    });
    const out = captureStdout();
    const invocation = parseArgv([
      "init-campaign", "--db", dbPath, "--campaign", "dimtest",
      "--embedding-dim", "8",
      "--args", '{"name":"DimTest"}'
    ]);
    const code = await run(invocation, { stdin: emptyStdin(), stdout: out.stream, engine });
    expect(code).toBe(0);
    const payload = JSON.parse(out.lines.join("").trim());
    expect(payload).toEqual({ campaignId: "dimtest", created: true, embeddingDim: 8 });
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

  it("commit-narrative writes an act's `sets` into canon and moves the day", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "commit-narrative", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({
        operationId: "op-1",
        daysElapsed: 2,
        event: {
          eventId: "ev1", gravity: 1,
          circumstance: "Aldric prend le commandement de la garde.",
          participants: [entityId], surfaceTokens: [],
          acts: [{
            actorId: entityId, verb: "TAKES_COMMAND",
            sets: { entityId, key: "metier", value: { type: "STRING", value: "capitaine" }, category: "HISTORIQUE" }
          }]
        }
      })
    ]);
    expect(r.code).toBe(0);
    const out = r.out as { newWorldDay: number; eventId: string; replayed: boolean };
    expect(out.newWorldDay).toBe(2);
    expect(out.eventId).toBe("ev1");
    expect(out.replayed).toBe(false);
  });

  it("commit-narrative replays on the same operationId instead of writing twice (#29)", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const bundle = JSON.stringify({
      operationId: "op-retry",
      daysElapsed: 1,
      event: {
        eventId: "ev-retry", gravity: 0, circumstance: "Aldric ferre un cheval.",
        participants: [entityId], surfaceTokens: [],
        acts: [{ actorId: entityId, verb: "SHOES_HORSE" }]
      }
    });
    const first = await call(["commit-narrative", "--db", dbPath, "--campaign", "c1", "--args", bundle]);
    const retry = await call(["commit-narrative", "--db", dbPath, "--campaign", "c1", "--args", bundle]);
    expect((first.out as { replayed: boolean }).replayed).toBe(false);
    expect((retry.out as { replayed: boolean }).replayed).toBe(true);
    expect((retry.out as { newWorldDay: number }).newWorldDay).toBe(1);
  });

  it("commit-narrative rejects a free-text name where an entity id belongs", async () => {
    const r = await call([
      "commit-narrative", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({
        operationId: "op-bad", daysElapsed: 0,
        event: {
          eventId: "ev-bad", gravity: 0, circumstance: "le forgeron parle",
          participants: ["le forgeron"], surfaceTokens: [],
          acts: [{ actorId: "le forgeron", verb: "SPEAKS" }]
        }
      })
    ]);
    expect(r.code).toBe(1);
    expect((r.out as { code: string }).code).toBe("ENTITY_NOT_FOUND");
  });

  it("--source out-of-band lands on a record that brought no observation (#18/#22)", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call([
      "commit-narrative", "--db", dbPath, "--campaign", "c1",
      "--source", "out-of-band",
      "--args", JSON.stringify({
        operationId: "op-oob", daysElapsed: 0,
        records: [{
          recordId: "rec-1", entityId, key: "rumeur",
          value: { type: "STRING", value: "déserteur" }, category: "HISTORIQUE",
          authoredBy: entityId, route: "RUMOUR", surfaceTokens: []
        }]
      })
    ]);
    expect(r.code).toBe(0);
    const doctor = await call(["doctor", "--db", dbPath, "--campaign", "c1"]);
    const checks = (doctor.out as { checks: Array<{ id: string; message: string }> }).checks;
    expect(checks.find(c => c.id === "out-of-band-audited")?.message).toMatch(/1 record/);
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
    const sceneCheck = await call([
      "get-scene", "--db", dbPath, "--campaign", "c1"
    ]);
    expect(sceneCheck.code).toBe(0);
    expect((sceneCheck.out as { locationId: string } | null)?.locationId).toBe(locId);
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

  // #21's third state: an empty belief list is an answer, and it comes with a
  // line saying so. The Cassius Vorentius bug was a plausible-empty standing in
  // for a null.
  it("get-holder-context returns beliefs: [] plus an explain line for a holder who knows nothing", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call(["get-holder-context", "--db", dbPath, "--campaign", "c1", "--entity", entityId]);
    expect(r.code).toBe(0);
    const ctx = r.out as { beliefs: unknown[]; explain: string; road: string; holderId: string };
    expect(ctx.beliefs).toEqual([]);
    expect(ctx.explain).toMatch(/knows nothing/i);
    expect(ctx.road).toBe("DEFAULT_GROUP");
  });

  it("get-holder-context refuses to answer without a holder — every read is somebody's", async () => {
    const r = await call(["get-holder-context", "--db", dbPath, "--campaign", "c1"]);
    expect(r.code).toBe(1);
    expect((r.out as { code: string }).code).toBe("INVALID_ARGS");
  });

  it("get-holder-context distinguishes an unknown holder from a holder who knows nothing", async () => {
    const r = await call(["get-holder-context", "--db", dbPath, "--campaign", "c1", "--holder", "h_nobody"]);
    expect(r.code).toBe(1);
    expect((r.out as { code: string }).code).toBe("HOLDER_NOT_FOUND");
  });

  it("doctor reports on a fresh bootstrapped campaign", async () => {
    const r = await call(["doctor", "--db", dbPath, "--campaign", "c1"]);
    const report = r.out as { status: string; checks: Array<{ id: string; status: string }> };
    expect(report.checks.find(c => c.id === "holders-present")?.status).toBe("PASS");
    expect(report.checks.find(c => c.id === "no-omniscient-read")?.status).toBe("PASS");
  });

  it("show/set-dispatch-policy: additive, never a replacement (#15)", async () => {
    const before = await call(["show-dispatch-policy", "--db", dbPath, "--campaign", "c1"]);
    const ruleCount = (before.out as { rules: unknown[] }).rules.length;
    const after = await call([
      "set-dispatch-policy", "--db", dbPath, "--campaign", "c1",
      "--args", JSON.stringify({
        routes: [{ fromPlaceId: "p1", toPlaceId: "p2", route: "OFFICIAL", travelDays: 3 }]
      })
    ]);
    const policy = after.out as { routes: unknown[]; rules: unknown[] };
    expect(policy.routes).toHaveLength(1);
    expect(policy.rules).toHaveLength(ruleCount);
  });

  it("reads args from stdin when --args is absent", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1"
    ], '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}');
    expect((mention.out as { isNew: boolean }).isNew).toBe(true);
  });

  // Replace-on-key is state EVOLUTION now (#27), not a contradiction to
  // adjudicate: history lives in the ledger, canon holds current state.
  it("two commits on the same key replace rather than contradict", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const bundle = (op: string, val: string) => JSON.stringify({
      operationId: op, daysElapsed: 1,
      event: {
        eventId: `ev-${op}`, gravity: 0, circumstance: `Aldric devient ${val}.`,
        participants: [entityId], surfaceTokens: [],
        acts: [{
          actorId: entityId, verb: "BECOMES",
          sets: { entityId, key: "metier", value: { type: "STRING", value: val }, category: "HISTORIQUE" }
        }]
      }
    });
    const first = await call(["commit-narrative", "--db", dbPath, "--campaign", "c1", "--args", bundle("op-a", "capitaine")]);
    const second = await call(["commit-narrative", "--db", dbPath, "--campaign", "c1", "--args", bundle("op-b", "simple soldat")]);
    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect((second.out as { newWorldDay: number }).newWorldDay).toBe(2);
  });

  it("lookup-entity returns candidates when ambiguous, never prompts", async () => {
    await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Captain Aldric","type":"PERSONNAGE","description":"old guard captain"}'
    ]);
    await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Captain Brennus","type":"PERSONNAGE","description":"new guard captain"}'
    ]);
    const r = await call([
      "lookup-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"mention":"the captain","type":"PERSONNAGE"}'
    ]);
    expect(r.code).toBe(0);
    const out = r.out as { candidates: unknown[] };
    expect(Array.isArray(out.candidates)).toBe(true);
  });

  it("returns VALIDATION_FAILED on bad args shape", async () => {
    const r = await call([
      "commit-narrative", "--db", dbPath, "--campaign", "c1",
      "--args", '{"operationId":"op-x"}'  // missing the required daysElapsed
    ]);
    expect(r.code).toBe(1);
    expect((r.out as { code: string }).code).toBe("VALIDATION_FAILED");
  });
});

describe("CLI e2e — campaign-exists", () => {
  let tmp: string;
  let dbPath: string;
  let engine: Engine;
  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-cli-ce-"));
    dbPath = join(tmp, "c.db");
    engine = makeEngine(dbPath);
  });
  afterEach(async () => {
    await engine.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  async function call(argv: string[]): Promise<{ code: number; out: unknown }> {
    const out = captureStdout();
    const code = await run(parseArgv(argv), { stdin: emptyStdin(), stdout: out.stream, engine });
    const text = out.lines.join("").trim();
    return { code, out: text ? JSON.parse(text) : null };
  }

  it("returns {exists:false} for an uninitialized campaign", async () => {
    const r = await call(["campaign-exists", "--db", dbPath, "--campaign", "ghost"]);
    expect(r.code).toBe(0);
    expect(r.out).toEqual({ exists: false });
  });

  it("returns {exists:true} with name after init-campaign", async () => {
    await call([
      "init-campaign", "--db", dbPath, "--campaign", "c1",
      "--args", '{"name":"Test","embeddingDim":3}'
    ]);
    const r = await call(["campaign-exists", "--db", dbPath, "--campaign", "c1"]);
    expect(r.code).toBe(0);
    expect((r.out as { exists: boolean; name: string }).exists).toBe(true);
    expect((r.out as { name: string }).name).toBe("Test");
  });
});

describe("CLI e2e — prepare-turn", () => {
  let tmp: string;
  let dbPath: string;
  let engine: Engine;
  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-cli-pt-"));
    dbPath = join(tmp, "c.db");
    engine = makeEngine(dbPath);
    await run(
      parseArgv(["init-campaign", "--db", dbPath, "--campaign", "c1", "--args", '{"name":"Test","embeddingDim":3}']),
      { stdin: emptyStdin(), stdout: captureStdout().stream, engine }
    );
  });
  afterEach(async () => {
    await engine.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  async function call(argv: string[]): Promise<{ code: number; out: unknown }> {
    const out = captureStdout();
    const code = await run(parseArgv(argv), { stdin: emptyStdin(), stdout: out.stream, engine });
    const text = out.lines.join("").trim();
    return { code, out: text ? JSON.parse(text) : null };
  }

  // `scene: null` is a literal, distinguishable state (#21): nobody has said
  // where the player is. Ask the human, never guess.
  it("returns the frame with scene: null on a fresh campaign with no scene", async () => {
    const r = await call(["prepare-turn", "--db", dbPath, "--campaign", "c1"]);
    expect(r.code).toBe(0);
    expect(r.out).toEqual({ day: 0, turn: 0, scene: null, presentEntities: [], holder: null });
  });

  it("carries the holder's context when asked for one, and names the road (#21)", async () => {
    const mention = await call([
      "mention-entity", "--db", dbPath, "--campaign", "c1",
      "--args", '{"canonicalName":"Aldric","type":"PERSONNAGE","description":"smith"}'
    ]);
    const entityId = (mention.out as { entityId: string }).entityId;
    const r = await call(["prepare-turn", "--db", dbPath, "--campaign", "c1", "--entity", entityId]);
    expect(r.code).toBe(0);
    const out = r.out as { holder: { road: string; beliefs: unknown[] } | null };
    expect(out.holder?.road).toBe("DEFAULT_GROUP");
    expect(out.holder?.beliefs).toEqual([]);
  });
});

describe("CLI e2e — validate-narration", () => {
  let tmp: string;
  let dbPath: string;
  let engine: Engine;
  beforeEach(async () => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-cli-vn-"));
    dbPath = join(tmp, "c.db");
    engine = makeEngine(dbPath);
    await run(
      parseArgv(["init-campaign", "--db", dbPath, "--campaign", "c1", "--args", '{"name":"Test","embeddingDim":3}']),
      { stdin: emptyStdin(), stdout: captureStdout().stream, engine }
    );
  });
  afterEach(async () => {
    await engine.close();
    rmSync(tmp, { recursive: true, force: true });
  });

  async function call(argv: string[]): Promise<{ code: number; out: unknown }> {
    const out = captureStdout();
    const code = await run(parseArgv(argv), { stdin: emptyStdin(), stdout: out.stream, engine });
    const text = out.lines.join("").trim();
    return { code, out: text ? JSON.parse(text) : null };
  }

  it("extracts capitalized proper nouns and reports them as issues on an empty campaign", async () => {
    const r = await call([
      "validate-narration", "--db", dbPath, "--campaign", "c1",
      "--args", '{"narration":"Cassius arrive."}'
    ]);
    expect(r.code).toBe(0);
    const report = r.out as { extractedNames: string[]; ok: boolean; issues: unknown[] };
    // extractedNames is regex-derived (deterministic) — always populated regardless of LLM keys
    expect(report.extractedNames).toContain("Cassius");
    // With no entities in the campaign the issue list should be non-empty (unresolved name)
    // OR partial:true when the LLM stage skipped due to missing API keys — either is acceptable.
    const hasIssue = report.issues.length > 0 || (r.out as { partial?: boolean }).partial === true;
    expect(hasIssue).toBe(true);
  });
});

describe("CLI e2e — help", () => {
  let tmp: string;
  let dbPath: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "sneq-cli-help-")); dbPath = join(tmp, "h.db"); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("--help (no command) prints general help", async () => {
    const engine = makeEngine(dbPath);
    const out = captureStdout();
    const code = await run(parseArgv(["--help"]), { stdin: emptyStdin(), stdout: out.stream, engine });
    expect(code).toBe(0);
    const text = out.lines.join("");
    expect(text).toMatch(/sneq-engine — narrative-state engine CLI/);
    expect(text).toMatch(/init-campaign/);
    await engine.close();
  });

  it("<cmd> --help prints command-specific help", async () => {
    const engine = makeEngine(dbPath);
    const out = captureStdout();
    const code = await run(parseArgv(["commit-narrative", "--help"]), {
      stdin: emptyStdin(), stdout: out.stream, engine
    });
    expect(code).toBe(0);
    expect(out.lines.join("")).toMatch(/sneq-engine commit-narrative/);
    await engine.close();
  });
});
