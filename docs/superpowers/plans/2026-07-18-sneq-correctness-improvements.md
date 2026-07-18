# SNEQ Correctness Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. This mission is explicitly main-thread only; do not dispatch subagents.

**Goal:** Make campaign lifecycle, compound mutations, graph depth, and propagation behavior correct and truthful, then remove the non-functional collapse surface.

**Architecture:** Engine-owned lifecycle controllers invalidate stale campaign contexts, while repository adapters enforce the parent invariant and serialize deletion with atomic transactions. `AtomicWriteStrategy` expands to cover constraint append and optimistic entity creation; a per-campaign entity revision forces concurrent creators to rerun resolution before committing from stale canon. Public graph depth is narrowed to one hop, propagation metadata becomes deterministic, and `collapse_attribute` is deleted before 1.0.

**Tech Stack:** TypeScript 5.4 strict mode, Node.js 20+, ESM/NodeNext, Vitest 2, Zod 4, better-sqlite3, sqlite-vec, TypeDoc, pnpm.

## Global Constraints

- Do not add runtime dependencies.
- Preserve existing `CampaignContext` signatures except deliberate removal of `collapseAttribute` and narrowing `depth` to `0 | 1`.
- Keep resolver and embedding provider work outside repository transactions.
- Generate each atomic `operationId` once per logical public call.
- A distributed strategy must not consume idempotency state for non-terminal `stale` entity-create results.
- Historical approved specs and plans remain unchanged; update current README, skill, upgrade guide, tests, and generated API docs.
- Do not commit, push, publish, open a PR, or delete any branch. End every task with a diff review checkpoint only.
- After every task, run the focused tests and `pnpm test` before marking it complete.

---

## File Structure

### New files

- `src/campaign-lifecycle.ts` — internal lifecycle state machine shared by `Engine` and `CampaignContext`.
- `test/campaign-lifecycle.test.ts` — stale reference, close, recreation, deletion failure, and Engine terminal-state regressions.
- `test/campaign-mention-concurrency.test.ts` — optimistic revision retry and provider-outside-transaction regressions.
- `test/campaign-depth.test.ts` — explicit A → B → C one-hop fact retrieval regression.

### Core files modified

- `src/errors.ts` — lifecycle and concurrent-creation errors.
- `src/engine.ts` — context/controller cache, delete transitions, terminal close.
- `src/campaign.ts` — universal usability guard, atomic constraint append, optimistic mention retry, depth narrowing, collapse removal.
- `src/atomic/types.ts` — add-constraint and create-entity commands/results/decision types.
- `src/atomic/decisions.ts` — pure decisions for constraint append and entity create.
- `src/atomic/repository-strategy.ts` — local transactional implementations.
- `src/atomic/index.ts`, `src/index.ts` — public command/decision/error exports.

### Repository files modified

- `src/repository/interface.ts` — `entityRevision()` and one-hop `neighbors()` contract.
- `src/repository/memory/index.ts` — parent checks, revision state, serialized delete/close.
- `src/repository/json/index.ts` — persisted revision compatibility through `MemoryState`.
- `src/repository/sqlite/migrations.ts` — schema version 3 and `campaigns.entity_revision`.
- `src/repository/sqlite/index.ts` — parent checks, revision reads/increments, serialized delete/close.
- `test/repository/contract.ts` — orphan-write, revision, and delete-ordering contract coverage.
- `test/repository/json-contract.test.ts`, `test/repository/sqlite.test.ts` — persistence/migration details.

### Public-contract files modified

- `src/core/propagation.ts`, `test/core/propagation.test.ts` — deterministic IDs/timestamps.
- `src/tools/schemas.ts`, `src/tools/dispatcher.ts`, `src/tools/adapters.ts`, `test/tools/dispatcher.test.ts` — depth narrowing and collapse deletion.
- `src/cli/types.ts`, `src/cli/help.ts`, `src/cli/run.ts`, `src/cli/errors.ts` — collapse CLI deletion.
- `test/cli/unit/parse-argv.test.ts`, `test/cli/unit/help.test.ts` — 14-command contract and unknown collapse command.
- Delete `test/cli/unit/collapse-attribute.test.ts` after its compatibility behavior is intentionally removed.
- `README.md`, `UPGRADING.md`, `skills/sneq-narrative-engine.md`, generated `docs/api.md`, and generated `docs/typedoc/**` — truthful current documentation.

---

### Task 1: Add Engine-Owned Campaign Lifecycle Invalidation

**Files:**
- Create: `src/campaign-lifecycle.ts`
- Create: `test/campaign-lifecycle.test.ts`
- Modify: `src/errors.ts:23-28`
- Modify: `src/engine.ts:25-102`
- Modify: `src/campaign.ts:25-309`
- Modify: `src/index.ts:26-30`

**Interfaces:**
- Produces: `CampaignLifecycle`, `CampaignLifecycleState`, `SneqCampaignContextInvalidatedError`.
- Preserves: direct `new CampaignContext(deps)` construction with a standalone lifecycle.
- Later tasks rely on: `CampaignContext.ensureUsable()` guarding every public operation and `Engine.close()` invalidating cached contexts before repository close.

- [ ] **Step 1: Write failing lifecycle tests**

Create `test/campaign-lifecycle.test.ts` with a keyless Engine helper and these regressions:

```ts
import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { SneqCampaignContextInvalidatedError } from "../src/errors.js";
import { asCampaignId, asEntityID } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Provider, ProviderRef, RouterConfig } from "../src/router/interface.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("provider must not run"); },
  async embed() { throw new Error("provider must not run"); },
};
const router: RouterConfig = {
  tiers: {
    heavy: { primary: ref, fallbacks: [] },
    light: { primary: ref, fallbacks: [] },
  },
};

function makeEngine(repository = new InMemoryRepository({ embeddingDim: 0 })) {
  return {
    repository,
    engine: new Engine({
      repository,
      router,
      _routerDeps: { resolveProvider: () => provider },
    }),
  };
}

const campaignId = asCampaignId("lifecycle");
const entityId = asEntityID("entity");

async function expectInvalid(operation: () => unknown | Promise<unknown>) {
  await expect(Promise.resolve().then(operation)).rejects.toBeInstanceOf(
    SneqCampaignContextInvalidatedError,
  );
}

describe("CampaignContext lifecycle", () => {
  it("permanently rejects a retained context after delete and allows a fresh context after recreation", async () => {
    const { engine } = makeEngine();
    const oldContext = await engine.createCampaign({ id: campaignId, name: "Old", embeddingDim: 0 });
    await oldContext.addConstraint({
      entityId,
      attributeKey: "loyalty",
      rule: { type: "DOIT_ETRE", valeurs: [{ type: "STRING", value: "duke" }] },
      justification: "seed verification",
    });

    await engine.deleteCampaign(campaignId);
    await expectInvalid(() => oldContext.addConstraint({
      entityId,
      attributeKey: "loyalty",
      rule: { type: "DOIT_ETRE", valeurs: [{ type: "STRING", value: "king" }] },
      justification: "must not resurrect",
    }));

    const fresh = await engine.createCampaign({ id: campaignId, name: "Fresh", embeddingDim: 0 });
    expect(fresh).not.toBe(oldContext);
    await expect(fresh.currentScene()).resolves.toBeNull();
    await expectInvalid(() => oldContext.currentScene());
    await engine.close();
  });

  it("rejects read, write, dispatch, and hook operations after Engine.close", async () => {
    const { engine } = makeEngine();
    const context = await engine.createCampaign({ id: campaignId, name: "Close", embeddingDim: 0 });
    await engine.close();

    const asyncOperations = [
      () => context.resolveEntity({ mention: "Roric" }),
      () => context.suggestExisting("Roric", "PERSONNAGE"),
      () => context.getEntity(entityId),
      () => context.getRelevantFacts(entityId),
      () => context.currentScene(),
      () => context.mentionEntity({ canonicalName: "Roric", type: "PERSONNAGE", description: "Captain" }),
      () => context.registerFact({
        entityId,
        attributeKey: "role",
        value: { type: "STRING", value: "captain" },
        category: "SOCIAL",
        observation: { source: "SYSTEM", method: "DEDUCTION_CONFIRMEE", fiabilite: "CERTAINE", timestamp: 0 },
      }),
      () => context.addConstraint({
        entityId,
        attributeKey: "role",
        rule: { type: "REGEX", pattern: ".+" },
        justification: "closed",
      }),
      () => context.setScene({ locationEntityId: entityId, presentEntityIds: [], description: "closed" }),
      () => context.advanceTurn("closed"),
      () => context.validateNarration({ narration: "Roric enters." }),
      () => context.prepareTurn(),
      () => context.handleToolCall("sneq__get_entity", { entityId }),
    ];
    for (const operation of asyncOperations) await expectInvalid(operation);

    expect(() => context.registerUserPromptHandler(async () => null)).toThrow(SneqCampaignContextInvalidatedError);
    expect(() => context.registerPreGenerationHook({ onEvent() {} })).toThrow(SneqCampaignContextInvalidatedError);
    expect(() => context.registerNarrationGate({ async validate() { return { ok: true, extractedNames: [], issues: [] }; } }))
      .toThrow(SneqCampaignContextInvalidatedError);

    expect(() => engine.campaign(campaignId)).toThrow(/engine is closed/i);
    await expect(engine.listCampaigns()).rejects.toThrow(/engine is closed/i);
    await expect(engine.createCampaign({ id: campaignId, name: "No", embeddingDim: 0 }))
      .rejects.toThrow(/engine is closed/i);
    expect(engine.routerClient()).toBeDefined();
    await expect(engine.close()).resolves.toBeUndefined();
  });

  it("resets a context to unverified when repository deletion fails", async () => {
    class FailingDeleteRepository extends InMemoryRepository {
      failOnce = true;
      override async deleteCampaign(id: ReturnType<typeof asCampaignId>) {
        if (this.failOnce) {
          this.failOnce = false;
          throw new Error("delete failed");
        }
        return super.deleteCampaign(id);
      }
    }
    const repository = new FailingDeleteRepository({ embeddingDim: 0 });
    const { engine } = makeEngine(repository);
    const context = await engine.createCampaign({ id: campaignId, name: "Retry", embeddingDim: 0 });

    await expect(engine.deleteCampaign(campaignId)).rejects.toThrow("delete failed");
    await expect(context.currentScene()).resolves.toBeNull();
    await engine.deleteCampaign(campaignId);
    await expectInvalid(() => context.currentScene());
    await engine.close();
  });
});
```

