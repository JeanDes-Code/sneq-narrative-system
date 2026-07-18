---
title: SNEQ Correctness and Interface Truthfulness Improvements
date: 2026-07-18
status: draft-awaiting-written-review
related:
  - ./2026-07-18-distributed-atomic-finish-line-design.md
  - https://github.com/JeanDes-Code/sneq-narrative-system/pull/5
---

# SNEQ Correctness and Interface Truthfulness Improvements

## Goal

Close the narrow correctness and public-contract gaps confirmed by the 2026-07-18 architecture review without turning `sneq-engine` into a broad refactor.

The implementation will, in order:

1. permanently invalidate stale `CampaignContext` references after campaign deletion or Engine shutdown;
2. move `addConstraint` and canonical entity creation behind the atomic mutation seam;
3. constrain graph depth to the one-hop behavior the engine actually supports;
4. make `propagate()` deterministic for identical complete inputs;
5. remove the non-functional `collapse_attribute` surface before 1.0.

## Evidence and current constraints

The design is based on observed repository behavior at `main` commit `d151457`:

- a positively verified `CampaignContext` can write after `Engine.deleteCampaign()` and recreate potentiality state under a missing campaign;
- `addConstraint` performs an unprotected read-modify-write;
- `mentionEntity` resolves and then inserts directly, allowing concurrent callers to create from the same stale view of canon;
- repository `neighbors(..., depth)` implementations ignore `depth`, and `getRelevantFacts(..., { depth: 2 })` still returns only direct-neighbor facts;
- repeated identical `propagate()` calls produce different IDs and timestamps;
- `collapse_attribute` is published in TypeScript, schema, dispatcher, CLI, and generated-doc surfaces but cannot succeed.

Consumer verification found no public GitHub call sites for `sneq-engine`, `collapseAttribute`, `sneq__collapse_attribute`, or the `collapse-attribute` CLI command. npm reports 195 downloads between 2026-06-10 and 2026-07-18, so private or unindexed consumers remain possible. Removal is still justified because the surface has never been functional, is already excluded from advertised agent tools, and the package is pre-1.0.

## Non-goals

This work will not:

- split `CampaignContext` by file size alone;
- add a framework-specific distributed adapter;
- run resolver or embedding provider work inside a store transaction;
- add campaign-wide leases or long-lived locks;
- implement graph traversal beyond direct neighbors;
- implement attribute collapse;
- redesign IDs across unrelated commands;
- change the synchronous `UserPromptRegistry` adjudication path;
- commit, push, publish, open a PR, or delete a remote branch without a separate explicit instruction.

## 1. Campaign lifecycle ownership

### 1.1 Internal lifecycle controller

Each Engine-created context is paired with an internal lifecycle controller. The controller is not exported from the package root and does not become part of the supported public API.

The lifecycle states are:

- `unverified`: the context has not yet confirmed that its campaign exists;
- `active`: the campaign has been verified and the context is usable;
- `deleting`: `Engine.deleteCampaign(id)` is in progress;
- `deleted`: deletion completed and the context is permanently stale;
- `engine-closed`: the owning Engine has shut down.

Direct `new CampaignContext(...)` construction remains supported. It receives a standalone controller when no Engine-owned controller is supplied.

### 1.2 CampaignContext guards

All public `CampaignContext` methods check lifecycle state before doing work.

Campaign-bound I/O methods use one `ensureUsable()` path that:

1. rejects `deleting`, `deleted`, or `engine-closed` contexts;
2. checks repository campaign existence while the context is `unverified`;
3. transitions to `active` after successful verification;
4. throws `SneqCampaignNotFoundError` when the campaign was never created.

Hook-registration methods do not perform repository I/O, but they still synchronously reject an invalidated context.

`handleToolCall` checks lifecycle state before dispatch so an unsupported tool or schema error cannot mask the more fundamental stale-context failure.

### 1.3 Engine deletion

