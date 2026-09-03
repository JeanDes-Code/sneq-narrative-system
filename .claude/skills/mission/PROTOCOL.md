<!-- vendored from jean-ai-os/protocols/MISSION-PROTOCOL.md @ 0995540 le 2026-09-03
     Généré. Ne pas éditer ici : la prochaine re-vendorisation écrase. Voir § Self-improvement. -->
# Mission protocol

What every `/mission` skill does the same way, in any repo, on any harness.

A meta-session is not a task session. It is the peer of the human running the mission: it holds the
global context, dispatches focused agents that each need only their small slice, and treats its own
context window as mortal. Its memory lives on disk, not in the conversation.

## How this file is used

`/mission-init` **vendors a copy** of this file into a repo at
`<repo>/.claude/skills/mission/PROTOCOL.md`, stamped in an HTML comment with the source and the
commit it was taken from. It vendors the state guard the same way, `mission-hooks/state-guard.sh`
into `<repo>/.claude/skills/mission/hooks/`, and wires it into `<repo>/.claude/settings.json`
(see § The state guard). That stamp is the only place a reader learns where the original lives. Beside it sits
`SKILL.md`, the repo's delta, whose first line reads *"Read ./PROTOCOL.md first, then apply what
follows."*

A copy, not a pointer: these skills are committed, and a path into someone's home directory is a dead
link for every teammate who clones the repo. The cost is that a copy drifts. The mitigation is that
the drift is **detectable** — `missions/scan-missions.sh` compares each stamp against this file and
reports mismatches.

**Edit a shared rule here, never in one repo's delta.** A rule fixed in one copy is a rule still
broken in the other three.

## The four kinds of content, and the test for each

- **Rule** — true in any repo, on any harness. Lives here, whole.
  *Test: would this still be true in a repo that does not exist yet?*
- **Slot** — this file asks the question, the repo answers it. Marked `SLOT` below.
  *Test: does the content change from repo to repo while the heading stays?*
- **Patina** — a dated incident. Lives in the repo where it happened, under `## Patina`. This file
  keeps an incident only when it could have happened anywhere, and only stripped of its repo.
  *Test: could this have happened in a repo you have never seen?*
- **Amendment** — a delta line that narrows or overrides a rule here. Legal, and it must say so out
  loud: `### Amends: <exact heading from PROTOCOL.md>`. Silent contradiction is how skills drift
  apart without anyone deciding they should.

## This protocol never names the human

"The human", "the product owner", "the owner". Never a personal name, never a personal detail.

These `SKILL.md` files are tracked in shared remotes, at least one of them a company repo that
colleagues read. The neutral register is not a style preference — it is the reason a copy of this
file can sit in a repo you do not own.

---

# SLOT — Where mission state lives

*The repo answers: which directory, why that one, and how it is resolved.*

Every answer so far has been a directory the repo's own `.gitignore` already covered, resolved
through `git rev-parse --git-common-dir` so that running from a worktree cannot fork the state onto a
directory that gets deleted next week.

The tradeoff, whatever directory is chosen: inside the clone, a teammate finds mission state with
`ls` and no convention to learn; gitignored, the working memory — in-flight branch names, unanswered
questions, half-verified claims — never becomes a committed record, a merge conflict, or review
noise. The cost is that it is per-clone. It does not follow you to another machine.

**Shape, and this part is not a slot.** The global scanner reads these and nothing else:

```
<missions root>/INDEX.md
<missions root>/<slug>/MISSION.md     ← must carry an `Opened <YYYY-MM-DD>` line in its first 8 lines
<missions root>/<slug>/STATE.md       ← its mtime IS the mission's heartbeat
<missions root>/archive/<slug>/       ← where a closed mission goes
```

The `Opened` line is the one field two modules share: this protocol says to write it, the scanner
reads it. Change it here and mission dates stop being detected globally. A mission without one still
runs; it surfaces under `## Problèmes` in the global view instead of vanishing.

