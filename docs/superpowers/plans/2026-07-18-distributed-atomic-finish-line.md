# Distributed Atomic Finish-Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make asynchronous entity confirmation atomic under concurrent distributed writes and give every atomic command an explicit retry-deduplication token so PR #5 can be pushed for final review.

**Architecture:** `CampaignContext` generates one operation ID per logical write and delegates all four atomic operations to `AtomicWriteStrategy`. The repository-backed strategy executes entity confirmation inside `Repository.transaction(fn)`, while a pure `decideConfirmEntityMatch` function lets distributed adapters apply the same validation and alias rules inside their own store transaction.

**Tech Stack:** TypeScript 5, ESM, Vitest 2, pnpm, TypeDoc, in-memory/JSON/SQLite repository contract.

## Global Constraints

- Preserve `new Engine({ repository, router })` and the existing local `Repository.transaction(fn)` behavior.
- Preserve the public `CampaignContext.confirmEntityMatch({ mention, entityId, type })` signature.
- Keep SNEQ framework-independent; no Convex or web-framework imports.
- Every `AtomicWriteStrategy` command must include a non-empty `operationId: string` generated once before delegation.
- Injected distributed strategies must atomically deduplicate repeated operation IDs and return the original result.
- Missing-entity and type-mismatch errors must retain their current observable messages.
- Do not change the synchronous `UserPromptRegistry` adjudication path.
- Do not merge PR #5; push it only after verification.

## File Structure

- `src/atomic/types.ts` — public atomic commands, results, and pure-decision input/output contracts.
- `src/atomic/decisions.ts` — deterministic atomic decisions, including entity confirmation.
- `src/atomic/repository-strategy.ts` — historical `Repository.transaction(fn)` implementation of all atomic writes.
- `src/atomic/index.ts` — framework-free `sneq-engine/atomic` exports.
- `src/campaign.ts` — stable public facade; creates timestamps/operation IDs and delegates writes.
- `src/index.ts` — main-entrypoint public type/function exports.
- `test/atomic/decisions.test.ts` — pure decision behavior and immutability tests.
- `test/atomic/strategy.test.ts` — local transaction, injected strategy, operation ID, and concurrency tests.
- `test/campaign-confirm-entity.test.ts` — public facade compatibility tests.
- `README.md` — distributed strategy and retry contract documentation.
- `docs/api.md` — generated public API reference.

---

### Task 1: Define the confirmation command and pure decision

**Files:**
- Modify: `src/atomic/types.ts:1-77`
- Modify: `src/atomic/decisions.ts:1-62`
- Modify: `test/atomic/decisions.test.ts:1-88`

**Interfaces:**
- Produces: `AtomicCommand`, `ConfirmEntityMatchCommand`, `ConfirmEntityMatchResult`, `ConfirmEntityMatchDecisionInput`, `ConfirmEntityMatchDecision`, and `decideConfirmEntityMatch(input)`.
- Consumes: existing `Entity`, `EntityType`, `CampaignId`, `EntityID`, and `normalizeAlias` domain behavior.

- [ ] **Step 1: Add entity-confirmation decision cases**

Import `decideConfirmEntityMatch` and `Entity`, then add these cases. Leave the three existing decision inputs unchanged until Task 3 so this task can commit in a green state:

```ts
import {
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideRegisterFact,
  decideSetScene,
} from "../../src/atomic/decisions.js";
import type { Entity } from "../../src/domain/entity.js";

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    campaignId,
    id: entityId,
    type: "PERSONNAGE",
    name: "Roric",
    description: "Capitaine de la garde",
    nomConnu: true,
    aliases: [],
    tags: [],
    createdAt: 1,
    embedding: null,
    embeddingRefreshedAt: null,
    ...overrides,
  };
}

it("rejects confirmation for an unknown entity", () => {
  expect(() => decideConfirmEntityMatch({
    operationId: "op-confirm-missing",
    campaignId,
    entityId,
    mention: "le capitaine",
    type: "PERSONNAGE",
    observedAt: 20,
    entity: null,
  })).toThrow(/not found in campaign/i);
});

it("rejects confirmation when the entity type differs", () => {
  expect(() => decideConfirmEntityMatch({
    operationId: "op-confirm-type",
    campaignId,
    entityId,
    mention: "la ville",
    type: "LIEU",
    observedAt: 20,
    entity: entity(),
  })).toThrow(/type mismatch/i);
});

it("returns an idempotent result for normalized canonical names and aliases", () => {
  const canonical = decideConfirmEntityMatch({
    operationId: "op-confirm-name",
    campaignId,
    entityId,
    mention: "roric",
    type: "PERSONNAGE",
    observedAt: 20,
    entity: entity(),
  });
  const alias = decideConfirmEntityMatch({
    operationId: "op-confirm-alias",
    campaignId,
    entityId,
    mention: "le capitaine",
    type: "PERSONNAGE",
    observedAt: 21,
    entity: entity({ aliases: [{ text: "Le Capitaine", source: { kind: "PLAYER" }, observedAt: 10 }] }),
  });

  expect(canonical.result).toEqual({ entityId, aliasAdded: false });
  expect(alias.result).toEqual({ entityId, aliasAdded: false });
});

it("returns a new entity value without mutating the input", () => {
  const original = entity();
  const decision = decideConfirmEntityMatch({
    operationId: "op-confirm-add",
    campaignId,
    entityId,
    mention: "le capitaine",
    type: "PERSONNAGE",
    observedAt: 20,
    entity: original,
  });

  expect(decision.result).toEqual({ entityId, aliasAdded: true });
  expect(decision.entity.aliases).toContainEqual({
    text: "le capitaine",
    source: { kind: "PLAYER" },
    observedAt: 20,
  });
  expect(original.aliases).toEqual([]);
});
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts
```

Expected: TypeScript/Vitest fails because `decideConfirmEntityMatch` and the new command fields/types do not exist.

- [ ] **Step 3: Add the atomic contracts**

In `src/atomic/types.ts`, import `Entity` and `EntityType`, introduce the shared command base, and add confirmation contracts. Do not extend the three existing commands until Task 3:

```ts
import type { Entity, EntityType } from "../domain/entity.js";

export interface AtomicCommand {
  /** Stable token for atomically deduplicating retries of one logical write. */
  operationId: string;
}

export interface ConfirmEntityMatchCommand extends AtomicCommand {
  campaignId: CampaignId;
  mention: string;
  entityId: EntityID;
  type: EntityType;
  observedAt: number;
}

export interface ConfirmEntityMatchResult {
  entityId: EntityID;
  aliasAdded: boolean;
}

export interface ConfirmEntityMatchDecisionInput extends ConfirmEntityMatchCommand {
  entity: Entity | null;
}

export interface ConfirmEntityMatchDecision {
  entity: Entity;
  result: ConfirmEntityMatchResult;
}
```

- [ ] **Step 4: Implement the pure decision**

In `src/atomic/decisions.ts`, import the new types and `normalizeAlias`, then add:

```ts
import { normalizeAlias } from "../resolver/normalize.js";

export function decideConfirmEntityMatch(
  input: ConfirmEntityMatchDecisionInput,
): ConfirmEntityMatchDecision {
  const entity = input.entity;
  if (!entity) {
    throw new Error(
      `entity "${String(input.entityId)}" not found in campaign "${String(input.campaignId)}"`,
    );
  }
  if (entity.type !== input.type) {
    throw new Error(`entity type mismatch: expected ${input.type}, got ${entity.type}`);
  }

  const normalized = normalizeAlias(input.mention);
  const exists = normalizeAlias(entity.name) === normalized
    || entity.aliases.some((alias) => normalizeAlias(alias.text) === normalized);
  if (exists) {
    return { entity, result: { entityId: entity.id, aliasAdded: false } };
  }

  return {
    entity: {
      ...entity,
      aliases: [...entity.aliases, {
        text: input.mention,
        source: { kind: "PLAYER" },
        observedAt: input.observedAt,
      }],
    },
    result: { entityId: entity.id, aliasAdded: true },
  };
}
```

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts
pnpm typecheck
```

Expected: decision tests pass and TypeScript reports zero errors.

- [ ] **Step 6: Commit the contracts and pure decision**

```bash
git add src/atomic/types.ts src/atomic/decisions.ts test/atomic/decisions.test.ts
git commit -m "feat(atomic): decide entity confirmation atomically" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Execute confirmation inside the repository transaction

