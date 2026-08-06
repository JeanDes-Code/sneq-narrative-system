# sneq-engine v0.4.0 — Stratified knowledge: spec

**Date:** 2026-08-06 · **Source:** three-minds design round (Sol / Kimi K3 / House-Opus) over issue [#9](https://github.com/JeanDes-Code/sneq-narrative-system/issues/9), the v1 theory (`SNEQ/01..08`), and the 0.3.0 code at `e2843a0`.
**Status:** DRAFT — reviewed with Jean 2026-08-07. Every load-bearing claim below was re-verified against the code by the synthesizing session; mind attributions are noted where a finding was unique.

**Amended 2026-08-07** after review with Jean and the issue #9 amendment (2026-08-06, tool-surface analysis): lazy holder creation (§2.3) · `DispatchPolicy` auto-dispatch (§2.4, supersedes "never auto-dispatch" in §6.1) · `add_constraint` kept and re-founded, two roles, all six rule types (§2.6) · `GM_NARRATION` guard adopted (§2.6) · `validate_narration` hosts the containment/canary gates (§5.2). Consumer census correction: grimoire is not the only consumer — Hermes/Leeloo call the CLI in live play, and the Hermes-Agent GDD plans `add_constraint` as its world-rules system (with the caveat recorded in §2.6: the auto-propagation it describes never existed in 0.3.0).

---

## 0. What the round changed about the problem

Issue #9's plan rested on two factual premises about 0.3.0. Both are false, and two of the three minds independently proved it (Sol §0.1, House R1/R2; Kimi missed both and its recommendation inherited the error):

1. **"Event — immutable, append-only. This is `AttributFige` as it stands."** — No. `AttributFige` is a **last-write-wins projection** keyed by (entity, key): the contract test *requires* replacement (`test/repository/contract.ts:222` — `"facts: replace-on-same-key"`), SQLite writes `INSERT OR REPLACE INTO figed` (`src/repository/sqlite/index.ts:238`), memory does `Map.set(entityId|key)` (`src/repository/memory/index.ts:194`). The event layer does not exist; it is new work.
2. **"Move two existing mechanisms onto the right layers."** — There is no mechanism to move. `canTransition`/`assertTransition` have **zero production call sites**; the only writer of `etat` sets `"CONTRAINT"` unconditionally (`src/atomic/decisions.ts:35`), and `Potentialite.etat` excludes `FIGE` at the type level (`src/domain/potentialite.ts:41`). The state machine is vocabulary, not behavior. The promotion loop gets **implemented for the first time**, not relocated.

Two more findings that reshape scope:

- **The omniscient read is the actual bug** (House, decisive; Sol converged). `getRelevantFacts` (`src/campaign.ts:139-152`) returns every fact of the entity and, at depth 1, every fact of every neighbor — unfiltered, unranked. It is one of the ten advertised tools and it is what grimoire calls to build GM context. This is Arm B of the experiment (96% scene leakage) reproduced *inside* the library. `get_entity` and `prepare-turn` leak the same way (Sol §0.4).
- **A fourth repository adapter exists out of tree** (House R3). Grimoire implements the full `Repository` contract on Convex (`grimoire/apps/web/lib/canon/convex-sneq-repository.ts:125,153`) and persists `Potentialite` rows. Deleting the constraint types is a cross-repo data migration, not a free move. Convex stores rows as `payload` blobs behind `as AttributFige` casts that TypeScript will not police.

The theory largely sides with the issue, more than the issue knew (House T1/T2, verified): the v1 docs count time in `{ jour, heure }` — `turn` is a 0.3.0 invention — and `SNEQ/02` §2.5 already prescribes "contrainte souple immédiate, convertie en stricte si confirmée", which is the promotion mechanism issue #9 rediscovered. And `SNEQ/01` §1.8: "Les faits FIGÉS ne sont jamais modifiés. Seule l'interprétation peut évoluer" — the player floor was already doctrine.

**Practical blocker found on the way (House R6, reproduced):** the test suite fails locally — `better_sqlite3.node` is compiled for `NODE_MODULE_VERSION 137`, machine runs Node v26.4.0. `pnpm rebuild better-sqlite3` before any of this work starts; until then the SQLite adapter is unverified.

---

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

Raw truth (`getEvents`, `getRecords`, `getCanonicalAttributes`) remains available to *trusted application code* — save inspection, admin UIs, tests — but is **not on the agent tool surface**. You cannot leak what the API will not hand you: this is the structural form of "one context window cannot withhold from itself", and it is the part that maps 1:1 to the measured 0.80-vs-4.84 separation.

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
| **changed** | `sneq__get_entity` (identity only) · `sneq__advance_turn` (+ optional `days`) · `sneq__add_constraint` (same signature; now the entry of the provisional layer — single-value `DOIT_ETRE` → `ProvisionalInvention`, exclusion rules → promotion-time validation) · `sneq__validate_narration` (gains the containment + canary gates from experimentation-1#19 as a runtime `strict` mode — the amendment's point that the output gate mostly ships already) |
| **unchanged** | `lookup_entity`, `suggest_existing`, `mention_entity`, `set_scene` |

One composite write beats five order-sensitive writes in an agent loop; tool count is a real cost (deep modules: much behavior, small interface).

### 5.3 CLI (14 commands)

`get-relevant-facts` → `get-holder-context`; `register-fact` → `commit-narrative`; `advance-turn --days N`; `prepare-turn --holder <id>`; add `upsert-holder`. Everything else unchanged.

### 5.4 Repository contract + adapters

Contract gains: `appendEvent`/`getEvents`, `appendRecord`/`getRecords`, `upsertHolder`/`listHolders`, `appendCarriage`/`listCarriages(toPlaceId?, arrivedBy?)`, `appendCarriageEffect`, `appendInvention`/`appendInventionTransition`/`listInventions(status?)`, clock get/set. The contract test must assert **the absence of any event mutation path** — unusual, and the point.

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

**Prerequisite:** `pnpm rebuild better-sqlite3` — until then the SQLite third of the contract suite is decorative.

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

Entity resolution + anti-fork cascade · `UserPromptRegistry` / `confirmEntityMatch` · Router/providers (including the just-shipped usage metrics) · scenes · GCN storage · the three-adapter contract seam · skill file (`skills/sneq-narrative-engine.md` gets a content update, not a redesign).

## UPGRADING.md headline (draft)

> **0.4.0 — Stratified knowledge (breaking).** SNEQ no longer answers "what is true" on the path to the model — only "what does this holder know." `getRelevantFacts` and `register_fact` are gone: write through `commit_narrative` (events, records, carriages, inventions — one atomic bundle), read through `get_holder_context` (beliefs ranked by engine-computed salience, delivered by carriages that arrive on a world day you advance yourself). Facts you stored are now `CanonicalAttribute` projections (`AttributFige` alias kept until 0.5); reliability lives on beliefs, not facts; turns no longer move the world.