# Boot procedure (every `/mission` invocation)

1. Resolve the missions dir. Create it if missing. Read `INDEX.md`.
2. **Active mission, no new objective** → read its `MISSION.md` + `STATE.md`, confirm resumption in
   ≤3 lines (mission name, last update, next unit), and continue. The state guard already printed
   both files at session start when a mission was active; that printout names the mission you
   resume, and a slug that has an `INDEX.md` line never gets a second one. Re-verify everything under "In
   flight" — dispatches die with their session. Trust "Done".
3. **An objective given as argument** → if a mission is active, ask whether to archive it or run
   both; else create the folder, write `MISSION.md` (objective, hard dates, verified facts only, tool
   surface, standing decisions) plus a first `STATE.md`, and add the `INDEX.md` line.
4. **No active mission, no argument** → ask for the objective. One question, not a form.

**SLOT — extra boot steps.** *The repo answers: is there anything to check before the first dispatch
that only applies here?* Leave empty when there is nothing.

# The state guard: the harness refuses to end a turn on stale state

`STATE.md` is the only thing a handoff carries. The rule "keep it current" lived in this protocol,
the human repeated it at the end of a session, and it still failed: one repo's `STATE.md` said
"nothing dispatched yet" a full working day after dispatches began, and the next session added a
second `INDEX.md` line instead of resuming. A rule in prose erodes, faster on a weaker model. So
the save is enforced by Claude Code hooks, which run whatever the model does.

`hooks/state-guard.sh`, one script, five events, wired in `<repo>/.claude/settings.json`:

- **`UserPromptSubmit`.** A prompt that starts with `/mission` binds the session to the guard. From
  then on every prompt opens a turn (marker `.guard/turn`). Sessions that never typed `/mission`
  are left alone: a quick fix in the same repo is not a mission.
- **`PreToolUse`** on the editing tools and Bash, for the main agent of a bound session only
  (the hook sees `agent_id` empty for it, set for a subagent): refuses a write into the repo tree
  outside the missions dir and the repo's allowlist. Edit and Write are judged by their path; a
  Bash command by its shape (`>`, `tee`, `sed -i`, `python -`, `mv`, `cp`, `rm`, `touch`,
  `mkdir`, `patch`, `git apply|restore|stash|reset --hard|checkout --`), and it passes when it
  names the missions dir or an allowlisted path. The refusal says what to do instead: dispatch an
  executor with a brief. The numbers behind the rule, from one day of runs: the meta-session that
  built three slices itself did it in 149 Bash calls at a median context of 335k, 148M tokens
  read; its executors ran at 30k to 100k. Building in the meta-session costs five to eight times
  what an executor costs, and the protocol already said the meta-session dispatches. A tool run
  that writes files (`python tools/x.py`) passes: that is a run, not an edit.
- **`PostToolUse`** on Write, Edit, Bash, Agent, Skill and their kin marks the turn as one that
  acted (`.guard/dirty`). Read, Grep and Glob do not count: looking changes nothing.
- **`Stop`.** When a bound session tries to end an acting turn and `STATE.md` is older than the
  turn, the hook exits 2 and the model reads its message: update `STATE.md`, then stop. A second
  refusal in the same turn is never issued (`stop_hook_active`); a model that ignores the message
  once is let go, and the gap shows on the next boot.
- **`SessionStart`** on startup, resume, clear and compact prints the active mission's `STATE.md`
  and `MISSION.md` into the fresh context. The reader side of the same failure: a new session cannot
  miss a mission it was just shown.

What the model does when blocked: rewrite `STATE.md` so that a session that has only this file
could continue. Done, In flight, Next unit, Gates pending, Open questions, the Updated line. A turn
that changed nothing about the mission says so on the Updated line, which costs one edit.

