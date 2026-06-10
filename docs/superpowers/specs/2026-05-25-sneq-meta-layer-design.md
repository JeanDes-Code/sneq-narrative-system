---
title: SNEQ Meta Layer — Design
date: 2026-05-25
status: approved-for-planning
author: Jean Desauw (brainstormed with Nemo)
depends-on:
  - 2026-05-19-sneq-v2-engine-design.md
  - 2026-05-20-sneq-cli-design.md
  - 2026-05-21-sneq-defensive-features-design.md
language: fr
---

# SNEQ Meta Layer — Design Document

## TL;DR

Une couche **méta** ajoutée au moteur `@sneq/engine` et à son CLI : un canal hors-narration, strictement séparé de l'état narratif canonique, qui capture ce qui se passe *autour* de la partie plutôt que *dans* l'histoire. Trois capacités, séparées par leur **destination** :

1. **Directives canon** (`CanonDirective`) — l'injection de lois/lore custom pendant un méta-break ("dans ce royaume la magie est hors-la-loi", "le sang paie tout sortilège"). Ce n'est pas du feedback, c'est du **canon** : ça doit atterrir dans l'état narratif et remonter dans `prepare-turn` pour façonner la génération. Modélisé comme un type léger campaign-scoped (texte libre + scope + priorité), distinct du graphe entités-faits parce que la loi-monde en prose ne se mappe pas sur des `AttributFige` clé→valeur.

2. **Feedback système** (`FeedbackEntry`) — l'agent (et le joueur, en réflexion de méta-break) signale ce qui est cassé, manquant, contourné, ou ce qui était bon. **Jamais** remonté au joueur en session (sinon ça casse l'immersion). Deux sous-mécanismes : un verbe explicite `report-feedback` fire-and-forget, et la télémétrie passive ci-dessous.

3. **Télémétrie de couverture** (`ToolCallLogEntry`) — automatique, une ligne par appel d'outil, capturée au point d'étranglement unique `dispatchToolCall`. C'est la seule façon d'obtenir le signal "jamais utilisé / utilisé partiellement" : l'agent ne peut pas rapporter de façon fiable ce qu'il *n'a pas* fait. Classifie chaque appel (`OK` / `EMPTY` / `NO_MATCH` / `CONTRADICTION` / `ERROR`) sans coopération de l'agent.

Les capacités 2 et 3 alimentent la **boucle de croissance** : `sneq-engine feedback` retourne un digest (couverture + entrées ouvertes + liste des outils jamais appelés), Nemo le lit quand Jean demande "on a des feedbacks ?", synthétise les thèmes, et promeut les vrais en issues GitHub (triage manuel, jamais auto). La capacité 1 est son propre cycle de vie.

Surface : ~700 LOC dans `src/` + ~900 LOC de tests. Aucune nouvelle dépendance runtime. CLI passe de 15 à 20 commandes. 2 nouveaux outils LLM. Aucun breaking change sur l'API publique existante.

---

## 1. Context

### 1.1 Le besoin

Après plusieurs sessions de jeu réelles (Hermes-Agent comme MJ sur Discord, SNEQ en backbone), deux manques structurels remontent — aucun n'est un bug, ce sont des **trous d'infrastructure** :

**Le méta-break.** Jean met régulièrement la narration en pause pour parler à l'AIGM *hors personnage*. Trois usages distincts :
- **Correction** — l'IA part dans une direction non voulue, Jean réoriente.
- **Réflexion** — après un gros moment narratif, un débrief : ce qui était bon, ce qui ne l'était pas, ce qu'il veut pour la suite.
- **Injection de loi/lore** — expliquer une règle custom du monde que l'IA ne peut pas connaître ("dans ce système, la loi c'est X"). **Usage le plus fréquent.** Aujourd'hui ça n'a aucun point d'ancrage durable : Jean le redit à chaque session, ou l'IA l'oublie.

**Le feedback agent → système.** Quand SNEQ ne marche pas comme attendu en cours de partie, l'agent est assez autonome pour **contourner silencieusement** le manque — et il ne le dit *jamais* à Jean, justement pour ne pas casser l'interaction narrative. Résultat : zéro visibilité sur ce qui est cassé, jamais touché, ou systématiquement contourné. Le système ne peut pas grandir parce que personne ne collecte le signal qui dirait *comment* le faire grandir.