`Engine.deleteCampaign(id)` transitions a cached context to `deleting` before repository deletion begins. Calls made through that context after the transition reject immediately.

On successful repository deletion:

- the controller becomes `deleted`;
- the context is removed from the Engine cache;
- references already held by callers remain permanently invalid.

On repository deletion failure:

- the controller returns to `unverified`, not directly to `active`;
- the next operation must re-check repository existence before proceeding;
- the deletion error propagates unchanged.

Recreating the same campaign ID after successful deletion creates a new controller and a new `CampaignContext`. It never reactivates an old reference.

Repository deletion participates in the same mutation serialization as `Repository.transaction(fn)`. For the local adapters, an atomic mutation already in flight completes before campaign deletion purges its state, while lifecycle invalidation prevents a later mutation from starting. This closes the race where a transaction snapshot could otherwise restore data deleted concurrently.

A distributed repository and its injected write strategy must provide the equivalent ordering between `deleteCampaign` and atomic commands for the same campaign.

### 1.4 Engine shutdown

`Engine.close()` invalidates every cached context as `engine-closed` before closing the repository. The Engine becomes terminal for campaign, list, create, and delete operations. Repeated `close()` calls are idempotent.

Repository adapters drain their queued transactions before releasing persistence resources. A distributed adapter’s `close()` has the same responsibility for its own in-flight operations.

`routerClient()` remains available after close because the Router can be injected and shared independently of repository lifecycle. Static tool metadata is unaffected.

If repository close fails, contexts remain invalidated because the underlying repository state is uncertain.

### 1.5 Lifecycle errors

Add and export:

```ts
class SneqCampaignContextInvalidatedError extends Error {
  campaignId: string;
  reason: "deleting" | "deleted" | "engine-closed";
}
```

This error distinguishes a stale Engine-owned reference from `SneqCampaignNotFoundError`, whose remediation remains “create the campaign first.”

### 1.6 Repository parent invariant

Memory, JSON, and SQLite adapters reject campaign-scoped create/upsert/append mutations when the parent campaign does not exist. They use `SneqCampaignNotFoundError` so direct repository consumers receive the same invariant as facade consumers.

The guarded mutations include:

- `upsertEntity`;
- `appendFact`;
- `upsertPotentialite`;
- `upsertNode`;
- `upsertEdge`;
- `appendTurn`;
- `upsertScene`.

JSON inherits the memory behavior and persists any lifecycle metadata added to memory state. SQLite checks the `campaigns` table inside the same synchronous write scope.

This adapter invariant is the second line of defense for direct repository use and for operations that began before lifecycle invalidation.

## 2. Atomic `addConstraint`

### 2.1 Public facade compatibility

The existing method remains unchanged:

```ts
campaign.addConstraint({ entityId, attributeKey, rule, justification })
```

`CampaignContext` generates the following once per logical call:

- `operationId`;
- `constraintId`;
- `createdAt`.

It then delegates to `AtomicWriteStrategy.addConstraint`.

### 2.2 Atomic command and result

Add framework-independent atomic types:

```ts
interface AddConstraintCommand extends AtomicCommand {
  campaignId: CampaignId;
  constraintId: ConstraintId;
  entityId: EntityID;
  attributeKey: string;
  rule: RegleContrainte;
  justification: string;
  createdAt: number;
}

interface AddConstraintResult {
  constraintId: ConstraintId;
}
```

The pure decision input combines the command with the existing potentiality loaded inside the store transaction.

### 2.3 Pure decision

`decideAddConstraint`:

- creates the default potentiality when none exists;
- clones an existing potentiality rather than mutating it;
- appends the supplied constraint;
- transitions `etat` to `CONTRAINT`;
- returns the updated potentiality and result.

All nondeterministic metadata is supplied by the command.

### 2.4 Local repository-backed strategy

The local strategy performs, inside `Repository.transaction(fn)`:

1. load the current potentiality;
2. run `decideAddConstraint`;
3. upsert the returned potentiality;
4. return the supplied constraint ID.

The transaction serialization already used by the reference adapters prevents concurrent callers from overwriting each other’s constraint arrays.

### 2.5 Distributed contract

A distributed strategy must:

- execute the read-decision-write flow atomically;
- deduplicate terminal results by `operationId`;
- return the original result when a committed response is retried.

The new strategy method is required. This is a pre-1.0 interface change and will be documented in `UPGRADING.md`.

## 3. Concurrent canonical entity creation

### 3.1 Chosen guarantee

Canonical creation uses optimistic per-campaign entity revision and retry.

This was chosen over:

- an exact-name-only guard, which would still allow differently phrased mentions to fork canon;
- a campaign-wide lease, which would hold coordination across resolver and embedding latency and require timeout/recovery semantics.

### 3.2 Entity revision contract

`RepositoryAccess` gains:

```ts
entityRevision(campaignId: CampaignId): Promise<number>
```

Revision starts at `0` when a campaign is created and increments on every entity insert or update, including:

- direct `upsertEntity`;
- canonical creation;
- alias updates from `confirmEntityMatch`.

Memory state stores a revision per campaign. JSON persists it with the rest of memory state. SQLite adds a non-null integer revision column with a default of `0` to existing campaigns.

A missing campaign rejects with `SneqCampaignNotFoundError` rather than returning a sentinel revision.

### 3.3 Atomic create command

Add a required strategy method:

```ts
createEntity(command: CreateEntityCommand): Promise<CreateEntityResult>
```

The command contains:

- stable logical `operationId`;
- `campaignId`;
- `expectedEntityRevision`;
- the fully materialized candidate `Entity`;
- normalized identity keys derived from canonical name and supplied aliases;
- `force`.

The candidate ID, alias observation timestamps, `createdAt`, embedding, and embedding refresh timestamp are created outside the store transaction and remain stable across optimistic retries.

### 3.4 Pure create decision

The local strategy loads, inside its transaction:

- current entity revision;
- exact normalized matches for the candidate canonical name and aliases.

`decideCreateEntity` returns one of four outcomes:

- `stale`: current revision differs from `expectedEntityRevision`; no write occurs;
- `existing`: one exact same-type match exists; reuse it regardless of `force`;
- `conflict`: multiple exact same-type matches exist and `force` is false;
- `create`: insert the candidate when revision is current and no blocking exact match exists, or when multiple legacy matches exist and the caller explicitly used `force`.

The decision does not mutate loaded entities or the candidate.

### 3.5 CampaignContext flow

One public `mentionEntity` call performs:

1. create one logical operation ID and stable candidate metadata;
2. read entity revision `N`;
3. run the existing resolver against canon;
4. return an existing match or adjudication result when resolution is terminal;
5. generate or refresh the candidate embedding outside a transaction when creation remains allowed;
6. call `createEntity` with expected revision `N`;
7. map `existing`, `conflict`, or `create` to the existing `MentionResult` union;
8. on `stale`, reread revision, rerun resolution against the newer canon, and retry.

The candidate embedding may be reused across stale retries because the candidate text is unchanged. Resolver work must rerun because the canonical store changed.

### 3.6 Retry bound

A logical call retries at most three stale revisions. Exhaustion throws:

```ts
class SneqConcurrentEntityCreationError extends Error {
  campaignId: string;
  attempts: number;
}
```

The error instructs the caller to retry the logical call. The engine never falls back to stale creation.

### 3.7 Idempotency semantics

The operation ID remains stable across stale retries.

A distributed strategy must not record `stale` as a completed idempotent result because no logical result or mutation was committed. It must atomically deduplicate terminal `create`, `existing`, and `conflict` results.

If entity insertion commits but the transport response is lost, retrying the same operation ID returns the original terminal result rather than evaluating the now-changed revision again.

### 3.8 Concurrency outcome

