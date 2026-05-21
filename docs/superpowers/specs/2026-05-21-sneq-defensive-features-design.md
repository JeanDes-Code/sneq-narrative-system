---
title: SNEQ Defensive Features — Design
date: 2026-05-21
status: approved-for-planning
author: Jean Desauw (brainstormed with Nemo)
depends-on:
  - 2026-05-19-sneq-v2-engine-design.md
  - 2026-05-20-sneq-cli-design.md
closes: github-issue-1
language: fr
---

# SNEQ Defensive Features — Design Document

## TL;DR

Cinq ajouts minimaux au moteur `@sneq/engine` et à son CLI pour fermer trois des quatre bugs remontés par l'issue #1 (session RP "Stuck in Tamriel", 21/05/2026) : scène fantôme avec PNJ inventé, dérive de nom propre canon (Aldwyn ≠ Alduin), témoignage halluciné par un PNJ sur un événement jamais joué. Le quatrième bug (boucle de tokens) reste hors-scope car relevant du runtime LLM, pas du moteur narratif.

Les cinq ajouts :

1. **`validate-narration`** — nouvelle commande CLI qui scanne un texte de narration candidat et retourne la liste des noms propres non résolus contre le canon. Pipeline hybride : regex → resolver existant → light-tier LLM uniquement en cas d'ambiguïté.
2. **`prepare-turn`** — nouvelle commande CLI qui retourne en un appel atomique `{scene, presentEntities, facts}`. Le MJ ne peut plus sauter des étapes en composant manuellement get-scene + get-entity + get-relevant-facts.
3. **`campaign-exists`** — nouvelle commande CLI qui répond `{exists, name?}` sans throw. Permet au consommateur (Hermes) de décider "SNEQ-first vs SAVE.yaml-fallback" au wake-up sans gestion d'exception.
4. **`NarrationGateHook`** — nouvelle interface de validation pluggable pour les consommateurs in-process. Implémentation de référence livrée, branchée sur la même logique que `validate-narration`.
5. **`lookup-entity` `notFoundReason`** — champ additif sur `ResolutionResult` pour distinguer `no-match` / `below-threshold` / `ambiguous`. Pas de refactor, juste de la lisibilité au niveau du contrat.

Surface : ~600 LOC dans `src/` + ~800 LOC de tests. Aucune nouvelle dépendance runtime. CLI passe de 12 à 15 commandes. Aucun breaking change sur l'API publique.

---

## 1. Context

### 1.1 L'incident déclencheur