- [ ] **Step 2: Run the lifecycle tests and confirm failure**

Run:

```bash
pnpm vitest run test/campaign-lifecycle.test.ts
```

Expected: FAIL because `SneqCampaignContextInvalidatedError` and lifecycle invalidation do not exist; retained contexts remain usable after delete/close.

- [ ] **Step 3: Add lifecycle errors**

Add to `src/errors.ts`:

```ts
export type CampaignContextInvalidationReason = "deleting" | "deleted" | "engine-closed";

export class SneqCampaignContextInvalidatedError extends Error {
  constructor(
    public readonly campaignId: string,
    public readonly reason: CampaignContextInvalidationReason,
  ) {
    super(`campaign context "${campaignId}" is invalid (${reason})`);
    this.name = "SneqCampaignContextInvalidatedError";
  }
}

export class SneqConcurrentEntityCreationError extends Error {
  constructor(public readonly campaignId: string, public readonly attempts: number) {
    super(`entity canon changed during ${attempts} creation attempts for campaign "${campaignId}"; retry the logical call`);
    this.name = "SneqConcurrentEntityCreationError";
  }
}
```

Export both classes and `CampaignContextInvalidationReason` from `src/index.ts`. The concurrent error is added now so later tasks do not reopen the error export block.

- [ ] **Step 4: Implement the internal lifecycle controller**

Create `src/campaign-lifecycle.ts`:

```ts
import type { CampaignId } from "./domain/ids.js";
import { SneqCampaignContextInvalidatedError } from "./errors.js";

export type CampaignLifecycleState =
  | "unverified"
  | "active"
  | "deleting"
  | "deleted"
  | "engine-closed";

export class CampaignLifecycle {
  private state: CampaignLifecycleState = "unverified";

  constructor(private readonly campaignId: CampaignId) {}

  assertUsable(): void {
    if (this.state === "deleting" || this.state === "deleted" || this.state === "engine-closed") {
      throw new SneqCampaignContextInvalidatedError(this.campaignId, this.state);
    }
  }

  needsVerification(): boolean {
    this.assertUsable();
    return this.state === "unverified";
  }

  markVerified(): void {
    this.assertUsable();
    this.state = "active";
  }

  beginDelete(): void {
    this.assertUsable();
    this.state = "deleting";
  }

  deletionFailed(): void {
    if (this.state === "deleting") this.state = "unverified";
  }

  deletionSucceeded(): void {
    this.state = "deleted";
  }

  close(): void {
    this.state = "engine-closed";
  }
}
```

- [ ] **Step 5: Wire lifecycle ownership into Engine**

Change `src/engine.ts` so the cache stores context/controller pairs and campaign operations reject after close:

```ts
import { CampaignLifecycle } from "./campaign-lifecycle.js";

interface CachedCampaignContext {
  context: CampaignContext;
  lifecycle: CampaignLifecycle;
}

export class Engine {
  // existing fields
  private readonly contexts = new Map<string, CachedCampaignContext>();
  private closed = false;

  private assertOpen(): void {
    if (this.closed) throw new Error("engine is closed");
  }

  campaign(id: CampaignId): CampaignContext {
    this.assertOpen();
    const cached = this.contexts.get(id);
    if (cached) return cached.context;
    const lifecycle = new CampaignLifecycle(id);
    const context = new CampaignContext({
      campaignId: id,
      repo: this.repo,
      router: this.router,
      resolver: this.resolver,
      writeStrategy: this.writes,
      embedder: this.embedder,
      userPrompt: this.userPrompt,
      preGen: this.preGen,
      narrationGate: this.narrationGate,
      logger: this.logger,
      lifecycle,
    });
    this.contexts.set(id, { context, lifecycle });
    return context;
  }

  async listCampaigns(): Promise<CampaignMeta[]> {
    this.assertOpen();
    return this.repo.listCampaigns();
  }

  async createCampaign(input: NewCampaignInput): Promise<CampaignContext> {
    this.assertOpen();
    await this.repo.createCampaign({
      id: input.id,
      name: input.name,
      createdAt: Date.now(),
      embeddingDim: input.embeddingDim,
    });
    return this.campaign(input.id);
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    this.assertOpen();
    const cached = this.contexts.get(id);
    cached?.lifecycle.beginDelete();
    try {
      await this.repo.deleteCampaign(id);
      cached?.lifecycle.deletionSucceeded();
      this.contexts.delete(id);
    } catch (error) {
      cached?.lifecycle.deletionFailed();
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const cached of this.contexts.values()) cached.lifecycle.close();
    await this.repo.close();
  }
}
```

Keep `routerClient()` unchanged and callable after close.

- [ ] **Step 6: Replace the cached boolean with `ensureUsable()` and guard every context method**

In `src/campaign.ts`, add the lifecycle dependency and field:

```ts
import { CampaignLifecycle } from "./campaign-lifecycle.js";

export interface CampaignContextDeps {
  // existing fields
  lifecycle?: CampaignLifecycle;
}

export class CampaignContext implements ToolCallContext {
  readonly id: CampaignId;
  private readonly lifecycle: CampaignLifecycle;
  private readonly writeStrategy: AtomicWriteStrategy;

  constructor(private readonly deps: CampaignContextDeps) {
    this.id = deps.campaignId;
    this.lifecycle = deps.lifecycle ?? new CampaignLifecycle(deps.campaignId);
    // existing write-strategy selection
  }

  private async ensureUsable(): Promise<void> {
    this.lifecycle.assertUsable();
    if (!this.lifecycle.needsVerification()) return;
    const all = await this.deps.repo.listCampaigns();
    this.lifecycle.assertUsable();
    if (!all.some((campaign) => campaign.id === this.id)) {
      throw new SneqCampaignNotFoundError(this.id);
    }
    this.lifecycle.markVerified();
  }
}
```

Then make these methods call `await this.ensureUsable()` before repository, resolver, router, strategy, or registry work:

```ts
resolveEntity
suggestExisting
getEntity
confirmEntityMatch
getRelevantFacts
currentScene
mentionEntity
registerFact
addConstraint
setScene
advanceTurn
validateNarration
prepareTurn
```

Convert the currently synchronous promise-returning read methods to `async` where needed. Keep their public return types unchanged.

Guard synchronous registry methods with `this.lifecycle.assertUsable()`:

```ts
registerUserPromptHandler
registerPreGenerationHook
registerNarrationGate
```

Guard `handleToolCall` before dispatch:

```ts
handleToolCall(name: string, args: unknown): Promise<unknown> {
  this.lifecycle.assertUsable();
  return dispatchToolCall(name, args, this);
}
```

- [ ] **Step 7: Run focused and full tests**

Run:

```bash
pnpm vitest run test/campaign-lifecycle.test.ts test/campaign.test.ts test/campaign-confirm-entity.test.ts
pnpm test
```

Expected: all pass. Existing never-created campaign tests still throw `SneqCampaignNotFoundError`; stale/closed contexts throw `SneqCampaignContextInvalidatedError`.

- [ ] **Step 8: Review the lifecycle diff without committing**

Run:

```bash
git diff --check
git diff -- src/campaign-lifecycle.ts src/errors.ts src/engine.ts src/campaign.ts src/index.ts test/campaign-lifecycle.test.ts
```

Expected: no whitespace errors; only lifecycle/error changes and their tests. Do not commit.

---

### Task 2: Enforce Repository Parent Invariants and Delete Ordering

**Files:**
- Modify: `src/repository/memory/index.ts:14-275`
- Modify: `src/repository/sqlite/index.ts:33-345`
- Modify: `test/repository/contract.ts:31-171`
- Modify: `test/repository/sqlite.test.ts:103-115`

**Interfaces:**
- Consumes: `SneqCampaignNotFoundError` and existing `Repository.transaction(fn)`.
- Produces: all campaign-scoped create/upsert/append writes reject missing parents; `deleteCampaign` and `close` share transaction ordering.
- Later tasks rely on: entity revisions and atomic create running inside the same serialization queue.

- [ ] **Step 1: Add failing shared contract tests for orphan writes and deletion ordering**

Add to `test/repository/contract.ts`:

```ts
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

it("rejects campaign-scoped writes after the parent campaign is deleted", async () => {
  await repo.deleteCampaign(cid);
  const missing = /campaign "c1" not found/i;

  await expect(repo.upsertEntity(entity("orphan"))).rejects.toThrow(missing);
  await expect(repo.appendFact(fact("orphan", "role", "ghost"))).rejects.toThrow(missing);
  await expect(repo.upsertPotentialite(cid, {
    entiteId: asEntityID("orphan"),
    attribut: "role",
    etat: "CONTRAINT",
    contraintes: [],
    contexteGeneratif: { categorieAttribut: "SOCIAL", tendances: [] },
  })).rejects.toThrow(missing);
  await expect(repo.upsertNode(cid, {
    entityId: asEntityID("orphan"),
    type: "PERSONNAGE",
    etatActuel: "PARTIELLEMENT_CONNU",
    poidsNarratif: 0,
    tags: [],
  })).rejects.toThrow(missing);
  await expect(repo.upsertEdge(cid, {
    key: "orphan-edge",
    source: asEntityID("orphan"),
    cible: asEntityID("other"),
    typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
    directionnalite: "BIDIRECTIONNELLE",
    forcePropagation: 0.5,
    etatArete: "FIGE",
    attributs: {},
  })).rejects.toThrow(missing);
  await expect(repo.appendTurn({
    campaignId: cid,
    turnNumber: 1,
    summary: null,
    sceneId: null,
    createdAt: 0,
  })).rejects.toThrow(missing);
  await expect(repo.upsertScene({
    campaignId: cid,
    id: asSceneId("orphan-scene"),
    locationId: asEntityID("orphan"),
    presentEntityIds: [],
    description: "orphan",
    createdAtTurn: 1,
  })).rejects.toThrow(missing);
});

it("orders deletion after an already-started transaction and never resurrects its state", async () => {
  const entered = deferred();
  const release = deferred();
  const transaction = repo.transaction(async (tx) => {
    entered.resolve();
    await release.promise;
    await tx.upsertEntity(entity("in-flight"));
  });

  await entered.promise;
  let deletionFinished = false;
  const deletion = repo.deleteCampaign(cid).then(() => { deletionFinished = true; });
  await Promise.resolve();
  expect(deletionFinished).toBe(false);

  release.resolve();
  await Promise.all([transaction, deletion]);
  expect(await repo.listCampaigns()).toEqual([]);
  expect(await repo.getEntity(cid, asEntityID("in-flight"))).toBeNull();
});
```

