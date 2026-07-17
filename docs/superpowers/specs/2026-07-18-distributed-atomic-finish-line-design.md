---
title: Distributed Atomic Strategy — Finish-Line Design
date: 2026-07-18
status: approved
related:
  - https://github.com/JeanDes-Code/sneq-narrative-system/pull/5
  - https://github.com/JeanDes-Code/sneq-narrative-system/issues/4
  - https://github.com/JeanDes-Code/grimoire/issues/44
---

# Distributed Atomic Strategy — Finish-Line Design

## Goal

Finish PR #5 as a framework-independent extension for distributed repositories without weakening the guarantees already provided by local `Repository.transaction(fn)` adapters.

The remaining correctness gap is asynchronous entity adjudication: `confirmEntityMatch` currently performs a read-modify-write outside the atomic strategy, so concurrent alias confirmations can overwrite each other. Distributed commands also need an explicit idempotency token so a transport retry cannot silently repeat a committed logical operation.

## Scope

This finish-line pass will:

1. move `confirmEntityMatch` behind `AtomicWriteStrategy`;
2. export a pure decision for distributed adapters;
3. add an operation ID to every atomic command and document its retry contract;
4. preserve the existing `CampaignContext.confirmEntityMatch(input)` public API;
5. add focused regression and compatibility tests;
6. regenerate API documentation and verify the published `sneq-engine/atomic` entrypoint.

It will not add Convex code, change the synchronous `UserPromptRegistry` flow, alter existing repository adapter APIs, or merge the PR automatically.

PR #3 has been closed. Its runtime feedback persistence and telemetry remain consumer-level concerns. GitHub issue templates may return later in a separate focused PR.

## Architecture

### Atomic command contract

Every atomic command receives an `operationId: string` generated once by `CampaignContext` before delegation:

- `RegisterFactCommand`
- `SetSceneCommand`
- `AdvanceTurnCommand`
- `ConfirmEntityMatchCommand`

An injected distributed strategy must atomically deduplicate repeated `operationId` values and return the original result. This covers the case where a store transaction commits but the transport response is lost and retried.

The historical repository-backed strategy keeps using `Repository.transaction(fn)`. It does not need durable retry bookkeeping because it is an in-process implementation, but it accepts the same commands and preserves their results.

### Entity confirmation

`AtomicWriteStrategy` gains:

```ts
confirmEntityMatch(command: ConfirmEntityMatchCommand): Promise<ConfirmEntityMatchResult>
```

The command contains:

- `operationId`
- `campaignId`
- `mention`
- `entityId`
- expected entity `type`
- `observedAt`

The result contains:

- `entityId`
- `aliasAdded`

The repository-backed strategy executes the complete flow inside one transaction:

1. load the entity from the command campaign;
2. reject an unknown entity;
3. reject a type mismatch;
4. normalize the canonical name and all aliases;
5. return `aliasAdded: false` for an existing normalized mention;
6. append the PLAYER alias and persist the updated entity;
7. return `aliasAdded: true`.

This prevents two concurrent confirmations from reading the same alias list and replacing each other's updates.

### Pure decision

`sneq-engine/atomic` exports `decideConfirmEntityMatch` alongside the existing decisions. Its input combines the command with the entity loaded inside the store transaction. It either throws the same validation errors as the current public method or returns the updated entity/result decision.

The decision remains deterministic: timestamps and operation IDs are supplied by the caller rather than generated inside it.

### Campaign facade

`CampaignContext.confirmEntityMatch(input)` keeps its current signature. It only:

1. verifies the campaign exists;
2. creates `operationId` and `observedAt` once;
3. delegates to `writeStrategy.confirmEntityMatch`.

The three existing write methods also create and pass one operation ID per logical call.

## Error handling

- Missing entities continue to reject with an entity-not-found error containing the campaign and entity IDs.
- Type mismatches continue to reject with expected and actual types.
- Duplicate normalized aliases are successful idempotent results with `aliasAdded: false`.
- Store/transport errors propagate from the strategy; the engine must not convert an uncertain write into success.
- Embedding outage behavior introduced by PR #5 remains unchanged.

## Testing

### Pure decisions

Add tests proving that `decideConfirmEntityMatch`:

- rejects an unknown entity;
- rejects a type mismatch;
- recognizes normalized canonical-name and alias duplicates;
- appends a PLAYER alias with the supplied `observedAt`;
- does not mutate the input entity.

### Repository-backed strategy

Add tests proving that:

- confirmation runs through `Repository.transaction(fn)`;
- two concurrent confirmations for different aliases both survive;
- a duplicate confirmation returns `aliasAdded: false`;
- every strategy method receives an operation ID.

### Injected strategy compatibility

Extend delegation tests to prove:

- `CampaignContext.confirmEntityMatch` delegates to the injected strategy;
- operation IDs are non-empty and stable for the duration of one delegated call;
- an injected strategy still prevents use of the legacy transaction callback.

### Verification

Run:

```bash
pnpm build
pnpm test
pnpm typecheck
pnpm run docs
node -e 'import("sneq-engine/atomic")'
```

The working tree must be clean after generated documentation is committed. PR #5 may then be pushed for final review, but not merged without a separate explicit instruction.

## Acceptance criteria

- Concurrent alias confirmation cannot lose an alias in the local reference strategy.
- Distributed adapters have a pure decision and one atomic strategy method for confirmation.
- All atomic commands expose an idempotency token with a documented deduplication requirement.
- Existing local consumers and the synchronous adjudication path remain source-compatible.
- The complete test, build, typecheck, documentation, and package-entrypoint verification passes.