**Files:**
- Modify: `src/atomic/types.ts:46-50`
- Modify: `src/atomic/repository-strategy.ts:1-44`
- Modify: `test/atomic/strategy.test.ts:1-120`

**Interfaces:**
- Consumes: `decideConfirmEntityMatch`, `ConfirmEntityMatchCommand`, and `ConfirmEntityMatchResult` from Task 1.
- Produces: a repository-backed `confirmEntityMatch` implementation that serializes concurrent alias updates.

- [ ] **Step 1: Add repository-strategy tests for confirmation and concurrency**

Update the test-only injected strategy so it satisfies the forthcoming fourth method:

```ts
function injectedStrategy(): AtomicWriteStrategy {
  return {
    registerFact: vi.fn(async () => ({ factId: null, contradictions: [] })),
    setScene: vi.fn(async () => ({ sceneId: "s1" as never, turnNumber: 1 })),
    advanceTurn: vi.fn(async () => ({ turnNumber: 1 })),
    confirmEntityMatch: vi.fn(async (command) => ({
      entityId: command.entityId,
      aliasAdded: true,
    })),
  };
}
```

Add a helper that inserts a canonical entity:

```ts
async function seedEntity(repository: InMemoryRepository, campaignId: ReturnType<typeof asCampaignId>) {
  const entityId = asEntityID("captain");
  await repository.upsertEntity({
    campaignId,
    id: entityId,
    type: "PERSONNAGE",
    name: "Roric",
    description: "Capitaine",
    nomConnu: true,
    aliases: [],
    tags: [],
    createdAt: 0,
    embedding: null,
    embeddingRefreshedAt: null,
  });
  return entityId;
}
```

Add tests:

```ts
it("confirms an entity match inside Repository.transaction", async () => {
  const campaignId = asCampaignId("confirm-transaction");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Confirm", createdAt: 0, embeddingDim: 0 });
  const entityId = await seedEntity(repository, campaignId);
  const transaction = vi.spyOn(repository, "transaction");
  const strategy = repositoryAtomicWriteStrategy(repository);

  await expect(strategy.confirmEntityMatch({
    operationId: "op-confirm",
    campaignId,
    entityId,
    mention: "le capitaine",
    type: "PERSONNAGE",
    observedAt: 10,
  })).resolves.toEqual({ entityId, aliasAdded: true });

  expect(transaction).toHaveBeenCalledOnce();
});

it("preserves both aliases when confirmations run concurrently", async () => {
  const campaignId = asCampaignId("confirm-concurrent");
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  await repository.createCampaign({ id: campaignId, name: "Concurrent", createdAt: 0, embeddingDim: 0 });
  const entityId = await seedEntity(repository, campaignId);
  const strategy = repositoryAtomicWriteStrategy(repository);

  await Promise.all([
    strategy.confirmEntityMatch({
      operationId: "op-confirm-captain",
      campaignId,
      entityId,
      mention: "the captain",
      type: "PERSONNAGE",
      observedAt: 10,
    }),
    strategy.confirmEntityMatch({
      operationId: "op-confirm-commander",
      campaignId,
      entityId,
      mention: "guard commander",
      type: "PERSONNAGE",
      observedAt: 11,
    }),
  ]);

  expect((await repository.getEntity(campaignId, entityId))?.aliases.map((alias) => alias.text).sort())
    .toEqual(["guard commander", "the captain"]);
});
```

- [ ] **Step 2: Run the focused strategy test and verify it fails**

Run:

```bash
pnpm vitest run test/atomic/strategy.test.ts
```

