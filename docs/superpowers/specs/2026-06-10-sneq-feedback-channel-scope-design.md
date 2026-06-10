---
title: SNEQ Feedback Channel — Scope retenu (addendum au Meta Layer)
date: 2026-06-10
status: approved-for-planning
author: Jean Desauw (brainstormed with Nemo)
depends-on:
  - 2026-05-25-sneq-meta-layer-design.md
  - 2026-06-10-sneq-plug-and-play-hardening-design.md
language: fr
---

# SNEQ Feedback Channel — Scope Document

## TL;DR

Le gap à fermer : « le CLI doit pouvoir recevoir du feedback d'un consommateur, ou il faut un chemin documenté pour ouvrir une issue GitHub ». Réponse en deux moitiés, parce que le gap a **deux audiences** :

1. **Consommateurs humains** (devs npm) → templates d'issues GitHub + section README. Net-new, le repo n'a pas de dossier `.github/`.
2. **L'agent in-game** (qui ne peut pas ouvrir d'issues) → **capacités 2 et 3** du spec Meta Layer (`2026-05-25`) : `FeedbackEntry` (verbe `report-feedback`, digest `feedback`, triage `triage-feedback`) + télémétrie passive `tool_call_log`.

La **capacité 1 (`CanonDirective`) est différée** : c'est du canon, pas du feedback — cycle de vie distinct, hors-sujet pour ce gap. Le spec Meta Layer reste la référence design complète ; ce document acte le scope retenu et les deltas rendus nécessaires par le hardening 0.1.0 (postérieur au spec mère).

## 1. Scope retenu

| Capacité Meta Layer | Statut |
|---|---|
| 1 — `CanonDirective` + `prepare-turn.directives` + `sneq__record_directive` | **Différée** (future work, design inchangé dans le spec mère) |
| 2 — `FeedbackEntry` : `report-feedback` / `feedback` / `triage-feedback` | **Retenue** |
| 3 — Télémétrie `ToolCallLogEntry` au point d'étranglement `dispatchToolCall` | **Retenue** |
| Net-new — `.github/ISSUE_TEMPLATE/` + section README « Feedback » | **Retenue** |

Pourquoi 3 avec 2 : sans télémétrie, le digest ne contient que ce que l'agent *choisit* de dire. Le signal le plus précieux (« jamais appelé / contourné en silence ») ne peut venir que de la capture passive (§1.1 du spec mère), et elle est cheap : une fonction pure + un try/finally au point d'étranglement unique + une table.

## 2. Deltas vs le spec mère

Le spec Meta Layer date d'avant le hardening 0.1.0. Corrections de ses hypothèses :

| Sujet | Spec mère | Retenu |
|---|---|---|
| Outils LLM | 11 → 13 | 11 → **12** (`sneq__report_feedback` seul ; `record_directive` différé) |
| Commandes CLI | 15 → 20 | 15 → **18** (`report-feedback`, `feedback`, `triage-feedback`) |
| Advertising des outils | « les adapters auto-dérivent » | Toujours vrai **via `ADVERTISED_TOOL_NAMES`** (`src/tools/adapters.ts`, post-hardening) : filtre exclusion-based, le nouvel outil s'auto-advertise en entrant dans `ToolNames`. |
| `neverCalled` du digest | calculé contre `ToolNames` | calculé contre **`ADVERTISED_TOOL_NAMES`** — sinon `collapse_attribute` (dé-advertisé, jamais appelable) pollue le digest à vie. Après ce chantier : 11 outils advertised. |
| Adapters repository | sqlite seul | **3 adapters** (sqlite / memory / json, post-hardening) : les 5 nouvelles méthodes repo s'implémentent dans les trois et entrent dans la suite contrat `test/repository/contract.ts`. |
| Migration SQLite | 3 tables | **2 tables** (`feedback_entry`, `tool_call_log` ; pas de `canon_directive`) |
| Dispatcher | 2 nouveaux cases | **1 nouveau case** (`report_feedback`) + instrumentation try/finally inchangée |
| `prepare-turn` | gagne `directives` | **intouché** |

Tout le reste (shapes des types, sémantique swallow/fire-and-forget, classification `classifyOutcome` §5.1, cycle de vie du feedback, contrat CLI, locked decisions #4–#12) s'applique tel quel.

Nouvelles méthodes repo (interface + ×3 adapters + contrat) :

```ts
appendFeedback(campaignId, entry): Promise<void>
queryFeedback(campaignId, filter: { status?, since? }): Promise<FeedbackEntry[]>
updateFeedbackStatus(campaignId, id, status, promotedTo?): Promise<boolean>
appendToolCallLog(campaignId, entry): Promise<void>
aggregateToolCalls(campaignId): Promise<ToolCallAggregate[]>  // {tool, calls, outcomes, lastCalledAt}
```

## 3. Chemin humain : templates d'issues + README

- `.github/ISSUE_TEMPLATE/bug-report.yml` — repro, version, adapter (sqlite/memory/json), comportement attendu/observé.
- `.github/ISSUE_TEMPLATE/feedback.yml` — dropdown `kind` aligné sur la taxonomie `FeedbackKind` du moteur : friction / missing / broken / idea ; champ libre `body` ; champ optionnel `subject` (outil ou sous-système).
- `.github/ISSUE_TEMPLATE/config.yml` — `blank_issues_enabled: true` (pas de forçage).
- README, section « Feedback » : le chemin humain (issues, lien templates) et le chemin agent (verbe → digest → triage, promotion **manuelle** en issue — locked decision du spec mère §1.3 : jamais d'auto-promotion).
- `skills/sneq-narrative-engine.md` : quand appeler `sneq__report_feedback` (fire-and-forget, hors-bande, jamais montré au joueur).

## 4. Testing (delta)

Layout §10 du spec mère, moins les fichiers directives :

- `test/domain/feedback.test.ts`, `test/core/telemetry.test.ts` — inchangés vs spec mère.
- `test/tools/dispatcher.test.ts` — télémétrie + swallow + le case `report_feedback`.
- **`test/repository/contract.ts`** (remplace « sqlite.test.ts additif ») — CRUD feedback + tool_call_log + agrégats, exécuté sur les 3 adapters.
- `test/campaign.test.ts` — `reportFeedback`, `triageFeedback`, `feedbackDigest` (coverage + `neverCalled` contre advertised + entrées filtrées).
- `test/cli/unit/*` + e2e + smoke — les 3 nouvelles commandes dans les patterns existants.

Points de vigilance hérités : swallow (un `recordToolCall` qui throw ne casse jamais l'appel d'outil), `neverCalled` exhaustif, zéro PII/prose dans `detail`.

## 5. Workflow

- Branche `feat/feedback-channel`, un commit par tâche, PR — merge après OK explicite de Jean.
- Après merge : bump **0.2.0** (additif, zéro breaking) + `npm publish` (OTP Jean).
- Version cible documentée dans UPGRADING.md si un consommateur doit adapter quoi que ce soit (a priori rien : API additive).

## 6. Next step

Hand off à `superpowers:writing-plans` : plan TDD phasé calqué sur `docs/superpowers/plans/2026-06-10-sneq-plug-and-play-hardening.md`, ordre §13 du spec mère restreint au scope : domain → repo (interface + 3 adapters + contrat) → telemetry + dispatcher → méthodes campaign → outil LLM → commandes CLI → templates/README/skill → e2e + smoke.