What the guard does not cover: work done inside one turn before an automatic compaction. The
`SessionStart` printout restores what was saved before it, the turn's own unsaved part is lost.
Update `STATE.md` after every dispatch returns, not only when a turn ends.

The markers live in `<missions dir>/.guard/`, gitignored with the rest. The scanner reads `*/`
and never sees a dot-directory. Two mission sessions open in one repo bind last-wins; the earlier
one runs unguarded until its next `/mission` prompt.

# Talking to the human, who sees NONE of the sub-agent work

They see your messages and nothing else. A choice, a finding, or a trade-off that lives inside an
agent's report is invisible to them until you spell it out. Never surface a decision as a bare label
("two design choices", "option A vs B") without the context needed to actually decide it: what the
thing is, what the agent did, why the choice exists, and your recommendation with a reason.

- **Context before the question.** If you ask them to pick or override, first explain in a sentence
  or two what they are picking between and what each side means in plain terms.
- **Plain word over technical word, always.** "The small pop-up window", not the class name. Keep
  exact code and API names only when they are the actual thing being changed and no plain equivalent
  exists.
- **Lead with the outcome**, then the detail for whoever wants it.
- **Recap what matters from a report; never assume they read it.** They did not. It never reached
  them.
- **Take premises to them early.** Agents reason from what the mission folder says, and some of it is
  stale. A human corrects a premise in one sentence that no amount of agent work can settle. Ask
  before a wave, not after.

**SLOT — protected vocabulary.** *The repo answers: which terms must never be paraphrased here?* A
repo whose domain has a defined glossary needs the exact word, and that narrows the plain-word rule
above. Declare it as an amendment.

## Stable question IDs

A meta-session sends messages nobody asked for: an agent reports, you relay. So the human is
routinely **mid-reply to your message N** when N+1 and N+2 land. They answer "1. yes 2. no" against a
numbering you have already reused. Both sides then believe a question was answered that was never
asked, and neither can see it happened.

**Rule: an open question keeps its ID until answered, forever. Never renumber, never reuse.**

- Prefix by topic, number within it. A fresh integer per question, scoped to its topic. Sequences
  never reset.
- **Reprint every still-open question at the bottom of every message.** Not only when you ask
  something new. An unanswered question that stops being reprinted is one you silently dropped, and
  nobody can audit a list they cannot see.
- **Reprint the QUESTION, never just its ID.** An ID alone is unanswerable: by the time they read it
  the question is twenty messages up. Give the ID plus the full question, with enough context to
  answer it cold. Assume they remember nothing about it. This has failed exactly this way in
  practice: three IDs answered, the fourth returned as "I lost the question".
- When they answer by number, echo the ID **and the question text** as you act. If a bare number
  could match two questions, ask which. Do not guess.
- Retire an ID only once answered, and say so. Retired IDs are never recycled.
- Same discipline for any list they will act on later: keep labels stable across messages so their
  notes stay valid.

**SLOT — ID prefixes.** *The repo answers: which topic prefixes are in use here?*

# Operating rules

- **Posture: orchestrate.** Executors write, investigators map, verifiers refute. The meta-session
  briefs, adjudicates, gates, and commits.
- **`STATE.md` is the heartbeat.** Rewrite it after every completed unit — report received, merge
  done, decision taken, message sent. A meta-session that dies mid-flight must cost at most one unit
  of re-verification. Never let "I'll update it at the end" happen. It is also the file the global
  scanner reads the mtime of, so an un-rewritten `STATE.md` reads as an abandoned mission.
- **`MISSION.md` is durable.** Append verified facts and standing decisions only. Correct a refuted
  belief there at once: a stale `MISSION.md` poisons every successor session.
- **Context thresholds.** At 70% remaining, delegate everything delegable. At 40%, stop inline work
  and bring `STATE.md` to perfect currency. At 25%, write a `HANDOFF` section into it — open
  questions, exact resume commands — and say to reopen with `/mission`.