Expected: FAIL because `AtomicWriteStrategy` and `repositoryAtomicWriteStrategy` do not expose `confirmEntityMatch` yet.

- [ ] **Step 3: Extend the strategy interface and implement transactional confirmation**

First extend `AtomicWriteStrategy` in `src/atomic/types.ts`:

```ts
confirmEntityMatch(command: ConfirmEntityMatchCommand): Promise<ConfirmEntityMatchResult>;
```

Then update imports and add this method to `repositoryAtomicWriteStrategy`:

```ts
import {
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideRegisterFact,
  decideSetScene,
} from "./decisions.js";

confirmEntityMatch: (command) => repo.transaction(async (tx) => {
  const entity = await tx.getEntity(command.campaignId, command.entityId);
  const decision = decideConfirmEntityMatch({ ...command, entity });
  if (decision.result.aliasAdded) {
    await tx.upsertEntity(decision.entity);
  }
  return decision.result;
}),
```

Do not add operation-ID storage to local repositories; durable deduplication is the injected distributed strategy's documented responsibility.

- [ ] **Step 4: Run focused tests**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts test/atomic/strategy.test.ts
pnpm typecheck
```

Expected: all focused tests pass and TypeScript reports zero errors.

- [ ] **Step 5: Commit the repository strategy**

```bash
git add src/atomic/types.ts src/atomic/repository-strategy.ts test/atomic/strategy.test.ts
git commit -m "fix(atomic): serialize entity alias confirmation" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Delegate all facade writes with operation IDs

**Files:**
- Modify: `src/atomic/types.ts:7-40`
- Modify: `src/campaign.ts:1-256`
- Modify: `test/atomic/decisions.test.ts:28-88`
- Modify: `test/atomic/strategy.test.ts:38-120`
- Modify: `test/campaign-confirm-entity.test.ts:1-96`

**Interfaces:**
- Consumes: the four-method `AtomicWriteStrategy` from Tasks 1-2.
- Produces: unchanged public campaign APIs that create one operation ID/timestamp and delegate each write.

- [ ] **Step 1: Require operation IDs on the three existing commands**

In `src/atomic/types.ts`, extend the existing commands from `AtomicCommand`:

```ts
export interface RegisterFactCommand extends AtomicCommand {
  campaignId: CampaignId;
  factId: FactId;
  entityId: EntityID;
  attributeKey: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
}

export interface SetSceneCommand extends AtomicCommand {
  campaignId: CampaignId;
  sceneId: SceneId;
  locationEntityId: EntityID;
  presentEntityIds: EntityID[];
  description: string;
  createdAt: number;
}

export interface AdvanceTurnCommand extends AtomicCommand {
  campaignId: CampaignId;
  summary?: string;
  createdAt: number;
}
```

Add `operationId: "op-register"`, `operationId: "op-scene"`, and `operationId: "op-turn"` to the existing register-fact, set-scene, and advance-turn inputs in `test/atomic/decisions.test.ts`.

Add `operationId: "op-legacy-turn"` to the direct `strategy.advanceTurn(...)` call in `test/atomic/strategy.test.ts`.

- [ ] **Step 2: Extend delegation tests for all four commands**

In the delegation test, call:

```ts
await campaign.confirmEntityMatch({
  mention: "the captain",
  entityId,
  type: "PERSONNAGE",
});
```

Assert every command contains a non-empty operation ID:

```ts
for (const method of [
  strategy.registerFact,
  strategy.setScene,
  strategy.advanceTurn,
  strategy.confirmEntityMatch,
]) {
  expect(method).toHaveBeenCalledWith(expect.objectContaining({
    operationId: expect.stringMatching(/^op_/),
    campaignId,
  }));
}
```

Also assert confirmation receives `mention`, `entityId`, `type`, and numeric `observedAt`.

- [ ] **Step 3: Add a public-facade test proving the injected strategy owns confirmation**

In `test/campaign-confirm-entity.test.ts`, add `vi` and a test using an injected strategy whose `confirmEntityMatch` returns without reading/updating the repository:

