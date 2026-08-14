# sneq-engine — Stratified knowledge: spec

**Ships as 0.5.0.** There is no 0.4.0 release — `0.4` is the internal build milestone (§9). This file's name, the `v0.4` label on the map, and the "v0.4" wording throughout the body all predate that decision and are kept so existing links resolve. Read "v0.4" as "this design", not as a release.

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

1. **`operationId` dedup does not exist.** §5.1 says `commit_narrative` is "idempotent by `operationId` (existing dedup rules apply)" and §7.4/§7.5 test retries against it. `operationId` is *written* 7× (`src/campaign.ts:130,161,243,271,286,300,315`), *declared* once with a doc comment promising dedup (`src/atomic/types.ts:10-11`), and **read zero times** in `src/`. `repositoryAtomicWriteStrategy` never consults it. Idempotency is **new work**, not an existing rule. (It is real in grimoire's Convex adapter — `findCompletedOperation`/`recordOperation`, `convex/canonMutations.ts:446,466` — which is why it looks like it exists.) `docs/api.md` documents the guarantee as if shipped, on npm. *Ruled 2026-08-14 ([#29](https://github.com/JeanDes-Code/sneq-narrative-system/issues/29)): 0.5.0 builds it engine-side — `recordOperation`/`findOperation` in the §5.4 contract, per-campaign bounded retention; §7.4/§7.5 test the built mechanism. The docs half already shipped in 0.3.1.*
2. **The `better_sqlite3` blocker is not real.** See §7. Node v24.13.0; 313/313 tests pass.
3. **`get_entity` does not leak.** §0 says it "leaks the same way" and §3 "narrows" it. `campaign.ts:122-125` returns a bare `Entity`, and `Entity` (`src/domain/entity.ts:26-38`) has no attribute field — there has never been a dump. The false claim lives in `toolDescriptions` (`src/tools/schemas.ts:91`: *"with its full set of figed (canonical) attributes"*), i.e. in the in-band documentation the model reads at call time. §3's narrowing is a one-line doc fix. (`prepare-turn` **does** leak, as claimed: `campaign.ts:362-369`.) The real unaddressed identity leak is `Entity.description` — persisted GM prose handed to any caller — plus aliases; the theory scoped exactly this with `nomConnu` (`SNEQ/02:36`), and §7.3's containment test does not cover it.
4. **The uptake extractor is capitalization-only.** §2.6 promises "no new NLP" by reusing `validate-narration`'s extractor. `isProperNounCandidate` (`src/core/validate-narration.ts:288-294`) requires an uppercase initial and caps sequences at 3 tokens. Lowercase surface tokens — *la cicatrice*, *le bac*, *la taxe* — are **never** extracted, so `PLAYER_UPTAKE` under-fires exactly where inventions are most common. This is risk §6.3 arriving through the front door, and the two are not connected in the text. Also, `extract` is an instance method on a `Validator` requiring `Resolver` + `Router`; standalone use needs a free function. *Resolved 2026-08-14 ([#25](https://github.com/JeanDes-Code/sneq-narrative-system/issues/25)): §2.6 no longer uses the extractor for uptake — known-token substring search over the utterance. The code still reads as described; nothing depends on it any more.*
5. **`add_constraint` cannot keep "the same signature" and serve two roles.** `decideAddConstraint` hardcodes `source: { kind: "INFERENCE_IA", confidence: 0.7 }` (`src/atomic/decisions.ts:20`) and `etat: "CONTRAINT"` (`:35`). Every constraint is `INFERENCE_IA`, so §2.6's discriminator ("a single-value `DOIT_ETRE` sourced `INFERENCE_IA` → provisional") matches *everything* and `REGLE_MONDE` (`src/domain/potentialite.ts:9`) has no producer. The signature must gain an explicit role/source. *Adopted 2026-08-14 ([#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19)): the signature gains it.* Related: `validateValue` cannot simply "gain its first readers" — `IMPLIQUE` and `CORRELE_AVEC` unconditionally `return { ok: true }` (`src/core/validation.ts:96-98`), and `ValidationContext` demands a strict/soft split that `Contrainte` has no field to express (still open — [#23](https://github.com/JeanDes-Code/sneq-narrative-system/issues/23)'s audit).
6. **`Observation.fiabilite` cannot be removed by declaration.** §2.2 types `OfficialRecord.observation` as `Observation` while saying "fiabilite REMOVED" — but `fiabilite` is **required** on `Observation` (`src/domain/observation.ts:24`). Introduce a distinct `Provenance` type. Removal also breaks `src/cli/observation.ts:5-11` (the `Pick<>` and all four presets), the zod schema (`src/tools/schemas.ts:36`), and leaves a stale key in every persisted `figed.observation` blob (`sqlite/serialization.ts:87`) — with **no blob migration** in §5.4's schema-v4 list. Mitigating finding: nothing in `src/` ever *reads* `fiabilite` for a decision, so the break is type/serialization only. *Ruled 2026-08-14 ([#18](https://github.com/JeanDes-Code/sneq-narrative-system/issues/18)), superseding this entry's `Provenance` proposal: the field is deleted from `Observation` itself — no parallel type, which would silently accept and drop the literal (grimoire's live failure mode). Riders adopted: strict tool-boundary rejection of the key (0.3.1 doctrine), the blob migration added to §5.4's list, the presets rewritten.*
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
  sets?: { entityId: EntityID; key: string; value: AttributValue;
           category: CategorieAttribut };   // the act's declared canonical effect (#27, §2.6)
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
  surfaceTokens: string[];         // the containment/canary alphabet — model-supplied + engine floor (#25)
}
```

**`surfaceTokens` producer — both, engine as floor** (decided with Jean, 2026-08-14, [#25](https://github.com/JeanDes-Code/sneq-narrative-system/issues/25)). The model supplies distinctive phrases in the commit bundle — it already writes `circumstance`, and only it knows the identifying surface of the event. The engine guarantees a mechanical floor on top: display name and aliases of every participant, the place, every `objectId` — registry lookup, no NLP. `verb` is excluded: taxonomy strings do not occur in prose and only add false positives. Records get the same floor (subject entity names, the record `key`, `value` when textual). Commit validation rejects any supplied token that does not appear as a substring of `circumstance` or an act value — a token absent from content cannot leak, it can only false-positive against innocent prose. An **empty model set is legal**: the floor still applies; a lazy caller degrades only uptake detection for its own inventions. Measured basis: the phase-D containment run used **hand-authored lowercase phrases** (*droit sur la laine*, *quatre jours de geôle* — `experimentation-1/prototypes/scaled-audit/fixture.ts`) that the capitalization-gated extractor could never produce; the safety property was never extraction's to carry.

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
  observation: Observation;        // provenance ONLY — fiabilite DELETED from the type itself (#18)
  day: number;
  turn: number;
  surfaceTokens: string[];         // containment alphabet, same producer rule as events (#25; ratified 2026-08-14)
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
  realmId: EntityID;               // the realm entity (#26) — realms are entities, not strings
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

- **Bootstrap**: campaign creation seeds one default realm **entity** (#26) and one default community with a single stratum. `get_holder_context` never returns empty for lack of authoring.
- **Resolution cascade** (mirror of the entity cascade): entity → its `INDIVIDUAL` holder if a derogation was declared → its `community × stratum` group if declared → the campaign default group.
- **Auto-derogation by participation** (decided with Jean, 2026-08-14, [#28](https://github.com/JeanDes-Code/sneq-narrative-system/issues/28)): when the cascade resolves an entity that appears in ≥ 1 event's `participants`, the engine materializes its `INDIVIDUAL` holder (`derogationReason: "PARTICIPANT"`) lazily, at that moment — participation *is* the declared reason, and the fiction touching the NPC is the trigger, the same principle as the rest of this list. The cost ceiling comes free: rows exist only for entities the fiction actually asks about — bounded by real play, never by cast size, which is exactly the cap that made per-NPC memory unaffordable and makes this affordable. `PERSONAL_STAKE` stays an authoring act (`holders[]`): a stake cannot be derived mechanically, and "deviation for a reason is drama" is about exactly this case. **The resulting texture is intended, not a gap**: named NPCs diverge by what they witnessed and by declared stakes; background NPCs of one stratum genuinely share the stratum's memory.
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
  originRealm: EntityID;           // engine-stamped at dispatch from fromPlaceId (#26) — never caller-supplied
  destinationRealm: EntityID;      // engine-stamped at dispatch from toPlaceId (#26)
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

**Realm source of truth** (decided with Jean, 2026-08-14, [#26](https://github.com/JeanDes-Code/sneq-narrative-system/issues/26)). A realm is an **entity** — a fiction object narration will mention, so it becomes one through `mention_entity` anyway; as an entity it gets aliases and resolution for free. A place carries `realmId?: EntityID` as **entity metadata** (like `description`), not as a canonical attribute — conquest is a metadata update, and the seeding gap (§13) is not inherited. The engine **stamps** `originRealm`/`destinationRealm` at dispatch from the endpoints; the caller never supplies them — the typo that silently disabled the halt has nothing left to type — and a later conquest never rewrites whether a past carriage halted (snapshot, not live derivation, which would also destabilize the belief cache). A place without a declared realm belongs to the campaign's default realm: `realmOf(place) = place.realmId ?? defaultRealm`. A campaign that never declares realms never halts anything; declaring one place foreign creates the border to everywhere-default. No nulls, no unevaluable state, no rejected dispatch. `doctor` (§12.4) lists default-realm places once ≥ 2 realms exist. §7.2's ≥ 2-realm fixture is now writable: default realm + one declared foreign realm entity + one `realmId` assignment.

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

At `commit_narrative`, the engine matches the event's gravity against the rules and creates the carriages itself, using the route table. Policy-dispatched carriers are **generic but labelled** ("une caravane marchande") — a carrier becomes a named NPC only when the player engages with it: the promotion pattern applied to carriers, a generic carrier being exactly a provisional detail. The library owns the contract, the game owns the map: policy and routes are game-supplied data.

**Authoring surface** (decided with Jean, 2026-08-14, [#15](https://github.com/JeanDes-Code/sneq-narrative-system/issues/15)). The policy lives in **campaign state**, persisted by the repository — the contract gains `getDispatchPolicy` plus writes through the bundle, closing §13's "no home" gap. Two authoring roads. **In fiction**: `commit_narrative` accepts additive `policy.routes[]` / `policy.rules[]` — the `holders[]` pattern; the mountain pass is declared in the same bundle as the first event that uses it. **Out of band**: a CLI pair `show-dispatch-policy` / `set-dispatch-policy` for campaign setup and inspection (§5.3). The tool surface stays at ten. **Bootstrap seeds default rules and zero routes**, mirroring §2.3's holder bootstrap (e.g. gravity ≥ 2 → `RUMOUR` toward `ALL_KNOWN_COMMUNITIES`, generic carrier); routes cannot be seeded — SNEQ owns no map. Until the fiction declares its first route, rules fire and find nothing, and that state is **counted, not silent** (§6.1's unroutable counter): legal-but-deaf becomes legal-but-loud, and the campaign talks from the first declared route. **Fan-out cap** (#13 D5): `EngineConfig.maxDispatchFanout`, default **64** — `ALL_KNOWN_COMMUNITIES` scales with the campaign, and the Convex bundle is one mutation with a document-write ceiling. Truncation is deterministic and fiction-sensible — targets reachable by shortest declared `travelDays` first, news travels near-first, game-declared data only — and always loud: a counter plus a `doctor` line, so a capped gravity-3 event is never silently partial.

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
  surfaceTokens: string[];         // uptake alphabet — §2.6's match reads these (#25; ratified 2026-08-14)
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
  atDay: number;                   // the fold orders promotions by (atDay, atTurn) (#27; ratified 2026-08-14)
  atTurn: number;
  evidence?: PromotionEvidence;
  supersededBy?: InventionId;
}
```