- **The human's gates are per-action**: merges, pushes to shared branches, releases, production
  writes, outward messages. List them in `STATE.md` under "Gates pending". Never batch-assume.
- **One mission per session; one agent per checkout.** Check what other sessions own before
  dispatching into a working tree.

**SLOT — gates.** *The repo answers: which actions here are human-gated, exactly?*
**SLOT — tool surface.** *The repo answers: which tools exist here, and at what permission?*
Discover it from `MISSION.md § Tool surface` rather than re-probing every session.

# SLOT — Play: `<verb>`

*The repo answers: what is the recurring play this repo's missions run?*

Every adaptation so far has exactly one, and it is never the same one. It is the procedure this repo
runs often enough to be worth writing down: working a backlog, working a map, driving a release.

A play belongs in the delta, never here. It is the most repo-shaped thing a mission skill contains.

# An agent going idle is NOT an agent that reported

An idle notification means the agent stopped. It does not mean its findings reached you.

The failure is invisible in exactly the wrong direction: a missing report reads like a clean result.
If you are gating a merge on "the reviewer found nothing", an unsent report and a clean review are
the same shape on your screen. In one observed wave, three of eight parallel reviewers went idle
carrying a bare `idleReason: "available"` and no report body, while the five that did report were
carrying HIGH-severity defects.

**Rule: never let an agent's silence stand in for its verdict.** Message it by name and ask for the
whole thing — verdict, findings with `file:line`, the specific call you gated on, and what it could
not check. Naming the gate in the ask ("this decides whether it merges tonight") is what gets a real
answer instead of a summary.

**The second shape is worse, because it looks like a report.** An agent goes idle carrying a summary
of work it finished twenty minutes ago, while the question you asked five minutes ago sits unanswered
inside it. The tell is a report whose subject is not the thing you last asked about.

# Verify the artifact, not the claim, and stamp the time

Before asking an agent whether something is done, check the thing itself: a `grep`, an `ls -l` for
the mtime, a read-back from the API, the branch head from the forge. It costs one call, and it has
beaten asking every time it was tried.

**Then stamp the time on the answer.** A direct check goes stale too. The difference is that you know
when you took it, and a report never tells you when its claim was true. Two readings of one file
disagreed for a while during one run and both were correct: taken twelve seconds apart, either side
of a rebuild. A disagreement about the state of an artifact is settled in one line by the path, the
mtime, and the literal command output — never by whose reasoning is better.

**Assume any state you were handed has already moved.** The commonest shape is not two readings that
disagree. It is one reading that was true when taken and false by the time someone acted on it. So
re-read state at the moment you use it, not at the moment you were told it, and when your reading
contradicts what you were handed, suspect the clock before you suspect the claim.

The worst observed case was seconds from costing five hours: a working tree had quietly checked out a
stale branch, and a long build was about to start on a commit that did not contain the only change
the build existed to ship. The checkout command had reported success, and it was telling the truth —
it answered a different question than the one that mattered.

**SLOT — cheap checks here.** *The repo answers: which one-line commands read back real state in this
repo?*

# An agent that SENT A REPORT is not an agent that has FINISHED

The mirror of the rule above, and it fails in the more dangerous direction. A report reads like an
ending. It is not: an executor that has reported can still be running a mutation battery, a restore
loop, or a second measurement pass over the same tracked files.

**Before you commit a tree an agent occupied, or dispatch anyone else into it, ask that agent to
confirm it has stopped** — and require proof, not assurance: a clean `git status --porcelain
--untracked-files=all`, and the production files diffed against your intended commit.

The near-miss that earned this: a confident report read as "done", the tree committed, an adversarial
verifier dispatched into the same worktree, the executor mid-battery in both cases. The commit caught
a pristine file by luck. The mutation it could have caught instead still passed half the suite, so
the commit would have been a plausible-looking revert of the very fix it claimed to ship. The same
overlap would also have let the verifier measure a mutated file and report it as a genuine defect,
which is the more expensive half: a corrupted finding survives into decisions, a lost measurement
does not.

