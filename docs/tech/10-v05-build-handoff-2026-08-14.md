# v0.4 build hand-off — the ordered plan for 0.5.0

**Status: hand-off plan of record** — the deliverable of wayfinder map [#10](https://github.com/JeanDes-Code/sneq-narrative-system/issues/10), decided with Jean 2026-08-14 ([#16](https://github.com/JeanDes-Code/sneq-narrative-system/issues/16)). The design source is the spec of record (`9-sneq-v04-stratified-knowledge-spec-2026-08-06.md`); this document orders its build. Every design question the spec left open was adjudicated on the map (fourteen closed tickets); the spec body carries each ruling.

## Ground rules

- **One release: 0.5.0** (#30). `0.4` is an internal milestone. Slices order by dependency alone — no slice needs to be releasable, and there is no migration window (no alias, no dual path, single-step migrations).
- **Ship criterion**: Jean can run a real campaign with it. Not green tests.
- **§12.2/§12.3/§12.4 are critical path**, not polish. Rule: a tool description changes in the same PR as the tool it describes.
- **0.3.1's tag + npm publish are independent** of this plan and must not be scheduled behind it.
- **Executors**: each slice is handed to a Claude Code build session; Jean gates every merge. Consumer-side items (below) are named, budgeted, and not sliced here.

## The five slices

Coarse slicing decided with Jean (#16): five PRs, each gated by named tests. §7's suite runs green from day one (verified baseline, 324 tests) — every gate extends a running suite.

### Slice 1 — Foundation: types, contract, fold

The domain as decided, the storage that holds it, and the projection that reads it.

- §2 types: `EventAct.sets` (#27), `surfaceTokens` (#25), `Holder.realmId` + realm-as-entity (#26), `Carriage` with engine-stamped realm snapshots (#26), `Observation` without `fiabilite` (#18), `DispatchPolicy` (#15), invention lifecycle + constraint `QUARANTINED` status (#23), explicit `add_constraint` role/source (#19).
- §5.4 repository contract + all three in-tree adapters: the append/list methods, `getDispatchPolicy` (#15), `recordOperation`/`findOperation` with bounded retention (#29), clock get/set.
- The projection fold (#27): deterministic, three producers, intra-commit `SneqContradictionError`.

**Gates**: §7.1 in full (ledger append-only, replace-on-key, **no event-mutation path exists**, round-trip, reopen-identical) + `rebuild(ledger) === projection`.

### Slice 2 — Migration: v3→v4 and JSON v1→v2

Depends on slice 1 — the fold is the migration tool.

- `figed` → `canonical_attributes` copy as `LEGACY_FACT`.
- Per-entity day-0 `LEGACY_CANON` event synthesis (#17): attributes as `sets`, gravity 0, `WITNESSED` by default group + player.
- Persisted `observation` blob rewrite dropping `fiabilite` (#18); CLI presets rewritten.
- Constraint value-type coherence audit (#23): required, findings flagged in the migration report, never auto-fixed or deleted.
- `MemoryState`/`PersistedShape` version bump with v1 loader.

**Gate**: the migration test (§7's missing-five) — migrate a 0.3 fixture, assert canon identical, beliefs non-empty, audit report emitted.

### Slice 3 — Knowledge: beliefs, containment, promotion

The perspective seam's engine room. Internally parallelizable after slice 1; slice 2 only feeds its fixtures.

- `derive-beliefs`: the arrival matrix, realm halt with default-realm fallback (#26), `minStanding`, effects (DELAY/CANCEL/DISCREDIT), `WITNESSED` from participation.
- The #21 resolution cascade with lazy auto-`PARTICIPANT` derogation (#28); `PERSONAL_STAKE` stays authored.
- Containment (#25): engine token floor, commit-time token validation, `forbiddenTokensFor`/`checkContainment` ported, `assertContainment` with throw posture (§11 D).
- Promotion lifecycle (§2.6): uptake by known-token substring search (#25), evidence kinds, silent `REJECTED` by canon, `SUPERSEDED`, constraint consult with quarantine (#23) — `validateValue`'s first readers (#19).

**Gates**: §7.2 (fixture ≥ 2 realms ≥ 3 strata), §7.3 (the toll-keeper test), §7.4 (the lifecycle).

### Slice 4 — The write and the world: `commit_narrative` and `tick`

The single write as decided, and the call that runs the world. Depends on slices 1–3.

- `commit_narrative`: required `daysElapsed` (#20), additive `policy.routes[]/rules[]` (#15), `holders[]`, GM_NARRATION routing to provisional, `OUT_OF_BAND` sanctioned source (#22), engine-side idempotency by `operationId` (#29), fan-out cap `maxDispatchFanout` default 64 with near-first truncation (#15).
- `tick({ days })` (§11 H): arrivals, policy dispatch, belief-cache invalidation, salience decay.
- The §6 counters: uncovered, unroutable, frozen-clock (#15/#20), plus the §6.2/§6.3 instrumentation at the commit boundary.

**Gates**: §7.5 (one bundle or nothing; retry idempotent against the built mechanism) + the DispatchPolicy test (missing-five).

### Slice 5 — Surface: APIs, tools, CLI, doctor, skill file

Everything an agent or host touches, with its honest description in the same PR.

- §11 A/C/F: `ingestPlayerInput` (closes the promotion-evidence ingress hole), `filterTranscript`, blocking `gateNarration` (new `ValidationReport` shape).
- Tools (§5.2, stays at ten): `get_holder_context { holderId | entityId }` with cascade + named resolution (#21), `commit_narrative`, changed `get_entity`/`advance_turn`/`add_constraint`/`validate_narration`.
- CLI (§5.3, 17 commands): optional `--holder`/`--entity` on `prepare-turn` (holderless = the frame), the typed three-state null doctrine (#21), `show`/`set-dispatch-policy` (#15), provenance flags surviving onto `commit-narrative` (#18/#22).
- §12.2 tool descriptions (with their tools), §12.4 `doctor` complete (including the four 2026-08-14 lines), §12.3 repo skill file rewritten, UPGRADING/README counts, `docs/api.md` regenerated.

**Gates**: `doctor` green on a migrated fixture campaign + the §11 containment assertion over a composed payload.

## Consumer-side (budgeted, not sliced here)

- **grimoire migration** — its repo, against the #13 contract (seven tables + `commitNarrativeAtomic`; fix the `prepareTurn` leak, not a tool).
- **`rpg-mj-knowledge` skill files** — the MJ's real operating manual; ~⅓ invalidated by `register-fact` → `commit-narrative` alone. **Preceded by the Leeloo grep** of the old `references/sneq-integration.md` (re-homed from #19). Targets the raw `sneq-engine` invocation form — no wrapper exists since 2026-05-25. Executor: Jean + Leeloo.
- **Consumer GDD rewrites** (Hermes-Agent) against the 0.4 contract — event → carriage → belief, never GCN propagation.

## Not in this plan

- 0.3.1 tag + npm publish (independent, Jean's call, ships first).
- 1.0 promotion / play validation (§9) — earned by a migrated grimoire campaign after 0.5.0.
- §10's untouched surfaces (entity resolution, router/providers, resolver thresholds).