L'issue #1 du repo `sneq-narrative-system` rapporte quatre bugs de continuité observés lors d'une session RP du 21/05/2026 ("Stuck in Tamriel", campagne Skyrim). Diagnostic après échange avec Hermes-Agent (l'agent MJ tournant sur Discord) :

| Bug | Cause |
|---|---|
| Scène fantôme (Cassius Vorentius, PNJ inventé à un campement à l'aube) | Pas d'appel à `sneq-engine get-scene`. SAVE.yaml absent pour cette campagne. Fallback sur `session_search` qui a retourné un résultat partiel, extrapolé en scène + PNJ inventés. |
| "Aldwyn" au lieu d'"Alduin" | Pas d'appel à `lookup-entity` sur la transcription vocale. Le nom a été stocké tel quel dans MemPalace. |
| Anya témoigne d'un événement jamais joué | Pas d'appel à `get-relevant-facts(anya)`. Anya n'est pas non plus enregistrée dans SNEQ — `get-relevant-facts` aurait retourné vide. |
| Réponse dégénérée en répétitions cycliques | Overflow contexte LLM, ~40 échanges. Hors-scope SNEQ. |

Lecture du skill `rpg-core` de Hermes (versions du 21/05) confirme : **SNEQ n'a pas été appelé du tout pendant cette session.** Le rituel de wake-up de Hermes met SAVE.yaml en source primaire ; SNEQ y figure comme alternative opt-in mentionnée dans une procédure d'urgence conditionnée à "si SNEQ est configuré pour cette campagne" — sans mécanisme pour le savoir.

### 1.2 Pourquoi des features défensives côté SNEQ

Deux pistes ont été envisagées :
- (a) Réécrire le wake-up ritual de Hermes pour qu'il appelle SNEQ en premier.
- (b) Donner à SNEQ les outils pour rendre la non-utilisation mécaniquement difficile.

Le choix retenu est **les deux en parallèle**, dans l'ordre : SNEQ d'abord (ce spec), puis Hermes après. Ce document couvre uniquement la partie SNEQ.

Le principe directeur : **rendre l'appel à SNEQ atomique et auto-suffisant**. Un consommateur qui appelle `prepare-turn` au wake-up et `validate-narration` avant chaque flush ne peut plus produire les bugs 1-3, qu'il s'agisse de Hermes ou d'un futur consommateur in-process (TTRPG app, etc.).

### 1.3 Hors-scope (explicite)

- **Boucle de tokens / overflow contexte** — bug 4 de l'issue. C'est un problème de runtime LLM, pas de moteur narratif. Mention seulement pour transparence.
- **Réécriture du wake-up Hermes** — travail séparé, dans un autre repo, dans une autre session.
- **Auto-correction** des noms propres mal orthographiés (réécrire "Aldwyn" → "Alduin" automatiquement). `validate-narration` retourne des suggestions ; l'agent appelant arbitre. L'auto-rewrite change la sémantique du texte joueur, trop risqué pour V1.
- **Validation en streaming** sur une réponse LLM chunk-par-chunk. V1 est one-shot.
- **Validation engine-side automatique** (le moteur interceptant sa propre narration). La narration vit en dehors de SNEQ ; le moteur n'a jamais le texte sauf si on le lui passe.

---

## 2. Locked Decisions

| # | Décision |
|---|----------|
| 1 | **Trois nouvelles commandes CLI** : `validate-narration`, `prepare-turn`, `campaign-exists`. Total : 12 → 15 commandes. |
| 2 | **`validate-narration` : pipeline hybride.** Regex → resolver existant → light-tier LLM uniquement sur les candidats no-match. Zéro coût LLM dans le cas commun. |
| 3 | **Nouveau type de hook : `NarrationGateHook`.** Le hook existant `PreGenerationHook` est fire-and-forget (pas un gate). Le nouveau hook a une signature bloquante `validate(input): Promise<ValidationReport>`. Implémentation de référence livrée, parallèle à `PreGenerationRegistry`. |
| 4 | **Le hook n'est PAS auto-déclenché par le moteur.** La narration vit hors SNEQ. Le consommateur est responsable d'appeler `campaign.validateNarration(text)` avant de flusher. Le hook permet d'injecter une implémentation personnalisée (stopwords custom, LLM différent, etc.) — pas un gate magique. |
| 5 | **`lookup-entity` `notFoundReason` est additif.** Nouveau champ dérivé sur `ResolutionResult`, calculé depuis `layerUsed` + `candidates`. Pas de refactor du resolver lui-même. `CAMPAIGN_NOT_FOUND` reste un throw au niveau CLI pour les 11 autres commandes ; `campaign-exists` est la seule à ne pas throw. |
| 6 | **Pas de breaking change.** L'API publique existante est préservée. Le nouveau champ `notFoundReason` est `?:`. Les nouveaux registres sont additifs sur `Engine`. |
| 7 | **`prepare-turn` retourne `{scene, presentEntities: [{entity, facts}]}`.** Scene + entités + leurs faits figés en un appel. Pas de turn summaries dans V1. |
| 8 | **Stopwords FR + EN seulement en V1.** ~150 mots combinés, codés en dur. Configuration externe différée. |
| 9 | **Tests : 4 stages du Validator chacun couvert par ≥1 test ; positif + négatif pour chaque nouvelle commande CLI.** Pas de chasse au 100 % sur les edge cases regex. |
| 10 | **`bin` reste `sneq-engine`.** Pas de nouveau binaire ; même entry point `src/cli.ts`, trois cases supplémentaires dans le switch. |

---

## 3. Architecture

### 3.1 Vue d'ensemble

```
            ┌───────────────────────────────────┐
consumer    │   Engine (facade)                 │
 (Hermes,   │   engine.campaign(id).…           │
  TTRPG)    └─────┬─────────────────────────────┘
                  │
   ┌───────┬──────┴────────┬──────────┬─────────┐
   ▼       ▼               ▼          ▼         ▼
 Domain   GCN    Resolver           Router    Hooks (NEW: NarrationGate)
                 ├ resolveEntity    tiers     ├ userPrompt
                 │  └ +notFoundReason         ├ preGen
                 ├ suggestExisting            └ narrationGate ◀ NEW
                 │
                 ┌─────────────────────┐
                 │ Validator (NEW)     │
                 │  src/core/          │
                 │  validate-narration │
                 │  .ts                │
                 └─────────────────────┘
                          ▲
                          │ (used by)
                  ┌───────┴────────┐
                  │                │
            CLI: validate-     CampaignContext:
            narration          validateNarration
                                  │
                                  ▼
                          NarrationGateRegistry
                              .validate()
                                  │
                                  ▼
                      defaultNarrationGateHook
                      (or registered custom hook)
                                  │
                                  ▼
                            new Validator(...)
```

Trois nouveaux points d'entrée CLI (`validate-narration`, `prepare-turn`, `campaign-exists`), un nouveau module `src/core/validate-narration.ts`, un nouveau hook `src/hooks/narration-gate.ts`, et un champ additif `notFoundReason` sur `ResolutionResult`.

### 3.2 Couches modifiées vs nouvelles

| Couche | État | Changement |
|---|---|---|
| `src/domain/` | inchangé | — |
| `src/repository/` | inchangé | — |
| `src/router/` | inchangé | — |
| `src/resolver/resolver.ts` | modifié | Ajout dérivé `notFoundReason` à `ResolutionResult`. |
| `src/hooks/pre-generation.ts` | inchangé | — |
| `src/hooks/user-prompt.ts` | inchangé | — |
| `src/hooks/narration-gate.ts` | **NEW** | Interface + registry + impl de référence. |
| `src/core/validate-narration.ts` | **NEW** | Classe `Validator`. Pipeline 4 étapes. |
| `src/campaign.ts` | modifié | Ajout `validateNarration()`, `prepareTurn()`, `registerNarrationGate()`. |
| `src/engine.ts` | modifié | Owns `narrationGate: NarrationGateRegistry`. |
| `src/cli/types.ts` | modifié | `KNOWN_COMMANDS` passe de 12 à 15. |
| `src/cli/run.ts` | modifié | 3 nouveaux cases dans le switch. |
| `src/cli/help.ts` | modifié | 3 nouvelles sections d'aide. |
| `src/tools/schemas.ts` | modifié | Ajout schema Zod pour `sneq__validate_narration`. Les deux autres (prepare-turn, campaign-exists) sont CLI-only — pas exposées comme tools LLM. |
| `src/tools/dispatcher.ts` | modifié | Ajout case `sneq__validate_narration`. |

---

## 4. `validate-narration`

### 4.1 CLI

```bash
sneq-engine validate-narration \
  --db <path> \
  --campaign <id> \
  [--config <cfg>] \
  --args '{"narration":"<text>","type":"PERSONNAGE","strict":false}'

# Ou narration via stdin (recommandé pour les textes longs) :
echo '<text>' | sneq-engine validate-narration --db x --campaign c --args '{}'
```

Args :
- `narration` (string, requis) — le texte candidat à valider.
- `type` (EntityType, optionnel) — restreint la résolution à un type. Typiquement omis.
- `strict` (bool, défaut `false`) — si `true`, exit 1 quand `issues.length > 0`. Sinon, exit 0 + report sur stdout.

### 4.2 Sortie

```ts
interface ValidationReport {
  ok: boolean;                  // true ⇔ issues.length === 0
  partial?: boolean;            // true si l'étape LLM a été sautée (pas de clé / échec)
  extractedNames: string[];     // tous les candidats que le regex a flaggés
  issues: {
    noun: string;
    kind: "no-match" | "below-threshold" | "ambiguous";
    suggestions: {
      entityId: string;
      canonicalName: string;
      confidence: number;
    }[];
    llmReasoning?: string;
  }[];
}
```

### 4.3 Pipeline (4 étapes)

**Stage 1 — Extraction regex.** Tokenize le texte → identifie les séquences de 1 à 3 tokens capitalisés → drop :
- Tokens position 0 ou suivant `. ! ?` (heuristique sentence-start).
- Stopwords FR + EN (liste codée en dur, ~150 mots combinés : Tu, Il, Elle, Vous, Nous, Mais, Si, Oh, Ah, Ainsi, You, He, She, We, But, So, Yes, etc.).
- Tokens uniquement numériques ou < 2 caractères.

Volontairement **permissif** : préfère un faux positif (coût = un alias-lookup) à un faux négatif (coût = hallucination).

**Stage 2 — Passe resolver.** Pour chaque candidat, appel à `resolver.resolveEntity({mention: candidat, type})`. Catégorisation par `layerUsed` :
- `match !== null` → **RESOLVED** — drop.
- `match: null, layerUsed: "none"` → **NO-MATCH** candidat — escalade en stage 3.
- `match: null, layerUsed: "vector" | "judge", candidates.length > 0` → **BELOW-THRESHOLD** — c'est le cas Aldwyn → Alduin. Suggestions attachées depuis `candidates`. **Pas de LLM nécessaire.**
- `match: null, layerUsed: "user-prompt"` (utilisateur a refusé via L4) → **AMBIGUOUS** — suggestions attachées.

Note : en mode CLI, `userPromptRegistry` n'a pas de handler enregistré, donc L4 n'est jamais déclenché. Le cas `user-prompt` ne peut apparaître que pour les consommateurs in-process qui ont enregistré un handler.

**Stage 3 — Second avis LLM (uniquement sur NO-MATCH, batché).** Si `noMatch.length > 0` :
- Construction d'un prompt avec : la narration complète (tronquée à ~3000 chars si plus longue), la liste des NO-MATCH candidats, et top-K entités canoniques récemment touchées (K=20, triées par `embeddingRefreshedAt` desc).
- Un seul appel light-tier (Mistral / DeepSeek) avec format JSON strict :
  ```json
  [{"noun": "...", "verdict": "typo" | "unknown", "suggestion"?: "<entityId>", "confidence"?: 0..1, "reasoning"?: "..."}]
  ```
- Pour chaque verdict :
  - `typo` avec `suggestion` → promu en **BELOW-THRESHOLD**, suggestion attachée.
  - `unknown` → confirmé **NO-MATCH** final.
- En cas d'échec LLM (timeout, pas de clé) : `partial: true`, garder les NO-MATCH tels quels. Pas d'exception.

**Stage 4 — Assemblage.** Group by `kind`, tri par `confidence` descendant à l'intérieur de chaque groupe, retour.

### 4.4 Surface programmatique

```ts
class CampaignContext {
  // …existing methods…
  validateNarration(input: NarrationGateInput): Promise<ValidationReport>;
}
```

Délègue à `engine.narrationGate.validate(input, ctx)`. Le ctx contient `{campaignId, resolver, router}`.

### 4.5 Outil LLM exposé

`Engine.tools.{anthropic,openai,gemini}` exposera également ce tool sous le nom `sneq__validate_narration`, schema Zod identique à l'input ci-dessus. Les agents in-process qui passent par le tool-call protocol peuvent donc l'appeler comme n'importe quel autre tool SNEQ.

### 4.6 Module

`src/core/validate-narration.ts`. Classe `Validator` :

```ts
export class Validator {
  constructor(
    private readonly resolver: Resolver,
    private readonly router: Router,
    private readonly opts?: { stopwords?: ReadonlySet<string>; topK?: number }
  ) {}

  async validate(input: NarrationGateInput, campaignId: CampaignId): Promise<ValidationReport> {
    const candidates = this.extract(input.narration);
    const resolved = await this.resolvePass(campaignId, candidates, input.type);
    const escalated = await this.llmPass(campaignId, input.narration, resolved);
    return this.assemble(candidates, escalated);
  }

  private extract(text: string): string[] { /* stage 1 */ }
  private async resolvePass(campaignId, candidates, type?) { /* stage 2 */ }
  private async llmPass(campaignId, narration, resolved) { /* stage 3 */ }
  private assemble(candidates, results): ValidationReport { /* stage 4 */ }
}
```

Pure orchestration. Pas d'I/O direct ; tout passe par le resolver et le router injectés.

---

## 5. `prepare-turn`

### 5.1 CLI

```bash
sneq-engine prepare-turn --db <path> --campaign <id> [--config <cfg>]
# Pas de --args nécessaire ; le campaign + sa current scene suffisent.
```

### 5.2 Sortie

```ts
interface TurnContext {
  scene: Scene | null;          // null si aucune scène n'a encore été set
  presentEntities: {
    entity: Entity;
    facts: AttributFige[];      // tous les figés pour cette entité, sans depth
  }[];
}
```

### 5.3 Comportement

1. `campaign.currentScene()` → si `null`, retour immédiat `{scene: null, presentEntities: []}`. Signal explicite au caller : "scène pas initialisée, appelle `set-scene` avant de narrer."
2. Pour chaque `presentEntityId` dans la scène : `repo.getEntity(id)` + `repo.getFigedAttributes(id)`. Fan-out parallèle (Promise.all), pas séquentiel.
3. Retour `{scene, presentEntities}`.

Pure lecture, pas de side-effects. Si une entité référencée par `presentEntityIds` n'existe pas dans le repo (ne devrait pas arriver — invariant rompu), elle est omise du résultat avec un warning logger côté serveur.

### 5.4 Surface programmatique

```ts
class CampaignContext {
  prepareTurn(): Promise<TurnContext>;
}
```

### 5.5 Pas exposé comme tool LLM

Cette commande est destinée au CLI / au bootstrap in-process. Elle est moins utile aux agents in-process qui passent par les tools LLM (ils ont déjà accès direct à `currentScene` + `getEntity` + `getRelevantFacts`). Pas dans `Engine.tools`.

---

## 6. `campaign-exists`

### 6.1 CLI

```bash
sneq-engine campaign-exists --db <path> --campaign <id>
```

### 6.2 Sortie

```ts
interface CampaignExistsResult {
  exists: boolean;
  name?: string;            // présent si exists === true
  embeddingDim?: number;    // présent si exists === true
}
```

### 6.3 Comportement

- `engine.listCampaigns()` → filtre par `id`.
- Si trouvé : `{exists: true, name, embeddingDim}`.
- Si absent : `{exists: false}`.
- **Ne throw pas** `CAMPAIGN_NOT_FOUND`. C'est le seul de toutes les commandes CLI dans ce cas. Les 14 autres throw toujours.

### 6.4 Comportement spécial dans `run.ts`

Le pre-check générique en début de `dispatch()` (`existing.some(c => c.id === inv.campaign)` → throw `CAMPAIGN_NOT_FOUND`) doit être bypassé pour `campaign-exists` et `init-campaign`. La condition actuelle est `if (inv.command !== "init-campaign")`. Devient `if (inv.command !== "init-campaign" && inv.command !== "campaign-exists")`.

### 6.5 Surface programmatique

`engine.listCampaigns()` est déjà publique — pas besoin de méthode dédiée. Les consommateurs in-process peuvent filtrer eux-mêmes.

### 6.6 Pas exposé comme tool LLM

Bootstrap-only. Hors `Engine.tools`.

---

## 7. `NarrationGateHook` + reference implementation

### 7.1 Modèle mental

Ce **n'est pas** un gate automatique que le moteur déclenche tout seul. La narration vit **en dehors** de SNEQ — Hermes la génère, l'app TTRPG la génère. Le moteur n'a aucun moyen d'intercepter le texte.

Le hook est en fait de la **validation pluggable** : un consommateur enregistre son validator préféré sur la campagne, puis appelle `campaign.validateNarration(input)` avant de flusher la narration au joueur. Le "gate" est la discipline du caller à appeler la méthode ; le hook permet juste de swap l'implémentation du Validator sans forker.

### 7.2 Interface

```ts
// src/hooks/narration-gate.ts

export interface NarrationGateInput {
  narration: string;
  type?: EntityType;
  strict?: boolean;
}

export interface NarrationGateContext {
  campaignId: CampaignId;
  resolver: Resolver;
  router: Router;
}

export interface NarrationGateHook {
  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport>;
}

export class NarrationGateRegistry {
  private hook: NarrationGateHook = defaultNarrationGateHook;

  register(h: NarrationGateHook): { dispose(): void } {
    this.hook = h;
    return { dispose: () => { this.hook = defaultNarrationGateHook; } };
  }

  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport> {
    return this.hook.validate(input, ctx);
  }
}

// Pas de setErrorHandler ici : contrairement à PreGenerationRegistry.emit() qui est
// fire-and-forget (void), validate() retourne une Promise. Les erreurs propagent
// naturellement au caller via le await. Pas besoin de redirection.

export const defaultNarrationGateHook: NarrationGateHook = {
  async validate(input, ctx) {
    const validator = new Validator(ctx.resolver, ctx.router);
    return validator.validate(input, ctx.campaignId);
  }
};
```

### 7.3 Wiring

- `Engine` détient un `narrationGate: NarrationGateRegistry` instance, en parallèle de `userPrompt` et `preGen`.
- `CampaignContext` gagne deux méthodes :
  - `validateNarration(input)` → délégué au registry, ctx construit depuis les deps.
  - `registerNarrationGate(hook)` → délégué au registry.
- Default registry contient `defaultNarrationGateHook`. Sans enregistrement custom, `validateNarration` utilise le Validator built-in — même code path que le CLI.

### 7.4 Use cases

| Consommateur | Path |
|---|---|
| Hermes (out-of-process) | Shell-out à `sneq-engine validate-narration` avant chaque flush. Ne touche pas au hook. |
| TTRPG app (in-process, futur) | `campaign.validateNarration({narration: pendingText})` dans son pipeline post-generate. Default validator suffit ; peut swap. |
| Consommateur custom | `campaign.registerNarrationGate({validate: myCustomImpl})` pour injecter un validator domain-specific (langue, stopwords, modèle LLM). |

---

## 8. `lookup-entity` `notFoundReason`

### 8.1 Champ additif

```ts
// src/resolver/resolver.ts
export interface ResolutionResult {
  match: Entity | null;
  confidence: number;
  candidates: Entity[];
  layerUsed: "alias" | "vector" | "judge" | "user-prompt" | "none";
  reasoning?: string;
  notFoundReason?: "no-match" | "below-threshold" | "ambiguous";  // NEW
}
```

### 8.2 Logique de dérivation (pure)

Appliquée à la fin de `resolveEntity()`, juste avant le `return` de chaque branche :

| Condition | `notFoundReason` |
|---|---|
| `match !== null` | `undefined` |
| `match: null, layerUsed: "none"` | `"no-match"` |
| `match: null, layerUsed: "vector"`, `confidence < tauLow` | `"below-threshold"` |
| `match: null, layerUsed: "vector" \| "judge"`, `candidates.length > 0`, confidence >= tauLow | `"ambiguous"` |
| `match: null, layerUsed: "user-prompt"` | `"ambiguous"` |
| `match: null, layerUsed: "judge"` avec `candidates: []` | `"no-match"` |

### 8.3 Surface CLI

Le champ est inclus tel quel dans la sortie JSON de `lookup-entity`. Pas de transformation. Les consommateurs peuvent switcher dessus :

```ts
switch (result.notFoundReason) {
  case "no-match": // créer une nouvelle entité ou demander au joueur
  case "below-threshold": // afficher les suggestions, ne pas auto-créer
  case "ambiguous": // demander au joueur de choisir
}
```

### 8.4 `CAMPAIGN_NOT_FOUND` reste un throw

Pour les 14 autres commandes CLI, "campagne inexistante" reste un throw au niveau CLI. `campaign-exists` est l'unique sortie sans throw.

---

## 9. Testing

### 9.1 Layout

| Fichier | Couverture |
|---|---|
| `test/core/validate-narration.test.ts` | Validator unit tests : regex extraction (noms multi-tokens, sentence-initial drop, stopword drop), routing par layerUsed, suggestions below-threshold, skip LLM sans clé, reporting partiel. |
| `test/cli/unit/validate-narration.test.ts` | CLI command unit : parsing args, path stdin, strict-mode exit code, shape JSON output. |
| `test/cli/unit/prepare-turn.test.ts` | Scene-null path, scene-with-entities path, facts attachés par entité, empty-campaign path. |
| `test/cli/unit/campaign-exists.test.ts` | exists / doesn't-exist ; pas de throw sur missing. |
| `test/hooks/narration-gate.test.ts` | Default hook dans registry, register-and-dispose, custom hook reçoit ctx. |
| `test/resolver/resolver.test.ts` (additif) | Nouveaux cas `notFoundReason` — un par branche de la table de dérivation. Tests existants doivent toujours passer. |
| `test/cli/e2e.test.ts` et `test/cli/smoke.test.ts` (additif) | Les 3 nouvelles commandes dans le pattern roundtrip existant. |

### 9.2 Mocking strategy

- **Validator LLM step** mocké au niveau Router pour les unit tests (la suite existante mock déjà le router pour les tests de resolver).
- **Integration smoke** (`SNEQ_INTEGRATION_SMOKE=1`) exerce le vrai appel light-tier — un test E2E qui crée une DB, mention quelques entités, appelle validate-narration avec un texte mixte (résolvable + no-match), vérifie que le rapport contient les bons issues.

### 9.3 Fixtures

Réutilise `test/fixtures/`. Si besoin d'un fixture campaign avec entités prédéfinies (Alduin, Anya, Dragonsreach), l'ajouter dans `test/fixtures/stuck-in-tamriel.fixture.ts` — mais probablement réutilisable depuis les fixtures CLI existants.

---

## 10. Open questions / risks

### 10.1 Risks

1. **Faux positifs regex en français.** Mitigé par la stopword list + le coût quasi-nul de l'alias-lookup. Si la prod montre un taux élevé, tune les stopwords — pas de changement architectural.
2. **Latence LLM light-tier.** ~1-2 sec par turn "uncertain". Acceptable pour un cycle RP turn-based ; pourrait être parallélisé avec le streaming narration dans une itération future.
3. **Le validator ne distingue pas le PJ d'un PNJ inconnu.** Il ne peut pas — le PJ est juste une autre entité dans canon. Tant que le PJ est `mention-entity`'d, il résout normalement. Si non enregistré, le nom du PJ sera flaggé `no-match`. C'est correct : enregistre ton PJ.
4. **Le LLM step peut halluciner des suggestions.** Mitigé par la liste `topK` d'entités réelles passées en contexte + format JSON strict + le verdict `unknown` toujours possible.

### 10.2 Pas vraiment des questions, mais des choses à confirmer pendant l'implémentation

- Format exact du prompt LLM en stage 3 (à itérer pendant la phase TDD ; le spec ne le fige pas).
- Liste stopwords exacte (FR + EN ~150 mots) — drafter pendant l'implémentation, pas dans ce spec.
- Top-K = 20 ou plus ? Tuner pendant l'implémentation selon la latence observée.

---

## 11. Dependencies

- Hérite de l'architecture V2 (`2026-05-19-sneq-v2-engine-design.md`) : Engine, CampaignContext, Resolver, Router, Repository.
- Hérite du contrat CLI (`2026-05-20-sneq-cli-design.md`) : parseArgv pattern, JSON-on-stdout, exit codes 0/1/2, --args / stdin format, --config router config.
- Aucune nouvelle dépendance runtime. Réutilise zod (déjà présent), router/resolver/repo existants.

---

## 12. Next step

Hand off to `superpowers:writing-plans` pour produire un plan d'implémentation phasé en TDD, ordonné pour dépendances (Validator → CLI commands → hook → notFoundReason → tests intégrés).