Two habits close it. Name the exclusive occupant of every working tree in `STATE.md`, and when you
brief an executor that will mutate anything, tell it to announce a mutation window and report when
the window is closed.

# Your prescribed shape will sometimes be wrong

The orchestrator writes briefs from a distance, so some of them specify the wrong implementation.
That is normal and cheap, provided the executor can say so. It is expensive only when the brief reads
as an order.

**Ask for deviation to be flagged, then hold it to a higher bar than the brief**: a deviation is
justified by a measurement that fails without it, never by preference. And say the correction out
loud when you relay it upward. "Your instruction was wrong and here is what proved it" is worth more
to the human than a clean-looking report, because it tells them which of your judgments to trust.

**Your stated premises are as wrong as your shapes, and harder to see.** A premise sits in the brief
as background, so an executor can implement around it without ever testing it. Say which premises you
want measured. Two failed in a single day once: a claim about a command's exit codes that was simply
false, and a check whose author had generalised from a sample of two, so it passed on the exact cases
it existed to flag. Reading them both found nothing. Running them found both.

# Settle the human's premises before you build on them

Some facts about the world only the human can confirm: what was actually sent, what was decided, who
owns an account, what is scheduled for when. An agent cannot check those. It can read a trace and
infer from it, and a trace is not the fact.

**Ask before you build, not after.** One mission spent an afternoon reasoning about a message that
had never gone out: a trace carried the campaign's own name, so every agent and the orchestrator read
it as evidence of a send, built a comparison on it, concluded, reversed the conclusion, and wrote all
of it into a document the owner corrected in one sentence.

**The expensive part was not the wasted work. It was that the doubt had already been raised.** The
monitoring agent's first report had said, in its own words, that either the date was off by one or
the send had not happened yet. That sentence was the answer. It sat in a report, unasked, for a whole
afternoon.

So: **an agent's hedge about a premise is a question for the human, not a caveat to carry forward.**
When a report says "either X or Y" about a fact of the world, stop and ask. It costs one message.

**When a premise falls, sweep for everywhere it reached.** A false premise does not stay in one
paragraph. That one had spread to five places in the deliverable. Retracting the headline claim and
leaving the downstream ones is worse than not retracting at all: the document then contradicts
itself, and the reader cannot tell which half to trust.

# Briefing an executor: the sentence that pays for itself

Put this in every fix brief, verbatim in spirit: **"Confirm this diagnosis yourself before changing
anything. If the real cause is different, say so and STOP."**

You will hand executors diagnoses that are wrong, inherited or your own. An executor told to *apply a
fix* applies it; an executor told to *confirm first* comes back with the real cause. That sentence
has stopped a wrong fix from landing in a shared CI gate, where it would have made the bug **more**
frequent while looking like a repair.

- **Give the executor the contradiction, not the conclusion.** When a report disagrees with a
  ticket's own text — the ticket says X is broken, the code says X was fixed and Y is the real gap —
  hand over both, ask it to settle, then correct the ticket.
- **"I could not verify this" is right; a verdict attached to it is not.** Agents report
  "pre-existing, but I could not baseline it". Treat the second clause as deleting the first, and
  baseline it yourself: a sub-agent often cannot while you can. Once this turned a "pre-existing
  failure" into "this change breaks CI", one merge before it shipped. When you do baseline, check
  that your comparison can actually separate the hypotheses.
- **Send documentation through adversarial review too.** Two documentation changes in one run passed
  every factual claim and still carried real defects in the code they told the reader to type, one of
  them a verification step that passed silently on a missing file. Prose is checked by reading; the
  commands inside prose have to be run.

**SLOT — reviewers.** *The repo answers: which reviewers or verifiers exist here, and when is each
one mandatory?*