Add to `test/repository/sqlite.test.ts`:

```ts
it("waits for an already-started transaction before closing the database", async () => {
  const repository = new SqliteRepository({ path: ":memory:", embeddingDim: 0 });
  await repository.createCampaign({ id: cid, name: "Close queue", createdAt: 0, embeddingDim: 0 });
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const transaction = repository.transaction(async (tx) => {
    entered();
    await gate;
    await tx.upsertEntity(someEntity("before-close"));
  });

  await started;
  let closeFinished = false;
  const closing = repository.close().then(() => { closeFinished = true; });
  await Promise.resolve();
  expect(closeFinished).toBe(false);

  release();
  await Promise.all([transaction, closing]);
  expect(closeFinished).toBe(true);
});
```

- [ ] **Step 2: Run repository contracts and confirm failure**

Run:

```bash
pnpm vitest run test/repository/memory-contract.test.ts test/repository/json-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/sqlite.test.ts
```

Expected: orphan writes currently succeed; memory deletion can interleave with the transaction queue.

- [ ] **Step 3: Add parent checks and a shared queue helper to memory**

In `src/repository/memory/index.ts`, import `SneqCampaignNotFoundError` and add:

```ts
private assertCampaignExists(campaignId: CampaignId): void {
  if (!this.state.campaigns.has(campaignId)) {
    throw new SneqCampaignNotFoundError(campaignId);
  }
}

private enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = this.txChain.then(fn);
  this.txChain = result.catch(() => undefined);
  return result;
}
```

Call `assertCampaignExists` at the beginning of:

```ts
upsertEntity
appendFact
upsertPotentialite
upsertNode
upsertEdge
appendTurn
upsertScene
```

Replace `deleteCampaign` with an internal direct implementation plus queue ordering:

```ts
private async deleteCampaignNow(id: CampaignId): Promise<void> {
  this.state.campaigns.delete(id);
  for (const bucket of [
    this.state.entities,
    this.state.facts,
    this.state.potentialites,
    this.state.nodes,
    this.state.edges,
    this.state.turns,
    this.state.scenes,
  ]) bucket.delete(id);
  await this.mutated();
}

async deleteCampaign(id: CampaignId): Promise<void> {
  return this.enqueue(() => this.deleteCampaignNow(id));
}
```

Refactor `transaction` to use `enqueue` and preserve rollback:

```ts
async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
  return this.enqueue(async () => {
    const snapshot = structuredClone(this.state);
    this.txDepth += 1;
    try {
      const result = await fn(this);
      this.txDepth -= 1;
      await this.mutated();
      return result;
    } catch (error) {
      if (this.txDepth > 0) this.txDepth -= 1;
      this.state = snapshot;
      throw error;
    }
  });
}

async close(): Promise<void> {
  await this.txChain;
}
```

- [ ] **Step 4: Add equivalent parent checks and queue ordering to SQLite**

In `src/repository/sqlite/index.ts`, add `txDepth`, `assertCampaignExists`, and `enqueue`:

```ts
private txDepth = 0;

private assertCampaignExists(campaignId: CampaignId): void {
  const row = this.db.prepare(`SELECT 1 FROM campaigns WHERE id = ?`).get(campaignId);
  if (!row) throw new SneqCampaignNotFoundError(campaignId);
}

private enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = this.txChain.then(fn);
  this.txChain = result.catch(() => undefined);
  return result;
}
```

Call `assertCampaignExists` before each campaign-scoped write listed in Step 3.

Move the existing synchronous deletion body to `deleteCampaignNow`, then queue it:

```ts
private deleteCampaignNow(id: CampaignId): void {
  const tx = this.db.transaction(() => {
    for (const table of ["entities", "aliases_norm", "figed", "potentialites", "nodes", "edges", "turns", "scenes"]) {
      this.db.prepare(`DELETE FROM ${table} WHERE campaign_id = ?`).run(id);
    }
    this.db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(id);
    if (this.dim !== null && this.dim > 0) deleteVecForCampaign(this.db, id);
  });
  tx();
}

async deleteCampaign(id: CampaignId): Promise<void> {
  return this.enqueue(async () => { this.deleteCampaignNow(id); });
}
```

Refactor `transaction` and `close`:

```ts
async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
  return this.enqueue(async () => {
    this.db.exec("BEGIN");
    this.txDepth += 1;
    try {
      const result = await fn(this);
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.txDepth -= 1;
    }
  });
}

async close(): Promise<void> {
  await this.txChain;
  this.db.close();
}
```

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
pnpm vitest run test/repository/memory-contract.test.ts test/repository/json-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/sqlite.test.ts test/campaign-lifecycle.test.ts
pnpm test
```

Expected: all pass; deletion waits for in-flight transactions and then purges their writes.

- [ ] **Step 6: Review the repository diff without committing**

Run:

```bash
git diff --check
git diff -- src/repository test/repository
```

Expected: parent checks and transaction/delete/close ordering only. Do not commit.

---

### Task 3: Move `addConstraint` Behind `AtomicWriteStrategy`

**Files:**
- Modify: `src/atomic/types.ts:1-107`
- Modify: `src/atomic/decisions.ts:1-106`
- Modify: `src/atomic/repository-strategy.ts:1-57`
- Modify: `src/atomic/index.ts:1-7`
- Modify: `src/campaign.ts:211-230`
- Modify: `src/index.ts:38-64`
- Modify: `test/atomic/decisions.test.ts:1-210`
- Modify: `test/atomic/strategy.test.ts:36-276`
- Modify: `test/campaign-confirm-entity.test.ts:33-55`

**Interfaces:**
- Produces: `AddConstraintCommand`, `AddConstraintResult`, `AddConstraintDecisionInput`, `AddConstraintDecision`, `decideAddConstraint`, `AtomicWriteStrategy.addConstraint`.
- Preserves: `CampaignContext.addConstraint(input): Promise<{ constraintId }>`.

- [ ] **Step 1: Write failing pure-decision and concurrency tests**

Add imports and tests to `test/atomic/decisions.test.ts`:

```ts
import { asConstraintId } from "../../src/domain/ids.js";
import type { Potentialite } from "../../src/domain/potentialite.js";
import { decideAddConstraint } from "../../src/atomic/decisions.js";

it("creates a constrained potentiality without mutating inputs", () => {
  const constraintId = asConstraintId("c-new");
  const result = decideAddConstraint({
    operationId: "op-constraint",
    campaignId,
    constraintId,
    entityId,
    attributeKey: "loyalty",
    rule: { type: "REGEX", pattern: "duke|king" },
    justification: "political pressure",
    createdAt: 40,
    existing: null,
  });

  expect(result.result).toEqual({ constraintId });
  expect(result.potentialite).toMatchObject({
    entiteId: entityId,
    attribut: "loyalty",
    etat: "CONTRAINT",
  });
  expect(result.potentialite.contraintes).toContainEqual({
    id: constraintId,
    source: { kind: "INFERENCE_IA", confidence: 0.7 },
    createdAt: 40,
    regle: { type: "REGEX", pattern: "duke|king" },
    justificationNarrative: "political pressure",
  });
});

it("appends to a cloned potentiality", () => {
  const existing: Potentialite = {
    entiteId: entityId,
    attribut: "loyalty",
    etat: "CONTRAINT",
    contraintes: [{
      id: asConstraintId("old"),
      source: { kind: "INFERENCE_IA", confidence: 0.7 },
      createdAt: 1,
      regle: { type: "REGEX", pattern: "duke" },
      justificationNarrative: "old",
    }],
    contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE", tendances: [] },
  };
  const result = decideAddConstraint({
    operationId: "op-constraint-2",
    campaignId,
    constraintId: asConstraintId("new"),
    entityId,
    attributeKey: "loyalty",
    rule: { type: "REGEX", pattern: "king" },
    justification: "new",
    createdAt: 2,
    existing,
  });

  expect(result.potentialite.contraintes).toHaveLength(2);
  expect(existing.contraintes).toHaveLength(1);
});
```

Add to `test/atomic/strategy.test.ts`:

```ts
it("preserves both constraints when addConstraint runs concurrently", async () => {
  const campaignId = asCampaignId("constraint-concurrent");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Constraints", createdAt: 0, embeddingDim: 0 });
  const strategy = repositoryAtomicWriteStrategy(repository);

  await Promise.all([
    strategy.addConstraint({
      operationId: "op-a",
      campaignId,
      constraintId: "a" as never,
      entityId: asEntityID("captain"),
      attributeKey: "loyalty",
      rule: { type: "REGEX", pattern: "duke" },
      justification: "a",
      createdAt: 1,
    }),
    strategy.addConstraint({
      operationId: "op-b",
      campaignId,
      constraintId: "b" as never,
      entityId: asEntityID("captain"),
      attributeKey: "loyalty",
      rule: { type: "REGEX", pattern: "king" },
      justification: "b",
      createdAt: 2,
    }),
  ]);

  expect((await repository.getPotentialite(campaignId, asEntityID("captain"), "loyalty"))
    ?.contraintes.map((constraint) => String(constraint.id)).sort()).toEqual(["a", "b"]);
});
```

Extend `injectedStrategy()` in `test/atomic/strategy.test.ts` with:

```ts
addConstraint: vi.fn(async (command) => ({ constraintId: command.constraintId })),
```

In the existing delegation test, call:

```ts
await campaign.addConstraint({
  entityId,
  attributeKey: "loyalty",
  rule: { type: "REGEX", pattern: "duke|king" },
  justification: "politics",
});
```

Assert `strategy.addConstraint` received `campaignId`, `entityId`, `attributeKey`, `createdAt`, `constraintId`, and an `operationId` matching `/^op_/`; include `strategy.addConstraint` in the existing operation-ID loop.

Add the same required method to the inline strategy in `test/campaign-confirm-entity.test.ts`:

```ts
addConstraint: async (command) => ({ constraintId: command.constraintId }),
```

- [ ] **Step 2: Run atomic tests and confirm failure**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts test/atomic/strategy.test.ts
```