### 1.2 Pourquoi côté SNEQ (et pas côté Hermes)

Même principe que le spec défensif (§1.2 de `2026-05-21`) : **SNEQ fournit les primitives durables et auto-suffisantes ; le consommateur pilote l'interaction.**

SNEQ est une bibliothèque de bookkeeping + un CLI, *pas* le MJ. La conversation de méta-break vit dans Hermes (Discord). SNEQ ne peut pas l'héberger. Mais SNEQ peut posséder :
- les **primitives d'écriture** durables (enregistrer une directive, émettre un feedback) ;
- la **capture passive** au point d'étranglement des outils (télémétrie) ;
- la **lecture / le digest** pour la boucle de croissance.

La détection "Jean entre en méta-break" et le routage de ses paroles vers la bonne primitive restent **côté Hermes**, dans une session séparée — exactement comme la réécriture du wake-up ritual l'était pour le spec défensif. Le seul artéfact consommateur qui vit dans ce repo et reste in-scope : le skill agent (`skills/sneq-narrative-engine.md`), qui apprend à l'agent quand appeler les nouveaux outils.

### 1.3 Hors-scope (explicite)

- **Détection + routage du méta-break côté Hermes** — repo séparé, session séparée.
- **Clustering LLM des thèmes de feedback dans SNEQ** (`feedback --synthesize`) — différé. SNEQ stocke du structuré et le retourne ; la synthèse conceptuelle est faite par Nemo dans une session Claude Code, là où le modèle fort est déjà. Garde le moteur déterministe.
- **Validation sémantique de la narration contre les directives** (ex. flagger "pistolet" sous une directive "pas d'armes à feu"). `validate-narration` reste de la résolution de noms propres en V1.
- **Sink de télémétrie externe** (PostHog, etc.). Local-first SQLite d'abord ; un hook pluggable de sink est une itération future.
- **Promotion automatique du feedback en issues GitHub** par signal. Triage manuel uniquement, piloté par Nemo.
- **Auto-réécriture des corrections en canon.** Une correction de méta-break peut *devenir* une directive, mais c'est Hermes qui arbitre quel verbe appeler ; SNEQ ne devine pas.

---

## 2. Locked Decisions

