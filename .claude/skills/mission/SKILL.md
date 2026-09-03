---
name: mission
description: Run a long, multi-session mission in this repo. A meta-session holds the objective, dispatches focused agents, keeps its memory on disk, and survives its own context dying. Use for a batch of issues that ends in a merge on main or in a release, or for work resumed from a previous run.
---

Read `./PROTOCOL.md` first, then apply what follows.

## Where mission state lives

`.claude-runs/missions/`, resolved through `git rev-parse --git-common-dir` so a run started from a
worktree writes to the main clone:

```bash
MISSIONS="$(dirname "$(git rev-parse --git-common-dir)")/.claude-runs/missions"
```

The repo's `.gitignore` had no generic scratch directory: `dist/`, `build/`, `out/` and
`coverage/` are build outputs, `docs/typedoc/` is the TypeDoc source of `docs/api.md`. So
`.claude-runs/` was added to `.gitignore` on the day this skill was installed (2026-09-03), the
same directory four other repos use. Missions must not write anywhere else in the tree except
`docs/tech/`, which is where hand-off documents live.

## Extra boot steps

Before the first dispatch:

1. **Read `CLAUDE.md`**, then the latest hand-off in `docs/tech/` (the highest-numbered file). Section
   numbers cited in code comments (§5.1, §7.2, §11) refer to `docs/tech/9-*.md`, the design of
   record. Every hand-off names the commit its line numbers come from. Read at that commit or
   re-locate by symbol.
2. **Read the open issues**: `gh issue list --state open`. An issue is the unit of work here. An
   issue's claims about the code are claims; verify them against `main` before briefing anyone.
3. **Baseline once**: `pnpm install --frozen-lockfile` if `node_modules/` is missing, then
   `pnpm test && pnpm typecheck`. A red baseline is a finding, not a starting point.
4. **Declare the closing gate in `MISSION.md`**, one of two words. `merge`: the mission ends when
   its last PR is merged on `main` with CI green. `release`: it ends when the version is on npm.
   A release is usually the last of several missions, and sometimes the only one. The gate is
   named at boot so nobody argues about it at close.

## Protected vocabulary

### Amends: Talking to the human, who sees NONE of the sub-agent work

The plain-word rule stands, with one narrowing: the names below are defined in the design of
record and in `skills/sneq-narrative-engine.md`, and are never paraphrased. `holder`, `carriage`,
`ledger`, `belief`, `invention`, `promotion`, `uptake`, `containment`, `standing`, `gravity`,
`salience`, `dispatch`, `derogation`, `canon`, `doctor`, `operationId`, the ten tool names
(`commit_narrative`, `get_holder_context`, `mention_entity` and the rest), the 18 CLI commands,
and the v1 identifiers kept in French (`PERSONNAGE`, `Potentialite`, `GCN`, `nomConnu`). Say
"the single write" only when it is `commit_narrative`.

## ID prefixes

An issue keeps GitHub's own number (`#52`). Prefixes are for questions and findings raised inside
a mission, by the area of the engine they touch:

| Prefix | Area |
|---|---|
| `LEDGER` | events, records, carriages, beliefs, the projection fold (`src/core/derive-beliefs.ts`, `projection.ts`, `tick.ts`) |
| `SEAM` | holder context, containment, promotion, invention tokens (`holder-context.ts`, `containment.ts`, `promotion.ts`) |
| `RESOLVE` | the resolver cascade and the judge (`src/resolver/`) |
| `ROUTER` | tiers, providers, retry (`src/router/`) |
| `SURFACE` | tool schemas, dispatcher, CLI, the agent skill file (`src/tools/`, `src/cli/`, `skills/`) |
| `STORE` | the repository contract and its three adapters (`src/repository/`) |
| `DOCS` | `README.md`, `UPGRADING.md`, `CHANGELOG.md`, `docs/api.md`, `docs/tech/` |
| `REL` | version, tag, npm, GitHub release |

## Gates

Human-gated, per action, never batched:

- **Merging on `main`.** The owner merges every PR. `main` has no branch protection; the habit is
  the protection.
- **Tagging.** A tag means "this commit is a release".
- **Publishing to npm** and **creating a GitHub release.** The owner does both by hand.
- **Any write to GitHub other than a feature branch and its PR**: creating, closing or commenting
  on an issue, editing someone else's PR. The repo is public; an issue is an outward message.
- **Declaring the mission's gate reached.** `merge` is proven by `gh pr view <n> --json mergedAt`.
  `release` is proven by `npm view sneq-engine version` reading back the new version.