Expected: FAIL because the command, decision, and strategy method do not exist.

- [ ] **Step 3: Add atomic types**

Add to `src/atomic/types.ts`:

```ts
import type { Potentialite, RegleContrainte } from "../domain/potentialite.js";
import type { ConstraintId } from "../domain/ids.js";

export interface AddConstraintCommand extends AtomicCommand {
  campaignId: CampaignId;
  constraintId: ConstraintId;
  entityId: EntityID;
  attributeKey: string;
  rule: RegleContrainte;
  justification: string;
  createdAt: number;
}

export interface AddConstraintResult {
  constraintId: ConstraintId;
}

export interface AddConstraintDecisionInput extends AddConstraintCommand {
  existing: Potentialite | null;
}

export interface AddConstraintDecision {
  potentialite: Potentialite;
  result: AddConstraintResult;
}
```

Add to `AtomicWriteStrategy`:

```ts
addConstraint(command: AddConstraintCommand): Promise<AddConstraintResult>;
```

- [ ] **Step 4: Implement and export `decideAddConstraint`**

Add to `src/atomic/decisions.ts`:

```ts
export function decideAddConstraint(input: AddConstraintDecisionInput): AddConstraintDecision {
  const constraint = {
    id: input.constraintId,
    source: { kind: "INFERENCE_IA" as const, confidence: 0.7 },
    createdAt: input.createdAt,
    regle: input.rule,
    justificationNarrative: input.justification,
  };
  const base = input.existing ?? {
    entiteId: input.entityId,
    attribut: input.attributeKey,
    etat: "INDEFINI" as const,
    contraintes: [],
    contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE" as const, tendances: [] },
  };
  return {
    potentialite: {
      ...base,
      etat: "CONTRAINT",
      contraintes: [...base.contraintes, constraint],
      contexteGeneratif: {
        ...base.contexteGeneratif,
        tendances: [...base.contexteGeneratif.tendances],
      },
    },
    result: { constraintId: input.constraintId },
  };
}
```

Export it from `src/atomic/index.ts` and `src/index.ts`, together with the new types.

- [ ] **Step 5: Implement the repository-backed strategy method**

Add to `repositoryAtomicWriteStrategy`:

```ts
addConstraint: (command) => repo.transaction(async (tx) => {
  const existing = await tx.getPotentialite(
    command.campaignId,
    command.entityId,
    command.attributeKey,
  );
  const decision = decideAddConstraint({ ...command, existing });
  await tx.upsertPotentialite(command.campaignId, decision.potentialite);
  return decision.result;
}),
```

- [ ] **Step 6: Delegate `CampaignContext.addConstraint`**

Replace the direct read-modify-write body with:

```ts
async addConstraint(input: {
  entityId: EntityID;
  attributeKey: string;
  rule: RegleContrainte;
  justification: string;
}): Promise<{ constraintId: ConstraintId }> {
  await this.ensureUsable();
  const createdAt = Date.now();
  return this.writeStrategy.addConstraint({
    operationId: createOperationId(),
    campaignId: this.id,
    constraintId: asConstraintId(`c_${createdAt}_${Math.random().toString(36).slice(2, 8)}`),
    entityId: input.entityId,
    attributeKey: input.attributeKey,
    rule: input.rule,
    justification: input.justification,
    createdAt,
  });
}
```

- [ ] **Step 7: Run focused and full tests**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts test/atomic/strategy.test.ts test/campaign-confirm-entity.test.ts test/campaign.test.ts test/campaign-lifecycle.test.ts
pnpm test
```

Expected: all pass; concurrent constraints survive and injected strategies receive one operation ID per call.

- [ ] **Step 8: Review the atomic constraint diff without committing**

Run:

```bash
git diff --check
git diff -- src/atomic src/campaign.ts src/index.ts test/atomic
```

Expected: only add-constraint command/decision/delegation changes. Do not commit.

---

### Task 4: Add Entity Revisions and Atomic Create Decisions

**Files:**
- Modify: `src/repository/interface.ts:32-75`
- Modify: `src/repository/memory/index.ts:14-275`
- Modify: `src/repository/sqlite/migrations.ts:3-116`
- Modify: `src/repository/sqlite/index.ts:56-140`
- Modify: `src/atomic/types.ts`
- Modify: `src/atomic/decisions.ts`
- Modify: `src/atomic/repository-strategy.ts`
- Modify: `src/atomic/index.ts`, `src/index.ts`
- Modify: `test/repository/contract.ts`
- Modify: `test/repository/json-contract.test.ts`
- Modify: `test/repository/sqlite.test.ts`
- Modify: `test/atomic/decisions.test.ts`
- Modify: `test/atomic/strategy.test.ts`
- Modify: `test/campaign-confirm-entity.test.ts`

**Interfaces:**
- Produces: `RepositoryAccess.entityRevision`, `CreateEntityCommand`, `CreateEntityResult`, `CreateEntityDecisionInput`, `CreateEntityDecision`, `AtomicWriteStrategy.createEntity`, `decideCreateEntity`.
- Later task consumes these from `CampaignContext.mentionEntity`.

- [ ] **Step 1: Write failing revision contract tests**

Add to the shared repository contract:

```ts
it("tracks a per-campaign entity revision", async () => {
  expect(await repo.entityRevision(cid)).toBe(0);
  await repo.upsertEntity(entity("rev-1"));
  expect(await repo.entityRevision(cid)).toBe(1);
  await repo.upsertEntity(entity("rev-1", { description: "updated" }));
  expect(await repo.entityRevision(cid)).toBe(2);
});

it("rejects entityRevision for a missing campaign", async () => {
  await repo.deleteCampaign(cid);
  await expect(repo.entityRevision(cid)).rejects.toThrow(/campaign "c1" not found/i);
});
```

In `test/repository/json-contract.test.ts`, extend the persistence test:

```ts
expect(await r2.entityRevision(cid)).toBe(1);
```

In `test/repository/sqlite.test.ts`, import `Database` from `better-sqlite3` and add this file-backed migration regression:

```ts
it("migrates a version-2 campaign with entity revision zero", async () => {
  const tmp = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-revision-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
  const legacy = new Database(tmp);
  legacy.exec(`
    CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
    INSERT INTO schema_version (version) VALUES (2);
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      embedding_dim INTEGER NOT NULL
    );
    INSERT INTO campaigns (id, name, created_at, embedding_dim)
    VALUES ('c1', 'Legacy', 0, 0);
  `);
  legacy.close();

  const migrated = new SqliteRepository({ path: tmp, embeddingDim: 0 });
  expect(await migrated.entityRevision(cid)).toBe(0);
  await migrated.close();
});
```

Add to `test/atomic/strategy.test.ts`:

```ts
it("increments the entity revision when confirmation adds an alias", async () => {
  const campaignId = asCampaignId("confirm-revision");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Revision", createdAt: 0, embeddingDim: 0 });
  const entityId = await seedEntity(repository, campaignId);
  const strategy = repositoryAtomicWriteStrategy(repository);
  expect(await repository.entityRevision(campaignId)).toBe(1);

  await strategy.confirmEntityMatch({
    operationId: "op-confirm-revision",
    campaignId,
    entityId,
    mention: "the captain",
    type: "PERSONNAGE",
    observedAt: 10,
  });

  expect(await repository.entityRevision(campaignId)).toBe(2);
});
```

- [ ] **Step 2: Write failing pure create-decision tests**

Add to `test/atomic/decisions.test.ts`:

```ts
import { decideCreateEntity } from "../../src/atomic/decisions.js";

const candidate = entity({ id: asEntityID("candidate"), name: "Captain Roric" });

it("returns stale before considering exact matches", () => {
  expect(decideCreateEntity({
    operationId: "op-create",
    campaignId,
    expectedEntityRevision: 1,
    candidate,
    identityKeys: ["captain roric"],
    force: false,
    currentEntityRevision: 2,
    exactMatches: [entity()],
  }).result).toEqual({ status: "stale" });
});

it("reuses one exact same-type match", () => {
  const existingEntity = entity();
  const decision = decideCreateEntity({
    operationId: "op-create",
    campaignId,
    expectedEntityRevision: 1,
    candidate,
    identityKeys: ["captain roric"],
    force: true,
    currentEntityRevision: 1,
    exactMatches: [existingEntity],
  });
  expect(decision.entity).toBeNull();
  expect(decision.result).toEqual({
    status: "existing",
    entityId: existingEntity.id,
    isNew: false,
    resolvedTo: existingEntity.id,
  });
});