| # | Décision |
|---|----------|
| 1 | **Un seul spec combiné** couvrant les trois capacités (directives, feedback, télémétrie). Elles partagent l'idée d'un canal hors-narration mais restent des tables et des contrats distincts. |
| 2 | **Directives = nouveau type léger `CanonDirective`** (texte libre + scope + priorité + statut), table dédiée, *pas* réutilisation de `AttributFige` ni `Contrainte`. La loi-monde en prose ne se mappe pas sur des faits clé→valeur. |
| 3 | **Les directives remontent dans `prepare-turn`.** GLOBAL et SYSTEM toujours ; ENTITY quand l'entité est présente dans la scène. Triées par `priority` desc. Remontent même quand aucune scène n'est encore posée (la loi-monde existe à froid). |
| 4 | **Télémétrie passive au point d'étranglement `dispatchToolCall`.** Une ligne `ToolCallLogEntry` par appel d'outil, classifiée par outcome. Couvre les deux chemins (in-process `handleToolCall` + CLI `default` case) en une seule instrumentation. **Zéro effort agent, zéro changement de schéma.** |
| 5 | **Accès repo dans le dispatcher via `recordToolCall(entry)`** ajouté à `ToolCallContext` (optionnel, implémenté par `CampaignContext`). L'écriture de télémétrie est **swallowed** — elle ne peut jamais casser un appel d'outil. |
| 6 | **`report-feedback` = verbe fire-and-forget** (swallow, retourne `{recorded}`). `record-directive` = écriture canon délibérée qui, elle, **propage ses erreurs** (action de méta-break, pas mid-narration). |
| 7 | **Store = nouvelles tables dans la DB campaign**, pas de sidecar. Les directives sont du canon (elles vivent avec la campagne) ; le volume feedback/télémétrie est trivial en jeu tour-par-tour. |
| 8 | **Cycle de vie du feedback** : `status` ∈ `OPEN` → `TRIAGED` / `PROMOTED` / `DISMISSED`, + `promotedTo` (URL issue). Empêche le signal déjà trié de resurgir au digest suivant. |
| 9 | **2 outils LLM** : `sneq__record_directive`, `sneq__report_feedback` (les seuls que l'agent in-game appelle). Les 3 commandes de lecture/gestion (`list-directives`, `feedback`, `triage-feedback`) sont CLI-only, comme `prepare-turn`/`campaign-exists`. |
| 10 | **5 nouvelles commandes CLI** : `record-directive`, `list-directives`, `report-feedback`, `feedback`, `triage-feedback`. Total : 15 → 20. `bin` reste `sneq-engine`. |
| 11 | **Pas de nouveau registry pluggable** pour télémétrie/feedback en V1. Écritures repo directes avec sémantique swallow. Un hook de sink (PostHog) viendra plus tard si besoin. |
| 12 | **La télémétrie ne logge jamais les args bruts** (la narration peut s'y trouver). Seulement : nom d'outil, outcome, durée, et un `detail` minimal (compte/code). Pas de PII, pas de prose. |
| 13 | **Pas de breaking change.** API publique préservée. `prepare-turn` gagne un champ additif `directives`. `recordToolCall` est `?:` sur `ToolCallContext`. Nouvelles méthodes additives sur `CampaignContext`. |

---

## 3. Architecture

### 3.1 Vue d'ensemble

```
            ┌───────────────────────────────────┐
consumer    │   Engine (facade)                 │
 (Hermes,   │   engine.campaign(id).…           │
  TTRPG)    └─────┬─────────────────────────────┘
                  │
   ┌───────┬──────┴────────┬──────────┬──────────────────────────┐
   ▼       ▼               ▼          ▼                          ▼
 Domain   GCN    Resolver           Router            CampaignContext
  +CanonDirective (NEW)             tiers              ├ recordDirective   (NEW)
  +FeedbackEntry  (NEW)                                ├ reportFeedback    (NEW)
  +ToolCallLogEntry (NEW)                              ├ recordToolCall    (NEW)
                                                       ├ listDirectives    (NEW)
                                                       ├ feedbackDigest    (NEW)
                                                       ├ triageFeedback    (NEW)
                                                       └ prepareTurn  (+directives)
                                                              │
                  ┌───────────────────────────────────────────┤
                  ▼                                            ▼
         dispatchToolCall  ──(try/finally)──▶ classifyOutcome  Repository
         (point d'étranglement              (src/core/        ├ upsertDirective / listDirectives / retireDirective
          unique : in-process +              telemetry.ts)    ├ appendFeedback / queryFeedback / updateFeedbackStatus
          CLI default case)                       NEW         ├ appendToolCallLog / aggregateToolCalls
                  │                                           └ (3 nouvelles tables SQLite + migration)
                  ▼
         ctx.recordToolCall(entry)  ──swallow──▶ tool_call_log
```

Le canal méta est **orthogonal** au graphe narratif : aucune des trois tables ne référence `AttributFige`, `Potentialite` ou la GCN. Les directives *informent* la génération (via `prepare-turn`) mais ne sont pas des faits ; le feedback et la télémétrie ne touchent jamais la narration.

### 3.2 Couches modifiées vs nouvelles

| Couche | État | Changement |
|---|---|---|
| `src/domain/directive.ts` | **NEW** | Type `CanonDirective` + `DirectiveScope` + helpers. |
| `src/domain/feedback.ts` | **NEW** | Types `FeedbackEntry`, `FeedbackKind`, `FeedbackStatus`, `ToolCallLogEntry`, `ToolCallOutcome`. |
| `src/domain/ids.ts` | modifié | Ajout `DirectiveId`, `FeedbackId` + `asDirectiveId`, `asFeedbackId`. |
| `src/core/telemetry.ts` | **NEW** | `classifyOutcome(tool, result, err?) → {outcome, detail?}` — fonction pure, mapping par outil. |
| `src/tools/dispatcher.ts` | modifié | `recordToolCall?` sur `ToolCallContext` ; wrap du switch en try/finally + classify + record (swallow) ; 2 nouveaux cases. |
| `src/tools/schemas.ts` | modifié | `ToolNames` 11 → 13 ; schemas + descriptions Zod pour les 2 nouveaux outils. |
| `src/campaign.ts` | modifié | `recordDirective`, `reportFeedback`, `recordToolCall`, `listDirectives`, `feedbackDigest`, `triageFeedback` ; `prepareTurn` gagne `directives`. |
| `src/repository/interface.ts` | modifié | 3 groupes de méthodes (directives, feedback, tool-call-log). |
| `src/repository/sqlite/migrations.ts` | modifié | Nouvelle migration : tables `canon_directive`, `feedback_entry`, `tool_call_log`. |
| `src/repository/sqlite/index.ts` | modifié | Implémentation des nouvelles méthodes repo. |
| `src/repository/sqlite/serialization.ts` | modifié | (Dé)sérialisation des 3 nouveaux row shapes. |
| `src/cli/types.ts` | modifié | `KNOWN_COMMANDS` 15 → 20. |
| `src/cli/run.ts` | modifié | 5 nouveaux cases dans le switch. |
| `src/cli/help.ts` | modifié | 5 nouvelles sections d'aide. |
| `src/cli/parse-argv.ts` | modifié (léger) | Flags de confort `--status`, `--since` pour `feedback` (sinon `--args` JSON). |
| `src/engine.ts` | **inchangé** | `Engine.tools` auto-dérive des schemas ; le repo est déjà passé à `CampaignContext`. Rien à câbler. |
| `skills/sneq-narrative-engine.md` | modifié | Quand appeler `record_directive` et `report_feedback`. |

---

## 4. Data model

Trois records, trois tables, séparés par destination.

### 4.1 `CanonDirective` (bucket CANON)

```ts
// src/domain/directive.ts
export type DirectiveScope = "GLOBAL" | "SYSTEM" | "ENTITY";

export interface CanonDirective {
  id: DirectiveId;
  rule: string;                       // texte libre : "Le sang paie tout sortilège."
  scope: DirectiveScope;
  scopeRef?: string;                  // SYSTEM → tag ("magie") ; ENTITY → EntityID
  priority: number;                   // ordre de remontée, desc (défaut 0)
  status: "ACTIVE" | "RETIRED";
  source: "META_BREAK" | "SYSTEM";
  note?: string;                      // rationale : "demandé par le joueur, session 3"
  createdAt: number;
  createdTurn?: number;
}
```

- `GLOBAL` : loi-monde sans condition. `SYSTEM` : loi attachée à un sous-système nommé (`scopeRef` = tag d'organisation, ex. "magie", "droit-d-Aldric") ; remonte toujours, comme GLOBAL, mais filtrable. `ENTITY` : règle propre à une entité (`scopeRef` = `EntityID`) ; remonte seulement quand l'entité est présente.
- **Retirer** une directive = `upsert` avec `status: "RETIRED"`. On ne supprime jamais : l'historique du canon reste auditable.

### 4.2 `FeedbackEntry` (bucket META — jamais montré au joueur)

```ts
// src/domain/feedback.ts
export type FeedbackKind =
  | "FRICTION" | "MISSING" | "BROKEN"      // l'agent : ça coince / manque / est cassé
  | "REFLECTION" | "CORRECTION" | "PRAISE" // le joueur, en méta-break
  | "IDEA";                                 // l'un ou l'autre

export type FeedbackStatus = "OPEN" | "TRIAGED" | "PROMOTED" | "DISMISSED";

export interface FeedbackEntry {
  id: FeedbackId;
  origin: "AGENT" | "HUMAN";
  kind: FeedbackKind;
  body: string;                       // le contenu réel
  subject?: string;                   // pointeur : nom d'outil, sous-système, "general"
  severity?: "LOW" | "MED" | "HIGH";
  status: FeedbackStatus;             // défaut OPEN à la création
  promotedTo?: string;                // URL de l'issue GitHub une fois promu
  createdAt: number;
  createdTurn?: number;
}
```

Nommé `FeedbackEntry` (et non `Observation`) pour éviter la collision avec l'`Observation` existante (provenance des faits).

### 4.3 `ToolCallLogEntry` (TÉLÉMÉTRIE — automatique)

```ts
// src/domain/feedback.ts
export type ToolCallOutcome =
  | "OK" | "EMPTY" | "NO_MATCH" | "CONTRADICTION" | "ERROR";

export interface ToolCallLogEntry {
  tool: string;                       // nom de l'outil sneq__*
  outcome: ToolCallOutcome;
  durationMs: number;
  detail?: string;                    // code d'erreur, ou "facts=0", ou "issues=2"
  createdAt: number;
  turn?: number;                      // best-effort (latestTurn au moment de l'appel)
}
```

Pas d'ID brandé : `tool_call_log` utilise un rowid SQLite interne. **Jamais d'args bruts** (cf. locked decision #12).

### 4.4 Schéma SQLite (migration additive)

```sql
CREATE TABLE canon_directive (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  rule TEXT NOT NULL,
  scope TEXT NOT NULL,                -- GLOBAL | SYSTEM | ENTITY
  scope_ref TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  source TEXT NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  created_turn INTEGER
);
CREATE INDEX idx_directive_campaign_status ON canon_directive(campaign_id, status);

CREATE TABLE feedback_entry (
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
CREATE INDEX idx_feedback_campaign_status ON feedback_entry(campaign_id, status);

CREATE TABLE tool_call_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id TEXT NOT NULL,
  tool TEXT NOT NULL,
  outcome TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  detail TEXT,
  created_at INTEGER NOT NULL,
  turn INTEGER
);
CREATE INDEX idx_toolcall_campaign_tool ON tool_call_log(campaign_id, tool);
```

---

## 5. Capture

### 5.1 Télémétrie passive (`dispatchToolCall`)

Le point d'étranglement unique. Les deux chemins (in-process `campaign.handleToolCall` → `dispatchToolCall`, et CLI `run.ts` `default` case → `dispatchToolCall`) y convergent. Instrumentation en une fois :

```ts
// src/tools/dispatcher.ts (forme)
export async function dispatchToolCall(name: string, rawArgs: unknown, ctx: ToolCallContext): Promise<unknown> {
  // …validation/parse inchangés…
  const started = Date.now();
  let result: unknown;
  let error: unknown;
  try {
    result = await runSwitch(toolName, args, ctx);   // le switch existant, extrait
    return result;
  } catch (e) {
    error = e;
    throw e;                                          // comportement inchangé pour le caller
  } finally {
    const { outcome, detail } = classifyOutcome(toolName, result, error);
    const entry: ToolCallLogEntry = {
      tool: toolName,
      outcome,
      durationMs: Date.now() - started,
      ...(detail ? { detail } : {}),
      createdAt: Date.now()
    };
    // swallow : la télémétrie ne casse JAMAIS un appel d'outil
    try { await ctx.recordToolCall?.(entry); } catch { /* logger.warn côté impl */ }
  }
}
```

`recordToolCall?` est ajouté à `ToolCallContext` (optionnel → pas de breaking change, et les tests qui passent un faux ctx restent valides). `CampaignContext` l'implémente : lit `latestTurn` (best-effort) pour `turn`, écrit via `repo.appendToolCallLog`, swallow toute erreur via `deps.logger.warn`.

**`classifyOutcome` (src/core/telemetry.ts)** — fonction pure, mapping par outil :

| Outil | Règle |
|---|---|
| `lookup_entity` | `match === null` → `NO_MATCH` (detail = `notFoundReason`) ; sinon `OK` |
| `get_entity` | `null` → `EMPTY` ; sinon `OK` |
| `get_relevant_facts` | `length === 0` → `EMPTY` (detail = `facts=0`) ; sinon `OK` |
| `suggest_existing` | `candidates.length === 0` → `EMPTY` ; sinon `OK` |
| `register_fact` | `contradictions.length > 0` → `CONTRADICTION` ; sinon `OK` |
| `validate_narration` | `report.ok === false` → `OK` + detail = `issues=N` (trouver des issues = l'outil marche) |
| `collapse_attribute` | throw (non câblé en V2) → `ERROR` |
| autres / throw | throw → `ERROR` (detail = code) ; sinon `OK` |

### 5.2 `report-feedback` (verbe explicite, fire-and-forget)

Le canal délibéré de l'agent pour ce que la télémétrie ne peut pas inférer ("j'ai contourné l'absence de X", "ce sous-système est conceptuellement bancal"). Écrit un `FeedbackEntry(origin: "AGENT")`, swallow les erreurs d'écriture, retourne `{recorded: boolean}`. Invisible au joueur par construction (c'est un appel d'outil entre l'input et la narration).

### 5.3 `record-directive` (écriture canon délibérée)

Écrit / met à jour un `CanonDirective`. **Ne swallow pas** : c'est une action de méta-break que Jean attend persistée, donc les erreurs remontent. Pas mid-narration, donc sûr. `id` absent → création (`asDirectiveId(...)`, `status: "ACTIVE"`, `source: "META_BREAK"`) ; `id` présent → upsert (permet retire via `status: "RETIRED"` et ré-priorisation).

---

## 6. Directives dans `prepare-turn`

`prepareTurn()` (`campaign.ts:214`) gagne un champ additif `directives`. Règle de remontée :

```ts
const active = await repo.listDirectives(this.id, { status: "ACTIVE" });
const directives = active
  .filter(d =>
    d.scope === "GLOBAL" ||
    d.scope === "SYSTEM" ||
    (d.scope === "ENTITY" && d.scopeRef && scene?.presentEntityIds.includes(d.scopeRef as EntityID))
  )
  .sort((a, b) => b.priority - a.priority);
```

Le retour devient :

```ts
interface TurnContext {
  scene: Scene | null;
  presentEntities: { entity: Entity; facts: AttributFige[] }[];
  directives: CanonDirective[];       // NEW
}
```

**Correctness à froid** : quand `scene === null`, `prepare-turn` retourne aujourd'hui tôt `{scene:null, presentEntities:[]}`. On change pour retourner quand même les directives GLOBAL + SYSTEM actives : la loi-monde est connue avant même qu'une scène soit posée. Les ENTITY-scoped nécessitent une scène (pas de présence sans scène).

Hermes compose le prompt de génération ; SNEQ ne fait que *retourner* les directives dans le bundle `prepare-turn`. L'injection effective dans le prompt système du MJ est côté Hermes (hors-scope, §1.3).

---

## 7. La boucle de croissance

### 7.1 Le digest

```bash
sneq-engine feedback --db ./campaign.db --campaign X [--status open] [--since <ts>]
```

Retourne un seul bundle JSON :

```ts
interface FeedbackDigest {
  coverage: {
    tool: string;
    calls: number;
    outcomes: Partial<Record<ToolCallOutcome, number>>;
    lastCalledAt: number | null;
  }[];
  neverCalled: string[];              // ToolNames \ {outils vus dans tool_call_log}
  feedback: FeedbackEntry[];          // filtré par --status (défaut OPEN) et --since
}
```

`neverCalled` est calculé contre la liste canonique `ToolNames` (13 après ce spec) : c'est le signal "jamais touché" que Jean veut, dérivable uniquement de la télémétrie passive. Les directives ne sont **pas** dans le digest (cycle de vie différent ; on les inspecte via `list-directives` / `prepare-turn`).

### 7.2 Synthèse + promotion (piloté par Nemo)

Quand Jean demande "on a des feedbacks ?", Nemo lit `sneq-engine feedback`, **synthétise les thèmes** dans la session Claude Code (pas de clustering LLM dans SNEQ — locked #1 de §1.3), les présente, et avec l'accord de Jean ouvre des issues GitHub pour les vrais. Puis marque les entrées correspondantes :

```bash
sneq-engine triage-feedback --db ./campaign.db --campaign X \
  --args '{"id":"fb_abc","status":"PROMOTED","promotedTo":"https://github.com/JeanDes-Code/sneq-narrative-system/issues/12"}'
```

`triage-feedback` est **operator-only** (Nemo), pas un outil LLM. Le `status` évite que le signal trié resurgisse au prochain digest (`--status open` par défaut).

---

## 8. Surface CLI (5 nouvelles commandes)

Toutes suivent le contrat CLI existant : `--db` / `--campaign` requis, `--args` JSON (ou stdin), une ligne de JSON sur stdout, exit codes 0/1/2. Soumises au pre-check `CAMPAIGN_NOT_FOUND` standard (pas d'exception comme `campaign-exists`).

| Commande | Args | Sortie | Outil LLM ? |
|---|---|---|---|
| `record-directive` | `{rule, scope, scopeRef?, priority?, note?, id?, status?}` | `{directiveId, created}` | ✅ `sneq__record_directive` |
| `list-directives` | `{scope?, status?}` (défaut status=ACTIVE) | `CanonDirective[]` | ❌ CLI-only |
| `report-feedback` | `{kind, body, subject?, severity?}` | `{recorded}` | ✅ `sneq__report_feedback` |
| `feedback` | `{status?, since?}` (ou flags `--status`/`--since`) | `FeedbackDigest` | ❌ CLI-only |
| `triage-feedback` | `{id, status, promotedTo?}` | `{updated}` | ❌ CLI-only |

Exemples :

```bash
# Méta-break : injecter une loi-monde
sneq-engine record-directive --db ./c.db --campaign forge-de-valmure \
  --args '{"rule":"Le sang paie tout sortilège : pas de magie sans coût physique.","scope":"SYSTEM","scopeRef":"magie","priority":10,"note":"posé session 3"}'

# L'agent signale une friction (fire-and-forget)
sneq-engine report-feedback --db ./c.db --campaign forge-de-valmure \
  --args '{"kind":"MISSING","body":"Pas moyen de lier deux entités par une relation temporaire ; contourné avec un fait ETAT.","subject":"sneq__add_constraint","severity":"MED"}'

# Nemo : "on a des feedbacks ?"
sneq-engine feedback --db ./c.db --campaign forge-de-valmure --status open
```

---

## 9. Outils LLM exposés (2)

Ajoutés à `ToolNames` (11 → 13), `schemas`, `toolDescriptions`. Les adapters anthropic/openai/gemini et `jsonSchemas` auto-dérivent (aucun changement dans `adapters.ts` / `json-schema.ts` / `engine.ts`). Deux nouveaux cases dans `dispatchToolCall`.

```ts
sneq__record_directive: z.object({
  rule: z.string(),
  scope: z.enum(["GLOBAL", "SYSTEM", "ENTITY"]),
  scopeRef: z.string().optional(),
  priority: z.number().int().optional(),
  note: z.string().optional(),
  id: z.string().optional(),                 // upsert / retire
  status: z.enum(["ACTIVE", "RETIRED"]).optional()
}),
sneq__report_feedback: z.object({
  kind: z.enum(["FRICTION","MISSING","BROKEN","REFLECTION","CORRECTION","PRAISE","IDEA"]),
  body: z.string(),
  subject: z.string().optional(),
  severity: z.enum(["LOW","MED","HIGH"]).optional()
})
```

Descriptions (orientées narratif, comme les existantes) :
- `sneq__record_directive` : "Persiste une règle/loi custom du monde que le joueur a posée hors-narration (méta-break). Remonte ensuite dans prepare-turn. Utiliser quand le joueur explique une loi que tu ne peux pas déduire du canon."
- `sneq__report_feedback` : "Signale hors-bande un problème du système SNEQ (manquant, cassé, contourné) ou une réflexion. JAMAIS montré au joueur. Fire-and-forget : appelle et continue, n'attends rien, ne casse pas la narration."

`mention_entity`/`suggest_existing` exposent déjà le type `WORLD` — une directive SYSTEM peut donc référencer un sous-système worldbuilding cohérent avec une entité WORLD existante, mais ce n'est pas requis (`scopeRef` SYSTEM est un tag libre).

---

## 10. Testing

### 10.1 Layout

| Fichier | Couverture |
|---|---|
| `test/domain/directive.test.ts` | Construction `CanonDirective`, helpers `asDirectiveId`. |
| `test/domain/feedback.test.ts` | `FeedbackEntry` / `ToolCallLogEntry`, `asFeedbackId`. |
| `test/core/telemetry.test.ts` | `classifyOutcome` : un cas par ligne du tableau §5.1 (OK/EMPTY/NO_MATCH/CONTRADICTION/ERROR). |
| `test/tools/dispatcher.test.ts` (additif) | Télémétrie enregistrée par appel ; classification correcte ; **swallow** quand `recordToolCall` throw (l'appel d'outil réussit quand même) ; dispatch des 2 nouveaux cases. |
| `test/repository/sqlite.test.ts` (additif) | CRUD des 3 tables ; `aggregateToolCalls` (compte + outcomes + lastCalledAt) ; `queryFeedback` filtré par status/since ; `listDirectives` par scope/status ; retire via upsert. |
| `test/campaign.test.ts` (additif) | `recordDirective`, `reportFeedback`, `triageFeedback` ; `prepareTurn` avec directives (GLOBAL/SYSTEM toujours, ENTITY si présente, RETIRED exclues, ordre priorité, cas scène=null) ; `feedbackDigest` (coverage + `neverCalled` + entrées). |
| `test/cli/unit/*.test.ts` | Un fichier par nouvelle commande : parsing args, shape JSON, `report-feedback` retourne `{recorded}`, digest shape, triage met à jour le status. |
| `test/cli/e2e.test.ts` + `test/cli/smoke.test.ts` (additif) | Les 5 commandes dans le pattern roundtrip existant. |

### 10.2 Points de vigilance

- **Swallow** : le test clé du dispatcher est qu'un `recordToolCall` qui throw ne fait PAS échouer l'appel d'outil sous-jacent.
- **`neverCalled`** : après une campagne où seuls 3 outils sont appelés, le digest doit lister les 10 autres.
- **Surfacing à froid** : `prepare-turn` sans scène doit quand même retourner les directives GLOBAL/SYSTEM.
- **Pas de PII en télémétrie** : asserter qu'aucun `detail` ne contient d'args bruts/narration.

---

## 11. Open questions / risks

### 11.1 Risks

1. **Volume de `tool_call_log`.** Trivial en tour-par-tour (dizaines d'appels/session). Si un consommateur in-process haute-fréquence apparaît, ajouter une rétention/rollup — pas de changement architectural.
2. **`latestTurn` sur le hot path télémétrie.** Une lecture SQLite par appel d'outil pour stamper `turn`. Cheap, mais si mesuré coûteux : rendre `turn` purement best-effort (skip si pas en cache). À trancher en implémentation.
3. **Bruit du feedback agent.** Un agent trop zélé spamme `report-feedback`. Mitigé par le cycle de vie (`DISMISSED`) et la synthèse Nemo qui filtre. Pas de rate-limit en V1.
4. **Frontière directive vs fait.** Risque que l'agent enregistre en directive ce qui devrait être un fait d'entité (ou l'inverse). Le skill doc cadre : directive = règle-monde en prose qui contraint la génération ; fait = attribut clé→valeur figé sur une entité.

### 11.2 À confirmer pendant l'implémentation

- Format exact de `detail` par outil (à itérer en phase TDD).
- Enum `FeedbackKind` : 7 valeurs proposées, ajustables si l'usage réel en réclame d'autres (ou moins).
- Flags de confort `--status`/`--since` sur `feedback` vs tout en `--args` : trancher selon le pattern `parse-argv` existant.

---

## 12. Dependencies

- Hérite de l'architecture V2 (`2026-05-19`) : Engine, CampaignContext, Resolver, Router, Repository.
- Hérite du contrat CLI (`2026-05-20`) : parseArgv, JSON-on-stdout, exit codes, `--args`/stdin.
- Hérite du spec défensif (`2026-05-21`) : `prepare-turn` (qu'on étend), le pattern d'ajout d'outil LLM (`sneq__validate_narration`), la sémantique fire-and-forget de `PreGenerationRegistry` (qu'on réplique).
- Aucune nouvelle dépendance runtime. Réutilise zod, le repo SQLite, le router/resolver existants.

---

## 13. Next step

Hand off à `superpowers:writing-plans` pour produire un plan d'implémentation phasé en TDD, ordonné par dépendances :

1. Domain (`directive.ts`, `feedback.ts`, ids) + migration SQLite + méthodes repo.
2. `classifyOutcome` (pur) + instrumentation `dispatchToolCall` + `recordToolCall`.
3. Méthodes `CampaignContext` (record/report/triage/list/digest) + extension `prepareTurn`.
4. 2 outils LLM (schemas + descriptions + cases dispatcher).
5. 5 commandes CLI + help + parse-argv.
6. Skill doc.
7. Tests intégrés (e2e + smoke) en dernier.