Not gated: branching from `main`, pushing a feature branch, opening a PR that cites its issue,
running the suite, regenerating `docs/api.md`, writing under `docs/tech/`.

## Tool surface

Discover it from `MISSION.md § Tool surface`; this is the standing baseline.

| Tool | Command | Note |
|---|---|---|
| unit tests | `pnpm test` | excludes `test/integration/**`; needs `pnpm build` first, since `test/cli/smoke.test.ts` runs `dist/cli.js` |
| one file, one test | `pnpm vitest run test/core/x.test.ts`, `pnpm vitest run -t "name"` | |
| typecheck | `pnpm typecheck` | the only lint; strict flags in `tsconfig.json` |
| build | `pnpm build` | cleans `dist/` first |
| API docs | `pnpm docs:build` | regenerates `docs/api.md`; CI fails on a stale diff. Not `pnpm docs` |
| integration smoke | `SNEQ_INTEGRATION_SMOKE=1 pnpm test` | needs `DEEPSEEK_API_KEY`, `GOOGLE_GENAI_API_KEY` or `ANTHROPIC_API_KEY` in the environment. Skipped by default, so a green `pnpm test` has never talked to a provider |
| the CLI | `node dist/cli.js <command> --db ./tmp.db --campaign <id>` | after `pnpm build`; `*.db` is gitignored |
| GitHub | `gh issue`, `gh pr`, `gh pr checks` | authenticated as the owner |
| npm | `npm view sneq-engine version` | read only; publishing is the owner's |

## Play: land an issue

The recurring procedure. A mission is a list of these, then its declared gate.

1. **Read the issue whole**, then check its claims against the code at current `main`. Line numbers
   drift; the text may describe a fix already landed. Hand the executor the contradiction when
   there is one, never a conclusion.
2. **Branch from fresh `main`** with the repo's prefixes: `feat/`, `fix/`, `docs/`, `chore/`,
   `release/`, then a slug.
3. **Dispatch one executor** with a brief that carries, in this order: "confirm this diagnosis
   yourself before changing anything; if the real cause is different, say so and stop"; the test
   that fails first; the change; the comment or doc line that made the false claim, fixed in the
   same diff; a `CHANGELOG.md` entry when behaviour changes; `skills/sneq-narrative-engine.md`
   when a tool's meaning changes; `pnpm test`, `pnpm typecheck` and `pnpm docs:build` all green,
   with `docs/api.md` committed if it moved.
4. **La Justice reviews the diff against the issue text.** Flags only. A finding that names a
   comment asserting a property goes back to the executor with the predicate to read.
5. **Push, open the PR citing the issue** (`Closes #NN` in the body), wait for CI on Node 20 and
   22. Read `gh pr checks <n>` back; never infer a green run from a clean local one.
6. **The owner merges.** Then rewrite `STATE.md`.

When the mission's gate is `release`, after the last issue is merged: summon Le Chariot (the
`chariot` agent). It prepares the version bump in `package.json` and `SNEQ_ENGINE_VERSION` in
`src/index.ts` (`test/smoke.test.ts` pins both), the `CHANGELOG.md` heading, the `UPGRADING.md`
section, a fresh `docs/api.md`, and a `release/vX.Y.Z-prep` PR. The owner merges, tags, publishes.
The mission closes when npm reads back the version.

## Cheap checks here

- `git log --oneline -5` and `git status --short`: what is committed, what is not.
- `gh issue list --state open` and `gh pr list`: the units and their state.
- `gh pr checks <n>`: CI on both Node versions, read back, not inferred.
- `pnpm docs:build && git diff --stat -- docs/api.md`: the public API is documented, or it is not.
- `grep -c '^export' src/index.ts`: the export count moved, or a new symbol is not public.
- `npm view sneq-engine version` next to `jq .version package.json`: what is published versus what
  is on `main`.
- `node -e "import('./dist/index.js').then(m => console.log(m.SNEQ_ENGINE_VERSION))"` after a build.

## Loops

*Empty. No builder/critic loop runs in this repo today. When one does, name the medium, the bound
it runs under, and where its rounds write.*

## Reviewers

- **CI on Node 20 and 22** is a reviewer. Its typecheck, build, test and `docs/api.md` diff are read
  back per PR.
- **La Justice** (the `justice` agent) is mandatory before a PR leaves draft, and whenever the diff
  touches `src/core/`, `src/tools/schemas.ts`, `src/repository/interface.ts`, an error class, or
  any comment that claims a guard exists.
- **La Mort** (the `mort` agent) before La Justice when the diff adds comments or leaves
  commented-out code.