# A "could not verify" list is usually a question nobody asked

A document that ends with a list of open questions feels honest. Often it is unasked questions,
formatted. One deliverable shipped exactly that section; the owner answered four of the items from
memory, a sentence each, in one message, and two more turned out to be one query and one code read
away. The section had been written as a limit of the work. It was a limit of the asking.

**Before publishing anything with an unverified-claims section, split it three ways:**

1. What the human can answer now. Ask them.
2. What a query, a code read, or one command can answer now. Run it.
3. What genuinely cannot be settled yet.

Only the third earns a place in the document. Keep it — it tells the reader what they are getting and
what it rests on. Delete the other two by answering them.

# Closing a mission — the ceremony

A mission folder is working memory, not an archive of record. The failure mode is a folder full of
hard-won knowledge that nobody opens again. Six steps, in this order. Do not skip to step 6.

1. **Route every durable fact to a home.** Each verified fact and standing decision in `MISSION.md`
   goes somewhere that outlives the mission: a repo rule, a tracker issue for deferred work, personal
   memory, or an explicit discard. "Discarded" is a valid destination. "Still in the mission folder"
   is not.
2. **Settle every open question ID.** Each ends answered, dropped by the human, or filed. Say which,
   per ID. An ID that merely stops being reprinted is a decision lost in silence, which is the
   failure the ID scheme exists to prevent, arriving at the end instead of the middle.
3. **Verify each deliverable exists where it claims to.** Not "I published it" but the URL, the
   commit SHA, or the issue number, read back from the source. A mission that reports six
   deliverables and can prove four has shipped four.
4. **Name what is NOT done, and who owns it now.** Unfinished work with no named owner will be
   rediscovered from scratch. Write the handoff line even when the owner is the person who started.
5. **Write the run's procedural lesson down** while the run is still in your context. A lesson
   recalled next week is a lesson already half lost. See § Self-improvement. **And what the run
   cost**, when the harness exposes it: `missions/usage.py --repo . --mission <slug>` (next to the
   scanner in `jean-ai-os`) prints a table per session, tokens read and written, main and
   subagents; paste it into the final `STATE.md`. No transcripts on this harness: write
   "cost: not exposed". A slice whose cost nobody wrote down cannot be compared with the next.
6. **Archive.** Final `STATE.md` summary, move the folder to `archive/`, update `INDEX.md`.

Archiving is also what tells the global layer the mission is over: the scanner reads the move into
`archive/` and emits the journey entry from it. A mission left un-archived stays "open" forever and
eventually surfaces as one with no heartbeat.

**SLOT — where a durable lesson goes here.** *The repo answers: which file receives a lesson from
step 1 and step 5?*

# Self-improvement

A mission run that teaches a **procedural** lesson — a missing boot step, a state format that failed
a handoff — edits the skill in the same session, dated.

**Which file to edit is the whole question.**

- The lesson is true in any repo → it belongs in this protocol, at its source. **The copy in this
  repo is generated; editing it here is lost at the next re-vendor and leaves the rule broken in
  every other repo.** If you can reach the source (the stamp in the header names it), edit it there
  and re-vendor. If you cannot, write the lesson in the delta under `## To promote` and say it is
  protocol-level, so whoever maintains the protocol can lift it.
- The lesson is about this repo → it belongs in the delta, under `## Patina`, dated.
- The lesson narrows a rule above → it belongs in the delta, as `### Amends: <heading>`. Never
  contradict this file silently.

The run log lives in the repo's delta, never here. A protocol that accumulates one repo's incidents
stops being a protocol.

---

## Provenance

Distilled 2026-08-23 from the three `/mission` skills then in use, which share 13 section headings
and no shared bodies. They descend from one ancestor, so their overlap is one discovery copied three
times, not three independent findings. What argues for these rules is the opposite fact: two very
different repos both **added** to the set without ever removing from it.