```ts
it("delegates asynchronous confirmation to the injected atomic strategy", async () => {
  const repository = new InMemoryRepository({ embeddingDim: 0 });
  const confirmEntityMatch = vi.fn(async (command) => ({
    entityId: command.entityId,
    aliasAdded: true,
  }));
  const engine = new Engine({
    repository,
    router: {
      tiers: {
        heavy: { primary: ref, fallbacks: [] },
        light: { primary: ref, fallbacks: [] },
      },
    },
    _routerDeps: { resolveProvider: () => provider },
    writeStrategy: {
      registerFact: async () => ({ factId: null, contradictions: [] }),
      setScene: async () => ({ sceneId: "s1" as never, turnNumber: 1 }),
      advanceTurn: async () => ({ turnNumber: 1 }),
      confirmEntityMatch,
    },
  });
  const campaign = await engine.createCampaign({ id: asCampaignId("delegated"), name: "Test", embeddingDim: 0 });
  const entityId = asEntityID("external-entity");

  await expect(campaign.confirmEntityMatch({
    mention: "the captain",
    entityId,
    type: "PERSONNAGE",
  })).resolves.toEqual({ entityId, aliasAdded: true });

  expect(confirmEntityMatch).toHaveBeenCalledWith(expect.objectContaining({
    operationId: expect.stringMatching(/^op_/),
    campaignId: asCampaignId("delegated"),
    entityId,
    mention: "the captain",
    type: "PERSONNAGE",
    observedAt: expect.any(Number),
  }));
  await engine.close();
});
```

- [ ] **Step 4: Run the facade tests and verify the red state**

Run:

```bash
pnpm vitest run test/atomic/strategy.test.ts test/campaign-confirm-entity.test.ts
```

Expected: FAIL because `CampaignContext` still performs confirmation directly and existing writes do not pass operation IDs.

- [ ] **Step 5: Add one operation-ID generator**

Near the imports or at the bottom of `src/campaign.ts`, add:

```ts
function createOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
```

The helper is called exactly once per public write method invocation.

- [ ] **Step 6: Replace direct confirmation with strategy delegation**

Remove the `normalizeAlias` import and replace `confirmEntityMatch` with:

```ts
async confirmEntityMatch(
  input: ConfirmEntityMatchInput,
): Promise<{ entityId: EntityID; aliasAdded: boolean }> {
  await this.ensureCampaign();
  return this.deps.writeStrategy.confirmEntityMatch({
    operationId: createOperationId(),
    campaignId: this.id,
    mention: input.mention,
    entityId: input.entityId,
    type: input.type,
    observedAt: Date.now(),
  });
}
```

- [ ] **Step 7: Add operation IDs to the three existing delegations**

Add `operationId: createOperationId()` to the command objects passed by:

- `registerFact`
- `setScene`
- `advanceTurn`

Do not expose the operation ID in the public `CampaignContext` method parameters.

- [ ] **Step 8: Run focused tests and full typecheck**

Run:

```bash
pnpm vitest run test/atomic/decisions.test.ts test/atomic/strategy.test.ts test/campaign-confirm-entity.test.ts
pnpm typecheck
```

Expected: all focused tests pass and TypeScript reports zero errors.

- [ ] **Step 9: Commit facade delegation**