it("returns conflict for multiple exact matches unless forced", () => {
  const matches = [entity(), entity({ id: asEntityID("e2"), name: "Other" })];
  const conflict = decideCreateEntity({
    operationId: "op-create",
    campaignId,
    expectedEntityRevision: 1,
    candidate,
    identityKeys: ["captain"],
    force: false,
    currentEntityRevision: 1,
    exactMatches: matches,
  });
  expect(conflict.result).toMatchObject({ status: "conflict" });

  const forced = decideCreateEntity({
    operationId: "op-force",
    campaignId,
    expectedEntityRevision: 1,
    candidate,
    identityKeys: ["captain"],
    force: true,
    currentEntityRevision: 1,
    exactMatches: matches,
  });
  expect(forced.result).toEqual({ status: "created", entityId: candidate.id, isNew: true });
  expect(forced.entity).toEqual(candidate);
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run:

```bash
pnpm vitest run test/repository/memory-contract.test.ts test/repository/json-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/sqlite.test.ts test/atomic/decisions.test.ts
```

Expected: FAIL because revision methods/types/decisions do not exist.

- [ ] **Step 4: Add revision state to repository interfaces and memory/JSON**

In `src/repository/interface.ts`, add:

```ts
entityRevision(campaignId: CampaignId): Promise<number>;
```

Add `entityRevisions: Map<string, number>` to `MemoryState` and `emptyMemoryState()`.

Set and clear revision with campaign lifecycle:

```ts
async createCampaign(meta: CampaignMeta): Promise<void> {
  // existing dimension checks
  this.state.campaigns.set(meta.id, { ...meta });
  this.state.entityRevisions.set(meta.id, 0);
  await this.mutated();
}

private async deleteCampaignNow(id: CampaignId): Promise<void> {
  // existing purge
  this.state.entityRevisions.delete(id);
  await this.mutated();
}
```

Add:

```ts
async entityRevision(campaignId: CampaignId): Promise<number> {
  this.assertCampaignExists(campaignId);
  return this.state.entityRevisions.get(campaignId) ?? 0;
}
```

Increment revision after a successful entity upsert and before `mutated()`:

```ts
this.state.entityRevisions.set(
  e.campaignId,
  (this.state.entityRevisions.get(e.campaignId) ?? 0) + 1,
);
```

No JSON schema-version bump is required: `tryLoad()` already merges parsed state over `emptyMemoryState()`, so old files receive an empty revision map and existing campaigns read revision `0` until their next entity update.

- [ ] **Step 5: Add SQLite migration and revision behavior**

Change `SCHEMA_VERSION` to `3` and add:

```ts
{
  version: 3,
  sql: `ALTER TABLE campaigns ADD COLUMN entity_revision INTEGER NOT NULL DEFAULT 0;`,
},
```

Include `entity_revision` in campaign creation:

```sql
INSERT OR REPLACE INTO campaigns (id, name, created_at, embedding_dim, entity_revision)
VALUES (?, ?, ?, ?, 0)
```

Add:

```ts
async entityRevision(campaignId: CampaignId): Promise<number> {
  const row = this.db.prepare(
    `SELECT entity_revision FROM campaigns WHERE id = ?`,
  ).get(campaignId) as { entity_revision: number } | undefined;
  if (!row) throw new SneqCampaignNotFoundError(campaignId);
  return row.entity_revision;
}
```

Inside the existing synchronous `upsertEntity` transaction, increment after entity/alias/vector writes succeed:

```ts
this.db.prepare(
  `UPDATE campaigns SET entity_revision = entity_revision + 1 WHERE id = ?`,
).run(e.campaignId);
```

- [ ] **Step 6: Add create-entity atomic types and decision**

Add to `src/atomic/types.ts`:

```ts
export interface EntityCandidateSummary {
  entityId: EntityID;
  name: string;
  type: EntityType;
}

export interface CreateEntityCommand extends AtomicCommand {
  campaignId: CampaignId;
  expectedEntityRevision: number;
  candidate: Entity;
  identityKeys: string[];
  force: boolean;
}

export type CreateEntityResult =
  | { status: "stale" }
  | { status: "created"; entityId: EntityID; isNew: true }
  | { status: "existing"; entityId: EntityID; isNew: false; resolvedTo: EntityID }
  | { status: "conflict"; candidates: EntityCandidateSummary[] };

export interface CreateEntityDecisionInput extends CreateEntityCommand {
  currentEntityRevision: number;
  exactMatches: Entity[];
}

export interface CreateEntityDecision {
  entity: Entity | null;
  result: CreateEntityResult;
}
```

Add to `AtomicWriteStrategy`:

```ts
createEntity(command: CreateEntityCommand): Promise<CreateEntityResult>;
```

Implement in `src/atomic/decisions.ts`:

```ts
export function decideCreateEntity(input: CreateEntityDecisionInput): CreateEntityDecision {
  if (input.currentEntityRevision !== input.expectedEntityRevision) {
    return { entity: null, result: { status: "stale" } };
  }

  const matches = [...new Map(
    input.exactMatches
      .filter((match) => match.type === input.candidate.type)
      .map((match) => [match.id, match]),
  ).values()];

  if (matches.length === 1) {
    const match = matches[0]!;
    return {
      entity: null,
      result: { status: "existing", entityId: match.id, isNew: false, resolvedTo: match.id },
    };
  }

  if (matches.length > 1 && !input.force) {
    return {
      entity: null,
      result: {
        status: "conflict",
        candidates: matches.slice(0, 5).map((match) => ({
          entityId: match.id,
          name: match.name,
          type: match.type,
        })),
      },
    };
  }

  return {
    entity: input.candidate,
    result: { status: "created", entityId: input.candidate.id, isNew: true },
  };
}
```

Export the types and decision through `src/atomic/index.ts` and `src/index.ts`.

- [ ] **Step 7: Implement local atomic create**

Add to `repositoryAtomicWriteStrategy`:

```ts
createEntity: (command) => repo.transaction(async (tx) => {
  const currentEntityRevision = await tx.entityRevision(command.campaignId);
  const matches = new Map<string, Entity>();
  for (const identityKey of command.identityKeys) {
    for (const entity of await tx.findEntitiesByAlias(
      command.campaignId,
      identityKey,
      command.candidate.type,
    )) matches.set(entity.id, entity);
  }
  const decision = decideCreateEntity({
    ...command,
    currentEntityRevision,
    exactMatches: [...matches.values()],
  });
  if (decision.entity) await tx.upsertEntity(decision.entity);
  return decision.result;
}),
```

Add this required method to `injectedStrategy()` in `test/atomic/strategy.test.ts`:

```ts
createEntity: vi.fn(async (command) => ({
  status: "created" as const,
  entityId: command.candidate.id,
  isNew: true as const,
})),
```

Add the same method to the inline strategy in `test/campaign-confirm-entity.test.ts`:

```ts
createEntity: async (command) => ({
  status: "created" as const,
  entityId: command.candidate.id,
  isNew: true as const,
}),
```

- [ ] **Step 8: Run focused and full tests**

Run:

```bash
pnpm vitest run test/repository/memory-contract.test.ts test/repository/json-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/sqlite.test.ts test/atomic/decisions.test.ts test/atomic/strategy.test.ts test/campaign-confirm-entity.test.ts
pnpm test
pnpm typecheck
```

Expected: all pass; revisions persist and atomic create decisions are exported.

- [ ] **Step 9: Review the revision/create diff without committing**

Run:

```bash
git diff --check
git diff -- src/repository src/atomic src/index.ts test/repository test/atomic
```

Expected: revision storage, migration, create command/decision/strategy, and tests only. Do not commit.

---

### Task 5: Route `mentionEntity` Through Revision Retry

**Files:**
- Create: `test/campaign-mention-concurrency.test.ts`
- Modify: `src/campaign.ts:145-195`
- Modify: `test/atomic/strategy.test.ts`
- Modify: `test/campaign.test.ts:52-70,245-360`

**Interfaces:**
- Consumes: `RepositoryAccess.entityRevision`, `AtomicWriteStrategy.createEntity`, `CreateEntityResult`, `SneqConcurrentEntityCreationError`.
- Produces: at most three stale retries; stable operation ID and candidate metadata; existing public `MentionResult` mapping.

- [ ] **Step 1: Write a failing stable-operation-ID retry test**

Extend the injected strategy test in `test/atomic/strategy.test.ts` with a `createEntity` mock that returns `stale` once and `created` once:

```ts
it("keeps one operation ID across a stale create retry", async () => {
  const campaignId = asCampaignId("retry-op");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Retry", createdAt: 0, embeddingDim: 0 });
  const base = injectedStrategy();
  const createEntity = vi.fn()
    .mockResolvedValueOnce({ status: "stale" })
    .mockImplementationOnce(async (command) => ({
      status: "created",
      entityId: command.candidate.id,
      isNew: true,
    }));
  const strategy = { ...base, createEntity };
  const engine = new Engine({
    repository,
    router: routerConfig,
    _routerDeps: routerDeps,
    writeStrategy: strategy,
  });
  const campaign = engine.campaign(campaignId);

  await expect(campaign.mentionEntity({
    canonicalName: "Roric",
    type: "PERSONNAGE",
    description: "Captain",
  })).resolves.toMatchObject({ isNew: true });

  expect(createEntity).toHaveBeenCalledTimes(2);
  const first = createEntity.mock.calls[0]![0];
  const second = createEntity.mock.calls[1]![0];
  expect(second.operationId).toBe(first.operationId);
  expect(second.candidate.id).toBe(first.candidate.id);
  expect(second.candidate.createdAt).toBe(first.candidate.createdAt);
});

it("throws after three stale entity revisions without changing operation ID", async () => {
  const campaignId = asCampaignId("retry-exhausted");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Exhausted", createdAt: 0, embeddingDim: 0 });
  const base = injectedStrategy();
  const createEntity = vi.fn(async () => ({ status: "stale" as const }));
  const engine = new Engine({
    repository,
    router: routerConfig,
    _routerDeps: routerDeps,
    writeStrategy: { ...base, createEntity },
  });
  const campaign = engine.campaign(campaignId);

  await expect(campaign.mentionEntity({
    canonicalName: "Roric",
    type: "PERSONNAGE",
    description: "Captain",
  })).rejects.toMatchObject({
    name: "SneqConcurrentEntityCreationError",
    campaignId,
    attempts: 3,
  });
  expect(createEntity).toHaveBeenCalledTimes(3);
  expect(new Set(createEntity.mock.calls.map(([command]) => command.operationId))).toHaveSize(1);
});
```

- [ ] **Step 2: Write a failing real concurrency regression**

Create `test/campaign-mention-concurrency.test.ts` with a keyless memory Engine, wrap the real repository strategy, and barrier the first two create attempts:

```ts
import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { repositoryAtomicWriteStrategy } from "../src/atomic/repository-strategy.js";
import type { AtomicWriteStrategy } from "../src/atomic/types.js";
import { asCampaignId } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Provider, ProviderRef } from "../src/router/interface.js";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("not used"); },
  async embed() { throw new Error("not used in keyless mode"); },
};

describe("CampaignContext mentionEntity concurrency", () => {
  it("makes the stale creator rerun resolution and converge on one canonical entity", async () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const base = repositoryAtomicWriteStrategy(repository);
    const bothReady = deferred();
    const release = deferred();
    let firstAttempts = 0;
    const strategy: AtomicWriteStrategy = {
      ...base,
      async createEntity(command) {
        firstAttempts += 1;
        if (firstAttempts <= 2) {
          if (firstAttempts === 2) bothReady.resolve();
          await release.promise;
        }
        return base.createEntity(command);
      },
    };
    const engine = new Engine({
      repository,
      writeStrategy: strategy,
      router: {
        tiers: {
          heavy: { primary: ref, fallbacks: [] },
          light: { primary: ref, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => provider },
    });
    const campaignId = asCampaignId("race");
    const campaign = await engine.createCampaign({ id: campaignId, name: "Race", embeddingDim: 0 });

    const first = campaign.mentionEntity({
      canonicalName: "Captain Roric",
      type: "PERSONNAGE",
      aliases: ["the captain"],
      description: "Captain of the guard",
    });
    const second = campaign.mentionEntity({
      canonicalName: "Captain Roric",
      type: "PERSONNAGE",
      aliases: ["the captain"],
      description: "Captain of the guard",
    });

    await bothReady.promise;
    release.resolve();
    const results = await Promise.all([first, second]);

    expect(new Set(results.map((result) => result.entityId))).toHaveSize(1);
    expect(results.filter((result) => result.isNew)).toHaveLength(1);
    expect(await repository.findEntitiesByAlias(campaignId, "captain roric", "PERSONNAGE"))
      .toHaveLength(1);
    await engine.close();
  });
});
```

- [ ] **Step 3: Run mention tests and confirm failure**

Run:

```bash
pnpm vitest run test/atomic/strategy.test.ts test/campaign-mention-concurrency.test.ts test/campaign.test.ts
```

Expected: FAIL because `mentionEntity` still performs direct `upsertEntity` and never calls `createEntity`.

- [ ] **Step 4: Replace direct entity insertion with bounded optimistic retry**

In `src/campaign.ts`, import `normalizeAlias`, `SneqConcurrentEntityCreationError`, and `CreateEntityResult`. Add:

```ts
const MAX_ENTITY_CREATION_ATTEMPTS = 3;
```

Replace `mentionEntity` with this flow:

```ts
async mentionEntity(input: MentionInput): Promise<MentionResult> {
  await this.ensureUsable();
  const operationId = createOperationId();
  const createdAt = Date.now();
  const entityId = asEntityID(
    `${input.type.toLowerCase()}_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const aliasObservedAt = createdAt;
  let embeddingComputed = false;
  let embedding: Float32Array | null = null;
  let embeddingRefreshedAt: number | null = null;

  for (let attempt = 1; attempt <= MAX_ENTITY_CREATION_ATTEMPTS; attempt += 1) {
    const expectedEntityRevision = await this.deps.repo.entityRevision(this.id);
    const resolution = await this.resolveEntity({
      mention: input.canonicalName,
      type: input.type,
    });

    if (resolution.match) {
      return { entityId: resolution.match.id, isNew: false, resolvedTo: resolution.match.id };
    }
    if (!input.force && resolution.unavailableReason) {
      return {
        entityId: null,
        isNew: false,
        needsAdjudication: true,
        reason: "unavailable",
        candidates: [],
      };
    }
    if (!input.force && resolution.notFoundReason === "ambiguous" && resolution.candidates.length > 0) {
      return {
        entityId: null,
        isNew: false,
        needsAdjudication: true,
        reason: "ambiguous",
        candidates: resolution.candidates.slice(0, 5).map((candidate) => ({
          entityId: candidate.id,
          name: candidate.name,
          type: candidate.type,
        })),
      };
    }

    if (!embeddingComputed) {
      embeddingComputed = true;
      if (this.deps.embedder) {
        try {
          embedding = await this.deps.embedder.embed(`${input.canonicalName}. ${input.description}`);
          embeddingRefreshedAt = Date.now();
        } catch {
          embedding = null;
          embeddingRefreshedAt = null;
        }
      }
    }

    const candidate: Entity = {
      campaignId: this.id,
      id: entityId,
      type: input.type,
      name: input.canonicalName,
      description: input.description,
      nomConnu: true,
      aliases: (input.aliases ?? []).map((text) => ({
        text,
        source: { kind: "GM_NARRATION" as const },
        observedAt: aliasObservedAt,
      })),
      tags: [],
      createdAt,
      embedding,
      embeddingRefreshedAt,
    };
    const identityKeys = [...new Set(
      [candidate.name, ...candidate.aliases.map((alias) => alias.text)].map(normalizeAlias),
    )];
    const result: CreateEntityResult = await this.writeStrategy.createEntity({
      operationId,
      campaignId: this.id,
      expectedEntityRevision,
      candidate,
      identityKeys,
      force: input.force === true,
    });

    if (result.status === "stale") continue;
    if (result.status === "created") return { entityId: result.entityId, isNew: true };
    if (result.status === "existing") {
      return { entityId: result.entityId, isNew: false, resolvedTo: result.resolvedTo };
    }
    return {
      entityId: null,
      isNew: false,
      needsAdjudication: true,
      reason: "ambiguous",
      candidates: result.candidates,
    };
  }

  throw new SneqConcurrentEntityCreationError(this.id, MAX_ENTITY_CREATION_ATTEMPTS);
}
```

Delete the old direct `this.deps.repo.upsertEntity(entity)` path.

- [ ] **Step 5: Add provider-outside-transaction coverage**

In `test/campaign-mention-concurrency.test.ts`, import `Repository` and add:

```ts
import type { Repository } from "../src/repository/interface.js";

class TrackingMemoryRepository extends InMemoryRepository {
  insideTransaction = false;

  override transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    return super.transaction(async (tx) => {
      this.insideTransaction = true;
      try {
        return await fn(tx);
      } finally {
        this.insideTransaction = false;
      }
    });
  }
}

