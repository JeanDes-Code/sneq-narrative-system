# SNEQ Feedback Channel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give SNEQ a consumer-feedback channel: the in-game agent files out-of-band feedback (`sneq__report_feedback`) and passive tool-call telemetry captures what it never calls; the operator reads a digest and triages; human consumers get GitHub issue templates + a README path.

**Architecture:** Capacities 2+3 of the meta-layer spec (capacity 1 `CanonDirective` deferred). New domain types (`FeedbackEntry`, `ToolCallLogEntry`), 5 new Repository methods implemented in all 3 adapters under the shared contract suite, a pure `classifyOutcome` + try/finally instrumentation at the single `dispatchToolCall` chokepoint, 4 new `CampaignContext` methods, 1 new LLM tool (11→12 ToolNames, auto-advertised), 3 new CLI commands (15→18), `.github` issue templates. Zero breaking change.

**Tech Stack:** TypeScript 5 strict (NodeNext ESM, `exactOptionalPropertyTypes`), zod v4, vitest, better-sqlite3 (optional), Node ≥ 20.

**Specs:**
- `docs/superpowers/specs/2026-06-10-sneq-feedback-channel-scope-design.md` (scope + deltas — authoritative for THIS plan)
- `docs/superpowers/specs/2026-05-25-sneq-meta-layer-design.md` (full design, §4/§5/§7/§9/§10)

**Branch:** `feat/feedback-channel` (already created, specs committed) — one commit per task, PR at the end, merge only on Jean's explicit OK.

**Conventions for every task:** run `pnpm test` (expect green except the current step's new failing tests) and `pnpm typecheck` before each commit. Never `git add .` / `git add -A` — add files explicitly. Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Plan-level decisions (deltas already approved in the scope spec):**
- `neverCalled` is computed against `ADVERTISED_TOOL_NAMES`, not `ToolNames` (de-advertised `collapse_attribute` must not pollute the digest).
- `ToolCallAggregate.lastCalledAt: number` (not `number | null` as the mother-spec sketch had: a tool present in coverage has ≥ 1 call by construction).
- The tool schema gains an optional `origin` (`AGENT` default): the mother spec models `origin: "AGENT" | "HUMAN"` (§4.2) but its tool args (§9) gave no way to ever write `HUMAN` (player reflections relayed by the consumer in meta-break). Additive, default preserves §5.2.
- Telemetry `detail` on ERROR is `error.name` only (e.g. `ZodError`) — never the message, which can echo narration (locked decision #12, no PII).
- CLI `feedback`/`triage-feedback` read inline `--args` only (same precedent as `validate-narration`/`prepare-turn` special cases); `report-feedback` flows through the existing default tool-command case and gets `--args`/stdin for free.

---

### Task 1: Domain types — `feedback.ts`, `FeedbackId`, public exports

**Files:**
- Create: `src/domain/feedback.ts`
- Modify: `src/domain/ids.ts`
- Modify: `src/index.ts`
- Test: `test/domain/feedback.test.ts` (new)

- [ ] **Step 1: Write the failing test**

Create `test/domain/feedback.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { asFeedbackId } from "../../src/domain/ids.js";
import type { FeedbackEntry, ToolCallLogEntry } from "../../src/domain/feedback.js";

describe("feedback domain types", () => {
  it("asFeedbackId brands a string", () => {
    const id = asFeedbackId("fb_123");
    expect(id).toBe("fb_123");
  });

  it("FeedbackEntry compiles with and without optional fields", () => {
    const minimal: FeedbackEntry = {
      id: asFeedbackId("fb_1"), origin: "AGENT", kind: "MISSING",
      body: "no temporary relations", status: "OPEN", createdAt: 1
    };
    const full: FeedbackEntry = {
      ...minimal, subject: "sneq__add_constraint", severity: "MED",
      promotedTo: "https://github.com/x/y/issues/1", createdTurn: 4
    };
    expect(minimal.status).toBe("OPEN");
    expect(full.severity).toBe("MED");
  });

  it("ToolCallLogEntry compiles with and without optional fields", () => {
    const e: ToolCallLogEntry = { tool: "sneq__get_entity", outcome: "EMPTY", durationMs: 3, createdAt: 1 };
    const f: ToolCallLogEntry = { ...e, detail: "facts=0", turn: 2 };
    expect(f.outcome).toBe("EMPTY");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run test/domain/feedback.test.ts`
Expected: FAIL (cannot resolve `../../src/domain/feedback.js`, `asFeedbackId` not exported).

- [ ] **Step 3: Implement**

Create `src/domain/feedback.ts`:

```ts
import type { FeedbackId } from "./ids.js";

export type FeedbackKind =
  | "FRICTION" | "MISSING" | "BROKEN"      // the agent: something grates / is absent / is broken
  | "REFLECTION" | "CORRECTION" | "PRAISE" // the player, relayed in meta-break
  | "IDEA";                                 // either

export type FeedbackStatus = "OPEN" | "TRIAGED" | "PROMOTED" | "DISMISSED";

/** Out-of-band system feedback. Never narrative state, never shown to the player. */
export interface FeedbackEntry {
  id: FeedbackId;
  origin: "AGENT" | "HUMAN";
  kind: FeedbackKind;
  body: string;
  /** Pointer: tool name, subsystem, "general". */
  subject?: string;
  severity?: "LOW" | "MED" | "HIGH";
  status: FeedbackStatus;
  /** GitHub issue URL once promoted (manual triage only). */
  promotedTo?: string;
  createdAt: number;
  createdTurn?: number;
}

export type ToolCallOutcome = "OK" | "EMPTY" | "NO_MATCH" | "CONTRADICTION" | "ERROR";

/** One row per tool call, captured passively at dispatchToolCall.
 *  Never contains raw args or narration (telemetry must hold no PII/prose). */
export interface ToolCallLogEntry {
  tool: string;
  outcome: ToolCallOutcome;
  durationMs: number;
  /** Minimal machine detail: error name, "facts=0", "issues=2". */
  detail?: string;
  createdAt: number;
  /** Best-effort campaign turn at call time. */
  turn?: number;
}
```

In `src/domain/ids.ts` add (after `SceneId` / `asSceneId`, keeping the aligned style):

```ts
export type FeedbackId   = string & { readonly [brand]: "FeedbackId" };
export const asFeedbackId  = (s: string): FeedbackId  => s as FeedbackId;
```

In `src/index.ts`:
- extend the Domain block:

```ts
export type { FeedbackEntry, FeedbackKind, FeedbackStatus, ToolCallLogEntry, ToolCallOutcome } from "./domain/feedback.js";
```

- in the ids export lines, add `FeedbackId` to the `export type {...} from "./domain/ids.js"` list and `asFeedbackId` to the value export list.

- [ ] **Step 4: Verify green + commit**

Run: `pnpm vitest run test/domain/feedback.test.ts && pnpm typecheck`
Expected: PASS.

```bash
git add src/domain/feedback.ts src/domain/ids.ts src/index.ts test/domain/feedback.test.ts
git commit -m "feat(domain): FeedbackEntry / ToolCallLogEntry types + FeedbackId"
```

---

### Task 2: Repository — interface, contract tests, 3 adapter implementations

The 5 new methods land in the interface and ALL adapters in one commit (adding interface members breaks every implementing class's typecheck until each implements them).

**Files:**
- Modify: `src/repository/interface.ts`
- Modify: `src/repository/sqlite/migrations.ts`
- Modify: `src/repository/sqlite/serialization.ts`
- Modify: `src/repository/sqlite/index.ts`
- Modify: `src/repository/memory/index.ts` (JSON adapter inherits via `MemoryState` + `mutated()`)
- Modify: `src/index.ts`
- Test: `test/repository/contract.ts` (additive — runs on sqlite, memory AND json via the 3 existing consumers)

- [ ] **Step 1: Write the failing contract tests**

Append inside the `describe` block of `repositoryContract` in `test/repository/contract.ts` (after the `transaction` test). Also extend the file's imports:

```ts
import { asFeedbackId } from "../../src/domain/ids.js";
import type { FeedbackEntry, ToolCallLogEntry } from "../../src/domain/feedback.js";
```

Add a local builder next to `fact(...)`:

```ts
function fb(id: string, over: Partial<FeedbackEntry> = {}): FeedbackEntry {
  return {
    id: asFeedbackId(id), origin: "AGENT", kind: "FRICTION",
    body: `body of ${id}`, status: "OPEN", createdAt: 100, ...over
  };
}

function tc(tool: string, over: Partial<ToolCallLogEntry> = {}): ToolCallLogEntry {
  return { tool, outcome: "OK", durationMs: 5, createdAt: 100, ...over };
}
```

New tests:

```ts
    it("feedback: append, query by status and since, roundtrips optional fields", async () => {
      await repo.appendFeedback(cid, fb("fb_1", { subject: "sneq__add_constraint", severity: "MED", createdTurn: 3 }));
      await repo.appendFeedback(cid, fb("fb_2", { kind: "IDEA", createdAt: 200 }));
      await repo.appendFeedback(cid, fb("fb_3", { status: "DISMISSED", createdAt: 300 }));

      const open = await repo.queryFeedback(cid, { status: "OPEN" });
      expect(open.map(e => String(e.id))).toEqual(["fb_1", "fb_2"]);
      expect(open[0]?.subject).toBe("sneq__add_constraint");
      expect(open[0]?.severity).toBe("MED");
      expect(open[0]?.createdTurn).toBe(3);
      expect(open[1]?.subject).toBeUndefined();

      expect((await repo.queryFeedback(cid, { status: "OPEN", since: 150 })).map(e => String(e.id))).toEqual(["fb_2"]);
      expect((await repo.queryFeedback(cid, {})).map(e => String(e.id))).toEqual(["fb_1", "fb_2", "fb_3"]);
    });

    it("feedback: updateFeedbackStatus sets status + promotedTo, returns false on unknown id", async () => {
      await repo.appendFeedback(cid, fb("fb_1"));
      const ok = await repo.updateFeedbackStatus(cid, asFeedbackId("fb_1"), "PROMOTED", "https://github.com/x/y/issues/12");
      expect(ok).toBe(true);
      const promoted = await repo.queryFeedback(cid, { status: "PROMOTED" });
      expect(promoted[0]?.promotedTo).toBe("https://github.com/x/y/issues/12");
      expect(await repo.queryFeedback(cid, { status: "OPEN" })).toEqual([]);
      expect(await repo.updateFeedbackStatus(cid, asFeedbackId("nope"), "DISMISSED")).toBe(false);
    });

    it("tool-call log: append + aggregate folds counts, outcomes, lastCalledAt, sorted by tool", async () => {
      await repo.appendToolCallLog(cid, tc("sneq__lookup_entity", { createdAt: 10 }));
      await repo.appendToolCallLog(cid, tc("sneq__lookup_entity", { outcome: "NO_MATCH", detail: "ambiguous", createdAt: 30 }));
      await repo.appendToolCallLog(cid, tc("sneq__get_entity", { outcome: "EMPTY", createdAt: 20, turn: 2 }));

      const agg = await repo.aggregateToolCalls(cid);
      expect(agg.map(a => a.tool)).toEqual(["sneq__get_entity", "sneq__lookup_entity"]);
      const lookup = agg.find(a => a.tool === "sneq__lookup_entity")!;
      expect(lookup.calls).toBe(2);
      expect(lookup.outcomes).toEqual({ OK: 1, NO_MATCH: 1 });
      expect(lookup.lastCalledAt).toBe(30);
      expect(await repo.aggregateToolCalls(asCampaignId("other"))).toEqual([]);
    });

    it("deleteCampaign purges feedback and tool-call log", async () => {
      await repo.appendFeedback(cid, fb("fb_1"));
      await repo.appendToolCallLog(cid, tc("sneq__get_entity"));
      await repo.deleteCampaign(cid);
      await repo.createCampaign({ id: cid, name: "Contract", createdAt: 0, embeddingDim: DIM });
      expect(await repo.queryFeedback(cid, {})).toEqual([]);
      expect(await repo.aggregateToolCalls(cid)).toEqual([]);
    });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run test/repository/`
Expected: FAIL — TS errors (`appendFeedback` does not exist on `Repository`) across the 3 contract consumers.

- [ ] **Step 3: Extend the interface**

In `src/repository/interface.ts` — add to the type imports:

```ts
import type { FeedbackEntry, FeedbackStatus, ToolCallLogEntry, ToolCallOutcome } from "../domain/feedback.js";
import type { FeedbackId } from "../domain/ids.js";
```

Add next to `EntityWithScore`:

```ts
/** Per-tool aggregate of the telemetry log. Sorted by tool name in all adapters. */
export interface ToolCallAggregate {
  tool: string;
  calls: number;
  outcomes: Partial<Record<ToolCallOutcome, number>>;
  lastCalledAt: number;
}
```

Add to the `Repository` interface, after the Turn/Scene group:

```ts
  // Meta channel (feedback + telemetry) — orthogonal to the narrative graph
  appendFeedback(campaignId: CampaignId, entry: FeedbackEntry): Promise<void>;
  /** No status filter = all statuses. `since` filters on createdAt >= since. Ordered by createdAt asc. */
  queryFeedback(campaignId: CampaignId, filter: { status?: FeedbackStatus; since?: number }): Promise<FeedbackEntry[]>;
  /** Returns false when the id does not exist in the campaign. */
  updateFeedbackStatus(campaignId: CampaignId, id: FeedbackId, status: FeedbackStatus, promotedTo?: string): Promise<boolean>;
  appendToolCallLog(campaignId: CampaignId, entry: ToolCallLogEntry): Promise<void>;
  aggregateToolCalls(campaignId: CampaignId): Promise<ToolCallAggregate[]>;
```

- [ ] **Step 4: SQLite — migration v3 + serialization + implementation**

`src/repository/sqlite/migrations.ts` — bump `SCHEMA_VERSION` to `3` and append to `MIGRATIONS`:

```ts
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS feedback_entry (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        origin TEXT NOT NULL,
        kind TEXT NOT NULL,
        body TEXT NOT NULL,
        subject TEXT,
        severity TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        promoted_to TEXT,
        created_at INTEGER NOT NULL,
        created_turn INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_campaign_status ON feedback_entry(campaign_id, status);

      CREATE TABLE IF NOT EXISTS tool_call_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        tool TEXT NOT NULL,
        outcome TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        detail TEXT,
        created_at INTEGER NOT NULL,
        turn INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_toolcall_campaign_tool ON tool_call_log(campaign_id, tool);
    `
  }
```

`src/repository/sqlite/serialization.ts` — extend imports (`asFeedbackId` from ids, `FeedbackEntry`/`ToolCallLogEntry` types from domain) and append:

```ts
export interface FeedbackRow {
  id: string;
  campaign_id: string;
  origin: string;
  kind: string;
  body: string;
  subject: string | null;
  severity: string | null;
  status: string;
  promoted_to: string | null;
  created_at: number;
  created_turn: number | null;
}

export function feedbackToRow(e: FeedbackEntry, campaignId: CampaignId): FeedbackRow {
  return {
    id: e.id, campaign_id: campaignId, origin: e.origin, kind: e.kind, body: e.body,
    subject: e.subject ?? null, severity: e.severity ?? null, status: e.status,
    promoted_to: e.promotedTo ?? null, created_at: e.createdAt, created_turn: e.createdTurn ?? null
  };
}

export function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: asFeedbackId(row.id),
    origin: row.origin as FeedbackEntry["origin"],
    kind: row.kind as FeedbackEntry["kind"],
    body: row.body,
    ...(row.subject !== null ? { subject: row.subject } : {}),
    ...(row.severity !== null ? { severity: row.severity as NonNullable<FeedbackEntry["severity"]> } : {}),
    status: row.status as FeedbackEntry["status"],
    ...(row.promoted_to !== null ? { promotedTo: row.promoted_to } : {}),
    createdAt: row.created_at,
    ...(row.created_turn !== null ? { createdTurn: row.created_turn } : {})
  };
}