- **`AttributFige` → `CanonicalAttribute`**: stays replace-on-key **because it is explicitly a current-state projection now** — its history lives in events and invention transitions. Gains `source: { kind: "EVENT" | "PROMOTED_INVENTION" | "LEGACY_FACT"; … }` and `day`; `observation` becomes **optional** — EVENT/PROMOTED rows carry provenance in `source`, LEGACY_FACT copies keep theirs (ratified 2026-08-14). **No deprecated alias.** An earlier draft exported `AttributFige` through 0.4 and removed it in 0.5, as a migration window for the live out-of-tree consumer. There is no intermediate release to migrate through (§9), so the rename is a clean break at 0.5.0 and grimoire migrates as part of that work.
- **The projection rule** (decided with Jean, 2026-08-14, [#27](https://github.com/JeanDes-Code/sneq-narrative-system/issues/27)): `CanonicalAttribute` is a **deterministic fold over the ledger** with exactly the three producers the `source` union names.
  1. **Act `sets`** (§2.1): an act projects **only** through its explicit, caller-declared `sets` — the engine never interprets `verb` (the same line as `travelDays`: SNEQ owns no fiction semantics). *Walks* projects nothing because it declares nothing; `category` is declared, never inferred. Applied in `(day, turn, ledger sequence)` order, last writer wins — replace-on-key is state **evolution**, which resolves 0.3.0's split intention (`decideRegisterFact` refuses a differing value while SQLite is `INSERT OR REPLACE` and the contract test requires replacement) in favour of replace. The GM_NARRATION guard becomes structural: a `sets` rides on an on-ledger act and projects; a free-floating assertion with no act to hang on routes to the provisional layer, whatever the caller claims. A fake act smuggling an assertion is possible but **loud** — it sits in the append-only ledger.
  2. **Invention promotions**, per the lifecycle above.
  3. **`LEGACY_FACT`** migration rows — whether they get backing synthesized events is [#17](https://github.com/JeanDes-Code/sneq-narrative-system/issues/17)'s question, not preempted here.

  **Records never project.** An `OFFICIAL` record reaches canon only as `OFFICIAL_RECORD` promotion evidence, validated against constraints; direct projection would collapse §2.2's record-contradicts-event entitlement. "Which wins on the same key" is void. `SneqContradictionError` gets its one precise home: two `sets` on the same key with different values **inside one commit** — a self-contradicting bundle, a caller bug. Across commits it is replacement; promotion-vs-canon stays the silent `REJECTED` below. Contract test: `rebuild(ledger) === projection` — which is also the SQLite v3→v4 migration tool §13 needs. **Seeding is a genesis event**: campaign setup commits a day-0 event carrying the character sheet as `sets` — one write path, replay holds, initial conditions recorded honestly as initial conditions, and §13's direct-canonical-write gap closes.
- **`add_constraint` is kept, re-founded on an engine-internal basis** (decided with Jean, 2026-08-14, [#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19); supersedes the 2026-08-07 caller-based founding). The promotion-validation loop above needs a **constraint author**: an invention promotes only after validating against canon + exclusion constraints (#27), so an empty constraint space makes the collapse loop vacuous — exactly the failure that made rebel-political-narrative-game delete its `addConstraint` call (`validateValue` inert, zero readers). `REGLE_MONDE` gets its first producer; `validateValue` gains its first readers, **consulted at promotion and at commit validation**; all six rule types kept (`DOIT_ETRE`, `NE_PEUT_PAS_ETRE`, `IMPLIQUE`, `CORRELE_AVEC`, `RANGE_NUMERIQUE`, `REGEX`). The signature gains an explicit **role/source** — §0.5 premise 5 forces it: today everything is hardcoded `INFERENCE_IA` and `REGLE_MONDE` has no producer. Kept as *behavior*, no longer a founding: a single-value `DOIT_ETRE` sourced `INFERENCE_IA` lands as a `ProvisionalInvention` (the lifecycle `Potentialite` structurally cannot hold) — but the projection rule already routes free-floating assertions to the provisional layer, so this door is a convenience, not a reason the tool exists.

  **The honest caller evidence** (census #14 + its addendum): live play (Hermes/Leeloo CLI) uses nine commands and **never** `add-constraint`; the only code caller deleted the call on 2026-07-30 after finding `validateValue` inert; the Hermes-Agent GDD **exists** and plans all six rule types as its world-rules system — written against machinery that never ran, so it must be rewritten against the 0.4 contract either way (consumer-side, out of scope here).

  **Corrections on the record — two consumer misconceptions, each with its consumer.** Rebel-political-narrative-game expected **write-time enforcement** ("add a constraint → invalid values get rejected"); nothing read `validateValue`, so nothing enforced, and the caller left — 0.4 fixes exactly this by wiring validation into promotion and commit. The Hermes-Agent GDD expects **auto-propagation and value mutation** ("register a fact → connected entities receive constraints through the GCN"; "attribute += 1 per day" via `IMPLIQUE`) — machinery that has never run (`propagate()` has zero call sites in 0.3.0) and that v0.4 deliberately replaces with event → carriage/witness → **belief** → game-derived disposition; `IMPLIQUE` is a validation predicate, never a mutator. The jealous partner reacts when they *learn*, not by graph contagion. Consumer GDDs should be written against this contract.
- **The GM_NARRATION guard** (amendment, adopted verbatim): *an assertion whose observation source is `GM_NARRATION` may never enter canon directly.* It enters provisional and promotes only on the evidence rules above. Today `register_fact` accepts `GM_NARRATION` + `fiabilite: CERTAINE` with no brake — the confabulation problem is not "invention goes unrecorded", it is "invention can be recorded as truth". In 0.4 the brake is structural: `commit_narrative` routes unwarranted assertions to the provisional layer, whatever the caller claims. **One sanctioned warranted source exists beside it** (decided with Jean, 2026-08-14, [#22](https://github.com/JeanDes-Code/sneq-narrative-system/issues/22)): provenance source **`OUT_OF_BAND`** — "confirmed by the human, outside the fiction" — for the consumer's documented stale-scene recovery (ask Jean, then commit what Jean confirmed). It travels the normal `commit_narrative` road, projects per the projection rule, may be back-dated, and is **counted by `doctor`** (§12.4) so laundering confabulation through it is visible in one line. The guard itself stays unconditional: `OUT_OF_BAND` is a different source, not an exception — the third use of the honest-unusual-road pattern (genesis event #27, `LEGACY_CANON` #17). `--source player-utterance` for reconstructions was rejected: the label would lie, and a lying provenance in an append-only ledger is forever.
- **Promotion validation runs against canon + exclusion constraints** — the theory's collapse loop (generate → validate → inscribe, `SNEQ/04`) finally implemented, aimed at the output side.
- **Promotion is detected by the engine at commit time, never by the model** (unanimous). Player uptake is detected by **substring-searching the `PLAYER_UTTERANCE` text for the provisional invention's known `surfaceTokens`** — the same case-insensitive match `checkContainment` uses (decided with Jean, 2026-08-14, [#25](https://github.com/JeanDes-Code/sneq-narrative-system/issues/25); supersedes the extractor route, whose capitalization gate made lowercase tokens invisible — §0.5 premise 4). Known-token lookup, not open extraction: no new NLP, no model call, no free-function port — `Validator.extract` keeps its narration-gate job.
- **No evaporation by deletion** (Sol's argument, adopted): a stale provisional falls out of prompts by salience/recency — *invisible to the prompt, not forgotten by storage*. The player who revives the ferryman's name twenty turns later finds it promotable; deleting it would reproduce the exact drift SNEQ exists to prevent.
- **Contradiction before promotion:** by canon → invention marked `REJECTED` silently, no error, no interrupt (inverts today's `decideRegisterFact` adjudication path — provisional writes are a separate, cheaper path). By another provisional → both live; first uptake wins, loser `SUPERSEDED`. After promotion → canon; only remedy is a `REINTERPRETATION` record, never mutation. **By an unsatisfiable constraint → the constraint is the defect, not the invention** (decided with Jean, 2026-08-14, [#23](https://github.com/JeanDes-Code/sneq-narrative-system/issues/23)): a constraint that rejects on *type* mismatch (`equalValue`'s fail-closed path) can never pass any value — the engine appends a `QUARANTINED` transition to the constraint (audit trail preserved), stops it gating, and emits a `doctor` line. Silent `REJECTED` stays reserved for contradiction by canon, which is fiction; a mis-encoded row silently blocking every promotion on a key is a data bug, and it no longer hides behind the fiction's path.

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
- `day` — world time, on campaign state, advanced **only** by an explicit statement. How the statement enters the loop (decided with Jean, 2026-08-14, [#20](https://github.com/JeanDes-Code/sneq-narrative-system/issues/20)): **`commit_narrative` requires `daysElapsed: number`** — required, not optional, so "no time passed" is an explicit per-turn statement and the clock and the fiction ride one bundle; they cannot silently diverge (the live consumer's most-documented failure class — and `advance-turn` was called **zero times in three months** of live play, which is why doctrine alone is not the answer). 0 is legal: five hours of onion-soup talk moves no courier. `advance_turn` keeps an optional `days?: number` for **out-of-band skips only** — downtime, session breaks, time with no event to commit. One road inside the fiction, one outside it, no conversion anywhere. (Kimi's `daysPerTurn` engine-side conversion is rejected: it re-couples the clocks the requirement says to separate.) This extends the authorship pattern (#25 tokens, #27 `sets`): the fiction declares its own elapsed time, and only the model knows it.

Migration: `day` added to events/records/projections; existing campaigns get a **migration epoch at day 0** with `source: LEGACY_FACT` — honest (pre-0.4 campaigns genuinely have no world clock) rather than fabricating chronology from turn counts. **The epoch is populated, not empty** (decided with Jean, 2026-08-14, [#17](https://github.com/JeanDes-Code/sneq-narrative-system/issues/17)): migration synthesizes **one day-0 event per entity** carrying its legacy attributes as `sets` — `verb: "LEGACY_CANON"`, `gravity: 0` (below every bootstrap dispatch rule: no carriage storm), `WITNESSED` by the campaign default group + player. This is #27's genesis-event pattern applied to migration, and it is what keeps `rebuild(ledger) === projection` free of a `LEGACY_FACT` special case. The witnessing is the honest translation: pre-0.4 canon **was** omniscient — everyone knew everything — so old data keeps old semantics and stratification begins with the first post-migration event. The alternative (canon intact, beliefs empty, every holder amnesiac) reproduces the drift SNEQ exists to prevent. No `hour` until a mechanic demands one. This restores the v1 theory's unit (`GameTimestamp { jour, heure }`) — 0.3.0 was the outlier, which makes the ADR a *return*, not a swerve.

---

## 5. Write path, tools, CLI

### 5.1 One atomic write: `commit_narrative`

`AtomicWriteStrategy` today has six operations and no way to commit a bundle (`src/atomic/types.ts:128-135`) — "event committed, carriage missing" is a real torn-write on Convex. Replace `registerFact` + `addConstraint` with:

```
commitNarrative({ daysElapsed,                       // REQUIRED (#20) — the fiction's elapsed time, 0 legal
                  event?, records[], carriages[], carriageEffects[],
                  inventions[], promotionEvidence[], constraints[], holders[],
                  policy? })                         // additive routes[]/rules[] (#15)
```

— atomic, idempotent by `operationId` (existing dedup rules apply), applying invention transitions and projection updates in the same commit. Grimoire implements it as one Convex mutation. `advanceWorldDay` folds into `advanceTurn(command)` as above.

### 5.2 Tool protocol — stays at ten

| | tool |
|---|---|
| **removed** | `sneq__get_relevant_facts`, `sneq__register_fact` |
| **added** | `sneq__get_holder_context { holderId \| entityId, about?, topK? }` (exactly one of the two ids — the entity form runs §2.3's cascade in the engine, and the reply names the resolved holder + resolution road; unknown entity → `SneqUnknownEntityError`. Decided 2026-08-14, [#21](https://github.com/JeanDes-Code/sneq-narrative-system/issues/21)), `sneq__commit_narrative` |
| **changed** | `sneq__get_entity` (identity only) · `sneq__advance_turn` (+ optional `days`) · `sneq__add_constraint` (**signature unresolved — open**: it must serve two roles, and §0.5 premise 5 proves the shape in this spec cannot. `decideAddConstraint` hardcodes `INFERENCE_IA`, so the intended discriminator matches every constraint and `REGLE_MONDE` has no producer. The role must become explicit in the payload. Adjudicated at [#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19), not here) · `sneq__validate_narration` (keeps its entity-resolution job, gains holder awareness and the power to **block** rather than merely report. The **containment gate does not live here** — see §11 phase D and the note below) |
| **unchanged** | `lookup_entity`, `suggest_existing`, `mention_entity`, `set_scene` |

One composite write beats five order-sensitive writes in an agent loop; tool count is a real cost (deep modules: much behavior, small interface).

**Why containment is not an output gate.** Containment belongs *before* the call, not after it. The prototype this spec cites says so in the docstring of the function itself (`experimentation-1/prototypes/scaled-audit/engine.ts:409-413`):

> *"Every token from every event/record this holder has NOT learned. Decided from state, **before any call** — the containment gate. **Not a validator on the model's output; a statement about what was handed over.**"*

And it keeps the two functions deliberately separate (`:448-455`): `checkCanary` is *"a TEST-ONLY string assertion over prose that came back. Never a runtime validator that re-asks."* The distinction is load-bearing: **containment proves the fact was never handed over; the canary catches it being reconstructible from what was.** In the measured run, arm B fails containment **5/5 with `present == forbidden`, before the model has spoken** (`runs/pro-run2/containment.txt`). A post-hoc narration check cannot produce that result, because by then the leak has already been handed to the model.

So: **containment is a pre-flight assertion over the composed payload (§11 phase D)**; the canary stays test-only in the suite (§7.3); and `validate_narration` keeps its entity-resolution job, gains holder awareness, and gains the power to withhold. Budget it as new work, not as polish: `strict` is today an **empty shell** — accepted at `schemas.ts:85` and `hooks/narration-gate.ts:10`, **read nowhere** in the `Validator`. Roughly the whole gate is unwritten.

**`ValidationReport` cannot express a block.** Its shape is `{ ok, partial, extractedNames, issues }` (`src/hooks/narration-gate.ts:31-36`) — it reports, it never withholds or repairs. Blocking, redaction and a bounded repair loop are new control flow, and grimoire has already had to invent all three on top (`packages/gm/src/loop.ts:186-200`, and a `blocked → partial` downgrade in `apps/web/lib/canon/sneq-memory.ts:110-129`).

### 5.3 CLI (15 commands)

`get-relevant-facts` → `get-holder-context` (accepts `--holder` or `--entity`, #21); `register-fact` → `commit-narrative`; `advance-turn --days N`; `prepare-turn` with **optional** `--holder`/`--entity` (#21 — holderless is the wake-up probe: it returns the host-authored **frame** only — day, turn, scene ids — no holder knowledge, no seam bypass; with an id, frame + context in one call); add `upsert-holder`, `show-dispatch-policy` and `set-dispatch-policy` (#15 — same special-case routing as `upsert-holder` below; the tool surface stays at ten). Everything else unchanged.

**The null doctrine is typed** (#21): three distinguishable states, never conflated — unknown id → **error**; no scene → literal **`scene: null`** ("ask Jean, never guess", the issue #1 doctrine); holder-knows-nothing → **`beliefs: []`** plus an explain line saying so. The Cassius Vorentius bug was a plausible-empty standing in for a null; the contract test asserts the three states are distinguishable.

**The count:** 14 today (`src/cli/types.ts:5-20`), two renames (count-neutral) plus three additions = 17, **plus `doctor` = 18** (amended 2026-08-15, slice 5a). This count was computed on 2026-08-14 alongside #15 and never included §12.4's `doctor`, which §9 puts on the critical path: the ship criterion is a real campaign, the live consumer drives the CLI, and "run an exported test suite in your own repo" is not reachable mid-campaign. `doctor` exits 1 on a FAIL so a wrapper can gate on it. README:210 and UPGRADING:175 both encoded the old 14 — UPGRADING:175 as an *executable* verification step, so it fails on release day if not updated.

**`upsert-holder` is not routable as written.** `run.ts:127-135` sends every non-special command through `sneq__${command.replaceAll("-","_")}`, so it would dispatch `sneq__upsert_holder`, which §5.2 does not create. Decide explicitly: a sixth special-case branch in `run.ts` (keeps the tool surface at ten), or an eleventh tool. **Adjudication: special-case branch** — holder authoring is a host/setup concern, not a narration-loop concern, and the §11 pipeline puts holder creation in `commit_narrative`'s `holders[]` for in-play creation anyway.

**Two new flags need wiring**, and neither exists: `FLAGS_WITH_VALUE` (`src/cli/parse-argv.ts:9-11`) has no `--days` and no `--holder`, and `ParsedInvocation` (`src/cli/types.ts:24-35`) has no fields for them. Note this breaks the existing convention that every tool argument travels through `--args`/stdin — accept it (these two are ergonomic hot paths) but write it down.

**`--source` / `--observation` become orphans.** `buildObservation` is wired only at `run.ts:151` behind `if (inv.command === "register-fact")` — a dead command. Hermes/Leeloo drive live play through exactly that flag. `commit_narrative` must expose how an event and a record get their provenance from the CLI, or the presets die silently.

### 5.4 Repository contract + adapters

Contract gains: `appendEvent`/`getEvents`, `appendRecord`/`getRecords`, `upsertHolder`/`listHolders`, `appendCarriage`/`listCarriages(toPlaceId?, arrivedBy?)`, `appendCarriageEffect`, `appendInvention`/`appendInventionTransition`/`listInventions(status?)`, clock get/set, **`recordOperation`/`findOperation`** ([#29](https://github.com/JeanDes-Code/sneq-narrative-system/issues/29) — engine-side `operationId` idempotency for `commit_narrative`, codifying grimoire's proven Convex shape; per-campaign **bounded** retention, retries are near-in-time), and **`reindexEmbeddings(vectors)` + `setEmbeddingDim(dim)`** (§14 — the dimension is currently immutable after the first write, with no migration path at all). The contract test must assert **the absence of any event mutation path** — unusual, and the point.

- **SQLite**: schema v4 — new tables (`events`, `records`, `holders`, `carriages`, `carriage_effects`, `inventions`, `invention_transitions`), `figed` → `canonical_attributes` (copy as `LEGACY_FACT`), index `(campaign_id, to_place_id, arrival_day)`. `potentialites` table survives as-is. Plus, from the 2026-08-14 rulings: **synthesize the per-entity day-0 `LEGACY_CANON` events** (#17 — the `LEGACY_FACT` copy gets its ledger backing in the same migration); **rewrite persisted `observation` blobs to drop the stale `fiabilite` key** (#18 — single-step, no window, per #30); **audit persisted constraint rows for value-type coherence** (#23 — required, findings flagged in the migration report, never auto-fixed or deleted); and the **`operations` ring table** (#29).
- **Memory / JSON-file**: new maps/arrays; JSON save format bumps `version: 1 → 2` with a v1 loader. JSON adapter accepts the O(n) carriage scan for solo play — documented, not discovered at turn 400.
- **Convex (grimoire, out of tree)**: UPGRADING.md must spell out the exact tables/validators/backfill, because the `payload as AttributFige` casts make the gap invisible to TypeScript.
- **GCN survives**: nodes, edges, `forcePropagation`, `neighbors()` — persisted and contract-tested, still useful for entity relations. Only `src/core/propagation.ts` (the damped-BFS knowledge diffusion) dies, with its test file. Verified zero call sites in `src/` and grimoire.

---

## 6. Risks in play, each with its cheapest detector

1. **The world goes deaf** (House). The real cost is *authoring*: if news only travels when the GM model remembers to dispatch, silence is the default outcome of an improvised solo campaign. → Mitigated structurally by `DispatchPolicy` (§2.4): declared game rules auto-dispatch on gravity, so the baseline is a world that talks. **Three counters** (decided 2026-08-14, #15/#20), because one cannot tell the holes apart: **uncovered** — no rule matched the event (a policy hole); **unroutable** — a rule fired but no route reaches the target (a map hole; bootstrap ships rules with zero routes, so this is the loud form of a campaign that has not yet declared its map); **frozen-clock** — `day` unchanged across K consecutive commits while ≥ 1 carriage is in transit (carriages exist and never land, invisible to a zero-carriage count; also catches a model that habitually answers `daysElapsed: 0`). Each gets a `doctor` line (§12.4). If uncovered climbs monotonically, the policy has a hole; if unroutable does, the map has one. *(Supersedes the round's "never auto-dispatch": a declared, deterministic game rule is not an untuned heuristic — decided with Jean 2026-08-07.)*
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
5. **`atomic/commit-narrative` — one bundle or nothing.** Inject failure at each write boundary → nothing visible; retry idempotent; and assert the advertised tool surface exposes no unrestricted ledger read (the test that proves v0.4 is one system, not a module with a bypass). *(Re-scoped 2026-08-14, #29: the `operationId` dedup this and §7.4 exercise is **new work** — engine-side, `recordOperation`/`findOperation` — so these tests assert the built mechanism, not "existing rules" that never existed.)*

**No prerequisite.** The whole suite is live and green on the work machine — see the verified baseline in the header. The SQLite third of the contract suite runs; nothing gates the start of this work.

**Missing from the five, and each is cheap:** the **migration** (SQLite v3→v4 `figed` → `canonical_attributes` copy-as-`LEGACY_FACT`, and the JSON v1 loader — both are new code with no test in the plan) · **`DispatchPolicy` auto-dispatch** (the structural mitigation of risk §6.1, currently untested) · the **holder resolution cascade** of §2.3 (entity → individual → group → campaign default) · the **clock** (`advance_turn --days`, and that no engine path converts between `turn` and `day`) · and **§11's containment assertion**, which is the one test that maps to the measured result.

---

## 8. Divergences adjudicated (so they do not reopen)

| Question | Kimi | House | Sol | **Adjudication** |
|---|---|---|---|---|
| Shape | A | D (perspective seam) | D (ledger + projections) | **D+D merge** — A's premise refuted by verified R1; the two D's compose |
| `AttributFige` becomes | event layer | `Record` (rename) | `CanonicalAttribute` projection | **Sol** — replace-on-key is *correct* for a projection; records must accumulate, so House's rename fights the storage semantics it keeps |
| `Potentialite`/`Contrainte` | keep, narrowed | keep, wire to machine | **delete** | **Keep and wire** (settled 2026-08-07 with Jean; **re-founded 2026-08-14**, [#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19)). Sol proved `Potentialite` can't *be* the invention (no value field — verified): the lifecycle lives in `ProvisionalInvention`. The constraint space stays for an **engine-internal** reason: promotion validation (§2.6, #27) needs a constraint author, or the collapse loop is vacuous — `REGLE_MONDE` gets its first producer, `validateValue` its first readers. Caller evidence, stated honestly: live play never invokes `add-constraint` (nine commands, #14); the planned caller (Hermes-Agent GDD) exists but targets machinery that never ran; grimoire persists the rows (R4). Sol's verdict falls to the engine-internal need, not to a caller count. |
| Invention expiry | 7-day timeout | scene-scoped drop | **retrieval policy** | **Sol** — deletion reproduces drift; "invisible to the prompt" ≠ "forgotten by storage" |
| Clock | `daysPerTurn` conversion | explicit, fold into `advance_turn` | explicit, separate tool | **House's fold, Sol's semantics** — no conversion exists anywhere; one tool |
| Interception | `status` field | `status` field | `CarriageEffect` ledger | **Sol** — append-only with `causedByEventId` keeps the bribe inside the fiction; status is derived |
| Write surface | +4 tools (14) | 12 tools | composite commit (10) | **Sol** — one atomic bundle; torn writes are real on Convex (verified: no bundle op exists) |
| Version | 0.4.0 | 0.4.0 ("the 1.0 story, shipped honestly early") | 0.4.0 | **0.4.0, unanimous** |

## 9. Version verdict — one release, 0.5.0

**There is no 0.4.0.** Decided with Jean 2026-08-08 ([#30](https://github.com/JeanDes-Code/sneq-narrative-system/issues/30)). Everything in this document ships as a single breaking release, **0.5.0**; `0.4` survives only as an internal slicing milestone for the build. The round's unanimous 0.4.0 verdict is void — it was rendered before §11–§14 tripled the surface, and it named a release nobody will run.

**Ship criterion: Jean can run a real campaign with it.** Not "the code works". The system gets its first real play test at 0.5.0 and not before, so anything the campaign needs is in, and anything it does not is out.

Three consequences follow, and one of them is the only thing on this map that has made the surface *smaller*:

- **No migration window, so no migration machinery.** The spec had assumed a consumer running on 0.4 while 0.5 was built — hence the `AttributFige` alias, the two-step migrations, the deprecation gap in §13. Nobody will. One clean break: no alias, no dual code path, nothing to keep consistent.
- **§12.2, §12.3 and §12.4 are critical path, not polish.** The live consumer is an agent (Leeloo, through the CLI), and what an agent reads is the tool descriptions and the skill file. Ship 0.5.0 with either still lying and the play test measures a badly-briefed agent — a failure could not be attributed to the engine rather than the briefing. `doctor` joins them: it is the instrument that says *why* a campaign misbehaves.
- **A 0.3.1 patch ships first**, carrying what repairs present-tense damage and depends on no open ticket: the ten tool descriptions, the `operationId` documentation correction, `docs/api.md` regenerated, and the branded-ID validation at the tool boundary. That validation is breaking on purpose — it turns grimoire's silent `set_scene` failure into a loud one (§12.1), and Jean's call was explicit that breaking grimoire is acceptable, because the behaviour it breaks does nothing.

**1.0.0 is still earned, not declared** — by one full migrated grimoire campaign in which holder contexts demonstrably prevent leaks without starving NPCs. §6's detectors are how we'll know. Every load-bearing number here remains unvalidated in play: the salience weights are a prototype guess, the promotion rule is a synthesis of a theory recommendation and an untested reframing, and carriage mechanics have run for zero campaign-hours. Ship 0.5.0, play it, let the numbers promote it. (Fittingly, the release model is the invention model: 0.5.0 enters CONTRAINT; a campaign's worth of uptake promotes it.)

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
- **The pointer of last resort is broken.** The skill file (`:36,:79`) calls `docs/api.md` *"the source of truth"*. That file ships **795 dead links** (483 into `interfaces/`,`type-aliases/`… + 312 `../README.md`) pointing into `docs/typedoc/`, which is gitignored and not packaged. No CI step regenerated or checked it, and it is in `package.json#files`, so a stale copy shipped to npm. *(Root cause found while fixing this in 0.3.1: the documented command `pnpm docs` never ran the script at all — `docs` is one of npm's own commands, so pnpm proxied it and opened the homepage in a browser, exit 0. The script is now `docs:build`.)*
- **Every new failure mode will be indistinguishable from a crash.** `src/errors.ts` and `cli/errors.ts` gain nothing in v0.4: unknown holder, event-mutation attempt, border block, standing block, promotion rejection, uncovered dispatch route all fall through `formatError` to `INTERNAL_ERROR`, **exit 2** (`cli/errors.ts:96-99`). An agent reads that as "the engine is broken", not "you asked for the wrong thing".

### 12.2 Five rules v0.4 adopts

1. **Make the wrong call impossible, or loud. Never silent.** Validate branded IDs at the tool boundary and reject a non-id with an actionable message: `set_scene: "la taverne du Cerf" is not an EntityID. Call sneq__lookup_entity or sneq__mention_entity first, then pass the returned entityId.` This one check, shipped in 0.4, retro-fixes grimoire's dead context. Every tool that takes an `EntityID`/`HolderId` gets it. **This is a §7 test, not a doc bullet.**
2. **The tool description is the documentation.** It is the only text guaranteed to be in the model's context. Each of the ten gets rewritten to state: what it returns, what it does **not** return, the one failure mode the agent must handle, and the call that must precede it. `get_holder_context` must say in-band that there is no way to ask what is *true* — otherwise the agent will hunt for one and improvise when it fails.
3. **Errors are documentation.** Every v0.4 failure mode gets its own error class, its own CLI exit code, and a message naming the corrective call. Reserve `INTERNAL_ERROR`/exit 2 for genuine engine bugs.
4. **One worked example, executed in CI.** A complete turn — ingest → holder context → containment → commit → tick — as runnable code in the skill file and README, run by the test suite so it cannot rot. No consumer has ever had one; all four reverse-engineered the loop from type signatures, and all four got a different answer.
5. **Docs are generated and verified, not remembered.** `pnpm docs:build` runs in CI and the build fails on a dirty diff (**shipped in 0.3.1**, along with an assembler that refuses to write a file containing a dead link). Note the hard mechanical dependency: `typedoc.json` has a **single entry point** (`src/index.ts`), so the six new domain modules and `core/{derive-beliefs,salience,containment}.ts` are invisible to `docs/api.md` unless they are re-exported from `src/index.ts`. **Miss that and the entire v0.4 type surface is undocumented in the file the skill calls authoritative.** The spec has never mentioned `src/index.ts`.

### 12.3 Deliverable: `skills/sneq-narrative-engine.md` is rewritten, not updated

**Critical path (§9).** The ship criterion is a real campaign, and the live consumer is an agent. This file and the tool descriptions of §12.2 are what that agent reads; if either still lies at 0.5.0, the play test measures the briefing rather than the engine.

§10 says the skill file "gets a content update, not a redesign". That is wrong, and it is the document agents actually load. Its spine inverts: the core loop's step 4 (`register_fact`) is deleted; four of seven tool bullets change or disappear; two of six failure modes invert (a canon-contradicted provisional is now `REJECTED` **silently** — today the file teaches "contradictions are normal, adjudicate explicitly"); and `get_relevant_facts` — the documented form of the read §0 calls the actual bug — has its own bullet teaching `depth: 1`.

Worse is what is absent. The frontmatter `description` is the **routing trigger** that decides whether an agent loads this skill at all, and it says *"track canonical entities, facts, scenes, and turns"* — no holder, no world day, no "who knows what". An agent facing a perspective problem will not load it. Nothing tells the agent which holder it is reading for, that "what is true" is unaskable, or that writes are one bundle instead of five ordered calls.

The rewrite must carry, explicitly: the **holder discipline** (every read is for someone); the **id discipline** (never pass a name where an id is required, and how to get one); the **one-bundle write**; the **two clocks** and that narration alone never moves the world; and the fact that promotion is the engine's job, never the agent's.

### 12.4 A conformance harness consumers can run

**Critical path (§9)**, for the same reason and one more: when the 0.5.0 campaign misbehaves, this is the instrument that says *why*. Without it the first play test yields an impression, not a diagnosis.

Ship an executable checklist — `sneq-engine doctor --campaign <id>` or an exported test suite — that an integrating team (or an agent doing the integration) runs to get a verdict instead of a guess:

- every `EntityID`/`HolderId` reaching the engine resolves (**catches the grimoire bug on day one**)
- the scene's `presentEntityIds` are non-empty when a scene exists
- events have been appended in the last N turns (**catches "narration outruns the ledger"**)
- every advertised read is holder-scoped; no unrestricted ledger read is on the tool surface
- `assertContainment` passes for every holder that received a payload this session
- the belief cache's hit rate and invalidation count are sane
- the world clock is not frozen: `day` advances while carriages are in transit (#20)
- dispatch health: uncovered and unroutable counters near zero; fan-out truncation absent or explained (#15)
- `OUT_OF_BAND` commit count is low and each has a session-note rationale (#22 — the escape hatch is audited, not locked)
- no `QUARANTINED` constraints, or each one is known and explained (#23 — a quarantine is a data bug waiting for repair, not a permanent state)

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
- ~~`docs/api.md` — regenerate; fix the dead links; add a dirty-diff check to CI.~~ **Done in 0.3.1.** What remains for 0.5: `typedoc.json` has a single entry point (`src/index.ts`), so the new domain and core modules are invisible to `docs/api.md` until they are re-exported there — see §12.2 rule 5.

**Migration, unaddressed:**
- Observation blob rewrite for the `fiabilite` removal (§0.5 premise 6) — not in the schema-v4 list.
- The **day-0 legacy epoch** consequence, stated honestly in §4 but not followed through: every pre-0.4 fact lands in one bucket, so any day-ordered query over a migrated campaign returns the whole legacy corpus at once. Grimoire's backfill is where this lands.
- `MemoryState`/`emptyMemoryState()` are published types on `sneq-engine/memory`; adding seven ledger collections is a breaking change to them, and `PersistedShape` (`json/index.ts:51`) embeds `MemoryState` verbatim.
- No `decideCommitNarrative`. The six pure `decide*` fns are published on `sneq-engine/atomic` and are how the out-of-tree Convex adapter shares SNEQ's rules. Without an equivalent, the one consumer this spec calls load-bearing re-derives promotion, contradiction and transition logic by hand.

**Design gaps still open (carried from the audit, not yet resolved in the body of this spec):**
- ~~`DispatchPolicy` has no home~~ — **resolved by [#15](https://github.com/JeanDes-Code/sneq-narrative-system/issues/15)** (§2.4): campaign state via the repository contract; bundle + CLI authoring; bootstrap rules, zero routes; `maxDispatchFanout` in `EngineConfig`.
- **Salience weights** are "a config constant" with no slot in `EngineConfig`.
- **The belief cache is under-specified**: `revision` is undefined (`entityRevision()` covers entities only), and — the real hole — `CarriageEffect` is append-only and may be dated *after* the arrival it delays, so beliefs for a **past** day change; a key of `(campaignId, holderId, day, revision)` cannot express that. `SNEQ/05` already has the machinery (`dependDe`, `indexParEntite`, `invaliderDependants()`, tombstones, `CacheStats`) and is uncited.
- ~~The event → `CanonicalAttribute` projection rule is never given~~ — **resolved by [#27](https://github.com/JeanDes-Code/sneq-narrative-system/issues/27)** (§2.6): explicit `sets` on acts, deterministic fold, records never project.
- **`Belief.content` derivation is never given.**
- **`getHolderContext({ about })`** filters by entity, but `Belief.subject` is `EVENT | RECORD` — an event→entity index is needed and is not in the contract.
- ~~Place → realm has no source of truth~~ — **resolved by [#26](https://github.com/JeanDes-Code/sneq-narrative-system/issues/26)** (§2.4): realms are entities, places carry `realmId?`, carriages are engine-stamped, missing realm falls back to the campaign default.
- ~~`surfaceTokens`: who produces them~~ — **resolved by [#25](https://github.com/JeanDes-Code/sneq-narrative-system/issues/25)** (§2.1, §2.6): both, engine as floor; junk tokens rejected at commit; uptake drops the extractor.
- **`gravity` is model-supplied** yet drives auto-dispatch and 40% of salience — in tension with "the model writes content, never effects".
- ~~No direct canonical write remains once `register_fact` is deleted~~ — **resolved by [#27](https://github.com/JeanDes-Code/sneq-narrative-system/issues/27)** (§2.6): seeding is a genesis event; initial conditions are ledger entries, not fabrications.
- **The GCN is kept with no reader** — its only production caller is `getRelevantFacts` (`campaign.ts:145`), which §3 deletes; and `SNEQ/03:132-162` has `connu_publiquement`/`publique` relation flags, i.e. an unfiltered secret-relations channel straight through the seam.
- ~~Deprecation policy is inconsistent~~ — **resolved by §9.** One release means one break: no alias for `AttributFige`, no window for `getRelevantFacts`, nothing to keep consistent. Listed here only so the gap is not re-raised.

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

Two entries, and 0.4.0 is skipped — see §9.

> **0.3.1 — Honest surface (one breaking check).** No new features. The ten tool descriptions now state what each tool returns and what it does **not** — `sneq__get_entity` never returned attributes, whatever its description claimed. `docs/api.md` is regenerated and its idempotency guarantee corrected: `operationId` is accepted and stored, and the built-in local strategy does **not** deduplicate on it. **Breaking, deliberately:** every tool taking an `EntityID` now rejects a value that is not one, with a message naming the call to make first. If your integration passed model-typed names into `set_scene`, it was silently doing nothing and now says so.

> **0.5.0 — Stratified knowledge (breaking).** SNEQ no longer answers "what is true" on the path to the model — only "what does this holder know." `getRelevantFacts` and `register_fact` are gone: write through `commit_narrative` (events, records, carriages, inventions — one atomic bundle), read through `get_holder_context` (beliefs ranked by engine-computed salience, delivered by carriages that arrive on a world day you advance yourself). Compose your prompt however you like, then hand it to `assertContainment` before the call — that is where the guarantee is enforced. Facts you stored are now `CanonicalAttribute` projections, renamed with **no alias**; reliability lives on beliefs, not facts; turns no longer move the world.

---

## Amendment log

The body above carries only the current decision. This log carries how it got there — three passes, each of which reversed something the one before it had settled. Read it when a decision looks arbitrary; the reason is usually here.

**2026-08-06 — the round.** Three-minds design round (Sol / Kimi K3 / House-Opus) over issue #9, the v1 theory (`SNEQ/01..08`) and the 0.3.0 code at `e2843a0`. Produced §§0–10: the two false premises in #9, the D+D shape merge, and the eight adjudications in §8. Kimi's shape A was refuted by verified premise 1 and did not survive the round.

**2026-08-07 — review with Jean, plus the issue #9 amendment (tool-surface analysis).** Five changes, each superseding round output: lazy holder creation (§2.3, replacing upfront authoring) · `DispatchPolicy` auto-dispatch (§2.4, superseding the round's "never auto-dispatch") · `add_constraint` kept and re-founded rather than deleted, two roles, all six rule types (§2.6, superseding Sol's deletion verdict, which rested on an incomplete caller census) · the `GM_NARRATION` guard adopted (§2.6) · containment and canary filed inside `validate_narration` (§5.2). Consumer census corrected: grimoire is not the only consumer — Hermes/Leeloo drive the CLI in live play.

**2026-08-08 — verification pass** over the 0.3.0 code, the repo docs, the v1 theory, the **four live out-of-tree consumers** (grimoire, nexus-dynamics-rpg, rebel-political-narrative-game, arcanum) and the research prototype (`experimentation-1`). Four structural additions — §0.5 (seven premises of *this* spec, corrected) · §11 (the integration surface, because v0.4's central claim is unreachable at the single insertion point 0.3.0 offers) · §12 (the agent-facing contract as a deliverable) · §13 (the documentation work-package) — plus §14 (embeddings without setup, and a migration path for the locked dimension). It reversed the previous day on one point: **containment moved out of `validate_narration` to a pre-flight assertion** (§11 phase D), per the docstring of the prototype the spec cites. It also withdrew the `better_sqlite3` blocker, which was never real.

**2026-08-08, later — consolidation.** No new findings. The three passes had left the body self-contradicting in seven places: §0 on `get_entity` and on the sqlite blocker, §3 on the measured ratio, §5.2 on `add_constraint`'s signature and on where containment lives, §7 on the prerequisite, §10 on what is untouched. Each was rewritten to state the surviving decision once, and the chronology moved here. Status changed from DRAFT to *spec of record — open frontier*, pointing at map #10 for what remains undecided. Nothing in the design changed.

**2026-08-08 — the scope line, decided with Jean ([#30](https://github.com/JeanDes-Code/sneq-narrative-system/issues/30)).** The verification pass had added four sections and removed nothing; the release question it opened was answered rather than deferred. **No 0.4.0 ships.** One breaking release, 0.5.0, with `0.4` kept as an internal build milestone. The ship criterion is a real campaign, not green tests. Reversals: the round's unanimous 0.4.0 verdict is void (§9); the `AttributFige` deprecated alias is dropped, because no intermediate release exists to migrate through (§2.6), which also closes §13's deprecation-policy gap; §11 ships whole, not reduced to the phases that make the thesis testable; §12.2/12.3/12.4 move onto the critical path, since the live consumer is an agent that reads the tool descriptions and the skill file. A 0.3.1 patch ships ahead of it with the honest-surface work and one deliberately breaking check.

**2026-08-14 — the containment seam, decided with Jean ([#25](https://github.com/JeanDes-Code/sneq-narrative-system/issues/25), [#26](https://github.com/JeanDes-Code/sneq-narrative-system/issues/26), [#27](https://github.com/JeanDes-Code/sneq-narrative-system/issues/27)).** The three §13 gaps that gated `assertContainment`, the §7.2 fixture and the v3→v4 migration, adjudicated HITL. `surfaceTokens`: both produce, engine as floor; junk tokens rejected at commit; empty model set legal. Realm: realms are entities, places carry `realmId?` as metadata, carriages are engine-stamped snapshots at dispatch, missing realm falls back to the campaign default. Projection: acts project only through explicit `sets`; records never project (promotion evidence only); the projection is a deterministic fold with `rebuild(ledger) === projection` as contract test and migration tool in one; seeding is a genesis event. One reversal of the 2026-08-07 text: §2.6's extractor-based uptake detection is superseded by known-token substring search (the `checkContainment` match), closing §0.5 premise 4's under-fire. Evidence that framed #25: the prototype's containment measurement ran on hand-authored lowercase phrases the extractor could never have produced.

**2026-08-14 — `add_constraint` re-founded, decided with Jean ([#19](https://github.com/JeanDes-Code/sneq-narrative-system/issues/19)).** The keep-verdict stands; its basis changes. The 2026-08-07 founding ("live + planned callers") did not survive the census — live play never invokes `add-constraint`, and the planned caller (the Hermes-Agent GDD, which does exist) targets machinery that never ran. The new basis is engine-internal: the containment-seam decision made promotion validation load-bearing, and a constraint space with no author makes the collapse loop vacuous. Role 1 (provisional-layer entry) demoted from justification to behavior, since the projection rule already routes free-floating assertions to the provisional layer. The signature gains an explicit role/source (§0.5 premise 5, adopted). §2.6/§8 now cite the honest evidence and name both consumer misconceptions with their consumers (rebel: write-time enforcement; the GDD: propagation/mutation). The outstanding Leeloo grep of the old Hermes briefing moved to the build hand-off (#16) as §12.3 input — it cannot flip this verdict. Also repairs a PR #33 misplacement: the `AttributFige` migration-window sentence returned to its own bullet.

**2026-08-14 — the live loop: clock and dispatch authoring, decided with Jean ([#20](https://github.com/JeanDes-Code/sneq-narrative-system/issues/20), [#15](https://github.com/JeanDes-Code/sneq-narrative-system/issues/15)).** Two decisions against the same evidence: the busiest live consumer never called `advance-turn` in three months, and doctrine alone is what produced that silence. #20: `commit_narrative` **requires** `daysElapsed` — the fiction declares its own elapsed time every turn, extending the authorship pattern (#25 tokens, #27 `sets`); `advance_turn --days` survives for out-of-band skips only; §4's two-clocks/no-conversion semantics untouched. #15: `DispatchPolicy` lives in campaign state (repository contract), evolves via additive bundle `policy` and a `show`/`set-dispatch-policy` CLI pair (CLI count 15 → 17); bootstrap seeds default rules and zero routes; fan-out capped at `EngineConfig.maxDispatchFanout` (default 64) with deterministic near-first truncation. §6.1's single counter splits into three — uncovered, unroutable, frozen-clock — each with a `doctor` line, because a green zero-carriage count cannot see carriages that exist and never land.

**2026-08-14 — the migration epoch, decided with Jean ([#17](https://github.com/JeanDes-Code/sneq-narrative-system/issues/17), [#18](https://github.com/JeanDes-Code/sneq-narrative-system/issues/18)).** #17: migration **synthesizes** per-entity day-0 `LEGACY_CANON` events (attributes as `sets`, gravity 0, `WITNESSED` by default group + player) rather than accepting holder amnesia — the genesis-event pattern (#27) applied to migration, keeping the rebuild contract free of a `LEGACY_FACT` special case; the witnessing honestly translates pre-0.4 omniscience. #18: `fiabilite` is **deleted from `Observation` itself** — no parallel `Provenance` type (superseding §0.5 premise 6's proposal, because a parallel type silently drops the literal); the tool boundary rejects the key strictly, the persisted-blob rewrite joins §5.4's schema-v4 list, the CLI presets rewrite. Reliability lives on `Belief`, derived, as §2.5 always intended.

**2026-08-14 — the seam's consumer surface, decided with Jean ([#21](https://github.com/JeanDes-Code/sneq-narrative-system/issues/21), [#22](https://github.com/JeanDes-Code/sneq-narrative-system/issues/22)).** #21: `get_holder_context` accepts `holderId | entityId` (the engine runs §2.3's cascade and names the resolved holder); `prepare-turn --holder` becomes optional — holderless is the wake-up probe returning the host-authored frame only; the issue-#1 null doctrine becomes three typed, contract-tested states (error / literal `scene: null` / `beliefs: []` + explain). #22: reconstruction gets the sanctioned `OUT_OF_BAND` provenance source on the normal commit road — warranted, honestly labelled, back-datable, `doctor`-counted; the GM_NARRATION guard stays unconditional; `--source player-utterance` rejected because the label would lie in an append-only ledger. Third use of the honest-unusual-road pattern (#27 genesis, #17 `LEGACY_CANON`).

**2026-08-14 — the last three grillings, decided with Jean ([#23](https://github.com/JeanDes-Code/sneq-narrative-system/issues/23), [#28](https://github.com/JeanDes-Code/sneq-narrative-system/issues/28), [#29](https://github.com/JeanDes-Code/sneq-narrative-system/issues/29)); the frontier closes.** #23: the constraint type-coherence audit is required (riding the v3→v4 migration, re-run by `doctor`); a type-unsatisfiable constraint is `QUARANTINED` — the constraint is the defect, not the invention; silent `REJECTED` stays reserved for canon, which is fiction. #28: `PARTICIPANT` derogation becomes automatic and lazy at cascade time — participation is the declared reason, cost bounded by real play; `PERSONAL_STAKE` stays authored; the shared-stratum texture is stated as intended. #29: engine-side `operationId` idempotency is built, not narrowed — `recordOperation`/`findOperation` join the contract with bounded retention; this session's own decisions raised the stakes (one write carrying time means a retry double-advances the world); §7.4/§7.5 re-scoped to the built mechanism. With these, every open design question on map #10 is decided; what remains is the build hand-off (#16).

**2026-08-14 — the build hand-off, decided with Jean ([#16](https://github.com/JeanDes-Code/sneq-narrative-system/issues/16)); the map's destination is reached.** The build is sliced into **five dependency-ordered PRs** (Jean chose coarse over the proposed ten): foundation (types + contract + fold), migration, knowledge (beliefs + containment + promotion), the write and the world (`commit_narrative` + `tick`), and the surface (APIs + tools + CLI + `doctor` + skill file). Each slice gates on named §7 tests; §12.2 descriptions ride the PRs that change their tools; consumer-side work (grimoire migration, `rpg-mj-knowledge` skill files with the Leeloo grep first, GDD rewrites) is budgeted and named, not sliced. The plan of record: `10-v05-build-handoff-2026-08-14.md`. With this, every ticket on map #10 is closed and the way to building 0.5.0 is clear.

**2026-08-15 — build slices 1-2 land; four type-level ratifications.** Slice 1 (foundation: §2 types, §5.4 ledger contract on three adapters, the projection fold) and slice 2 (the migration epoch: `figed` → `canonical_attributes` copy, per-entity `LEGACY_CANON` synthesis #17, observation-blob rewrite #18, constraint audit #23 — one pure core shared by the SQLite v5 step and the JSON v1 loader so the adapters cannot drift) are implemented, TDD, suite green. The build surfaced four gaps between the spec's prose and its own type blocks, ratified with Jean: `surfaceTokens` added to `OfficialRecord` (§2.2) and `ProvisionalInvention` (§2.6) — both uses were declared, neither field was; `InventionTransition.atDay` — the fold cannot order a promotion against events without a day; `CanonicalAttribute.observation` optional — `source` is the provenance for EVENT/PROMOTED rows. `AttributFige` coexists as an internal-milestone type until slice 4 deletes it with `register_fact`; the released 0.5.0 surface keeps §2.6's no-alias rule.

**2026-08-15 — slices 3-5 land; the CLI count is amended 17 → 18.** Slice 3 (beliefs, the #21 cascade with lazy auto-`PARTICIPANT`, containment, promotion), slice 4 (`commit_narrative`, `tick`, bootstrap, the §6 counters) and slice 5a (the surface: §11's eight phases, the ten tools with rewritten descriptions, the CLI, `doctor`, the `AttributFige` clean break, §14.5's `setEmbeddingDim`/`reindexEmbeddings`) are implemented, TDD, suite green at 528 tests. Three decisions taken with Jean at the start of slice 5: **`doctor` ships as an 18th CLI command** (§5.3 amended above — the 17 predates §12.4's promotion to critical path); **§14.5 is in 0.5.0** (the two contract methods and the §12-shaped error; rung 0, the key-free embeddings provider, is explicitly not owed by v0.4); and slice 5 splits into **5a code / 5b prose**, so the diff stays reviewable.

Two things the build found rather than inherited. **A migrated 0.3 campaign was never bootstrapped** — no default realm entity, no default group, so the holder cascade had no floor and `deriveBeliefs` could not answer for anybody: a migrated campaign was unplayable, and the §12.4 gate is what caught it. Fixed at the source: `bootstrapPlan` is now pure data shared by `createCampaign`, the SQLite v3→v5 migration and the JSON v1 loader, the same anti-drift shape slice 2 used for `migrateLegacyCampaign`. And **the engine floor over-blocks**: because it forbids the names of an unlearned event's place, participants and objects, a public landmark named in a secret event becomes unmentionable to everyone who has not learned that event. Over-blocking is the intended direction of the error — containment fails loud rather than leaking quiet — and it is recorded as a test rather than left to be discovered at turn 400. The cure, if one is wanted, is authored public-token exemptions, not a softer floor.

Phase A also closed §2.6's ingress hole in the shape §11.2 described: `commit_narrative` gains `playerUtterance`, the engine runs `detectUptake` inside the commit, and caller-supplied `PLAYER_UPTAKE` evidence cannot outrank it. Before this, `promotionEvidence[]` was entirely caller-supplied and the model decided its own promotions — precisely what §2.6 forbids.
