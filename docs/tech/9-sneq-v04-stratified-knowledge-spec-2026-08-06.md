# sneq-engine v0.4.0 — Stratified knowledge: spec

**Date:** 2026-08-06 · **Source:** three-minds design round (Sol / Kimi K3 / House-Opus) over issue [#9](https://github.com/JeanDes-Code/sneq-narrative-system/issues/9), the v1 theory (`SNEQ/01..08`), and the 0.3.0 code at `e2843a0`.
**Status: spec of record — open frontier.** Not canon. This document states what is **decided** about v0.4. What is not yet decided is listed in §13 under *Design gaps still open*, and three of those gaps block the decisive seam (§11 phase D). Those open questions are worked as tickets on [wayfinder map #10](https://github.com/JeanDes-Code/sneq-narrative-system/issues/10) — the document holds the decisions, the map holds the frontier. Read the two together.

**Baseline verified 2026-08-08** on the work machine: Node **v24.13.0**, `pnpm test` → **34 files, 313 tests, all passing** (including `sqlite-contract.test.ts`, 17), `pnpm typecheck` clean.

**How to read this document.** The body carries the current decision and nothing else — where a later pass reversed an earlier one, the body was rewritten, not annotated. The chronology lives in the **Amendment log** at the end. §0.5 is the exception and stays in place: it is not history but a standing correction of premises this spec was built on, and each entry names code that still reads that way today.

---

## 0. What the round changed about the problem

Issue #9's plan rested on two factual premises about 0.3.0. Both are false, and two of the three minds independently proved it (Sol §0.1, House R1/R2; Kimi missed both and its recommendation inherited the error):

1. **"Event — immutable, append-only. This is `AttributFige` as it stands."** — No. `AttributFige` is a **last-write-wins projection** keyed by (entity, key): the contract test *requires* replacement (`test/repository/contract.ts:222` — `"facts: replace-on-same-key"`), SQLite writes `INSERT OR REPLACE INTO figed` (`src/repository/sqlite/index.ts:238`), memory does `Map.set(entityId|key)` (`src/repository/memory/index.ts:194`). The event layer does not exist; it is new work.
2. **"Move two existing mechanisms onto the right layers."** — There is no mechanism to move. `canTransition`/`assertTransition` have **zero production call sites**; the only writer of `etat` sets `"CONTRAINT"` unconditionally (`src/atomic/decisions.ts:35`), and `Potentialite.etat` excludes `FIGE` at the type level (`src/domain/potentialite.ts:41`). The state machine is vocabulary, not behavior. The promotion loop gets **implemented for the first time**, not relocated.

Two more findings that reshape scope:

- **The omniscient read is the actual bug** (House, decisive; Sol converged). `getRelevantFacts` (`src/campaign.ts:139-152`) returns every fact of the entity and, at depth 1, every fact of every neighbor — unfiltered, unranked. It is one of the ten advertised tools and it is what grimoire calls to build GM context. This is Arm B of the experiment (96% scene leakage) reproduced *inside* the library. `prepare-turn` leaks the same way (`campaign.ts:362-369`). `get_entity` does **not** — see §0.5 premise 3: it returns a bare `Entity` with no attribute field, and the leak Sol charged it with lives in its tool *description*, not its return value.
- **A fourth repository adapter exists out of tree** (House R3). Grimoire implements the full `Repository` contract on Convex (`grimoire/apps/web/lib/canon/convex-sneq-repository.ts:125,153`) and persists `Potentialite` rows. Deleting the constraint types is a cross-repo data migration, not a free move. Convex stores rows as `payload` blobs behind `as AttributFige` casts that TypeScript will not police.

The theory largely sides with the issue, more than the issue knew (House T1/T2, verified): the v1 docs count time in `{ jour, heure }` — `turn` is a 0.3.0 invention — and `SNEQ/02` §2.5 already prescribes "contrainte souple immédiate, convertie en stricte si confirmée", which is the promotion mechanism issue #9 rediscovered. And `SNEQ/01` §1.8: "Les faits FIGÉS ne sont jamais modifiés. Seule l'interprétation peut évoluer" — the player floor was already doctrine.

**A blocker the round reported and that does not exist:** House R6 claimed the suite fails locally on a `better_sqlite3` ABI mismatch against "Node v26.4.0". There is no such Node release. Re-run on the work machine 2026-08-08: Node v24.13.0, 313/313 passing, SQLite adapter included. No rebuild gates this work. Recorded here because the claim was carried as a prerequisite in two places for two days — an unverified blocker costs as much as a missed one.

---

## 0.5 Premises of *this* spec, corrected (2026-08-08)

§0 charges issue #9 with resting on unverified premises. A verification pass over the code, the docs, the theory and the consumers found this spec doing the same thing in seven places. The design survives all seven; the **scope** does not.

1. **`operationId` dedup does not exist.** §5.1 says `commit_narrative` is "idempotent by `operationId` (existing dedup rules apply)" and §7.4/§7.5 test retries against it. `operationId` is *written* 7× (`src/campaign.ts:130,161,243,271,286,300,315`), *declared* once with a doc comment promising dedup (`src/atomic/types.ts:10-11`), and **read zero times** in `src/`. `repositoryAtomicWriteStrategy` never consults it. Idempotency is **new work**, not an existing rule. (It is real in grimoire's Convex adapter — `findCompletedOperation`/`recordOperation`, `convex/canonMutations.ts:446,466` — which is why it looks like it exists.) `docs/api.md` documents the guarantee as if shipped, on npm.
2. **The `better_sqlite3` blocker is not real.** See §7. Node v24.13.0; 313/313 tests pass.
3. **`get_entity` does not leak.** §0 says it "leaks the same way" and §3 "narrows" it. `campaign.ts:122-125` returns a bare `Entity`, and `Entity` (`src/domain/entity.ts:26-38`) has no attribute field — there has never been a dump. The false claim lives in `toolDescriptions` (`src/tools/schemas.ts:91`: *"with its full set of figed (canonical) attributes"*), i.e. in the in-band documentation the model reads at call time. §3's narrowing is a one-line doc fix. (`prepare-turn` **does** leak, as claimed: `campaign.ts:362-369`.) The real unaddressed identity leak is `Entity.description` — persisted GM prose handed to any caller — plus aliases; the theory scoped exactly this with `nomConnu` (`SNEQ/02:36`), and §7.3's containment test does not cover it.
4. **The uptake extractor is capitalization-only.** §2.6 promises "no new NLP" by reusing `validate-narration`'s extractor. `isProperNounCandidate` (`src/core/validate-narration.ts:288-294`) requires an uppercase initial and caps sequences at 3 tokens. Lowercase surface tokens — *la cicatrice*, *le bac*, *la taxe* — are **never** extracted, so `PLAYER_UPTAKE` under-fires exactly where inventions are most common. This is risk §6.3 arriving through the front door, and the two are not connected in the text. Also, `extract` is an instance method on a `Validator` requiring `Resolver` + `Router`; standalone use needs a free function.
5. **`add_constraint` cannot keep "the same signature" and serve two roles.** `decideAddConstraint` hardcodes `source: { kind: "INFERENCE_IA", confidence: 0.7 }` (`src/atomic/decisions.ts:20`) and `etat: "CONTRAINT"` (`:35`). Every constraint is `INFERENCE_IA`, so §2.6's discriminator ("a single-value `DOIT_ETRE` sourced `INFERENCE_IA` → provisional") matches *everything* and `REGLE_MONDE` (`src/domain/potentialite.ts:9`) has no producer. The signature must gain an explicit role/source. Related: `validateValue` cannot simply "gain its first readers" — `IMPLIQUE` and `CORRELE_AVEC` unconditionally `return { ok: true }` (`src/core/validation.ts:96-98`), and `ValidationContext` demands a strict/soft split that `Contrainte` has no field to express.
6. **`Observation.fiabilite` cannot be removed by declaration.** §2.2 types `OfficialRecord.observation` as `Observation` while saying "fiabilite REMOVED" — but `fiabilite` is **required** on `Observation` (`src/domain/observation.ts:24`). Introduce a distinct `Provenance` type. Removal also breaks `src/cli/observation.ts:5-11` (the `Pick<>` and all four presets), the zod schema (`src/tools/schemas.ts:36`), and leaves a stale key in every persisted `figed.observation` blob (`sqlite/serialization.ts:87`) — with **no blob migration** in §5.4's schema-v4 list. Mitigating finding: nothing in `src/` ever *reads* `fiabilite` for a decision, so the break is type/serialization only.
7. **The omniscient read is not what the flagship consumer calls.** §0 says `getRelevantFacts` "is what grimoire calls to build GM context". It is not: grimoire calls `prepareTurn` (`packages/gm/src/loop.ts:316-324`), and that injection is **dead in production** — `set_scene` passes model-typed free-text names where `EntityID`s are required (`packages/gm/src/tools.ts:267`), so `getEntity` returns null for every one and `presentEntities` is **always empty**. Grimoire also **never calls `registerFact`**, so the SNEQ fact layer is **empty in production** and the codex renders `facts: []`. The diagnosis "the omniscient read is the actual bug" is right in principle and wrong in practice: today's measurable leak comes from the host's raw transcript window (§11 phase C), not from an API nobody calls. Deleting `getRelevantFacts` does not remove the omniscient read — it **relocates it one level up**, into consumer code where SNEQ can no longer see it.

**The pattern behind 3, 4 and 7 is the one §11 and §12 exist to fix:** every one of them is a place where the *documentation* said one thing, the *code* did another, and nothing failed loudly enough for anyone — human or agent — to notice for months.


## 1. The design in one paragraph

v0.4 is an **append-only narrative ledger with two materialized projections, read through a perspective seam**. What happens is an immutable **event** (act structured and untouchable, circumstance prose and reframeable). What power claims is a **record** — authored, entitled to contradict its event. What travels is a **carriage** — named carrier, real travel days, structurally stopped at realm borders, interceptable through appended effects. What a holder (a `community × stratum` group, or an individual by derogation) knows is a **belief** — derived on demand from arrived carriages, never stored, ranked by engine-computed salience, carrying the reliability vocabulary that today sits wrongly on canonical facts. What the GM invents without warrant is a **provisional invention** that promotes to canon only when something comes to depend on it — validated against the constraint space the theory always intended for that job. And the one read on the path to the model is `get_holder_context(holderId)`: **there is no way to ask SNEQ "what is true?" from the tool surface, so a leak requires information the API never handed over.**

Shape verdicts from the round: Kimi picked A (invalidated by premise 1 above); House and Sol each independently derived a Shape D, and the two D's are complementary — House supplies the interface commitment (the perspective seam), Sol supplies the storage architecture (ledger + projections). This spec is their merge, with divergences adjudicated in §8.

---

## 2. Domain model

New files under `src/domain/`; branded IDs added to `ids.ts` (`EventId`, `RecordId`, `HolderId`, `CarriageId`, `InventionId`).

### 2.1 `event.ts` — NEW, append-only

```ts
export interface EventAct {
  actorId: EntityID;
  verb: string;                    // structured, never prose
  objectId?: EntityID;
  value?: AttributValue;
}

export interface NarrativeEvent {
  eventId: EventId;
  campaignId: CampaignId;
  day: number;                     // world clock (§4)
  turn: number;                    // ordering within a day
  placeId?: EntityID;
  gravity: 0 | 1 | 2 | 3;
  acts: EventAct[];                // THE ACTS — immutable, no mutation path exists
  circumstance: string;            // THE SCENE — prose; the only thing REINTERPRETATION may reframe
  participants: EntityID[];
  surfaceTokens: string[];         // the containment/canary alphabet
}
```

**The player floor is the absence of an API**: the repository exposes `appendEvent` and queries — no update, no delete. "The woman you saved was picking his pocket" is a later record referencing the event's circumstance; "you never actually grabbed his arm" would require mutating `acts`, and no code path can. A contract test asserts the absence (§7).

*(Note: v1 had structured `preuves: Preuve[]` per fact — `SNEQ/02` §2.1 — which V2 flattened to one `excerpt?: string`. `surfaceTokens` + structured acts restore what was lost.)*

### 2.2 `record.ts` — NEW, append-only

```ts
export interface OfficialRecord {
  recordId: RecordId;
  campaignId: CampaignId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  authoredBy: EntityID;            // the power that issued it
  aboutEventId?: EventId;          // absent = pure assertion
  route: "OFFICIAL" | "RUMOUR";
  observation: Observation;        // provenance ONLY — fiabilite REMOVED (moves to Belief)
  day: number;
  turn: number;
}
```

A record contradicting its event is **legal data, not an error** — the gap is the game. `SneqContradictionError` survives only for canon-vs-canon conflicts on the projection (§2.6). Records accumulate; they are never replaced.

### 2.3 `holder.ts` — NEW

```ts
export interface GroupHolder {
  kind: "GROUP";
  holderId: HolderId;
  campaignId: CampaignId;
  community: string;
  stratum: string;
  realm: string;
  placeId: EntityID;
  standing: number;                // 0..1
}

export interface IndividualHolder {
  kind: "INDIVIDUAL";
  holderId: HolderId;
  campaignId: CampaignId;
  entityId: EntityID;
  baseGroupId: HolderId;
  derogationReason: "PARTICIPANT" | "PERSONAL_STAKE" | "PLAYER";
  standingOverride?: number;
}

export type Holder = GroupHolder | IndividualHolder;
```

Groups are the default (a town has strata, not three hundred memories). An individual inherits their base group and adds only what their **declared** derogation justifies — deviation for a reason is drama, random deviation is noise. The player is an `INDIVIDUAL` with `derogationReason: "PLAYER"`.

**Holders are created lazily, never authored upfront** (decided with Jean, 2026-08-07 — mirrors `mention_entity`: the social structure of a village is in superposition until the fiction touches it):

- **Bootstrap**: campaign creation seeds one default realm and one default community with a single stratum. `get_holder_context` never returns empty for lack of authoring.
- **Resolution cascade** (mirror of the entity cascade): entity → its `INDIVIDUAL` holder if a derogation was declared → its `community × stratum` group if declared → the campaign default group.
- **Creation in play**: `commit_narrative` accepts `holders[]` — the tanners' quarter or the neighbouring realm is declared in the same bundle as the event that introduces it. This also *shrinks* risk §6.4: holders born from the fiction at the moment it touches them are more accurate than holders guessed in advance.

### 2.4 `carriage.ts` — NEW

```ts
export interface Carriage {
  carriageId: CarriageId;
  campaignId: CampaignId;
  subject: { kind: "EVENT"; id: EventId } | { kind: "RECORD"; id: RecordId };
  carrier: string;                 // NAMED → traceable, interceptable
  route: "OFFICIAL" | "RUMOUR";
  fromPlaceId: EntityID;
  toPlaceId: EntityID;
  originRealm: string;
  destinationRealm: string;
  departedDay: number;
  travelDays: number;              // the GAME supplies this number; SNEQ owns no map
  minStanding?: number;
}

export interface CarriageEffect {   // append-only — interception is gameplay, with provenance
  effectId: string;
  carriageId: CarriageId;
  causedByEventId: EventId;         // the bribe/ambush IS an event
  day: number;
  effect: { kind: "DELAY"; days: number } | { kind: "CANCEL" } | { kind: "DISCREDIT" };
}
```

Arrival is derived: `departedDay + travelDays + Σ delays`, `CANCEL` never arrives, `DISCREDIT` degrades reliability without touching arrival. An `OFFICIAL` carriage with `originRealm !== destinationRealm` delivers nothing — a structural halt, not an attenuation. SQLite maintains an `arrival_day` column as a projection for the hottest query ("carriages arrived here by day D").

**Auto-dispatch by game rule — `DispatchPolicy`** (decided with Jean, 2026-08-07; supersedes the round's "never auto-dispatch"). Manual-only dispatch makes the deaf-world failure (§6.1) the *default outcome* of an improvised solo campaign — a game rule is required, and the engine executes it:

```ts
export interface DispatchPolicy {
  routes: { fromPlaceId: EntityID; toPlaceId: EntityID; travelDays: number;
            route: "OFFICIAL" | "RUMOUR" }[];   // game-owned distances; lazy — a route exists once the fiction establishes it
  rules:  { minGravity: 1 | 2 | 3; route: "OFFICIAL" | "RUMOUR";
            targets: "ALL_KNOWN_COMMUNITIES" | EntityID[];
            carrierLabel: string }[];            // e.g. gravity ≥ 2 → "courrier royal" toward the capital
}
```

At `commit_narrative`, the engine matches the event's gravity against the rules and creates the carriages itself, using the route table. Policy-dispatched carriers are **generic but labelled** ("une caravane marchande") — a carrier becomes a named NPC only when the player engages with it: the promotion pattern applied to carriers, a generic carrier being exactly a provisional detail. The library owns the contract, the game owns the map: policy and routes are game-supplied data. The §6.1 detector narrows to events *no rule covers*.

*(The reference prototype cannot express interception at all — `reaches()` is pure `departedDay + travelDays`. Both House and Sol caught that the gameplay surface the issue was sold on was missing from the reference; `CarriageEffect` is where it lives, and its `causedByEventId` keeps interception inside the fiction.)*

### 2.5 `belief.ts` — derived, NEVER stored

```ts
export interface Belief {
  holderId: HolderId;
  subject: { kind: "EVENT"; id: EventId } | { kind: "RECORD"; id: RecordId };
  content: string;
  learnedOnDay: number;
  viaCarrier?: string;
  certainty: "WITNESSED" | "TOLD" | "INFERRED";   // from event.participants — "you were there" is not negotiable
  fiabilite: Fiabilite;                           // the 0.3 vocabulary, finally on the right object
  method: ObservationMethod;
  salience: number;
  factors: { gravity: number; recency: number; personalInvolvement: number;
             socialPosition: number; propagationDelay: number };
}
```

Beliefs are a **pure function** of (events, records, carriages, effects, holders, today) — recomputed in `src/core/derive-beliefs.ts`, cacheable by `(campaignId, holderId, day, revision)`, never authoritative. This settles the issue's "personal involvement does two jobs" note: `personalInvolvement` stays a salience factor; `certainty` is a separate field derived from participation. `WITNESSED` beliefs are not negotiable by later records — the player floor generalized to every NPC, for free.

Salience is engine-computed in `src/core/salience.ts` — five factors are the decided thing; the **weights are a config constant**, starting at the prototype's exercised values (0.40 gravity / 0.20 recency / 0.20 involvement / 0.10 position / 0.10 delay), tunable without touching the factor list. The model never ranks its own memory: *the model writes content, never effects.*

### 2.6 `invention.ts` — NEW; and what happens to `AttributFige`

```ts
export type InventionStatus = "PROVISIONAL" | "PROMOTED" | "REJECTED" | "SUPERSEDED";

export interface ProvisionalInvention {
  inventionId: InventionId;
  campaignId: CampaignId;
  entityId: EntityID;
  attributeKey: string;
  value: AttributValue;            // value-bearing — the thing Potentialite structurally cannot hold
  category: CategorieAttribut;
  sourceNarration: string;
  confidence: number;              // provenance, NEVER a promotion threshold
  introducedAtTurn: number;
  introducedOnDay: number;
  status: InventionStatus;
  lastReferencedTurn: number;
}

export type PromotionEvidence =
  | { kind: "PLAYER_UPTAKE";       eventId: EventId }   // player's utterance references a surface token
  | { kind: "WORLD_CONSEQUENCE";   eventId: EventId }   // a later event declares it a causal dependency
  | { kind: "RECONFIRMATION";      eventId: EventId }   // reasserted on a LATER turn, distinct source
  | { kind: "OFFICIAL_RECORD";     recordId: RecordId };

export interface InventionTransition {                  // append-only audit
  inventionId: InventionId;
  from: InventionStatus;
  to: Exclude<InventionStatus, "PROVISIONAL">;
  atTurn: number;
  evidence?: PromotionEvidence;
  supersededBy?: InventionId;
}
```

- **`AttributFige` → `CanonicalAttribute`**: stays replace-on-key **because it is explicitly a current-state projection now** — its history lives in events and invention transitions. Gains `source: { kind: "EVENT" | "PROMOTED_INVENTION" | "LEGACY_FACT"; … }` and `day`. Deprecated alias `AttributFige` exported through 0.4, removed in 0.5 (there is a live out-of-tree consumer — this is a migration window, not a speculative seam).
- **`add_constraint` is re-founded, not deleted** (issue #9 amendment, 2026-08-06 — the round read domain types and never enumerated `dist/tools/`; for a middleware the tool contract is the primary API). It has live and planned callers (Jean's Hermes/Leeloo sessions via the CLI; the Hermes-Agent GDD plans it as its world-rules system) and it serves **two distinct roles** in 0.4:
  1. **Provisional layer entry** (the amendment's reading): a `DOIT_ETRE` with a single value sourced `INFERENCE_IA` is a *proposed value* and lands as a `ProvisionalInvention` — which supplies the lifecycle `Potentialite` structurally cannot (status, uptake tracking, transitions).
  2. **World rules** (the theory's `REGLE_MONDE` source, Hermes-Agent's planned use): laws declared at campaign setup or as dynamics emerge — all six rule types kept (`DOIT_ETRE`, `NE_PEUT_PAS_ETRE`, `IMPLIQUE`, `CORRELE_AVEC`, `RANGE_NUMERIQUE`, `REGEX` all have concrete planned uses) — **consulted at promotion and at commit validation**. `validateValue` gains its first readers ever (zero call sites today, engine and all consumers included).

  **Correction on the record**: the constraint *auto-propagation* consumers may expect ("register a fact → connected entities receive constraints through the GCN") has never run — `propagate()` has zero call sites in 0.3.0. Its v0.4 equivalent is deliberately different and better-founded: event → carriage/witness → **belief** → game-derived disposition. The jealous partner reacts when they *learn*, not by graph contagion. Consumer GDDs should be written against this contract.
- **The GM_NARRATION guard** (amendment, adopted verbatim): *an assertion whose observation source is `GM_NARRATION` may never enter canon directly.* It enters provisional and promotes only on the evidence rules above. Today `register_fact` accepts `GM_NARRATION` + `fiabilite: CERTAINE` with no brake — the confabulation problem is not "invention goes unrecorded", it is "invention can be recorded as truth". In 0.4 the brake is structural: `commit_narrative` routes unwarranted assertions to the provisional layer, whatever the caller claims.
- **Promotion validation runs against canon + exclusion constraints** — the theory's collapse loop (generate → validate → inscribe, `SNEQ/04`) finally implemented, aimed at the output side.
- **Promotion is detected by the engine at commit time, never by the model** (unanimous). Player uptake is detected by running the existing `validate-narration` extractor (`src/core/validate-narration.ts`) over `PLAYER_UTTERANCE` text against provisional `surfaceTokens` — machinery that already exists; no new NLP, no model call.
- **No evaporation by deletion** (Sol's argument, adopted): a stale provisional falls out of prompts by salience/recency — *invisible to the prompt, not forgotten by storage*. The player who revives the ferryman's name twenty turns later finds it promotable; deleting it would reproduce the exact drift SNEQ exists to prevent.
- **Contradiction before promotion:** by canon → invention marked `REJECTED` silently, no error, no interrupt (inverts today's `decideRegisterFact` adjudication path — provisional writes are a separate, cheaper path). By another provisional → both live; first uptake wins, loser `SUPERSEDED`. After promotion → canon; only remedy is a `REINTERPRETATION` record, never mutation.

---

## 3. The perspective seam (the commitment that carries the design)

**Deleted, not deprecated:** `getRelevantFacts` and its tool. **Narrowed:** `get_entity` returns identity/aliases, not the attribute dump; `prepare-turn` takes a holder and returns holder-safe context.

**The sole ordinary knowledge read:**

```ts
getHolderContext(holderId, { about?: EntityID; topK?: number }): {
  beliefs: Belief[];                       // salience-ranked, arrival-filtered
  provisionals: ProvisionalInvention[];    // active ones relevant to the scene
}
```

Raw truth (`getEvents`, `getRecords`, `getCanonicalAttributes`) remains available to *trusted application code* — save inspection, admin UIs, tests — but is **not on the agent tool surface**. You cannot leak what the API will not hand you: this is the structural form of "one context window cannot withhold from itself", and it is the part the experiment measured — a separation **in the 4–6× range** (§11.5 corrects the headline 6.05× to ≈4.17× after the blind cross-check; quote the range, never a point). Note the scope of that claim precisely: the seam makes *SNEQ's* contribution to the payload clean. It does not make the payload clean, because SNEQ does not compose it — that is what §11 phases C and D exist to close.

---

## 4. The clock

**Two independent clocks. No conversion, ever, anywhere in the engine.**

- `turn` — monotonic interaction/commit ordering. Unchanged type, unchanged uses (read ordering relies on it: `memory/index.ts:202`, `sqlite/index.ts:247`).
- `day` — world time, on campaign state, advanced **only** by an explicit call. `advance_turn` gains an optional `days?: number` argument (default 0) — one tool, two clocks, and five hours of onion-soup talk moves no courier. (Kimi's `daysPerTurn` engine-side conversion is rejected: it re-couples the clocks the requirement says to separate.)

Migration: `day` added to events/records/projections; existing campaigns get a **migration epoch at day 0** with `source: LEGACY_FACT` — honest (pre-0.4 campaigns genuinely have no world clock) rather than fabricating chronology from turn counts. No `hour` until a mechanic demands one. This restores the v1 theory's unit (`GameTimestamp { jour, heure }`) — 0.3.0 was the outlier, which makes the ADR a *return*, not a swerve.

---

## 5. Write path, tools, CLI

### 5.1 One atomic write: `commit_narrative`

`AtomicWriteStrategy` today has six operations and no way to commit a bundle (`src/atomic/types.ts:128-135`) — "event committed, carriage missing" is a real torn-write on Convex. Replace `registerFact` + `addConstraint` with:

```
commitNarrative({ event?, records[], carriages[], carriageEffects[],
                  inventions[], promotionEvidence[], constraints[], holders[] })
```

— atomic, idempotent by `operationId` (existing dedup rules apply), applying invention transitions and projection updates in the same commit. Grimoire implements it as one Convex mutation. `advanceWorldDay` folds into `advanceTurn(command)` as above.

### 5.2 Tool protocol — stays at ten

| | tool |
|---|---|
| **removed** | `sneq__get_relevant_facts`, `sneq__register_fact` |
| **added** | `sneq__get_holder_context { holderId, about?, topK? }`, `sneq__commit_narrative` |
| **changed** | `sneq__get_entity` (identity only) · `sneq__advance_turn` (+ optional `days`) · `sneq__add_constraint` (**signature unresolved — open**: it must serve two roles, and §0.5 premise 5 proves the shape in this spec cannot. `decideAddConstraint` hardcodes `INFERENCE_IA`, so the intended discriminator matches every constraint and `REGLE_MONDE` has no producer. The role must become explicit in the payload. Adjudicated at [#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19), not here) · `sneq__validate_narration` (keeps its entity-resolution job, gains holder awareness and the power to **block** rather than merely report. The **containment gate does not live here** — see §11 phase D and the note below) |
| **unchanged** | `lookup_entity`, `suggest_existing`, `mention_entity`, `set_scene` |

One composite write beats five order-sensitive writes in an agent loop; tool count is a real cost (deep modules: much behavior, small interface).

**Why containment is not an output gate.** Containment belongs *before* the call, not after it. The prototype this spec cites says so in the docstring of the function itself (`experimentation-1/prototypes/scaled-audit/engine.ts:409-413`):

> *"Every token from every event/record this holder has NOT learned. Decided from state, **before any call** — the containment gate. **Not a validator on the model's output; a statement about what was handed over.**"*

And it keeps the two functions deliberately separate (`:448-455`): `checkCanary` is *"a TEST-ONLY string assertion over prose that came back. Never a runtime validator that re-asks."* The distinction is load-bearing: **containment proves the fact was never handed over; the canary catches it being reconstructible from what was.** In the measured run, arm B fails containment **5/5 with `present == forbidden`, before the model has spoken** (`runs/pro-run2/containment.txt`). A post-hoc narration check cannot produce that result, because by then the leak has already been handed to the model.

So: **containment is a pre-flight assertion over the composed payload (§11 phase D)**; the canary stays test-only in the suite (§7.3); and `validate_narration` keeps its entity-resolution job, gains holder awareness, and gains the power to withhold. Budget it as new work, not as polish: `strict` is today an **empty shell** — accepted at `schemas.ts:85` and `hooks/narration-gate.ts:10`, **read nowhere** in the `Validator`. Roughly the whole gate is unwritten.

**`ValidationReport` cannot express a block.** Its shape is `{ ok, partial, extractedNames, issues }` (`src/hooks/narration-gate.ts:31-36`) — it reports, it never withholds or repairs. Blocking, redaction and a bounded repair loop are new control flow, and grimoire has already had to invent all three on top (`packages/gm/src/loop.ts:186-200`, and a `blocked → partial` downgrade in `apps/web/lib/canon/sneq-memory.ts:110-129`).

### 5.3 CLI (15 commands)

`get-relevant-facts` → `get-holder-context`; `register-fact` → `commit-narrative`; `advance-turn --days N`; `prepare-turn --holder <id>`; add `upsert-holder`. Everything else unchanged.

**The count:** 14 today (`src/cli/types.ts:5-20`), two renames (count-neutral) plus one addition = **15**. README:210 and UPGRADING:175 both encode the old 14 — UPGRADING:175 as an *executable* verification step, so it fails on release day if not updated.

**`upsert-holder` is not routable as written.** `run.ts:127-135` sends every non-special command through `sneq__${command.replaceAll("-","_")}`, so it would dispatch `sneq__upsert_holder`, which §5.2 does not create. Decide explicitly: a sixth special-case branch in `run.ts` (keeps the tool surface at ten), or an eleventh tool. **Adjudication: special-case branch** — holder authoring is a host/setup concern, not a narration-loop concern, and the §11 pipeline puts holder creation in `commit_narrative`'s `holders[]` for in-play creation anyway.

**Two new flags need wiring**, and neither exists: `FLAGS_WITH_VALUE` (`src/cli/parse-argv.ts:9-11`) has no `--days` and no `--holder`, and `ParsedInvocation` (`src/cli/types.ts:24-35`) has no fields for them. Note this breaks the existing convention that every tool argument travels through `--args`/stdin — accept it (these two are ergonomic hot paths) but write it down.

**`--source` / `--observation` become orphans.** `buildObservation` is wired only at `run.ts:151` behind `if (inv.command === "register-fact")` — a dead command. Hermes/Leeloo drive live play through exactly that flag. `commit_narrative` must expose how an event and a record get their provenance from the CLI, or the presets die silently.

### 5.4 Repository contract + adapters

Contract gains: `appendEvent`/`getEvents`, `appendRecord`/`getRecords`, `upsertHolder`/`listHolders`, `appendCarriage`/`listCarriages(toPlaceId?, arrivedBy?)`, `appendCarriageEffect`, `appendInvention`/`appendInventionTransition`/`listInventions(status?)`, clock get/set, and **`reindexEmbeddings(vectors)` + `setEmbeddingDim(dim)`** (§14 — the dimension is currently immutable after the first write, with no migration path at all). The contract test must assert **the absence of any event mutation path** — unusual, and the point.

- **SQLite**: schema v4 — new tables (`events`, `records`, `holders`, `carriages`, `carriage_effects`, `inventions`, `invention_transitions`), `figed` → `canonical_attributes` (copy as `LEGACY_FACT`), index `(campaign_id, to_place_id, arrival_day)`. `potentialites` table survives as-is.
- **Memory / JSON-file**: new maps/arrays; JSON save format bumps `version: 1 → 2` with a v1 loader. JSON adapter accepts the O(n) carriage scan for solo play — documented, not discovered at turn 400.
- **Convex (grimoire, out of tree)**: UPGRADING.md must spell out the exact tables/validators/backfill, because the `payload as AttributFige` casts make the gap invisible to TypeScript.
- **GCN survives**: nodes, edges, `forcePropagation`, `neighbors()` — persisted and contract-tested, still useful for entity relations. Only `src/core/propagation.ts` (the damped-BFS knowledge diffusion) dies, with its test file. Verified zero call sites in `src/` and grimoire.

---

## 6. Risks in play, each with its cheapest detector

1. **The world goes deaf** (House). The real cost is *authoring*: if news only travels when the GM model remembers to dispatch, silence is the default outcome of an improvised solo campaign. → Mitigated structurally by `DispatchPolicy` (§2.4): declared game rules auto-dispatch on gravity, so the baseline is a world that talks. The counter (events with zero carriages and age > 3 days) narrows to events **no policy rule covers** — if it climbs monotonically, the policy has a hole. *(Supersedes the round's "never auto-dispatch": a declared, deterministic game rule is not an untuned heuristic — decided with Jean 2026-08-07.)*
2. **Narration outruns the ledger** (Sol). The agent narrates a scar, a name, a promise, and never commits it — the architecture exists while drift continues. → Per-turn diff: proper nouns extracted from narration vs entities/inventions committed; alert on unresolved concrete details. The extractor already exists.
3. **Promotion fires too rarely and it masquerades as success** (House — the one to instrument first). A laconic player + a conservative uptake detector → nothing promotes, dashboards stay green, the world quietly forgets. → Promotion rate per 10 turns + stale-provisional-to-promoted ratio (alert around 5:1). Both free at the commit boundary.
4. **Holder metadata is wrong** (Sol). The engine perfectly enforces the wrong stratum/realm/standing → leakage or implausible ignorance. → Every belief carries an **explain trace** (participant | group inheritance | carriage X arrived day Y, passed route/standing); dev-mode asserts every belief has one; count border-blocks, standing-blocks, derogations, zero-belief holders near arrived carriages.
5. **The floor is violated legally through `circumstance`** (House). A reframing so total it functionally negates the act ("…in a dream you were having"). → Assert the `act` tuple appears unmodified in every payload referencing its event — string containment over structured fields, the canary trick pointed at the one thing that must never move.

---

## 7. Test plan (the five that buy the most)

1. **`repository/contract` extension — ledger append-only, projection replace-on-key.** Append two events touching one (entity, key): both remain queryable; exactly one `CanonicalAttribute` holds the latest value; assert no event mutation method exists; round-trip all new types; reopen JSON/SQLite and assert identical. (Explicitly separates what `contract.ts:222-232` currently conflates.)
2. **`core/derive-beliefs` — the arrival matrix.** Nothing arrives early; day 8 delivers what day 7 did not; official halts at a realm border regardless of standing; rumour crosses but still waits for arrival; `minStanding` filters strata; DELAY shifts, CANCEL kills, DISCREDIT degrades `fiabilite` only; participants know immediately with `WITNESSED`. **Fixture carries ≥ 2 realms and ≥ 3 strata** — the prototype's own comment records that a single-gradient fixture passes while broken (a strong model reasons its way back up a social gradient; it cannot reason across a border).
3. **`core/containment` — the measured claim, as a test.** Port `forbiddenTokensFor`/`checkContainment` from the prototype; assert `getHolderContext` output contains no surface token of any subject the holder has not learned. The one test that would have caught the toll-keeper.
4. **`core/promotion` — the lifecycle.** Uptake promotes; later reconfirmation promotes; same-turn echo does not; confidence alone never does; canon-contradicted provisional → `REJECTED` with **no** `SneqContradictionError` (inverts today's behavior — likeliest to be implemented wrong); promoted + contradicted → contradiction returned, act untouched; stale provisional stays retrievable and promotable 20 turns later; same `operationId` retried → exactly one transition.
5. **`atomic/commit-narrative` — one bundle or nothing.** Inject failure at each write boundary → nothing visible; retry idempotent; and assert the advertised tool surface exposes no unrestricted ledger read (the test that proves v0.4 is one system, not a module with a bypass).

**No prerequisite.** The whole suite is live and green on the work machine — see the verified baseline in the header. The SQLite third of the contract suite runs; nothing gates the start of this work.

**Missing from the five, and each is cheap:** the **migration** (SQLite v3→v4 `figed` → `canonical_attributes` copy-as-`LEGACY_FACT`, and the JSON v1 loader — both are new code with no test in the plan) · **`DispatchPolicy` auto-dispatch** (the structural mitigation of risk §6.1, currently untested) · the **holder resolution cascade** of §2.3 (entity → individual → group → campaign default) · the **clock** (`advance_turn --days`, and that no engine path converts between `turn` and `day`) · and **§11's containment assertion**, which is the one test that maps to the measured result.

---

## 8. Divergences adjudicated (so they do not reopen)

| Question | Kimi | House | Sol | **Adjudication** |
|---|---|---|---|---|
| Shape | A | D (perspective seam) | D (ledger + projections) | **D+D merge** — A's premise refuted by verified R1; the two D's compose |
| `AttributFige` becomes | event layer | `Record` (rename) | `CanonicalAttribute` projection | **Sol** — replace-on-key is *correct* for a projection; records must accumulate, so House's rename fights the storage semantics it keeps |
| `Potentialite`/`Contrainte` | keep, narrowed | keep, wire to machine | **delete** | **Keep and wire** (settled 2026-08-07 with Jean, after the issue #9 amendment and consumer evidence). Sol proved `Potentialite` can't *be* the invention (no value field — verified): the lifecycle lives in `ProvisionalInvention`. But the constraint space stays — `add_constraint` has a live caller (Hermes/Leeloo CLI), a planned caller (Hermes-Agent GDD world rules), grimoire persists the rows (R4), and promotion validation finally gives `validateValue` a reader. Sol's deletion verdict was made against "zero callers"; the caller census was incomplete. |
| Invention expiry | 7-day timeout | scene-scoped drop | **retrieval policy** | **Sol** — deletion reproduces drift; "invisible to the prompt" ≠ "forgotten by storage" |
| Clock | `daysPerTurn` conversion | explicit, fold into `advance_turn` | explicit, separate tool | **House's fold, Sol's semantics** — no conversion exists anywhere; one tool |
| Interception | `status` field | `status` field | `CarriageEffect` ledger | **Sol** — append-only with `causedByEventId` keeps the bribe inside the fiction; status is derived |
| Write surface | +4 tools (14) | 12 tools | composite commit (10) | **Sol** — one atomic bundle; torn writes are real on Convex (verified: no bundle op exists) |
| Version | 0.4.0 | 0.4.0 ("the 1.0 story, shipped honestly early") | 0.4.0 | **0.4.0, unanimous** |

## 9. Version verdict — 0.4.0

Unanimous across three vendors. This is architecturally the 1.0 story, but every load-bearing number in it is unvalidated in play: the salience weights are a prototype guess, the promotion rule is a synthesis of a theory recommendation and an untested reframing, and carriage mechanics have run for zero campaign-hours. **1.0.0 is earned by one full migrated grimoire campaign** in which holder contexts demonstrably prevent leaks without starving NPCs — §6's detectors are how we'll know. Ship 0.4.0, play it, let the numbers promote it. (Fittingly, the release model is the invention model: 0.4.0 enters CONTRAINT; a campaign's worth of uptake promotes it.)

## 10. Explicitly untouched

**Genuinely untouched — three.** Entity resolution + the anti-fork cascade · the router/providers (including the just-shipped usage metrics) · the resolver thresholds.

**Claimed untouched, and in scope after all — five.** The first pass listed seven; verification moved five of them back in. Each is real work, and none of it is budgeted anywhere else:

- **`UserPromptRegistry` / `confirmEntityMatch`** — it writes a *player-observed* alias into a globally readable identity surface. That is the `nomConnu` gap (`SNEQ/02:36`): the theory scoped the name itself per knower, and v0.4 does not.
- **Scenes** — `prepare-turn` changes shape and gains a holder, and `Scene.presentEntityIds` must now feed `event.participants` and the `PARTICIPANT` derogation.
- **GCN** — storage survives; the read surface does not. Its only production caller is `getRelevantFacts` (`campaign.ts:145`), which §3 deletes, so the GCN is kept with no reader (§13).
- **The skill file** — a rewrite, not a content update (§12.3). Its frontmatter `description` is the routing trigger that decides whether an agent loads it at all.
- **The three hooks** — never listed, never safe. `NarrationGateContext` exposes no holder and no beliefs, yet §5.2 puts a per-holder gate inside it. `PreGenerationRegistry` is orphaned: its `triggerKind` union has no `CARRIAGE_ARRIVED`/`DAY_ADVANCED`, its `hint` no `holderId`.

The three-adapter contract seam is untouched *as a seam* — the contract itself gains a dozen methods (§5.4).

---

## 11. Integration surface — the turn pipeline (NEW, 2026-08-08)

### 11.1 Why this section exists

v0.4's load-bearing sentence is: *"there is no way to ask SNEQ 'what is true?' from the tool surface, so a leak requires information the API never handed over."* **That sentence is only true if SNEQ sees the payload that reaches the model.** It never does. A census of the four live consumers shows where the library actually sits:

| # | Stage of a turn | What 0.3.0 offers | Actually used in production |
|---|---|---|---|
| 0 | Composition root | `Engine`, `Repository`, entity resolution | ✅ 4/4 |
| 1 | Player input captured | — | absent |
| 2 | Input interpretation | — | absent |
| 3 | **Knowledge selection** | `prepareTurn` / `getRelevantFacts`, both omniscient | grimoire: **dead** (premise 7); nexus: yes, but shadowed by its own `deriveBeliefs` |
| 4 | **Payload / prompt composition** | — | **4/4 wrote their own** |
| 5 | **Pre-flight assertion on the payload** | — | **0/4 — no consumer can** |
| 6 | LLM call | `Router` (transport) | ✅ 3/4 |
| 7 | **Agent loop + tool calls** | the 10 tools + dispatcher | ❌ **0/4 — `grep -rn "sneq__"` in grimoire returns 0** |
| 8 | Deterministic resolution (dice, systems) | — (out of scope, correctly) | n/a |
| 9 | Output gate | `validateNarration` | ✅ 3/3 — the one seam genuinely adopted |
| 10 | State commit | `registerFact`, `setScene`, `mentionEntity` | partial; grimoire never calls `registerFact` |
| 11 | Post-turn tick | `advanceTurn` | grimoire never; nexus yes |
| 12 | **Cross-turn transcript** | — | absent |

Two conclusions, both uncomfortable and both actionable:

- **The surface designed as primary is the one nobody uses.** Zero of four consumers advertise the SNEQ tools; all four wrote their own tool schemas, dispatcher and agent loop (grimoire `packages/gm/`, 819 lines; nexus `src/turn/pipeline.ts`; rebel `packages/director/`). Holding the protocol "at ten" optimises an unused surface. **Adjudication: the tool protocol is demoted from primary API to one supported binding of the pipeline below.** Keep the ten — they are the right ten — but the library-level pipeline is what ships as the contract, and §12 documents *both*.
- **SNEQ is absent from exactly the three stages that decide whether the thesis holds** — 4, 5 and 12.

Evidence that this is not hypothetical: nexus injects its per-NPC belief line (`What <NPC> knows/believes (only this may inform their behavior)`, `pipeline.ts:134`) **three lines above** an unfiltered `Canon so far: ${canonContext}` dump (`:137`) — an arm-A construction and an arm-B construction in the same prompt. And grimoire re-injects the last twelve journal entries as **raw prior narration** on every call (`packages/gm/src/context.ts:9,95`), unfiltered, unsummarised, unscoped. A perfect per-call perspective filter cannot help either one.

### 11.2 The eight phases

SNEQ does not take ownership of the prompt — every consumer has good reasons to own it (grimoire orders messages slow→fast for DeepSeek prefix caching; nexus has a two-phase propose/narrate split; rebel is offline-first with authored fallbacks). SNEQ takes ownership of the **decisions**, and requires **sight of the final payload**.

| Phase | API | Status |
|---|---|---|
| **A** | `ingestPlayerInput({ holderId, text })` → resolved mentions, detected uptake, player assertions | **NEW** |
| **B** | `getHolderContext(holderId, { about?, topK? })` | ✅ §3 |
| **C** | `renderContextBlock(ctx)` + **`filterTranscript(holderId, entries)`** | **NEW** |
| **D** | **`assertContainment({ holderId, text })`** → `{ pass, forbidden[], present[] }` | **NEW — the decisive seam** |
| **E** | host calls the LLM (`Router` optional) | ✅ |
| **F** | `gateNarration({ holderId, narration })` — holder-aware, may **block** and request repair | ⚠️ exists, advisory and holder-blind |
| **G** | `commitNarrative(bundle)` | ✅ §5.1 |
| **H** | **`tick({ days })`** → arrivals, policy dispatch, cache invalidation, salience decay | **NEW** |

**Phase A — `ingestPlayerInput`.** Also closes a hole §2.6 opens: it promises engine-side promotion detection over `PLAYER_UTTERANCE` text, but §5.1's bundle carries `promotionEvidence[]` **supplied by the caller**, and no tool, CLI command or bundle field ever hands SNEQ the raw player utterance. As written, the model decides its own promotions — precisely what §2.6 forbids ("detected by the engine at commit time, never by the model"). The old ingress was `--source player-utterance` on the deleted `register-fact`.

**Phase C — `filterTranscript` is not optional.** This is the leak that is measurable today. The host holds a transcript; SNEQ must be able to tell it which entries this holder may see, and which must be dropped, summarised or redacted. Without it, v0.4's guarantee expires after one turn.

**Phase D — `assertContainment` is the seam that makes the thesis testable.** The host composes whatever it wants and submits the **final string**; SNEQ answers whether it contains a token this holder cannot hold. This is the only design that both respects consumer autonomy over the prompt and makes "you cannot leak what the API never handed over" an enforceable claim rather than an aspiration. Cost: ~30 lines, already written and already measured (`forbiddenTokensFor`/`checkContainment`, `experimentation-1/prototypes/scaled-audit/engine.ts:414-446`). The only thing the library lacks is `surfaceTokens` per event/record — which §2.1 already specifies. **Default posture: throw.** The prototype does (`run.ts:45-49` — *"the engine is broken, stop"*), because a containment failure is an engine bug, not a gameplay outcome.

**Phase H — `tick`.** `advance_turn` bumps a counter. Somebody has to run the world: deliver arrivals, apply `DispatchPolicy`, invalidate belief caches, decay salience. If that somebody is the GM model, risk §6.1 is the default outcome; if it is the host, it must be one named call. Note grimoire never calls `advanceTurn` at all — its turn counter moves only as a side effect of `setScene` (`src/atomic/decisions.ts:106-124`).

### 11.3 Non-LLM ingress and the `turn` assumption

Everything above is shaped for a text game with a GM agent. Two of the consumer families are not that.

- **The game must be able to write without a model in the loop.** In a 2D/3D game most events are systemic — combat, theft, a quest completing, an NPC watching the player walk past. `commit_narrative` must be callable by game code with no LLM anywhere. rebel already enforces this ordering (*"AI proposes → game validates → world resolves → game commits → AI narrates"*, `ARCHITECTURE.md:9`) and had to keep SNEQ out of resolution entirely to get it.
- **`turn` is a chat-game assumption.** The 3D projects have no turns at all. v0.4 adds `day`, which helps, but `turn` remains a mandatory ordering key on every new type. Provide a monotonic sequence decoupled from the chat turn, or say explicitly that turnless hosts must synthesise one.
- **Latency has no budget.** `get_holder_context` on the hot path of an NPC dialogue in a 3D game is a pure derivation over the whole ledger, on every interaction. §2.5 says "cacheable" and stops there; see the cache gaps in §13.
- `3d-game-gauntlet/docs/VISION.md` §14 leaves *"ce qu'il faut modifier dans SNEQ pour qu'il serve un jeu 3D"* explicitly open, and §8 fixes an invariant SNEQ must serve: **there must always be a free-text input option** — i.e. phase A is required there too.

### 11.4 What the consumers built themselves (the real backlog)

Four independent teams, no coordination, same holes:

- **A per-holder read** — nexus wrote `canKnow` + salience (`src/beliefs/derive.ts:14-39`), experimentation-1 wrote 464 lines of it, rebel wrote a visibility filter and had already named the gap a year ago (*"the game needs explicit access rules to prevent the AI from leaking canonical information into dialogue"*), grimoire went without and leaks by default. **4/4.** This is §3, and it is the right call.
- **An append-only layer over `AttributFige`** — rebel wrote a whole ADR (Family-A keys `<selector>@<seq>@<eventId>` plus a fold), nexus its own `GameEvent[]` with `witnessIds` and `gravity`, arcanum `recentTurns`. **Three independent reinventions** is the strongest possible signal that §2.1 is correct.
- **Free-text facts as a first-class citizen** — nexus built `factKey()` + a djb2 hash (`adapter.ts:42-68`) and lost a fact to an 8-char slug collision; grimoire built incremental `note-N` keys (ADR 0012). Both are workarounds for the same missing API: *record this observation about this entity* without inventing a stable key. **v0.4 does not fix this** — `ProvisionalInvention` still requires an `attributeKey`. It should.
- **De-noising the narration gate** — nexus carries ~500 stopwords, a stemmer and a possessive normaliser and still flags `Ms`, `Cheap's`, `Tastes` every turn; its notes ask twice, by name, for SNEQ's LLM-judge tier.
- **`adopt-or-create`** — all three wrote the same `listCampaigns().some(...)` dance because `createCampaign` throws on duplicates.
- **A `tool` role in `ChatRequest`** — grimoire had to serialise tool calls as prose and add a leak detector after raw JSON reached a player on 2026-07-30 (`apps/web/lib/ai/sneq-router-brain.ts:31-47,59-62`).

**What no consumer wants SNEQ to absorb**, stated identically by all four: the world event resolver, mechanical resolution, RNG, scheduling, intervention windows. nexus: *"the model writes content, never effects"*; rebel: *"AI proposes → game validates"*; 3d-game: *"narration molle, systèmes durs"*. That convergence is free validation for v0.4's scope — provided it stays on the knowledge side of the line.

### 11.5 One correction to the measured claim

§9 and §3 quote "0.80 vs 4.84" (6.05×). The repo's own cross-check corrects it: 10 transcripts re-audited blind by a second model give DeepSeek a recall of **33% on arm A vs 60% on arm B**, so the ratio is inflated; corrected it is **≈4.17×**. `CROSSCHECK.md`: *"the honest reading is a range, not a point: the separation is somewhere around 4-6×, and it is not 10×."* Quote the range. The qualitative result needs no ratio and is stronger: arm B recited a carriage still on the road, crown records across a realm border, a muster notice read by an illiterate stablehand — *"Arm A never did this once, in any transcript, in either batch."*

---

## 12. The agent-facing contract (NEW, 2026-08-08)

### 12.1 The diagnosis: agents did not misread the docs, the API let them fail silently

This has gone wrong repeatedly, and the instinct — "write better docs" — is the wrong lesson. Every documented failure below is an **affordance** failure first and a documentation failure second.

- **The `set_scene` catastrophe.** `set_scene` takes `locationEntityId: EntityID` and `presentEntityIds: EntityID[]`. Grimoire's model types free-text names into them (`packages/gm/src/tools.ts:267`). SNEQ accepts them: they are `string`s at runtime, branded types vanish at compile time, and the tool boundary does not check. `getEntity(name)` then returns `null` for every one, `presentEntities` is silently `[]`, and **the GM prompt has been running with zero canon context in production for months**. No error, no warning, no log. No amount of documentation fixes an API that accepts a wrong value and returns success.
- **The tool descriptions lie, and they are the only doc guaranteed to be in context.** `toolDescriptions` (`src/tools/schemas.ts:89-100`) is shipped to the model on **every single call**. `sneq__get_entity` promises *"with its full set of figed (canonical) attributes"* — which has never been true (§0.5 premise 3). An agent that believes it will never call the read it actually needs. This is the single highest-leverage documentation surface in the repository, and neither the spec nor §10 mentions it.
- **The skill file teaches a loop the engine does not enforce.** `skills/sneq-narrative-engine.md:31` — *"Narrate. Then commit canon."* Nothing checks that step 4 happened. Risk §6.2 ("narration outruns the ledger") is the documented workflow's natural failure mode, and grimoire demonstrates it perfectly: `registerFact` has an adapter and **zero callers**, so the fact layer is empty.
- **The API asks agents to do the thing agents are worst at.** `register_fact` requires inventing a stable `attributeKey`. Two teams independently built hashes and counters to escape it (§11.4). Naming things consistently across a 400-turn campaign is not a reasonable ask of a stochastic process.
- **The pointer of last resort is broken.** The skill file (`:36,:79`) calls `docs/api.md` *"the source of truth"*. That file ships **795 dead links** (483 into `interfaces/`,`type-aliases/`… + 312 `../README.md`) pointing into `docs/typedoc/`, which is gitignored and not packaged. No CI step regenerates or checks it (`.github/workflows/ci.yml` never runs `pnpm docs`), and it is in `package.json#files`, so a stale copy ships to npm.
- **Every new failure mode will be indistinguishable from a crash.** `src/errors.ts` and `cli/errors.ts` gain nothing in v0.4: unknown holder, event-mutation attempt, border block, standing block, promotion rejection, uncovered dispatch route all fall through `formatError` to `INTERNAL_ERROR`, **exit 2** (`cli/errors.ts:96-99`). An agent reads that as "the engine is broken", not "you asked for the wrong thing".

### 12.2 Five rules v0.4 adopts

1. **Make the wrong call impossible, or loud. Never silent.** Validate branded IDs at the tool boundary and reject a non-id with an actionable message: `set_scene: "la taverne du Cerf" is not an EntityID. Call sneq__lookup_entity or sneq__mention_entity first, then pass the returned entityId.` This one check, shipped in 0.4, retro-fixes grimoire's dead context. Every tool that takes an `EntityID`/`HolderId` gets it. **This is a §7 test, not a doc bullet.**
2. **The tool description is the documentation.** It is the only text guaranteed to be in the model's context. Each of the ten gets rewritten to state: what it returns, what it does **not** return, the one failure mode the agent must handle, and the call that must precede it. `get_holder_context` must say in-band that there is no way to ask what is *true* — otherwise the agent will hunt for one and improvise when it fails.
3. **Errors are documentation.** Every v0.4 failure mode gets its own error class, its own CLI exit code, and a message naming the corrective call. Reserve `INTERNAL_ERROR`/exit 2 for genuine engine bugs.
4. **One worked example, executed in CI.** A complete turn — ingest → holder context → containment → commit → tick — as runnable code in the skill file and README, run by the test suite so it cannot rot. No consumer has ever had one; all four reverse-engineered the loop from type signatures, and all four got a different answer.
5. **Docs are generated and verified, not remembered.** `pnpm docs` runs in CI and the build fails on a dirty diff. Note the hard mechanical dependency: `typedoc.json` has a **single entry point** (`src/index.ts`), so the six new domain modules and `core/{derive-beliefs,salience,containment}.ts` are invisible to `docs/api.md` unless they are re-exported from `src/index.ts`. **Miss that and the entire v0.4 type surface is undocumented in the file the skill calls authoritative.** The spec has never mentioned `src/index.ts`.

### 12.3 Deliverable: `skills/sneq-narrative-engine.md` is rewritten, not updated

§10 says the skill file "gets a content update, not a redesign". That is wrong, and it is the document agents actually load. Its spine inverts: the core loop's step 4 (`register_fact`) is deleted; four of seven tool bullets change or disappear; two of six failure modes invert (a canon-contradicted provisional is now `REJECTED` **silently** — today the file teaches "contradictions are normal, adjudicate explicitly"); and `get_relevant_facts` — the documented form of the read §0 calls the actual bug — has its own bullet teaching `depth: 1`.

Worse is what is absent. The frontmatter `description` is the **routing trigger** that decides whether an agent loads this skill at all, and it says *"track canonical entities, facts, scenes, and turns"* — no holder, no world day, no "who knows what". An agent facing a perspective problem will not load it. Nothing tells the agent which holder it is reading for, that "what is true" is unaskable, or that writes are one bundle instead of five ordered calls.

The rewrite must carry, explicitly: the **holder discipline** (every read is for someone); the **id discipline** (never pass a name where an id is required, and how to get one); the **one-bundle write**; the **two clocks** and that narration alone never moves the world; and the fact that promotion is the engine's job, never the agent's.

### 12.4 A conformance harness consumers can run

Ship an executable checklist — `sneq-engine doctor --campaign <id>` or an exported test suite — that an integrating team (or an agent doing the integration) runs to get a verdict instead of a guess:

- every `EntityID`/`HolderId` reaching the engine resolves (**catches the grimoire bug on day one**)
- the scene's `presentEntityIds` are non-empty when a scene exists
- events have been appended in the last N turns (**catches "narration outruns the ledger"**)
- every advertised read is holder-scoped; no unrestricted ledger read is on the tool surface
- `assertContainment` passes for every holder that received a payload this session
- the belief cache's hit rate and invalidation count are sane

Four consumers, four silent misintegrations, zero of them detectable from inside the consumer. This is the cheapest thing in the whole spec and probably the highest-yield.

---

## 13. Documentation & migration work-package (NEW, 2026-08-08)

The spec allocated one UPGRADING headline draft and one clause about the skill file, for a release that deletes two tools, renames the central storage type, adds six domain modules, two clocks and a cache. Owners required.

**Code-adjacent (blocks the build or ships wrong):**
- `src/index.ts` — re-export the six new domain modules + `core/{derive-beliefs,salience,containment}.ts`. **Gate for `docs/api.md` (§12.2 rule 5).**
- `toolDescriptions` (`src/tools/schemas.ts:89-100`) — ten rewritten strings (§12.2 rule 2).
- `src/cli/help.ts:3-18` — an exhaustive `Record<CommandName,string>`; the build fails if not updated in lockstep. Same for `SNEQ_ENGINE_VERSION` (`src/index.ts:1`), pinned by `test/smoke.test.ts:18`.
- `src/errors.ts` + `src/cli/errors.ts` — the new taxonomy (§12.2 rule 3).
- TSDoc on `CanonicalAttribute` explaining projection semantics — `docs/api.md:3463` renders `AttributFige` today with **zero prose**, so the "it is explicitly a current-state projection now" reasoning exists only in this spec.

**Prose:**
- `skills/sneq-narrative-engine.md` — full rewrite (§12.3).
- `README.md` — L18 (the one-line pitch sells constraint propagation, which v0.4 removes), L27 ("three repository adapters" — there are four), L145-146, L191-194 (`register-fact` example using the exact `--source gm-narration` preset the new guard blocks), L202-203, L210 (14→15), L277-281, and the L239-260 architecture diagram (no ledger, no projection, no seam — a redraw).
- `UPGRADING.md` — **structurally unfit before content**: titled "Upgrading to 0.1.0" with a single "Unreleased" bucket, no per-version sections. Its TL;DR (L8-12) promises *"your existing database files keep working untouched (the schema migration is automatic and additive)"* — false under §5.4, which renames `figed` and bumps the JSON format. That is the most damaging stale sentence in the repo. Must also gain the Convex tables/validators/backfill section §5.4 mandates, and note the removal of `propagate` + `PropagationInput`/`PropagationResult`/`ContraintePropagee` from the public API (`src/index.ts:138`) — absent from the headline draft.
- `docs/api.md` — regenerate; fix or strip the 795 dead links; add `pnpm docs` + dirty-diff check to `.github/workflows/ci.yml`.

**Migration, unaddressed:**
- Observation blob rewrite for the `fiabilite` removal (§0.5 premise 6) — not in the schema-v4 list.
- The **day-0 legacy epoch** consequence, stated honestly in §4 but not followed through: every pre-0.4 fact lands in one bucket, so any day-ordered query over a migrated campaign returns the whole legacy corpus at once. Grimoire's backfill is where this lands.
- `MemoryState`/`emptyMemoryState()` are published types on `sneq-engine/memory`; adding seven ledger collections is a breaking change to them, and `PersistedShape` (`json/index.ts:51`) embeds `MemoryState` verbatim.
- No `decideCommitNarrative`. The six pure `decide*` fns are published on `sneq-engine/atomic` and are how the out-of-tree Convex adapter shares SNEQ's rules. Without an equivalent, the one consumer this spec calls load-bearing re-derives promotion, contradiction and transition logic by hand.

**Design gaps still open (carried from the audit, not yet resolved in the body of this spec):**
- **`DispatchPolicy` has no home** — absent from §5.4's contract additions, from the tool surface, from the CLI, and from `EngineConfig`. It is the structural mitigation of risk §6.1.
- **Salience weights** are "a config constant" with no slot in `EngineConfig`.
- **The belief cache is under-specified**: `revision` is undefined (`entityRevision()` covers entities only), and — the real hole — `CarriageEffect` is append-only and may be dated *after* the arrival it delays, so beliefs for a **past** day change; a key of `(campaignId, holderId, day, revision)` cannot express that. `SNEQ/05` already has the machinery (`dependDe`, `indexParEntite`, `invaliderDependants()`, tombstones, `CacheStats`) and is uncited.
- **The event → `CanonicalAttribute` projection rule is never given** (which act produces which key?).
- **`Belief.content` derivation is never given.**
- **`getHolderContext({ about })`** filters by entity, but `Belief.subject` is `EVENT | RECORD` — an event→entity index is needed and is not in the contract.
- **Place → realm has no source of truth**: `Carriage` carries both `fromPlaceId` and `originRealm`, and no entity carries a realm.
- **`surfaceTokens`: who produces them**, model or engine? Load-bearing for both containment and uptake.
- **`gravity` is model-supplied** yet drives auto-dispatch and 40% of salience — in tension with "the model writes content, never effects".
- **No direct canonical write remains** once `register_fact` is deleted: seeding a character sheet at setup would require fabricating events.
- **The GCN is kept with no reader** — its only production caller is `getRelevantFacts` (`campaign.ts:145`), which §3 deletes; and `SNEQ/03:132-162` has `connu_publiquement`/`publique` relation flags, i.e. an unfiltered secret-relations channel straight through the seam.
- **Deprecation policy is inconsistent**: `AttributFige` keeps an alias to 0.5 for the out-of-tree consumer, while `getRelevantFacts` — which the same consumer reaches through `prepareTurn` — is deleted outright with no window.

**Theory to reconcile (5 of 8 SNEQ docs are never cited):**
- `SNEQ/06:219` — *"PERSPECTIVE — Un fait peut être vrai d'un point de vue, faux d'un autre"* is the theory's warrant for the entire seam, uncited.
- `SNEQ/04:193-201` already has `connaissances`, `reputations`, `temoinPresents` — beliefs, standing and `WITNESSED` — but as **generation** inputs, where v0.4 builds only the read filter. Say whether the generation side is out of scope.
- `SNEQ/07` §7.3 `HIERARCHIE_NARRATIVE` (`heriteDe`) is §2.3's holder cascade, one level richer.
- `SNEQ/02:36 nomConnu` scoped *the name itself* per knower — the identity leak §3 leaves open.
- The §2.5 warrant ("contrainte souple immédiate, convertie en stricte si confirmée") is quoted verbatim but sits under **"2.5 Questions de Conception"** — an open question, still open in `SNEQ/08:300` — and its subject is **rumour handling**. v0.4 transplants the mechanism onto GM inventions and leaves rumours with **no promotion path at all**. Restore it or document the divergence.

---

## 14. Embeddings & the zero-setup default (NEW, 2026-08-08)

### 14.1 The default exists and nobody uses it

`src/router/defaults.ts` already ships Google `text-embedding-004` (768 dims) as the embeddings primary, with `fallbacks: []` and a correct comment explaining why (a fallback of a different dimension would poison writes on failover). Adoption across the four consumers:

| Consumer | Embeddings |
|---|---|
| nexus-dynamics-rpg | `embeddingDim: 0` — *"alias-only resolution; no embeddings key needed"* (`adapter.ts:295`) |
| rebel-political-narrative-game | `embeddingDim: 0`, three call sites (`store.ts:92,211,215`) |
| grimoire | **Venice AI at 4096 dims**, via a hand-written `VeniceEmbeddingProvider` (`lib/ai/providers.ts:68`) |
| arcanum | bypasses SNEQ for this entirely |

**0/4 use the default chain.** Two disabled vectors outright; one wrote its own provider. The vector rung of the resolver cascade — `alias → vector → LLM judge → user-prompt` — is therefore dead in most of the fleet, which quietly degrades entity resolution to alias-only and makes the anti-fork guarantee weaker than the README advertises.

### 14.2 Why setup is hard: three walls at once

1. **The key.** Account, project, env var. Any key-based default keeps this wall standing.
2. **`embeddingDim` is chosen at campaign creation and is then immutable.** A mismatch throws *"Use a fresh database file or a matching --embedding-dim"* (`sqlite/index.ts:51-52`), and there is **no reindex path anywhere in the contract**. The dimension must be decided before the first write, irreversibly, at the moment the author knows least. `0` is the only choice that commits to nothing — which is very likely the whole explanation for the census above.
3. **`sqlite-vec`** is one more optional native peer to install.

Wall 2 is the interesting one, and it is ours, not the provider's.

### 14.3 A three-rung ladder

The `Provider` abstraction already supports this; only rung 0 is new.

```ts
embeddings: "local"    // rung 0 — 384 dims, no key, no account, offline after first fetch
embeddings: "google"   // rung 1 — today's default; free tier, one key
embeddings: { provider: "openai-compatible", baseUrl: "…" }   // rung 2 — what grimoire does
```

Rung 0 must ship as an **optional peer dependency**, exactly like `better-sqlite3` and `sqlite-vec`: `@huggingface/transformers` pulls ~380 MB of `node_modules` (onnxruntime) and cannot be imposed on consumers who do not want it.

### 14.4 Measured, on the work machine (2026-08-08, Node v24.13.0, Apple silicon)

Real entity-resolution cases in French — a mention against candidate canonical entities:

| Model | Dims | On-disk | Verdict |
|---|---|---|---|
| `Xenova/all-MiniLM-L6-v2` (English) | 384 | 97 MB | weak on FR (0.598 vs 0.430 FR↔EN) |
| `Xenova/multilingual-e5-small` | 384 | 465 MB | ❌ **ranks the wrong candidate**, margin 0.0024 |
| `Xenova/paraphrase-multilingual-MiniLM-L12-v2` | 384 | 449 MB | ✅ margin 0.170 |
| ⭐ same, `dtype: 'q8'` | 384 | **113 MB** | ✅ **4/4 cases**, 119 ms / 50 texts |

Recommended rung 0: **`Xenova/paraphrase-multilingual-MiniLM-L12-v2`, `dtype: 'q8'`, 384 dims.** Warm load ≈1 s, **3.5 ms per text**, 113 MB on disk, no key, no network after the first fetch.

**The trap, and it must be documented, not discovered:** `multilingual-e5-small` ranked *"La Forge de Valmure"* (the place) above *"Aldric Fervent — forgeron"* (the person) for the mention *"le forgeron"*, and compresses every score into 0.75–0.81. That flat band would wreck the resolver's `tauLow`/`tauHigh` thresholds, which assume a usable spread. **Embedding models are not interchangeable behind one `embeddingDim`**, and checking this costs twenty lines. Any documented alternative model ships with its measured spread, or it does not ship.

*(Free-tier quotas for Gemini, Mistral, Cloudflare Workers AI and HF Inference were **not** verified for this amendment — no web access in the session. Do not write rate-limit numbers into the docs without re-checking them.)*

### 14.5 What v0.4 owes this

- **`reindexEmbeddings(vectors)` + `setEmbeddingDim(dim)` on the repository contract (§5.4).** Moving from rung 0 (384) to rung 1 (768) must be a supported migration, not "start a new campaign". v0.4 already migrates SQLite to schema v4 and JSON to version 2 — this is the only moment where the cost is near zero. Without it, rung 0 becomes a trap of its own: the easy default that cannot be upgraded.
- **A §12-shaped error.** The current dim-mismatch message says *what* to do and never *why*, and arrives after the campaign is unusable. It should name the reindex call, and campaign creation should state the consequence of `embeddingDim: 0` at the moment of choosing it.
- **README correction.** L24 sells the degraded alias-only mode as being "for demos, prototypes, and providers without an embeddings endpoint". In practice it is what two production consumers run. Either rung 0 makes vectors the easy path, or the README should stop implying that keyless mode is a toy.

## UPGRADING.md headline (draft)

> **0.4.0 — Stratified knowledge (breaking).** SNEQ no longer answers "what is true" on the path to the model — only "what does this holder know." `getRelevantFacts` and `register_fact` are gone: write through `commit_narrative` (events, records, carriages, inventions — one atomic bundle), read through `get_holder_context` (beliefs ranked by engine-computed salience, delivered by carriages that arrive on a world day you advance yourself). Facts you stored are now `CanonicalAttribute` projections (`AttributFige` alias kept until 0.5); reliability lives on beliefs, not facts; turns no longer move the world.

---

## Amendment log

The body above carries only the current decision. This log carries how it got there — three passes, each of which reversed something the one before it had settled. Read it when a decision looks arbitrary; the reason is usually here.

**2026-08-06 — the round.** Three-minds design round (Sol / Kimi K3 / House-Opus) over issue #9, the v1 theory (`SNEQ/01..08`) and the 0.3.0 code at `e2843a0`. Produced §§0–10: the two false premises in #9, the D+D shape merge, and the eight adjudications in §8. Kimi's shape A was refuted by verified premise 1 and did not survive the round.

**2026-08-07 — review with Jean, plus the issue #9 amendment (tool-surface analysis).** Five changes, each superseding round output: lazy holder creation (§2.3, replacing upfront authoring) · `DispatchPolicy` auto-dispatch (§2.4, superseding the round's "never auto-dispatch") · `add_constraint` kept and re-founded rather than deleted, two roles, all six rule types (§2.6, superseding Sol's deletion verdict, which rested on an incomplete caller census) · the `GM_NARRATION` guard adopted (§2.6) · containment and canary filed inside `validate_narration` (§5.2). Consumer census corrected: grimoire is not the only consumer — Hermes/Leeloo drive the CLI in live play.

**2026-08-08 — verification pass** over the 0.3.0 code, the repo docs, the v1 theory, the **four live out-of-tree consumers** (grimoire, nexus-dynamics-rpg, rebel-political-narrative-game, arcanum) and the research prototype (`experimentation-1`). Four structural additions — §0.5 (seven premises of *this* spec, corrected) · §11 (the integration surface, because v0.4's central claim is unreachable at the single insertion point 0.3.0 offers) · §12 (the agent-facing contract as a deliverable) · §13 (the documentation work-package) — plus §14 (embeddings without setup, and a migration path for the locked dimension). It reversed the previous day on one point: **containment moved out of `validate_narration` to a pre-flight assertion** (§11 phase D), per the docstring of the prototype the spec cites. It also withdrew the `better_sqlite3` blocker, which was never real.

**2026-08-08, later — consolidation.** No new findings. The three passes had left the body self-contradicting in seven places: §0 on `get_entity` and on the sqlite blocker, §3 on the measured ratio, §5.2 on `add_constraint`'s signature and on where containment lives, §7 on the prerequisite, §10 on what is untouched. Each was rewritten to state the surviving decision once, and the chronology moved here. Status changed from DRAFT to *spec of record — open frontier*, pointing at map #10 for what remains undecided. Nothing in the design changed.