it("keeps resolver and candidate embedding work outside repository transactions", async () => {
  const repository = new TrackingMemoryRepository({ embeddingDim: 3 });
  const embeddingRef: ProviderRef = {
    provider: "custom",
    apiKeyEnv: "_NOOP",
    model: "embedding-test",
    embeddingDim: 3,
  };
  let embeddingCalls = 0;
  const embeddingProvider: Provider = {
    ref: embeddingRef,
    async chat() { throw new Error("judge is not needed for an empty campaign"); },
    async embed() {
      expect(repository.insideTransaction).toBe(false);
      embeddingCalls += 1;
      return {
        vectors: [new Float32Array([1, 0, 0])],
        dim: 3,
        modelUsed: embeddingRef.model,
        providerUsed: "custom",
      };
    },
  };
  const engine = new Engine({
    repository,
    router: {
      tiers: {
        heavy: { primary: embeddingRef, fallbacks: [] },
        light: { primary: embeddingRef, fallbacks: [] },
        embeddings: { primary: embeddingRef, fallbacks: [] },
      },
    },
    _routerDeps: { resolveProvider: () => embeddingProvider },
  });
  const campaign = await engine.createCampaign({
    id: asCampaignId("outside-transaction"),
    name: "Outside transaction",
    embeddingDim: 3,
  });

  await expect(campaign.mentionEntity({
    canonicalName: "Aldric",
    type: "PERSONNAGE",
    description: "A smith",
  })).resolves.toMatchObject({ isNew: true });
  expect(embeddingCalls).toBeGreaterThanOrEqual(2);
  await engine.close();
});
```

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
pnpm vitest run test/campaign-mention-concurrency.test.ts test/atomic/strategy.test.ts test/campaign.test.ts test/campaign-confirm-entity.test.ts
pnpm test
pnpm typecheck
```

Expected: one concurrent call creates, one reuses, one entity remains, and provider work is outside transactions.

- [ ] **Step 7: Review the mention retry diff without committing**

Run:

```bash
git diff --check
git diff -- src/campaign.ts test/campaign-mention-concurrency.test.ts test/atomic/strategy.test.ts test/campaign.test.ts
```

Expected: no direct entity upsert remains in `CampaignContext`. Do not commit.

---

### Task 6: Constrain Graph Depth to Direct Neighbors

**Files:**
- Modify: `src/repository/interface.ts:56-60`
- Modify: `src/repository/memory/index.ts:207-216`
- Modify: `src/repository/sqlite/index.ts:256-271`
- Modify: `src/campaign.ts:129-141`
- Modify: `src/tools/schemas.ts:48-52,96-100`
- Modify: `src/tools/dispatcher.ts:9-43`
- Modify: `test/repository/contract.ts:138-148`
- Modify: `test/tools/dispatcher.test.ts`
- Create: `test/campaign-depth.test.ts`

**Interfaces:**
- Produces: `neighbors(campaignId, entityId)` and `depth?: 0 | 1`.
- Removes: repository-level depth argument and acceptance of tool depth `2`/`3`.

- [ ] **Step 1: Write failing A → B → C and schema tests**