When two callers resolve from revision `N`:

- the first successful creator inserts and advances revision to `N + 1`;
- the second caller receives `stale`;
- the second reruns resolution against the new entity;
- if the resolver recognizes the semantic match, both calls return the same canonical entity ID and only one entity exists.

Expensive provider work remains outside the store transaction.

## 4. Truthful graph-depth contract

### 4.1 Campaign API

Keep the existing option name but narrow its type:

```ts
getRelevantFacts(
  entityId: EntityID,
  opts?: { attributeKeys?: string[]; depth?: 0 | 1 }
): Promise<AttributFige[]>
```

Semantics:

- omitted or `0`: own facts only;
- `1`: own facts plus direct-neighbor facts.

The attribute-key filter continues to apply to the source entity’s own facts as it does today. Neighbor facts remain unfiltered unless a separate future requirement changes that behavior.

### 4.2 Repository API

Change:

```ts
neighbors(campaignId, entityId, depth)
```

to:

```ts
neighbors(campaignId, entityId)
```

The method explicitly returns direct neighbors. Memory, JSON, SQLite, repository contract tests, and generated declarations use the same signature.

### 4.3 Tool and CLI contract

The `sneq__get_relevant_facts` schema accepts only integer `0` or `1`. Descriptions and agent skill guidance state “own facts or direct neighbors,” not “small graph depth” or “1-2 hops.”

Calls using `depth: 2` or `3` fail validation instead of returning incomplete data.

## 5. Deterministic propagation

### 5.1 Public compatibility

Keep `propagate()` and its result shape. Add one optional input:

```ts
interface PropagationInput {
  // existing fields
  createdAt?: number;
}
```

Existing callers remain source-compatible.

### 5.2 Stable metadata

Remove the process-global constraint counter and all internal wall-clock reads.

Each propagated constraint ID is derived deterministically from:

- campaign ID;
- source fact ID;
- propagation rule ID;
- target entity ID;
- target attribute;
- hop distance.

`createdAt` is:

- `input.createdAt` when supplied;
- otherwise the source fact observation timestamp.

The fallback is deterministic and preserves the current complete `Contrainte` result shape without forcing existing consumers to materialize metadata themselves.

### 5.3 Determinism guarantee

Repeated calls with structurally identical inputs return structurally equal results, including constraint IDs and timestamps.

The function remains sensitive to input edge/rule ordering as part of the supplied input. This work does not introduce canonical sorting or alter traversal semantics.

## 6. Remove `collapse_attribute`

### 6.1 Removed surfaces

Remove:

- `CampaignContext.collapseAttribute`;
- `ToolCallContext.collapseAttribute`;
- `sneq__collapse_attribute` from `ToolNames`;
- its Zod and JSON schemas;
- its description;
- its dispatcher branch;
- `collapse-attribute` from CLI command types, parsing, help, and run handling;
- the dedicated CLI NOT_IMPLEMENTED test;
- generated API declarations and documentation for the method/schema/command.

### 6.2 Preserved compatibility export

Keep `ADVERTISED_TOOL_NAMES` exported, but define it from the now-truthful `ToolNames`. Consumers using that export do not need a rename.

### 6.3 Supported replacement

Current docs and `UPGRADING.md` point consumers to:

1. `Router.chat` for value generation;
2. `validateValue` for domain validation;
3. `registerFact` for canonical persistence.

The CLI command count decreases from 15 to 14. The advertised tool count remains 10 because collapse was already excluded and `validate_narration` remains advertised.

Historical approved specs and plans are not rewritten. Current README, skill guidance, upgrade documentation, tests, and generated API docs become authoritative for the supported surface.

## 7. Testing strategy

Implementation proceeds as vertical TDD slices.

### 7.1 Lifecycle slice

Start with the confirmed memory-adapter reproduction:

1. create a campaign and retain its context;
2. call `addConstraint` to cache positive verification;
3. delete the campaign;
4. call through the stale context;
5. assert deterministic invalidation and absence of recreated state.