- **Le Diable** (the `diable` agent) when the diff touches how provider keys are read, `--config`
  loading, or the CLI's parsing of `--args` and stdin.
- **Le Mat** (the `mat` agent) when a CLI command or a tool's contract changed: drive it the way an
  agent would, from the skill file alone, against a temp `.db`.
- **Le Chariot** (the `chariot` agent) for every release.

## Where a durable lesson goes

- A rule an agent using the engine must follow: `skills/sneq-narrative-engine.md`, which ships in
  the npm package and is what consumers' agents read. `UPGRADING.md` when the rule changed between
  versions.
- A rule a developer of the engine must follow: `CLAUDE.md`.
- A misuse that a campaign's state can reveal: a `doctor` check in `src/core/doctor.ts`, which
  names the corrective call.
- Deferred work: a GitHub issue that cites `file:line` at a named commit.
- A hand-off for a session with no context: `docs/tech/<n>-<slug>-<date>.md`, numbered after the
  last one.
- An Arcane lesson: `/apprends <slug> <lesson>`.
- A procedural lesson about missions: this file, dated, under `## Patina`.

## What lies here

Six signals mean less than they look like they mean. All six have happened.

- **A comment that asserts a guard.** The comment above the promotion-evidence filter said a caller
  could not fake `PLAYER_UPTAKE`. Issue #46 and its review both cited the comment as fact. The
  filter never read `kind` (#52). A comment that claims a property is a claim; read the predicate,
  and when a finding names such a comment, fix the comment in the same diff as the code.
- **`pnpm docs` exits 0 and does nothing.** It is npm's own command. The script is `docs:build`.
  `docs/api.md` went stale for weeks behind a documented command that passed. CI now fails on the
  diff, so `main` cannot carry it; a local run still can.
- **Line numbers in issues and hand-offs drift.** #52's own text moved from lines 220 to 283
  between filing and reading. Hand-offs name their commit for this reason. Re-locate by symbol.
- **Green tests say nothing about the public API.** A symbol not re-exported from `src/index.ts`
  is invisible to TypeDoc and to every consumer, and 554 tests pass around it. The `docs/api.md`
  diff is the check.
- **A documented guarantee, on npm, that did not exist.** The README promised `operationId`
  idempotency; the engine ignored the field (#29). A guarantee is proven by a test named after it,
  never by the sentence that documents it.
- **A consumer that uses the library is not a consumer that uses it correctly.** Feedback arrives
  from an agent running a campaign, as an issue or as text the owner relays. Some of it describes
  a case the engine already covers, reached through a tool the agent did not call. When that is
  the diagnosis, the defect is discoverability, not the engine: fix `skills/sneq-narrative-engine.md`
  first, `UPGRADING.md` if a version moved the call, and add a `doctor` check when the campaign's
  state can show the misuse. Do not add engine behaviour to compensate for a call the agent should
  have made.

## Neighbouring rules

A mission does not overrule what already governs this repo. Precedence, highest first:

1. **The repo's `CLAUDE.md`**: the three layers and their direction (`domain`, then `core` which is pure, then
   `atomic` which executes), the ledger is append-only, beliefs are never stored, the model must not
   write effects, every public symbol goes through `src/index.ts`, `docs/api.md` is regenerated
   and committed when the API moves.
2. **The design of record**, `docs/tech/9-*.md`, and the latest hand-off in `docs/tech/`. A code
   comment citing a § cites that file.
3. **The Arcanes' protocol** from the owner's global setup: the architect (`empereur`) before code
   that crosses a layer or changes a data shape, the reviewer (`justice`) before a PR leaves
   draft, human gates on every outward action.
4. **`PROTOCOL.md`**, the shared mission protocol.
5. **This delta**, except where it declares `### Amends:` above.

## Amendments

See `### Amends:` under Protected vocabulary. Nothing else yet.

## Patina

- 2026-09-03 — First run, #52, gate `merge`. The session had started in the parent directory, not
  in the repo, so this skill and its hooks never loaded. The meta-session read the two files by hand
  and kept the guard's discipline itself. Start a mission session inside the repo.
- 2026-09-03 — `better-sqlite3@11` has no prebuilt binary for Node 26 and its source does not compile
  against it, so `pnpm install` fails on a machine whose default Node is newer than 22. CI runs 20
  and 22; the local baseline must run under one of those too (mise or nvm, and pnpm under that
  Node, not the standalone binary).
- 2026-09-03 — The issue's own fix snippet did not compile: it read `e.kind` where the element is
  `{ inventionId, evidence: { kind } }`. Code in an issue is a claim like its prose. The brief
  handed the executor the contradiction, and the executor settled it before writing.