Create `test/campaign-depth.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { Engine } from "../src/engine.js";
import { asCampaignId, asEntityID, asFactId } from "../src/domain/ids.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import type { Provider, ProviderRef } from "../src/router/interface.js";

const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "noop" };
const provider: Provider = {
  ref,
  async chat() { throw new Error("not used"); },
  async embed() { throw new Error("not used"); },
};

const observation = {
  source: "SYSTEM",
  method: "DEDUCTION_CONFIRMEE",
  fiabilite: "CERTAINE",
  timestamp: 0,
} as const;

describe("CampaignContext getRelevantFacts depth", () => {
  it("returns own facts at depth zero and direct neighbors only at depth one", async () => {
    const repository = new InMemoryRepository({ embeddingDim: 0 });
    const engine = new Engine({
      repository,
      router: {
        tiers: {
          heavy: { primary: ref, fallbacks: [] },
          light: { primary: ref, fallbacks: [] },
        },
      },
      _routerDeps: { resolveProvider: () => provider },
    });
    const campaignId = asCampaignId("depth");
    const campaign = await engine.createCampaign({ id: campaignId, name: "Depth", embeddingDim: 0 });
    const a = asEntityID("A");
    const b = asEntityID("B");
    const c = asEntityID("C");

    for (const entityId of [a, b, c]) {
      await repository.upsertNode(campaignId, {
        entityId,
        type: "PERSONNAGE",
        etatActuel: "BIEN_CONNU",
        poidsNarratif: 1,
        tags: [],
      });
      await repository.appendFact({
        campaignId,
        factId: asFactId(`fact-${entityId}`),
        entityId,
        key: "name",
        value: { type: "STRING", value: String(entityId) },
        category: "IDENTITE",
        observation,
        turn: 1,
      });
    }
    await repository.upsertEdge(campaignId, {
      key: "A-B",
      source: a,
      cible: b,
      typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
      directionnalite: "BIDIRECTIONNELLE",
      forcePropagation: 1,
      etatArete: "FIGE",
      attributs: {},
    });
    await repository.upsertEdge(campaignId, {
      key: "B-C",
      source: b,
      cible: c,
      typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
      directionnalite: "BIDIRECTIONNELLE",
      forcePropagation: 1,
      etatArete: "FIGE",
      attributs: {},
    });

    expect((await campaign.getRelevantFacts(a)).map((fact) => fact.entityId)).toEqual([a]);
    expect(new Set((await campaign.getRelevantFacts(a, { depth: 1 })).map((fact) => fact.entityId)))
      .toEqual(new Set([a, b]));
    expect((await campaign.getRelevantFacts(a, { depth: 1 })).map((fact) => fact.entityId))
      .not.toContain(c);
    await engine.close();
  });
});
```

Add to `test/tools/dispatcher.test.ts`:

```ts
it("rejects graph depth greater than one", async () => {
  await expect(dispatchToolCall(
    "sneq__get_relevant_facts",
    { entityId: "a", depth: 2 },
    stubCtx(),
  )).rejects.toThrow();
});
```

Update the shared repository contract assertions to:

```ts
expect((await repo.neighbors(cid, asEntityID("a"))).map((neighbor) => String(neighbor.node.entityId)))
  .toEqual(["b"]);
expect((await repo.neighbors(cid, asEntityID("b"))).map((neighbor) => String(neighbor.node.entityId)))
  .toEqual(["a"]);
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm vitest run test/campaign-depth.test.ts test/tools/dispatcher.test.ts test/repository/memory-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/json-contract.test.ts
```

Expected: TypeScript/runtime failures because repository signatures and schema still accept broader depth.

- [ ] **Step 3: Narrow the repository and campaign interfaces**

Change `Repository.neighbors` to:

```ts
neighbors(
  campaignId: CampaignId,
  entityId: EntityID,
): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>>;
```

Remove `_depth` from memory and SQLite implementations.

Change `CampaignContext.getRelevantFacts` and `ToolCallContext.getRelevantFacts` to:

```ts
opts?: { attributeKeys?: string[]; depth?: 0 | 1 }
```

Call:

```ts
const neighbors = await this.deps.repo.neighbors(this.id, entityId);
```

- [ ] **Step 4: Narrow the public tool schema and description**

Change the Zod field to:

```ts
depth: z.union([z.literal(0), z.literal(1)]).optional()
```

Change the description to:

```ts
sneq__get_relevant_facts: "List canonical facts about an entity, optionally including direct-neighbor facts with depth:1.",
```

Cast dispatcher depth as `0 | 1`.

- [ ] **Step 5: Run focused and full tests**

Run:

```bash
pnpm vitest run test/campaign-depth.test.ts test/tools/dispatcher.test.ts test/repository/memory-contract.test.ts test/repository/sqlite-contract.test.ts test/repository/json-contract.test.ts
pnpm test
pnpm typecheck
```

Expected: depth `0|1` works, depth `2` rejects, and every adapter exposes direct neighbors only.

- [ ] **Step 6: Review the depth diff without committing**

Run:

```bash
git diff --check
git diff -- src/repository src/campaign.ts src/tools test/repository test/campaign-depth.test.ts test/tools/dispatcher.test.ts
```

Expected: only one-hop contract changes. Do not commit.

---

### Task 7: Make Propagation Structurally Deterministic

**Files:**
- Modify: `src/core/propagation.ts:7-129`
- Modify: `test/core/propagation.test.ts:45-74`

**Interfaces:**
- Produces: optional `PropagationInput.createdAt` and stable constraint IDs.
- Preserves: `propagate()` result shape and existing callers that omit `createdAt`.

- [ ] **Step 1: Write the failing structural-equality regression**

Add to `test/core/propagation.test.ts`:

```ts
it("returns structurally equal output for identical input", () => {
  const input = {
    fact,
    campaignId: cid,
    edges: [edge("A", "B")],
    rules: [rule],
    maxDepth: 2,
    minForce: 0.1,
    createdAt: 123,
  };

  expect(propagate(input)).toEqual(propagate(input));
});

it("falls back to the source observation timestamp", () => {
  const result = propagate({
    fact,
    campaignId: cid,
    edges: [edge("A", "B")],
    rules: [rule],
    maxDepth: 2,
    minForce: 0.1,
  });
  expect(result.contraintesPropagees[0]!.contrainte.createdAt).toBe(fact.observation.timestamp);
});
```

- [ ] **Step 2: Run the propagation test and confirm failure**

Run:

```bash
pnpm vitest run test/core/propagation.test.ts
```

Expected: structural equality fails because IDs and `Date.now()` differ.

- [ ] **Step 3: Replace global/time metadata with deterministic helpers**

Add `createdAt?: number` to `PropagationInput`.

Delete `contraintCounter` and replace `synthesizeContrainte` with:

```ts
function stableHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function synthesizeContrainte(
  input: PropagationInput,
  rule: ReglePropagation,
  targetEntityId: EntityID,
  targetAttribute: string,
  hopDistance: number,
  force: number,
): Contrainte {
  const identity = [
    input.campaignId,
    input.fact.factId,
    rule.id,
    targetEntityId,
    targetAttribute,
    hopDistance,
  ].join("|");
  return {
    id: asConstraintId(`prop_${stableHash(identity)}`),
    source: { kind: "FAIT_CANONIQUE", factId: input.fact.factId },
    createdAt: input.createdAt ?? input.fact.observation.timestamp,
    regle: {
      type: "CORRELE_AVEC",
      autreEntite: input.fact.entityId,
      autreAttribut: input.fact.key,
    },
    justificationNarrative: `${rule.nom} (force=${force.toFixed(2)})`,
  };
}
```

In the result loop, calculate `targetAttribute` once and call:

```ts
const targetAttribute = deriveTargetAttribute(rule, fact);
result.push({
  entityId: cur.entityId,
  attributCible: targetAttribute,
  contrainte: synthesizeContrainte(
    input,
    rule,
    cur.entityId,
    targetAttribute,
    cur.distance,
    cur.forceAccumulee,
  ),
  hopDistance: cur.distance,
  forceAccumulee: cur.forceAccumulee,
});
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
pnpm vitest run test/core/propagation.test.ts
pnpm test
pnpm typecheck
```

Expected: repeated identical inputs are structurally equal; existing traversal/decay tests remain green.

- [ ] **Step 5: Review the propagation diff without committing**

Run:

```bash
git diff --check
git diff -- src/core/propagation.ts test/core/propagation.test.ts
```

Expected: no global counter or internal wall-clock read remains. Do not commit.

---

### Task 8: Remove `collapse_attribute` and Update Current Documentation

**Files:**
- Modify: `src/campaign.ts`
- Modify: `src/tools/schemas.ts`
- Modify: `src/tools/dispatcher.ts`
- Modify: `src/tools/adapters.ts`
- Modify: `src/cli/types.ts`
- Modify: `src/cli/help.ts`
- Modify: `src/cli/run.ts`
- Modify: `src/cli/errors.ts`
- Modify: `test/tools/dispatcher.test.ts`
- Modify: `test/cli/unit/parse-argv.test.ts`
- Modify: `test/cli/unit/help.test.ts`
- Delete: `test/cli/unit/collapse-attribute.test.ts`
- Modify: `README.md`
- Modify: `UPGRADING.md`
- Modify: `skills/sneq-narrative-engine.md`
- Regenerate: `docs/api.md`, `docs/typedoc/**`

**Interfaces:**
- Removes: `CampaignContext.collapseAttribute`, `ToolCallContext.collapseAttribute`, `sneq__collapse_attribute`, and CLI `collapse-attribute`.
- Preserves: `ADVERTISED_TOOL_NAMES` export, now equal to `ToolNames`.
- Final counts: 10 advertised tools and 14 CLI commands.

- [ ] **Step 1: Write failing absence/count tests**

Update `test/tools/dispatcher.test.ts`:

```ts
import { ToolNames } from "../../src/tools/schemas.js";

it("exports one truthful ten-tool set", () => {
  expect(ToolNames).toHaveLength(10);
  expect(ADVERTISED_TOOL_NAMES).toEqual(ToolNames);
  expect(ToolNames).not.toContain("sneq__collapse_attribute");
  expect(anthropicTools()).toHaveLength(10);
  expect(openAITools()).toHaveLength(10);
  expect(geminiTools()[0]!.functionDeclarations).toHaveLength(10);
  expect(genericTools()).toHaveLength(10);
});

it("rejects the removed collapse tool as unknown", async () => {
  await expect(dispatchToolCall(
    "sneq__collapse_attribute",
    { entityId: "e", attributeKey: "k" },
    stubCtx(),
  )).rejects.toThrow(/unknown tool/i);
});
```