export interface ToolCallRow {
  campaign_id: string;
  tool: string;
  outcome: string;
  duration_ms: number;
  detail: string | null;
  created_at: number;
  turn: number | null;
}

export function toolCallToRow(e: ToolCallLogEntry, campaignId: CampaignId): ToolCallRow {
  return {
    campaign_id: campaignId, tool: e.tool, outcome: e.outcome, duration_ms: e.durationMs,
    detail: e.detail ?? null, created_at: e.createdAt, turn: e.turn ?? null
  };
}
```

`src/repository/sqlite/index.ts`:
- extend imports: `FeedbackEntry, FeedbackStatus, ToolCallLogEntry` (domain), `FeedbackId` (ids), `ToolCallAggregate` (interface), and `feedbackToRow, rowToFeedback, type FeedbackRow, toolCallToRow` (serialization).
- in `deleteCampaign`, extend the purge list:

```ts
      for (const t of ["entities", "aliases_norm", "figed", "potentialites", "nodes", "edges", "turns", "scenes", "feedback_entry", "tool_call_log"]) {
```

- append the methods (before `transaction`):

```ts
  async appendFeedback(campaignId: CampaignId, entry: FeedbackEntry): Promise<void> {
    const row = feedbackToRow(entry, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO feedback_entry
        (id, campaign_id, origin, kind, body, subject, severity, status, promoted_to, created_at, created_turn)
      VALUES (@id, @campaign_id, @origin, @kind, @body, @subject, @severity, @status, @promoted_to, @created_at, @created_turn)
    `).run(row);
  }

  async queryFeedback(campaignId: CampaignId, filter: { status?: FeedbackStatus; since?: number }): Promise<FeedbackEntry[]> {
    const clauses: string[] = ["campaign_id = ?"];
    const params: unknown[] = [campaignId];
    if (filter.status !== undefined) { clauses.push("status = ?");      params.push(filter.status); }
    if (filter.since !== undefined)  { clauses.push("created_at >= ?"); params.push(filter.since); }
    const rows = this.db.prepare(
      `SELECT * FROM feedback_entry WHERE ${clauses.join(" AND ")} ORDER BY created_at, id`
    ).all(...params) as FeedbackRow[];
    return rows.map(rowToFeedback);
  }

  async updateFeedbackStatus(campaignId: CampaignId, id: FeedbackId, status: FeedbackStatus, promotedTo?: string): Promise<boolean> {
    const r = promotedTo !== undefined
      ? this.db.prepare(`UPDATE feedback_entry SET status = ?, promoted_to = ? WHERE campaign_id = ? AND id = ?`)
          .run(status, promotedTo, campaignId, id)
      : this.db.prepare(`UPDATE feedback_entry SET status = ? WHERE campaign_id = ? AND id = ?`)
          .run(status, campaignId, id);
    return r.changes > 0;
  }

  async appendToolCallLog(campaignId: CampaignId, entry: ToolCallLogEntry): Promise<void> {
    const row = toolCallToRow(entry, campaignId);
    this.db.prepare(`
      INSERT INTO tool_call_log (campaign_id, tool, outcome, duration_ms, detail, created_at, turn)
      VALUES (@campaign_id, @tool, @outcome, @duration_ms, @detail, @created_at, @turn)
    `).run(row);
  }

  async aggregateToolCalls(campaignId: CampaignId): Promise<ToolCallAggregate[]> {
    const rows = this.db.prepare(`
      SELECT tool, outcome, COUNT(*) AS calls, MAX(created_at) AS last
      FROM tool_call_log WHERE campaign_id = ? GROUP BY tool, outcome ORDER BY tool
    `).all(campaignId) as Array<{ tool: string; outcome: string; calls: number; last: number }>;
    const byTool = new Map<string, ToolCallAggregate>();
    for (const r of rows) {
      let agg = byTool.get(r.tool);
      if (!agg) { agg = { tool: r.tool, calls: 0, outcomes: {}, lastCalledAt: 0 }; byTool.set(r.tool, agg); }
      agg.calls += r.calls;
      agg.outcomes[r.outcome as keyof ToolCallAggregate["outcomes"]] = r.calls;
      agg.lastCalledAt = Math.max(agg.lastCalledAt, r.last);
    }
    return [...byTool.values()];
  }
```

- [ ] **Step 5: Memory adapter (JSON inherits)**

`src/repository/memory/index.ts`:
- extend imports: `FeedbackEntry, FeedbackStatus, ToolCallLogEntry` (domain), `FeedbackId` (ids), `ToolCallAggregate` (interface).
- extend `MemoryState` and `emptyMemoryState()`:

```ts
  feedback: Map<string, Map<string, FeedbackEntry>>;
  toolCalls: Map<string, ToolCallLogEntry[]>;
```

```ts
    nodes: new Map(), edges: new Map(), turns: new Map(), scenes: new Map(),
    feedback: new Map(), toolCalls: new Map()
```

- in `deleteCampaign`, the typed bucket loop can't take the two new shapes — delete them explicitly after the loop:

```ts
    this.state.feedback.delete(id);
    this.state.toolCalls.delete(id);
```

- append a new section before `// -- transaction`:

```ts
  // -- meta channel (feedback + telemetry) -------------------------------------

  private feedbackOf(cid: CampaignId): Map<string, FeedbackEntry> {
    let m = this.state.feedback.get(cid);
    if (!m) { m = new Map(); this.state.feedback.set(cid, m); }
    return m;
  }

  async appendFeedback(campaignId: CampaignId, entry: FeedbackEntry): Promise<void> {
    this.feedbackOf(campaignId).set(entry.id, structuredClone(entry));
    await this.mutated();
  }

  async queryFeedback(campaignId: CampaignId, filter: { status?: FeedbackStatus; since?: number }): Promise<FeedbackEntry[]> {
    return [...(this.state.feedback.get(campaignId)?.values() ?? [])]
      .filter(e =>
        (filter.status === undefined || e.status === filter.status) &&
        (filter.since === undefined || e.createdAt >= filter.since))
      .sort((a, b) => a.createdAt - b.createdAt || String(a.id).localeCompare(String(b.id)))
      .map(e => structuredClone(e));
  }

  async updateFeedbackStatus(campaignId: CampaignId, id: FeedbackId, status: FeedbackStatus, promotedTo?: string): Promise<boolean> {
    const e = this.state.feedback.get(campaignId)?.get(id);
    if (!e) return false;
    e.status = status;
    if (promotedTo !== undefined) e.promotedTo = promotedTo;
    await this.mutated();
    return true;
  }

  async appendToolCallLog(campaignId: CampaignId, entry: ToolCallLogEntry): Promise<void> {
    let list = this.state.toolCalls.get(campaignId);
    if (!list) { list = []; this.state.toolCalls.set(campaignId, list); }
    list.push(structuredClone(entry));
    await this.mutated();
  }

  async aggregateToolCalls(campaignId: CampaignId): Promise<ToolCallAggregate[]> {
    const byTool = new Map<string, ToolCallAggregate>();
    for (const e of this.state.toolCalls.get(campaignId) ?? []) {
      let agg = byTool.get(e.tool);
      if (!agg) { agg = { tool: e.tool, calls: 0, outcomes: {}, lastCalledAt: 0 }; byTool.set(e.tool, agg); }
      agg.calls += 1;
      agg.outcomes[e.outcome] = (agg.outcomes[e.outcome] ?? 0) + 1;
      agg.lastCalledAt = Math.max(agg.lastCalledAt, e.createdAt);
    }
    return [...byTool.values()].sort((a, b) => a.tool.localeCompare(b.tool));
  }
```

The JSON adapter needs NO code change: it extends `InMemoryRepository`, `mutated()` persists the whole state, and `tryLoad` spreads `{ ...emptyMemoryState(), ...parsed.state }` so pre-existing JSON files load with empty new buckets (no file-format migration).

- [ ] **Step 6: Export the new repository types**

In `src/index.ts`, extend the Repository export:

```ts
export type {
  Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore, ToolCallAggregate
} from "./repository/interface.js";
```

- [ ] **Step 7: Run the full repository suite ×3 adapters + commit**

Run: `pnpm vitest run test/repository/ && pnpm typecheck`
Expected: PASS — the 4 new contract tests green on sqlite, memory and json.

```bash
git add src/repository/interface.ts src/repository/sqlite/migrations.ts src/repository/sqlite/serialization.ts src/repository/sqlite/index.ts src/repository/memory/index.ts src/index.ts test/repository/contract.ts
git commit -m "feat(repository): feedback + tool-call-log methods in the contract and all 3 adapters (sqlite migration v3)"
```

---

### Task 3: `classifyOutcome` — pure telemetry classification

**Files:**
- Create: `src/core/telemetry.ts`
- Test: `test/core/telemetry.test.ts` (new)

- [ ] **Step 1: Write the failing tests** (one case per line of the mother spec's §5.1 table)

Create `test/core/telemetry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { classifyOutcome } from "../../src/core/telemetry.js";

describe("classifyOutcome", () => {
  it("lookup_entity: null match → NO_MATCH with notFoundReason detail", () => {
    expect(classifyOutcome("sneq__lookup_entity", { match: null, notFoundReason: "ambiguous", candidates: [] }))
      .toEqual({ outcome: "NO_MATCH", detail: "ambiguous" });
    expect(classifyOutcome("sneq__lookup_entity", { match: { id: "e1" } }))
      .toEqual({ outcome: "OK" });
  });

  it("get_entity: null → EMPTY", () => {
    expect(classifyOutcome("sneq__get_entity", null)).toEqual({ outcome: "EMPTY" });
    expect(classifyOutcome("sneq__get_entity", { id: "e1" })).toEqual({ outcome: "OK" });
  });

  it("get_relevant_facts: empty array → EMPTY facts=0", () => {
    expect(classifyOutcome("sneq__get_relevant_facts", [])).toEqual({ outcome: "EMPTY", detail: "facts=0" });
    expect(classifyOutcome("sneq__get_relevant_facts", [{ key: "k" }])).toEqual({ outcome: "OK" });
  });

  it("suggest_existing: no candidates → EMPTY", () => {
    expect(classifyOutcome("sneq__suggest_existing", { candidates: [], recommendsNew: true })).toEqual({ outcome: "EMPTY" });
    expect(classifyOutcome("sneq__suggest_existing", { candidates: [{ id: "e1" }] })).toEqual({ outcome: "OK" });
  });

  it("register_fact: contradictions → CONTRADICTION", () => {
    expect(classifyOutcome("sneq__register_fact", { factId: null, contradictions: [{ key: "k" }] }))
      .toEqual({ outcome: "CONTRADICTION" });
    expect(classifyOutcome("sneq__register_fact", { factId: "f1", contradictions: [] })).toEqual({ outcome: "OK" });
  });

  it("validate_narration: finding issues is the tool WORKING → OK with issues=N detail", () => {
    expect(classifyOutcome("sneq__validate_narration", { ok: false, issues: [{}, {}] }))
      .toEqual({ outcome: "OK", detail: "issues=2" });
    expect(classifyOutcome("sneq__validate_narration", { ok: true, issues: [] })).toEqual({ outcome: "OK" });
  });

  it("any throw → ERROR with the error NAME only (no message: it can echo narration)", () => {
    const err = new Error("Mira said something secret");
    err.name = "SneqCampaignNotFoundError";
    const r = classifyOutcome("sneq__set_scene", undefined, err);
    expect(r.outcome).toBe("ERROR");
    expect(r.detail).toBe("SneqCampaignNotFoundError");
    expect(JSON.stringify(r)).not.toContain("Mira");
  });

  it("unknown/other tools default to OK", () => {
    expect(classifyOutcome("sneq__advance_turn", { turnNumber: 3 })).toEqual({ outcome: "OK" });
    expect(classifyOutcome("sneq__report_feedback", { recorded: true })).toEqual({ outcome: "OK" });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/core/telemetry.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `src/core/telemetry.ts`:

```ts
import type { ToolCallOutcome } from "../domain/feedback.js";

/** Pure classification of one tool-call result into a telemetry outcome.
 *  detail stays machine-minimal (error NAME, counts) — never raw args, never narration. */
export function classifyOutcome(
  tool: string,
  result: unknown,
  error?: unknown
): { outcome: ToolCallOutcome; detail?: string } {
  if (error !== undefined) {
    const name = error instanceof Error ? error.name : "unknown";
    return { outcome: "ERROR", detail: name };
  }
  const r = (typeof result === "object" && result !== null ? result : undefined) as Record<string, unknown> | undefined;
  switch (tool) {
    case "sneq__lookup_entity": {
      if (r && r["match"] === null) {
        const reason = r["notFoundReason"];
        return { outcome: "NO_MATCH", ...(typeof reason === "string" ? { detail: reason } : {}) };
      }
      return { outcome: "OK" };
    }
    case "sneq__get_entity":
      return result === null ? { outcome: "EMPTY" } : { outcome: "OK" };
    case "sneq__get_relevant_facts":
      return Array.isArray(result) && result.length === 0
        ? { outcome: "EMPTY", detail: "facts=0" }
        : { outcome: "OK" };
    case "sneq__suggest_existing": {
      const c = r?.["candidates"];
      return Array.isArray(c) && c.length === 0 ? { outcome: "EMPTY" } : { outcome: "OK" };
    }
    case "sneq__register_fact": {
      const c = r?.["contradictions"];
      return Array.isArray(c) && c.length > 0 ? { outcome: "CONTRADICTION" } : { outcome: "OK" };
    }
    case "sneq__validate_narration": {
      if (r && r["ok"] === false) {
        const issues = r["issues"];
        return { outcome: "OK", detail: `issues=${Array.isArray(issues) ? issues.length : 0}` };
      }
      return { outcome: "OK" };
    }
    default:
      return { outcome: "OK" };
  }
}
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm vitest run test/core/telemetry.test.ts && pnpm typecheck`
Expected: PASS.

```bash
git add src/core/telemetry.ts test/core/telemetry.test.ts
git commit -m "feat(core): classifyOutcome — pure per-tool telemetry classification"
```

---

### Task 4: Dispatcher instrumentation + `CampaignContext.recordToolCall`

**Files:**
- Modify: `src/tools/dispatcher.ts`
- Modify: `src/campaign.ts`
- Test: `test/tools/dispatcher.test.ts` (additive), `test/campaign.test.ts` (additive)

- [ ] **Step 1: Write the failing dispatcher tests** (append to `test/tools/dispatcher.test.ts`)

```ts
import type { ToolCallLogEntry } from "../../src/domain/feedback.js";

describe("dispatchToolCall · passive telemetry", () => {
  it("records one classified entry per successful call", async () => {
    const recorded: ToolCallLogEntry[] = [];
    const ctx = { ...stubCtx(), recordToolCall: async (e: ToolCallLogEntry) => { recorded.push(e); } };
    await dispatchToolCall("sneq__get_entity", { entityId: "ghost" }, ctx);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ tool: "sneq__get_entity", outcome: "EMPTY" });
    expect(typeof recorded[0]!.durationMs).toBe("number");
    expect(typeof recorded[0]!.createdAt).toBe("number");
  });

  it("records ERROR (error name only) and still rethrows when the tool throws", async () => {
    const recorded: ToolCallLogEntry[] = [];
    const ctx = {
      ...stubCtx(),
      getEntity: async () => { const e = new Error("boom with narrative content"); e.name = "RepoDown"; throw e; },
      recordToolCall: async (e: ToolCallLogEntry) => { recorded.push(e); }
    };
    await expect(dispatchToolCall("sneq__get_entity", { entityId: "x" }, ctx)).rejects.toThrow("boom");
    expect(recorded[0]).toMatchObject({ tool: "sneq__get_entity", outcome: "ERROR", detail: "RepoDown" });
  });

  it("SWALLOW: a recordToolCall that throws does NOT fail the underlying tool call", async () => {
    const ctx = { ...stubCtx(), recordToolCall: async () => { throw new Error("telemetry db gone"); } };
    const r = await dispatchToolCall("sneq__advance_turn", {}, ctx);
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });

  it("a ctx without recordToolCall works unchanged (optional member)", async () => {
    const r = await dispatchToolCall("sneq__advance_turn", {}, stubCtx());
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/tools/dispatcher.test.ts`
Expected: FAIL — entries are never recorded (and TS: `recordToolCall` not on `ToolCallContext`).

- [ ] **Step 3: Instrument the dispatcher**

In `src/tools/dispatcher.ts`:
- add imports:

```ts
import { classifyOutcome } from "../core/telemetry.js";
import type { ToolCallLogEntry } from "../domain/feedback.js";
```

- add to the `ToolCallContext` interface (after `validateNarration`):

```ts
  /** Optional passive-telemetry sink. Implementations MUST be safe to fail: the dispatcher swallows. */
  recordToolCall?(entry: ToolCallLogEntry): Promise<void>;
```

- rewrite `dispatchToolCall` to wrap the existing switch (extracted verbatim into `runSwitch`) in try/finally:

```ts
export async function dispatchToolCall(name: string, rawArgs: unknown, ctx: ToolCallContext): Promise<unknown> {
  if (!(ToolNames as readonly string[]).includes(name)) {
    throw new Error(`unknown tool: ${name}`);
  }
  const toolName = name as ToolName;
  const schema = schemas[toolName];
  const args = schema.parse(rawArgs) as Record<string, unknown>;

  const started = Date.now();
  let result: unknown;
  let error: unknown;
  try {
    result = await runSwitch(toolName, args, ctx);
    return result;
  } catch (e) {
    error = e;
    throw e;
  } finally {
    const { outcome, detail } = classifyOutcome(toolName, result, error);
    const entry: ToolCallLogEntry = {
      tool: toolName,
      outcome,
      durationMs: Date.now() - started,
      ...(detail !== undefined ? { detail } : {}),
      createdAt: Date.now()
    };
    // Telemetry must never break a tool call.
    try { await ctx.recordToolCall?.(entry); } catch { /* implementations log; the dispatcher stays silent */ }
  }
}

async function runSwitch(toolName: ToolName, args: Record<string, unknown>, ctx: ToolCallContext): Promise<unknown> {
  switch (toolName) {
    // ... the existing cases, moved verbatim, unchanged ...
  }
}
```

- [ ] **Step 4: Implement `CampaignContext.recordToolCall`** (in `src/campaign.ts`, after `handleToolCall`)

Add the import:

```ts
import type { ToolCallLogEntry } from "./domain/feedback.js";
```

```ts
  /** Telemetry sink for dispatchToolCall. Best-effort turn stamp; never throws (locked: swallow). */
  async recordToolCall(entry: ToolCallLogEntry): Promise<void> {
    try {
      const latest = await this.deps.repo.latestTurn(this.id);
      await this.deps.repo.appendToolCallLog(this.id, {
        ...entry,
        ...(latest ? { turn: latest.turnNumber } : {})
      });
    } catch (err) {
      this.deps.logger.warn("tool-call telemetry write failed", { err: String(err) });
    }
  }
```

- [ ] **Step 5: Write the failing campaign-side test** (append to `test/campaign.test.ts`)

```ts
describe("CampaignContext · tool-call telemetry", () => {
  it("handleToolCall writes a turn-stamped entry into the repository", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const repository = sqliteRepository({ path: ":memory:", embeddingDim: 3 });
    const engine = new Engine({ repository, router: config, _routerDeps: deps });
    const c = await engine.createCampaign({ id: asCampaignId("tel1"), name: "x", embeddingDim: 3 });
    await c.advanceTurn("first");
    await c.handleToolCall("sneq__get_entity", { entityId: "ghost" });
    const agg = await repository.aggregateToolCalls(asCampaignId("tel1"));
    const got = agg.find(a => a.tool === "sneq__get_entity");
    expect(got?.calls).toBe(1);
    expect(got?.outcomes).toEqual({ EMPTY: 1 });
    await engine.close();
  });
});
```

Note: `sqliteRepository` is already imported in this file; telemetry for `advanceTurn` is NOT logged (in-process method call, not a tool call) — only `handleToolCall` paths dispatch.

- [ ] **Step 6: Run + commit**

Run: `pnpm vitest run test/tools/dispatcher.test.ts test/campaign.test.ts && pnpm test && pnpm typecheck`
Expected: all green (existing stubCtx tests unaffected: the new member is optional).

```bash
git add src/tools/dispatcher.ts src/campaign.ts test/tools/dispatcher.test.ts test/campaign.test.ts
git commit -m "feat(telemetry): passive tool-call capture at the dispatchToolCall chokepoint (swallow semantics)"
```

---

### Task 5: The `sneq__report_feedback` tool (schema → dispatcher → campaign)

**Files:**
- Modify: `src/tools/schemas.ts` (ToolNames 11 → 12, schema, description)
- Modify: `src/tools/dispatcher.ts` (ToolCallContext member + case)
- Modify: `src/campaign.ts` (`reportFeedback`)
- Test: `test/tools/dispatcher.test.ts` (additive + 10→11 advertised fix), `test/campaign.test.ts` (additive)

- [ ] **Step 1: Write the failing tests**

Append to `test/tools/dispatcher.test.ts`:

```ts
describe("sneq__report_feedback tool", () => {
  it("is advertised in every adapter shape (11 advertised after this feature)", () => {
    expect(ADVERTISED_TOOL_NAMES).toContain("sneq__report_feedback");
    expect(anthropicTools().map(t => t.name)).toContain("sneq__report_feedback");
  });

  it("dispatches to ctx.reportFeedback with optionals passed through", async () => {
    const calls: unknown[] = [];
    const ctx = { ...stubCtx(), reportFeedback: async (input: unknown) => { calls.push(input); return { recorded: true }; } };
    const r = await dispatchToolCall("sneq__report_feedback", {
      kind: "MISSING", body: "no temporary relations", subject: "sneq__add_constraint", severity: "MED"
    }, ctx);
    expect(r).toEqual({ recorded: true });
    expect(calls[0]).toEqual({
      kind: "MISSING", body: "no temporary relations", subject: "sneq__add_constraint", severity: "MED"
    });
  });

  it("rejects an unknown kind", async () => {
    await expect(dispatchToolCall("sneq__report_feedback", { kind: "RANT", body: "x" }, stubCtx()))
      .rejects.toThrow();
  });
});
```

In the EXISTING `"advertised tools"` describe, update the count assertion:

```ts
    expect(ADVERTISED_TOOL_NAMES).toHaveLength(11);
```

And extend `stubCtx()` with the new required member:

```ts
    validateNarration: async (_input) => ({ ok: true, extractedNames: [], issues: [] }),
    reportFeedback: async (_input) => ({ recorded: true })
```

Append to `test/campaign.test.ts`:

```ts
describe("CampaignContext · reportFeedback", () => {
  it("persists an OPEN AGENT entry with best-effort turn stamp", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const repository = sqliteRepository({ path: ":memory:", embeddingDim: 3 });
    const engine = new Engine({ repository, router: config, _routerDeps: deps });
    const c = await engine.createCampaign({ id: asCampaignId("fb1"), name: "x", embeddingDim: 3 });
    await c.advanceTurn();
    const r = await c.reportFeedback({ kind: "FRICTION", body: "resolver feels slow", severity: "LOW" });
    expect(r).toEqual({ recorded: true });
    const open = await repository.queryFeedback(asCampaignId("fb1"), { status: "OPEN" });
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ origin: "AGENT", kind: "FRICTION", severity: "LOW", createdTurn: 1 });
    await engine.close();
  });

  it("fire-and-forget: returns {recorded:false} instead of throwing when the write fails", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const repository = sqliteRepository({ path: ":memory:", embeddingDim: 3 });
    const engine = new Engine({ repository, router: config, _routerDeps: deps });
    await engine.createCampaign({ id: asCampaignId("fb2"), name: "x", embeddingDim: 3 });
    const c = engine.campaign(asCampaignId("fb2"));
    await repository.close(); // sabotage: every write now throws
    const r = await c.reportFeedback({ kind: "BROKEN", body: "x" });
    expect(r).toEqual({ recorded: false });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/tools/dispatcher.test.ts test/campaign.test.ts`
Expected: FAIL (`sneq__report_feedback` unknown, `reportFeedback` missing on context).

- [ ] **Step 3: Tool surface** — in `src/tools/schemas.ts`:

Append to `ToolNames`:

```ts
  "sneq__validate_narration",
  "sneq__report_feedback"
] as const;
```

Append to `schemas`:

```ts
  sneq__report_feedback: z.object({
    kind: z.enum(["FRICTION","MISSING","BROKEN","REFLECTION","CORRECTION","PRAISE","IDEA"]),
    body: z.string(),
    subject: z.string().optional(),
    severity: z.enum(["LOW","MED","HIGH"]).optional(),
    origin: z.enum(["AGENT","HUMAN"]).optional()
  })
```

Append to `toolDescriptions`:

```ts
  sneq__report_feedback: "Report an out-of-band issue with the SNEQ system itself: a missing capability you worked around, broken behavior, friction, or a player meta-break reflection (origin: HUMAN). NEVER shown to the player. Fire-and-forget: call it and keep narrating; it returns {recorded} and a failed write never breaks the story."
```

(`ADVERTISED_TOOL_NAMES` auto-includes it — the filter only excludes `collapse_attribute`. `Engine.tools`, `jsonSchemas`, and all adapter shapes derive. No change in `adapters.ts` / `json-schema.ts` / `engine.ts`.)

- [ ] **Step 4: Dispatcher** — in `src/tools/dispatcher.ts`:

Add the domain import:

```ts
import type { FeedbackKind } from "../domain/feedback.js";
```

Add to `ToolCallContext` (before the optional `recordToolCall?`):

```ts
  reportFeedback(input: { kind: FeedbackKind; body: string; subject?: string; severity?: "LOW" | "MED" | "HIGH"; origin?: "AGENT" | "HUMAN" }): Promise<{ recorded: boolean }>;
```

Add the case to `runSwitch` (after `sneq__validate_narration`):

```ts
    case "sneq__report_feedback":
      return ctx.reportFeedback({
        kind: args["kind"] as FeedbackKind,
        body: args["body"] as string,
        ...(args["subject"] !== undefined ? { subject: args["subject"] as string } : {}),
        ...(args["severity"] !== undefined ? { severity: args["severity"] as "LOW" | "MED" | "HIGH" } : {}),
        ...(args["origin"] !== undefined ? { origin: args["origin"] as "AGENT" | "HUMAN" } : {})
      });
```

- [ ] **Step 5: Campaign write path** — in `src/campaign.ts`:

Extend the feedback import and ids import:

```ts
import type { FeedbackEntry, FeedbackKind, ToolCallLogEntry } from "./domain/feedback.js";
import { asEntityID, asConstraintId, asFactId, asSceneId, asFeedbackId } from "./domain/ids.js";
```

Add after `recordToolCall`:

```ts
  /** Fire-and-forget (locked decision #6): swallows every failure and reports {recorded:false}.
   *  This runs mid-narration — it must never break the agent's turn. */
  async reportFeedback(input: { kind: FeedbackKind; body: string; subject?: string; severity?: "LOW" | "MED" | "HIGH"; origin?: "AGENT" | "HUMAN" }): Promise<{ recorded: boolean }> {
    try {
      await this.ensureCampaign();
      const latest = await this.deps.repo.latestTurn(this.id);
      const entry: FeedbackEntry = {
        id: asFeedbackId(`fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        origin: input.origin ?? "AGENT",
        kind: input.kind,
        body: input.body,
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.severity !== undefined ? { severity: input.severity } : {}),
        status: "OPEN",
        createdAt: Date.now(),
        ...(latest ? { createdTurn: latest.turnNumber } : {})
      };
      await this.deps.repo.appendFeedback(this.id, entry);
      return { recorded: true };
    } catch (err) {
      this.deps.logger.warn("report-feedback write failed", { err: String(err) });
      return { recorded: false };
    }
  }
```

- [ ] **Step 6: Run + commit**

Run: `pnpm test && pnpm typecheck`
Expected: all green, including the updated `toHaveLength(11)` assertion.

```bash
git add src/tools/schemas.ts src/tools/dispatcher.ts src/campaign.ts test/tools/dispatcher.test.ts test/campaign.test.ts
git commit -m "feat(tools): sneq__report_feedback — fire-and-forget agent feedback verb (ToolNames 11→12, advertised 10→11)"
```

---

### Task 6: Campaign read path — `feedbackDigest` + `triageFeedback`

**Files:**
- Modify: `src/campaign.ts`
- Modify: `src/index.ts`
- Test: `test/campaign.test.ts` (additive)

- [ ] **Step 1: Write the failing tests** (append to `test/campaign.test.ts`)

```ts
import { ADVERTISED_TOOL_NAMES } from "../src/tools/adapters.js";

describe("CampaignContext · feedbackDigest + triageFeedback", () => {
  it("digest: coverage from telemetry, neverCalled vs ADVERTISED tools, OPEN entries by default", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const repository = sqliteRepository({ path: ":memory:", embeddingDim: 3 });
    const engine = new Engine({ repository, router: config, _routerDeps: deps });
    const c = await engine.createCampaign({ id: asCampaignId("dg1"), name: "x", embeddingDim: 3 });

    await c.handleToolCall("sneq__get_entity", { entityId: "ghost" });
    await c.handleToolCall("sneq__report_feedback", { kind: "MISSING", body: "no temporary relations", subject: "sneq__add_constraint" });

    const digest = await c.feedbackDigest();
    const tools = digest.coverage.map(a => a.tool);
    expect(tools).toContain("sneq__get_entity");
    expect(tools).toContain("sneq__report_feedback");
    expect(digest.neverCalled).toContain("sneq__lookup_entity");
    expect(digest.neverCalled).not.toContain("sneq__get_entity");
    // de-advertised tool must never appear as a gap
    expect(digest.neverCalled).not.toContain("sneq__collapse_attribute");
    expect(digest.coverage.length + digest.neverCalled.length).toBe(ADVERTISED_TOOL_NAMES.length);
    expect(digest.feedback).toHaveLength(1);
    expect(digest.feedback[0]).toMatchObject({ kind: "MISSING", status: "OPEN" });
    await engine.close();
  });

  it("triage: PROMOTED entries leave the default digest, promotedTo persisted; unknown id → {updated:false}", async () => {
    const { config, deps } = makeEmbedRouter([0.5, 0.5, 0.0]);
    const repository = sqliteRepository({ path: ":memory:", embeddingDim: 3 });
    const engine = new Engine({ repository, router: config, _routerDeps: deps });
    const c = await engine.createCampaign({ id: asCampaignId("dg2"), name: "x", embeddingDim: 3 });
    await c.reportFeedback({ kind: "IDEA", body: "ship a digest" });
    const before = await c.feedbackDigest();
    const id = String(before.feedback[0]!.id);

    const r = await c.triageFeedback({ id, status: "PROMOTED", promotedTo: "https://github.com/x/y/issues/9" });
    expect(r).toEqual({ updated: true });
    expect((await c.feedbackDigest()).feedback).toHaveLength(0);
    const promoted = await c.feedbackDigest({ status: "PROMOTED" });
    expect(promoted.feedback[0]?.promotedTo).toBe("https://github.com/x/y/issues/9");

    expect(await c.triageFeedback({ id: "fb_nope", status: "DISMISSED" })).toEqual({ updated: false });
    await engine.close();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/campaign.test.ts`
Expected: FAIL (`feedbackDigest` / `triageFeedback` do not exist).

- [ ] **Step 3: Implement** — in `src/campaign.ts`:

Extend imports:

```ts
import type { FeedbackEntry, FeedbackKind, FeedbackStatus, ToolCallLogEntry } from "./domain/feedback.js";
import type { ToolCallAggregate } from "./repository/interface.js";
import { ADVERTISED_TOOL_NAMES } from "./tools/adapters.js";
```

Add the exported shape (next to `MentionResult`):

```ts
/** Operator-facing growth-loop bundle: coverage + the "never touched" gap + open entries. */
export interface FeedbackDigest {
  coverage: ToolCallAggregate[];
  /** ADVERTISED_TOOL_NAMES minus the tools seen in the telemetry log. */
  neverCalled: string[];
  feedback: FeedbackEntry[];
}
```

Add the methods after `reportFeedback`:

```ts
  /** Operator read. Default status filter: OPEN (triaged signal must not resurface — locked decision #8). */
  async feedbackDigest(filter?: { status?: FeedbackStatus; since?: number }): Promise<FeedbackDigest> {
    await this.ensureCampaign();
    const coverage = await this.deps.repo.aggregateToolCalls(this.id);
    const seen = new Set(coverage.map(a => a.tool));
    const neverCalled = ADVERTISED_TOOL_NAMES.filter(t => !seen.has(t));
    const feedback = await this.deps.repo.queryFeedback(this.id, {
      status: filter?.status ?? "OPEN",
      ...(filter?.since !== undefined ? { since: filter.since } : {})
    });
    return { coverage, neverCalled: [...neverCalled], feedback };
  }

  /** Operator-only triage (NOT an LLM tool). Errors propagate: this is a deliberate meta action. */
  async triageFeedback(input: { id: string; status: FeedbackStatus; promotedTo?: string }): Promise<{ updated: boolean }> {
    await this.ensureCampaign();
    const updated = await this.deps.repo.updateFeedbackStatus(
      this.id, asFeedbackId(input.id), input.status,
      input.promotedTo
    );
    return { updated };
  }
```

Note for `exactOptionalPropertyTypes`: `updateFeedbackStatus`'s `promotedTo?` parameter accepts an explicit `undefined` argument (optional **parameter**, not optional property) — passing `input.promotedTo` directly is fine.

In `src/index.ts`, extend the campaign export line:

```ts
export { CampaignContext, type MentionInput, type MentionResult, type RegisterFactInput, type FeedbackDigest } from "./campaign.js";
```

- [ ] **Step 4: Run + commit**

Run: `pnpm test && pnpm typecheck`
Expected: green.

```bash
git add src/campaign.ts src/index.ts test/campaign.test.ts
git commit -m "feat(campaign): feedbackDigest (coverage + neverCalled vs advertised) and operator triageFeedback"
```

---

### Task 7: CLI — 3 commands, `--status`/`--since` flags, help

**Files:**
- Modify: `src/cli/types.ts` (KNOWN_COMMANDS 15 → 18, ParsedInvocation)
- Modify: `src/cli/parse-argv.ts`
- Modify: `src/cli/run.ts`
- Modify: `src/cli/help.ts`
- Test: `test/cli/unit/feedback.test.ts` (new), `test/cli/unit/triage-feedback.test.ts` (new), `test/cli/unit/report-feedback.test.ts` (new), `test/cli/unit/parse-argv-new-commands.test.ts` (additive)

- [ ] **Step 1: Write the failing unit tests**

Create `test/cli/unit/feedback.test.ts` (same fake-stdio pattern as `prepare-turn.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";
import type { ParsedInvocation } from "../../../src/cli/types.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function inv(over: Partial<ParsedInvocation>): ParsedInvocation {
  return {
    command: "feedback", rawCommand: "feedback", db: "x.db", campaign: "c1",
    config: undefined, source: undefined, observationOverride: undefined,
    argsInline: undefined, help: false, embeddingDim: undefined, ...over
  };
}

function mkEngine(digestCalls: unknown[]): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
    campaign() {
      return {
        async feedbackDigest(filter: unknown) {
          digestCalls.push(filter);
          return { coverage: [], neverCalled: ["sneq__lookup_entity"], feedback: [] };
        }
      } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("feedback CLI", () => {
  it("emits the digest as one JSON line, default filter empty (campaign defaults to OPEN)", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(inv({}), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) });
    expect(exit).toBe(0);
    expect(io.read().neverCalled).toContain("sneq__lookup_entity");
    expect(calls[0]).toEqual({});
  });

  it("--status is case-insensitive and forwarded; --since forwarded", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(inv({ status: "promoted", since: 1234 }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) });
    expect(exit).toBe(0);
    expect(calls[0]).toEqual({ status: "PROMOTED", since: 1234 });
  });

  it("rejects an invalid --status with INVALID_ARGS", async () => {
    const io = fakeStdio();
    const exit = await run(inv({ status: "weird" }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine([]) });
    expect(exit).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
  });
});
```

Create `test/cli/unit/triage-feedback.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";
import type { ParsedInvocation } from "../../../src/cli/types.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

function inv(argsInline: unknown): ParsedInvocation {
  return {
    command: "triage-feedback", rawCommand: "triage-feedback", db: "x.db", campaign: "c1",
    config: undefined, source: undefined, observationOverride: undefined,
    argsInline, help: false, embeddingDim: undefined
  };
}

function mkEngine(calls: unknown[]): Engine {
  return {
    async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
    campaign() {
      return { async triageFeedback(input: unknown) { calls.push(input); return { updated: true }; } } as never;
    },
    async close() {}
  } as unknown as Engine;
}

describe("triage-feedback CLI", () => {
  it("forwards id, normalized status and promotedTo; prints {updated}", async () => {
    const io = fakeStdio();
    const calls: unknown[] = [];
    const exit = await run(
      inv({ id: "fb_1", status: "promoted", promotedTo: "https://github.com/x/y/issues/12" }),
      { stdin: io.stdin, stdout: io.stdout, engine: mkEngine(calls) }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ updated: true });
    expect(calls[0]).toEqual({ id: "fb_1", status: "PROMOTED", promotedTo: "https://github.com/x/y/issues/12" });
  });

  it("INVALID_ARGS when id or status is missing/bad", async () => {
    const io = fakeStdio();
    expect(await run(inv({ status: "TRIAGED" }), { stdin: io.stdin, stdout: io.stdout, engine: mkEngine([]) })).toBe(1);
    expect(io.read().code).toBe("INVALID_ARGS");
    const io2 = fakeStdio();
    expect(await run(inv({ id: "fb_1", status: "NOT_A_STATUS" }), { stdin: io2.stdin, stdout: io2.stdout, engine: mkEngine([]) })).toBe(1);
    expect(io2.read().code).toBe("INVALID_ARGS");
  });
});
```

Create `test/cli/unit/report-feedback.test.ts` (proves the default tool-command case picks it up):

```ts
import { describe, it, expect } from "vitest";
import { run } from "../../../src/cli/run.js";
import type { Engine } from "../../../src/engine.js";

function fakeStdio() {
  const chunks: string[] = [];
  const stdout = { write(s: string) { chunks.push(s); return true; } } as NodeJS.WritableStream;
  const stdin = { isTTY: true } as unknown as NodeJS.ReadableStream;
  return { stdin, stdout, read: () => JSON.parse(chunks.join("").trim()) };
}

describe("report-feedback CLI (default tool-command route)", () => {
  it("routes kebab→snake through dispatchToolCall and prints {recorded}", async () => {
    const io = fakeStdio();
    const engine = {
      async listCampaigns() { return [{ id: "c1", name: "x", createdAt: 0, embeddingDim: 0 }]; },
      campaign() {
        return { async reportFeedback() { return { recorded: true }; } } as never;
      },
      async close() {}
    } as unknown as Engine;
    const exit = await run(
      {
        command: "report-feedback", rawCommand: "report-feedback", db: "x.db", campaign: "c1",
        config: undefined, source: undefined, observationOverride: undefined,
        argsInline: { kind: "FRICTION", body: "resolver feels slow" }, help: false, embeddingDim: undefined
      },
      { stdin: io.stdin, stdout: io.stdout, engine }
    );
    expect(exit).toBe(0);
    expect(io.read()).toEqual({ recorded: true });
  });
});
```

Append to `test/cli/unit/parse-argv-new-commands.test.ts` — the file ALREADY imports `describe/it/expect` and `parseArgv`; append ONLY this block (no new import):

```ts
describe("parse-argv · feedback flags", () => {
  it("recognizes the three feedback commands", () => {
    for (const cmd of ["report-feedback", "feedback", "triage-feedback"]) {
      expect(parseArgv([cmd, "--db", "x.db", "--campaign", "c1"]).command).toBe(cmd);
    }
  });

  it("parses --status and --since", () => {
    const p = parseArgv(["feedback", "--db", "x.db", "--campaign", "c1", "--status", "open", "--since", "1234"]);
    expect(p.status).toBe("open");
    expect(p.since).toBe(1234);
  });

  it("rejects a non-integer --since", () => {
    expect(() => parseArgv(["feedback", "--since", "yesterday"])).toThrow(/INVALID_ARGS/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm vitest run test/cli/unit/`
Expected: FAIL (commands unknown, fields missing).

- [ ] **Step 3: Implement**

`src/cli/types.ts` — append to `KNOWN_COMMANDS`:

```ts
  "campaign-exists",
  "report-feedback",
  "feedback",
  "triage-feedback"
] as const;
```

Append to `ParsedInvocation` (optional — existing test literals stay valid):

```ts
  /** Convenience filter for the `feedback` command (any case; validated in run.ts). */
  status?: string;
  /** Convenience filter for the `feedback` command: epoch ms. */
  since?: number;
```

`src/cli/parse-argv.ts`:
- extend `FLAGS_WITH_VALUE` with `"--status", "--since"`;
- declare `let status: string | undefined;` and `let since: number | undefined;` next to the other locals;
- add the cases:

```ts
      case "--status": status = next; break;
      case "--since": {
        const parsed = Number(next);
        if (!Number.isInteger(parsed) || parsed < 0) {
          throw new CliError("INVALID_ARGS", `--since must be a non-negative integer (epoch ms), got: ${next}`);
        }
        since = parsed;
        break;
      }
```

- extend the return object (spread-conditional — `exactOptionalPropertyTypes` forbids explicit `undefined` on optionals):

```ts
    embeddingDim,
    ...(status !== undefined ? { status } : {}),
    ...(since !== undefined ? { since } : {})
```

`src/cli/run.ts` — add two cases BEFORE the `default` case, and update the default-case comment from "9 remaining tool commands" to "10 remaining tool commands". Add the import:

```ts
import type { FeedbackStatus } from "../domain/feedback.js";
```

```ts
    case "feedback": {
      const statusRaw = inv.status ?? (typeof args["status"] === "string" ? (args["status"] as string) : undefined);
      let status: FeedbackStatus | undefined;
      if (statusRaw !== undefined) {
        const up = statusRaw.toUpperCase();
        if (!["OPEN", "TRIAGED", "PROMOTED", "DISMISSED"].includes(up)) {
          throw new CliError("INVALID_ARGS", `--status must be one of open|triaged|promoted|dismissed, got: ${statusRaw}`);
        }
        status = up as FeedbackStatus;
      }
      const since = inv.since ?? (typeof args["since"] === "number" ? (args["since"] as number) : undefined);
      const campaign = deps.engine.campaign(campaignId);
      const digest = await campaign.feedbackDigest({
        ...(status !== undefined ? { status } : {}),
        ...(since !== undefined ? { since } : {})
      });
      deps.stdout.write(JSON.stringify(digest) + "\n");
      return 0;
    }
    case "triage-feedback": {
      const id = args["id"];
      const statusRaw = args["status"];
      const promotedTo = args["promotedTo"];
      if (typeof id !== "string" || id.length === 0) {
        throw new CliError("INVALID_ARGS", "triage-feedback requires args.id (string)");
      }
      const up = typeof statusRaw === "string" ? statusRaw.toUpperCase() : "";
      if (!["OPEN", "TRIAGED", "PROMOTED", "DISMISSED"].includes(up)) {
        throw new CliError("INVALID_ARGS", "triage-feedback requires args.status (open|triaged|promoted|dismissed)");
      }
      if (promotedTo !== undefined && typeof promotedTo !== "string") {
        throw new CliError("INVALID_ARGS", "args.promotedTo must be a string URL");
      }
      const campaign = deps.engine.campaign(campaignId);
      const result = await campaign.triageFeedback({
        id, status: up as FeedbackStatus,
        ...(promotedTo !== undefined ? { promotedTo } : {})
      });
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
```

`src/cli/help.ts` — add the three entries to `COMMAND_DESCRIPTIONS` (the `Record<CommandName, string>` type forces them):

```ts
  "report-feedback":    "Agent files out-of-band system feedback (fire-and-forget; never shown to the player)",
  "feedback":           "Operator digest: tool-call coverage, never-called tools, feedback entries (--status, --since)",
  "triage-feedback":    "Operator: set a feedback entry's status (triaged|promoted|dismissed) with optional promotedTo URL"
```

And document the two flags in `GENERAL_HELP` (after the `--embedding-dim` block):

```
  --status <s>             feedback: filter entries by status (open|triaged|promoted|dismissed; default open)
  --since <ms>             feedback: only entries with createdAt >= ms (epoch milliseconds)
```

- [ ] **Step 4: Run + commit**

Run: `pnpm test && pnpm typecheck`
Expected: green (the help unit test renders descriptions from the Record — new commands appear automatically).

```bash
git add src/cli/types.ts src/cli/parse-argv.ts src/cli/run.ts src/cli/help.ts test/cli/unit/feedback.test.ts test/cli/unit/triage-feedback.test.ts test/cli/unit/report-feedback.test.ts test/cli/unit/parse-argv-new-commands.test.ts
git commit -m "feat(cli): report-feedback / feedback / triage-feedback commands (15→18) + --status/--since flags"
```

---

### Task 8: Integration — e2e roundtrip + smoke

**Files:**
- Test: `test/cli/e2e.test.ts` (additive), `test/cli/smoke.test.ts` (additive)

- [ ] **Step 1: Write the failing e2e roundtrip** (append to `test/cli/e2e.test.ts`, reusing the file's `makeEngine`, `captureStdout`, `emptyStdin` helpers and the `parseArgv` import)

```ts
describe("CLI e2e — feedback channel roundtrip", () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(join(tmpdir(), "sneq-fbk-")); });
  afterEach(() => { rmSync(tmp, { recursive: true, force: true }); });

  it("report → digest (coverage + neverCalled + entry) → triage → filtered digests", async () => {
    const db = join(tmp, "fbk.db");
    const engine = makeEngine(db);
    const exec = async (argv: string[]) => {
      const out = captureStdout();
      const code = await run(parseArgv(argv), { stdin: emptyStdin(), stdout: out.stream, engine });
      return { code, json: JSON.parse(out.lines.join("").trim()) as Record<string, unknown> };
    };

    await exec(["init-campaign", "--db", db, "--campaign", "fbk", "--embedding-dim", "3", "--args", '{"name":"Feedback"}']);

    const rep = await exec(["report-feedback", "--db", db, "--campaign", "fbk",
      "--args", '{"kind":"MISSING","body":"no temporary relations","subject":"sneq__add_constraint","severity":"MED"}']);
    expect(rep.code).toBe(0);
    expect(rep.json).toEqual({ recorded: true });

    const digest = await exec(["feedback", "--db", db, "--campaign", "fbk", "--status", "open"]);
    expect(digest.code).toBe(0);
    const coverage = digest.json["coverage"] as Array<{ tool: string }>;
    expect(coverage.map(c => c.tool)).toContain("sneq__report_feedback");
    expect(digest.json["neverCalled"]).toContain("sneq__lookup_entity");
    const entries = digest.json["feedback"] as Array<{ id: string; kind: string }>;
    expect(entries).toHaveLength(1);
    expect(entries[0]!.kind).toBe("MISSING");

    const triage = await exec(["triage-feedback", "--db", db, "--campaign", "fbk",
      "--args", JSON.stringify({ id: entries[0]!.id, status: "PROMOTED", promotedTo: "https://github.com/JeanDes-Code/sneq-narrative-system/issues/1" })]);
    expect(triage.json).toEqual({ updated: true });

    const open = await exec(["feedback", "--db", db, "--campaign", "fbk"]);
    expect(open.json["feedback"]).toEqual([]);

    const promoted = await exec(["feedback", "--db", db, "--campaign", "fbk", "--status", "promoted"]);
    expect((promoted.json["feedback"] as Array<{ promotedTo?: string }>)[0]?.promotedTo)
      .toBe("https://github.com/JeanDes-Code/sneq-narrative-system/issues/1");
    await engine.close();
  });
});
```

- [ ] **Step 2: Smoke** (append one test inside the existing `describe` of `test/cli/smoke.test.ts`)

```ts
  it("--help lists the feedback commands", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toMatch(/report-feedback/);
    expect(stdout).toMatch(/triage-feedback/);
    expect(stdout).toMatch(/--status/);
  });
```

- [ ] **Step 3: Run (build first — smoke runs the built binary) + commit**

Run: `pnpm build && pnpm test && pnpm typecheck`
Expected: green.

```bash
git add test/cli/e2e.test.ts test/cli/smoke.test.ts
git commit -m "test(cli): feedback-channel e2e roundtrip + smoke coverage"
```

---

### Task 9: The human path — issue templates, README, skill doc

No code. The "documented way for any consumer" half of the gap.

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug-report.yml`
- Create: `.github/ISSUE_TEMPLATE/feedback.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Modify: `README.md`
- Modify: `skills/sneq-narrative-engine.md`

- [ ] **Step 1: Issue templates**

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: true
```

`.github/ISSUE_TEMPLATE/bug-report.yml`:

```yaml
name: Bug report
description: Something in sneq-engine is broken
title: "[bug] "
labels: ["bug"]
body:
  - type: input
    id: version
    attributes:
      label: Version
      description: Output of `npm ls sneq-engine`, or the version in your lockfile
      placeholder: sneq-engine@0.1.0
    validations:
      required: true
  - type: dropdown
    id: adapter
    attributes:
      label: Repository adapter
      options:
        - sqlite
        - memory
        - json
        - not sure / N/A
    validations:
      required: true
  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
      description: Smallest CLI invocation or code snippet that shows the problem
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected vs observed
    validations:
      required: true
```

`.github/ISSUE_TEMPLATE/feedback.yml` (the `kind` dropdown mirrors the engine's `FeedbackKind` taxonomy):

```yaml
name: Feedback
description: Friction, missing capability, or an idea — reviews welcome too
title: "[feedback] "
labels: ["feedback"]
body:
  - type: dropdown
    id: kind
    attributes:
      label: Kind
      description: Same taxonomy the engine uses internally
      options:
        - friction
        - missing
        - broken
        - idea
    validations:
      required: true
  - type: input
    id: subject
    attributes:
      label: Subject
      description: Tool or subsystem if you can point at one (e.g. sneq__add_constraint, CLI, resolver)
    validations:
      required: false
  - type: textarea
    id: body
    attributes:
      label: What happened, and what did you expect?
      description: Tell the friction as you hit it. Workarounds you used are gold.
    validations:
      required: true
```

Create the `feedback` label so the template can apply it (idempotent):

```bash
gh label create feedback --color FBCA04 --description "Friction, missing capability, or idea from a consumer" || true
```

- [ ] **Step 2: README section**

In `README.md`, add after the Install section:

```markdown
## Feedback

Two channels, depending on who you are:

**You are a human** (integrating the package, running the CLI): open a GitHub issue — the
[feedback template](.github/ISSUE_TEMPLATE/feedback.yml) for frictions / missing capabilities / ideas,
the [bug template](.github/ISSUE_TEMPLATE/bug-report.yml) for broken behavior. Blank issues are fine too.

**You operate an AI agent that consumes the engine**: the engine has an in-band channel.
The agent calls `sneq__report_feedback` (fire-and-forget, never shown to the player) whenever it works
around a missing capability or hits friction; every tool call is also passively logged with an outcome
(`OK` / `EMPTY` / `NO_MATCH` / `CONTRADICTION` / `ERROR`). You read the accumulated signal with:

```bash
sneq-engine feedback --db ./campaign.db --campaign my-campaign --status open
```

The digest bundles per-tool coverage, the list of advertised tools **never called** (the gap the agent
will never self-report), and the open feedback entries. Triage what matters
(`sneq-engine triage-feedback --args '{"id":"fb_…","status":"PROMOTED","promotedTo":"<issue url>"}'`)
and promote the real ones into GitHub issues — promotion is always a human decision, never automatic.
```

- [ ] **Step 3: Skill doc** (`skills/sneq-narrative-engine.md`)

Add a new subsection after "Scene / turn tools":

```markdown
### Feedback tool (out-of-band)

- **`sneq__report_feedback({ kind, body, subject?, severity?, origin? })`** — Report a problem with the SNEQ *system itself*, not the story: a capability you needed and worked around (`kind: "MISSING"`), broken behavior (`"BROKEN"`), friction (`"FRICTION"`), or an idea (`"IDEA"`). When the player gives meta-break reflections about the experience, relay them with `origin: "HUMAN"` and `kind: "REFLECTION" | "CORRECTION" | "PRAISE"`. Fire-and-forget: it returns `{ recorded }` — never block on it, never retry it, and **never mention it to the player**. This is how the engine grows: unreported workarounds are invisible to its maintainers.
```

And add one bullet to "Failure modes you handle":

```markdown
- **You worked around a missing engine capability:** file it with `sneq__report_feedback` (`kind: "MISSING"`, `subject` = the closest tool name) the moment you notice, then keep narrating. Silent workarounds starve the engine's growth loop.
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm test` (no code touched — safety net) and validate the YAML parses: `node -e "const yaml=require('node:fs').readFileSync('.github/ISSUE_TEMPLATE/feedback.yml','utf8'); console.log('bytes:', yaml.length)"` (GitHub validates server-side; eyeball indentation).

```bash
git add .github/ README.md skills/sneq-narrative-engine.md
git commit -m "docs: consumer feedback paths — GitHub issue templates, README section, skill guidance"
```

---

### Task 10: Docs regen, full verification, PR

**Files:**
- Modify: `docs/api.md` (generated)

- [ ] **Step 1: Regenerate API docs**

`pnpm docs` silently no-ops on this machine — use the direct invocation:

Run: `npx typedoc && node scripts/build-api-md.mjs`
Expected: `docs/api.md` updated (new types + tool). `docs/typedoc/` is gitignored; only `docs/api.md` gets committed.

- [ ] **Step 2: Full verification (superpowers:verification-before-completion)**

```bash
pnpm test && pnpm typecheck && pnpm build
```

Expected: full suite green (235 pre-existing + the new tests), tsc strict clean, build OK.

Pack-smoke (the npm artifact actually works):

```bash
npm pack
PKG_TGZ="$(pwd)/$(ls sneq-engine-*.tgz | tail -1)"
TMPD=$(mktemp -d) && cd "$TMPD" && npm init -y >/dev/null && npm i "$PKG_TGZ" >/dev/null
node --input-type=module -e "import('sneq-engine').then(m => console.log('import ok:', typeof m.Engine, '| report_feedback advertised:', m.ADVERTISED_TOOL_NAMES.includes('sneq__report_feedback')))"
npx sneq-engine --help | grep -E "report-feedback|triage-feedback"
cd - && rm -rf "$TMPD" sneq-engine-*.tgz
```

Expected: `import ok: function | report_feedback advertised: true` + the two commands listed.

Privacy grep (MUST be empty before push):

```bash
git grep -riE "([a]nya|[s]ang.?artemis|[t]amriel|[l]eeloo|[v]eill|[f]able-test|[j]eandesauw)" -- . ':!node_modules'
```

- [ ] **Step 3: Commit docs, push, open the PR**

```bash
git add docs/api.md
git commit -m "docs: regenerate api.md (feedback channel surface)"
git push -u origin feat/feedback-channel
gh pr create --title "feat: consumer feedback channel — report-feedback verb, passive telemetry, digest/triage, issue templates" --body "$(cat <<'EOF'
Implements capacities 2+3 of the meta-layer spec + the human feedback path.
Spec: docs/superpowers/specs/2026-06-10-sneq-feedback-channel-scope-design.md

- `sneq__report_feedback` LLM tool (fire-and-forget, never shown to the player) — ToolNames 11→12, advertised 10→11
- Passive tool-call telemetry at the dispatchToolCall chokepoint (classified outcomes, swallow semantics, no PII)
- `feedback` digest (coverage + neverCalled vs ADVERTISED + open entries) and operator `triage-feedback` — CLI 15→18
- 5 new Repository methods in all 3 adapters under the shared contract suite; SQLite migration v3 (2 tables)
- `.github` issue templates (bug + feedback aligned on the FeedbackKind taxonomy), README Feedback section, skill guidance
- Zero breaking change; capacity 1 (CanonDirective) intentionally deferred

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**STOP — do not merge.** Jean reviews the PR and gives an explicit OK. Post-merge (separate step, by his call): bump `0.2.0` in `package.json` + `SNEQ_ENGINE_VERSION` in `src/index.ts`, then `! npm publish` (his OTP).

---

## Self-review notes

- **Spec coverage:** scope-spec §1 (cap 2 → Tasks 5/6/7, cap 3 → Tasks 3/4, human path → Task 9); §2 deltas all encoded (12 tools Task 5, 18 commands Task 7, advertised auto Task 5, neverCalled-vs-advertised Task 6, 3 adapters Task 2, 2-table migration Task 2, 1 dispatcher case Task 5, prepare-turn untouched — no task touches it); §4 testing layout → Tasks 1-8 (contract replaces sqlite-only, the three key tests: swallow Task 4, neverCalled Task 6, no-PII Task 3); §5 workflow → Task 10.
- **Type consistency:** `FeedbackStatus` import in run.ts (Task 7) matches domain (Task 1); `ToolCallAggregate` defined once in interface.ts (Task 2), consumed by campaign (Task 6); `reportFeedback` signature identical in ToolCallContext (Task 5) and CampaignContext (Task 5).
- **Known fallout encoded:** stubCtx gains `reportFeedback` (Task 5), `ADVERTISED_TOOL_NAMES` length assertion 10→11 (Task 5), default-case comment 9→10 (Task 7).