Add coverage for:

- every campaign-bound method after delete;
- every campaign-bound method after Engine close;
- hook registration after invalidation;
- recreation of the same campaign ID producing a fresh usable context while the old one remains invalid;
- deletion failure resetting the context to `unverified`;
- deletion waiting for an already-started atomic mutation, then purging its result without resurrection;
- Engine methods after close;
- repository close draining queued transactions before releasing resources;
- direct orphan mutation rejection in the shared repository contract;
- memory, JSON, and SQLite parity.

### 7.2 Atomic addConstraint slice

Add tests proving:

- pure decision creation and update paths;
- no mutation of input potentiality;
- transaction use in the repository-backed strategy;
- two concurrent constraints both survive;
- injected strategy delegation;
- one operation ID per public logical call;
- distributed command and decision exports from `sneq-engine/atomic`.

### 7.3 Entity creation slice

Add repository contract tests for:

- revision initialization;
- revision increment on direct upsert;
- revision increment on alias confirmation;
- persistence through JSON reload;
- SQLite migration/default behavior;
- missing-campaign rejection.

Add pure decision tests for stale, existing, conflict, forced creation, and create outcomes.

Add a controlled concurrency regression where two callers:

- read the same initial revision;
- finish initial resolution before either atomic create runs;
- race their create commands;
- cause one stale retry;
- converge on one canonical entity ID;
- leave one stored entity;
- preserve the same operation ID across the stale retry;
- do not run resolver or embedding work inside the repository transaction.

### 7.4 Depth slice

Use A → B → C fixtures to prove:

- omitted/zero depth returns A facts only;
- depth `1` returns A and B, never C;
- tool schema rejects depth `2`;
- every adapter’s `neighbors` contract is direct-only.

### 7.5 Propagation slice

Add a structural equality regression for two repeated identical calls, including IDs and timestamps. Preserve existing force-decay, max-depth, source-exclusion, and rule-filter tests.

### 7.6 Collapse removal slice

Assert collapse is absent from:

- TypeScript class/interface declarations;
- tool names and schemas;
- dispatcher behavior;
- all adapter tool shapes;
- CLI parser and help;
- README and skill guidance;
- generated API docs.

The CLI should report `collapse-attribute` as an unknown command, not `NOT_IMPLEMENTED`.

## 8. Verification

After each slice:

- run the focused test file(s);
- run `pnpm test` before marking the slice complete.

Before completion, run:

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

Also run runtime exercises that can fail independently of unit coverage:

- stale context after delete and after close;
- two concurrent `mentionEntity` calls converging on one entity;
- repeated identical propagation input producing structural equality;
- `sneq-engine --help` showing 14 commands and no collapse command.

## 9. Acceptance criteria

- A `CampaignContext` invalidated by deletion or Engine shutdown rejects every later operation deterministically.
- Recreating a campaign ID never reactivates an old context reference.
- Campaign deletion is ordered after already-started atomic mutations and cannot be undone by transaction rollback.
- Direct repository writes cannot create campaign-scoped state without a parent campaign.
- Concurrent `addConstraint` calls cannot lose constraints in the local reference strategy.
- Distributed adapters receive deterministic add-constraint and entity-create decisions plus explicit idempotency semantics.
- Concurrent entity creators cannot both commit from the same entity revision.
- Resolver and embedding provider work remain outside store transactions.
- Graph APIs and docs promise only own facts or direct neighbors.
- Repeated identical propagation inputs return structurally equal outputs.
- `collapse_attribute` no longer exists in the supported TypeScript, tool, CLI, or generated-doc surface.
- Existing `CampaignContext` method signatures remain compatible except for deliberate removal of `collapseAttribute` and narrowing `depth` to `0 | 1`.
- Full tests, typecheck, build, docs generation, package entrypoint imports, and runtime verification pass.