Remove `collapseAttribute` from `stubCtx()`.

Add to `test/cli/unit/parse-argv.test.ts`:

```ts
it("treats collapse-attribute as an unknown removed command", () => {
  const result = parseArgv(["collapse-attribute"]);
  expect(result.command).toBe("unknown");
  expect(result.rawCommand).toBe("collapse-attribute");
});
```

In `test/cli/unit/help.test.ts`, import `KNOWN_COMMANDS` and replace the command-count test with:

```ts
import { KNOWN_COMMANDS } from "../../../src/cli/types.js";

it("lists the fourteen supported commands and omits collapse-attribute", () => {
  const output = helpText();
  expect(KNOWN_COMMANDS).toHaveLength(14);
  expect(output).not.toContain("collapse-attribute");
  for (const command of KNOWN_COMMANDS) expect(output).toContain(command);
});
```

- [ ] **Step 2: Run tool/CLI tests and confirm failure**

Run:

```bash
pnpm vitest run test/tools/dispatcher.test.ts test/cli/unit/parse-argv.test.ts test/cli/unit/help.test.ts test/cli/unit/collapse-attribute.test.ts
```

Expected: FAIL because collapse remains in every current surface.

- [ ] **Step 3: Remove the TypeScript/tool surface**

Delete `CampaignContext.collapseAttribute` from `src/campaign.ts`.

Delete `collapseAttribute` from `ToolCallContext` and remove the dispatcher case.

Delete `sneq__collapse_attribute` from `ToolNames`, `schemas`, and `toolDescriptions`.

Replace `src/tools/adapters.ts` special filtering with:

```ts
/** Tools advertised to LLMs. Every listed tool is implemented. */
export const ADVERTISED_TOOL_NAMES: readonly ToolName[] = ToolNames;
```

Remove no-longer-used `AttributValue` imports from `campaign.ts`/`dispatcher.ts` only when TypeScript confirms they are unused elsewhere.

- [ ] **Step 4: Remove the CLI command and NOT_IMPLEMENTED code**

Delete `"collapse-attribute"` from `KNOWN_COMMANDS` and `COMMAND_DESCRIPTIONS`.

Delete the `case "collapse-attribute"` branch from `src/cli/run.ts`; update the default-branch comment from “9 remaining tool commands” to “9 tool commands”.

Delete `"NOT_IMPLEMENTED"` from `ErrorCode` because no remaining source path emits it.

Delete `test/cli/unit/collapse-attribute.test.ts` after verifying it is exactly the previously read compatibility test and no other behavior lives there.

- [ ] **Step 5: Update README current behavior**

Make these exact content changes in `README.md`:

- In “Distributed stores”, say the strategy owns `registerFact`, `setScene`, `advanceTurn`, entity confirmation, constraint append, and canonical entity creation.
- Explain that canonical creation uses a per-campaign entity revision and stale resolution retry; distributed strategies must not dedupe non-terminal stale results.
- Change the CLI count to 14 and list nine dispatcher commands without `collapse-attribute`, plus three conveniences, validation, and prepare-turn.
- Remove the comment saying collapse is excluded from tool sets.
- Replace the deferred-scope collapse bullet with a short supported-path statement under the validation utility section: consumers compose `Router.chat + validateValue + registerFact`.
- Update the project structure/test count only if generated/fresh test output supplies a new exact count; do not guess.

- [ ] **Step 6: Add an unreleased breaking-change section to UPGRADING**

After the introductory paragraph, insert:

```md
## Unreleased pre-1.0 changes after 0.1.0

- `collapse-attribute`, `sneq__collapse_attribute`, and `CampaignContext.collapseAttribute` were removed. They never succeeded in 0.1.0. Compose `Router.chat` + `validateValue` + `registerFact` instead.
- `getRelevantFacts(..., { depth })` now accepts only `0 | 1`; repository `neighbors()` is explicitly direct-only.
- Custom `AtomicWriteStrategy` implementations must add `addConstraint` and `createEntity`, plus the entity-revision/idempotency semantics documented in the README.
- Stale or closed `CampaignContext` references now throw `SneqCampaignContextInvalidatedError` instead of reaching repository state.
```

Remove the old section claiming collapse still returns `NOT_IMPLEMENTED`, remove `NOT_IMPLEMENTED` from the compatible/additive bullet, and update the in-process compatibility table so it no longer promises dispatcher acceptance.

- [ ] **Step 7: Update the agent skill**

Change the relevant-facts entry to:

```md
- **`sneq__get_relevant_facts({ entityId, attributeKeys?, depth? })`** — Get canonical facts for the entity. Omit `depth` or pass `0` for own facts; pass `1` to include direct-neighbor facts. Deeper traversal is not part of the V2 contract.
```

Delete the entire “V2 scope note” about `sneq__collapse_attribute`. Add one failure-mode bullet:

```md
- **Generate then commit:** there is no collapse tool. Decide the value in narration, validate it when needed, then call `sneq__register_fact`.
```

- [ ] **Step 8: Run focused tests, regenerate docs, and check removed surfaces**

Run:

```bash
pnpm vitest run test/tools/dispatcher.test.ts test/cli/unit/parse-argv.test.ts test/cli/unit/help.test.ts
pnpm run docs
rg -n "collapseAttribute|sneq__collapse_attribute|collapse-attribute|NOT_IMPLEMENTED" src test docs/api.md docs/typedoc || true
rg -n "NOT_IMPLEMENTED" README.md UPGRADING.md skills || true
rg -n "collapseAttribute|sneq__collapse_attribute|collapse-attribute" UPGRADING.md || true
```

Expected:

- the source/test/generated-doc scan returns no matches;
- `NOT_IMPLEMENTED` is absent from current prose;
- the only upgrade-guide matches are the intentional removal/migration note;
- historical `docs/superpowers/specs/**` and `docs/superpowers/plans/**` are not searched or rewritten.

- [ ] **Step 9: Run full tests, typecheck, and build**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all pass; TypeDoc generated output no longer exposes collapse.

- [ ] **Step 10: Review the removal/docs diff without committing**

Run:

```bash
git diff --check
git status --short
git diff -- src/tools src/cli src/campaign.ts test/tools test/cli README.md UPGRADING.md skills/sneq-narrative-engine.md docs/api.md docs/typedoc
```

Expected: collapse deletion, depth/current atomic documentation, generated docs, and no unrelated edits. Do not commit.

---

### Task 9: Final Runtime and Package Verification

**Files:**
- Verify all changed source/tests/docs.
- Update only documentation counts proven by command output; do not change code in this task unless verification exposes a real defect.

**Interfaces:**
- Validates every acceptance criterion from `docs/superpowers/specs/2026-07-18-sneq-correctness-improvements-design.md`.

- [ ] **Step 1: Run the complete automated verification matrix**

Run:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm run docs
node -e 'import("sneq-engine")'
node -e 'import("sneq-engine/atomic")'
node -e 'import("sneq-engine/memory")'
node -e 'import("sneq-engine/sqlite")'
node -e 'import("sneq-engine/json")'
```

Expected: every command exits 0. Record the exact Vitest file/test counts for the final report.

- [ ] **Step 2: Exercise stale lifecycle behavior end to end**

Run the focused runtime-capable regression:

```bash
pnpm vitest run test/campaign-lifecycle.test.ts --reporter=verbose
```

Expected: delete, close, recreation, and deletion-failure cases pass independently.

- [ ] **Step 3: Exercise concurrent canonical creation end to end**

Run:

```bash
pnpm vitest run test/campaign-mention-concurrency.test.ts --reporter=verbose
```

Expected: one stored entity, one new result, one reused result, no provider call inside a transaction.

- [ ] **Step 4: Exercise deterministic propagation independently**

Run:

```bash
pnpm vitest run test/core/propagation.test.ts --reporter=verbose
```

Expected: repeated identical inputs are structurally equal and source-timestamp fallback passes.

- [ ] **Step 5: Verify CLI and public surface counts**

Run:

```bash
node dist/cli.js --help
node dist/cli.js collapse-attribute
node --input-type=module -e 'import { ToolNames, ADVERTISED_TOOL_NAMES } from "sneq-engine"; console.log(JSON.stringify({toolNames: ToolNames.length, advertised: ADVERTISED_TOOL_NAMES.length, collapse: ToolNames.includes("sneq__collapse_attribute")}))'
```

Expected:

- help lists 14 commands and no collapse command;
- `collapse-attribute` exits 1 with `UNKNOWN_COMMAND` JSON;
- the tool-count probe prints `{"toolNames":10,"advertised":10,"collapse":false}`.

- [ ] **Step 6: Audit changed files and generated output**

Run:

```bash
git diff --check
git status --short
git diff --stat
git diff --name-only
```

Expected:

- the approved spec and this plan remain uncommitted;
- source, tests, README, upgrade guide, skill, and generated docs match the planned slices;
- no package lock, dependency, unrelated source, or branch changes appear.

- [ ] **Step 7: Run a final current-surface truth scan**

Run:

```bash
rg -n "neighbors\([^\n]*depth|_depth" src/repository src/campaign.ts || true
rg -n "max\(3\)|literal\(2\)|literal\(3\)" src/tools/schemas.ts || true
rg -n "contraintCounter|Date\.now\(\)" src/core/propagation.ts || true
rg -n "collapseAttribute|sneq__collapse_attribute|collapse-attribute|NOT_IMPLEMENTED" src test docs/api.md docs/typedoc || true
rg -n "NOT_IMPLEMENTED" README.md UPGRADING.md skills || true
```

Expected: no ignored-depth signature, depth-2/3 schema, propagation global/time read, source/test/generated collapse surface, or `NOT_IMPLEMENTED` prose remains. The deliberate removal note in `UPGRADING.md` may still name the removed collapse APIs.

- [ ] **Step 8: Stop at the user gate**

Report a per-task outcome table with exact command evidence, changed-file summary, and any skipped checks. Do not commit, push, publish, open a PR, or delete branches. Ask Jean for the next explicit action.