```bash
git add src/atomic/types.ts src/campaign.ts test/atomic/decisions.test.ts test/atomic/strategy.test.ts test/campaign-confirm-entity.test.ts
git commit -m "feat(campaign): delegate confirmation through atomic strategy" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Export, document, and verify the finished public contract

**Files:**
- Modify: `src/atomic/index.ts:1-2`
- Modify: `src/index.ts:32-50`
- Modify: `README.md:110-165`
- Modify generated: `docs/api.md`
- Modify: `test/smoke.test.ts:1-32`

**Interfaces:**
- Consumes: all public contracts and decisions from Tasks 1-3.
- Produces: documented imports from both `sneq-engine` and `sneq-engine/atomic`.

- [ ] **Step 1: Extend smoke coverage for the public decision**

Import `decideConfirmEntityMatch` in `test/smoke.test.ts` and update the export assertion:

```ts
expect(decideConfirmEntityMatch).toBeTypeOf("function");
```

Keep the existing package export assertion for `./atomic` unchanged.

- [ ] **Step 2: Run the smoke test and verify it fails**

Run:

```bash
pnpm vitest run test/smoke.test.ts
```

Expected: FAIL because the new decision is not exported from the public entrypoints.

- [ ] **Step 3: Export the new contracts and decision**

Update `src/atomic/index.ts`:

```ts
export type * from "./types.js";
export {
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideRegisterFact,
  decideSetScene,
} from "./decisions.js";
```

Update `src/index.ts` to export these additional types:

```ts
AtomicCommand,
ConfirmEntityMatchCommand,
ConfirmEntityMatchResult,
ConfirmEntityMatchDecisionInput,
ConfirmEntityMatchDecision,
```

Also export `decideConfirmEntityMatch` with the other decisions.

- [ ] **Step 4: Document the fourth atomic operation and retry contract**

In the README distributed-store section:

- change “register-fact, set-scene, and advance-turn” to include entity confirmation;
- state that each command carries an `operationId`;
- state that injected distributed strategies must deduplicate repeated operation IDs atomically and return the original result;
- keep the synchronous `UserPromptRegistry` compatibility paragraph.

Use this wording:

```md
Every command carries an `operationId` generated once per logical engine call. A distributed strategy
must atomically deduplicate retries of that ID and return the original result; this covers a committed
store mutation whose transport response was lost. The local repository-backed strategy remains an
in-process `Repository.transaction(fn)` implementation.
```

- [ ] **Step 5: Run smoke, build, tests, and typecheck**

Run:

```bash
pnpm build
pnpm test
pnpm typecheck
```

Expected:

- build exits 0;
- 31 test files pass with at least the existing 252 tests plus the new regression cases;
- typecheck exits 0.

- [ ] **Step 6: Regenerate and inspect API documentation**

Run:

```bash
pnpm run docs
git diff --check
```

Expected: TypeDoc finishes with zero errors; existing unresolved-reference warnings may remain. `git diff --check` prints nothing.

- [ ] **Step 7: Verify the built atomic entrypoint**

Run:

```bash
node --input-type=module -e 'import("sneq-engine/atomic").then((m) => { if (typeof m.decideConfirmEntityMatch !== "function") process.exit(1) })'
```

Expected: exit 0 with no output.

- [ ] **Step 8: Commit exports and generated documentation**

```bash
git add src/atomic/index.ts src/index.ts README.md docs/api.md test/smoke.test.ts
git commit -m "docs(api): finalize distributed atomic contract" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Final branch verification and PR update

**Files:**
- Verify only; no planned source changes.

**Interfaces:**
- Consumes: complete PR #5 branch.
- Produces: a pushed branch ready for final human merge review.

- [ ] **Step 1: Run the complete release verification from a clean build**

Run:

```bash
pnpm clean
pnpm build
pnpm test
pnpm typecheck
pnpm run docs
node --input-type=module -e 'import("sneq-engine/atomic").then((m) => { if (typeof m.decideConfirmEntityMatch !== "function") process.exit(1) })'
git diff --check
git status --short
```

Expected:

- every command exits 0;
- all tests pass;
- the atomic entrypoint imports successfully;
- `git diff --check` prints nothing;
- `git status --short` prints nothing after generated docs are already committed.

- [ ] **Step 2: Review the final PR diff and commit list**

Run:

```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: the finish-line design and implementation commits are present; no whitespace errors appear.

- [ ] **Step 3: Push the reviewed branch**

```bash
git push origin feat/distributed-atomic-strategy
```

Expected: push succeeds and updates PR #5. Do not merge.

- [ ] **Step 4: Refresh PR state**

Run:

```bash
gh pr view 5 --json state,mergeable,mergeStateStatus,commits,url
```

Expected: PR remains `OPEN`, reports `MERGEABLE`, and includes the finish-line commits.
