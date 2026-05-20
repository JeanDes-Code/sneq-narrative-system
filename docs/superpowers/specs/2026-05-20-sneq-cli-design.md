---
title: SNEQ CLI — Design
date: 2026-05-20
status: approved-for-planning
author: Jean Desauw (brainstormed with Nemo)
depends-on: 2026-05-19-sneq-v2-engine-design.md
language: fr
---

# SNEQ CLI — Design Document

## TL;DR

Un binaire `sneq-engine` ajouté au package `@sneq/engine` existant, fonctionnant comme **wrapper mince** au-dessus de la librairie. Il expose les 10 tools du dispatcher en sous-commandes kebab-case + 2 conveniences (`init-campaign`, `get-scene`), avec un contrat I/O 100 % JSON sur stdout pour permettre à un agent out-of-process (Hermes-Agent, autres runtimes non-TypeScript) de piloter le moteur SNEQ sans embed in-process.

Le CLI ne réécrit aucune logique : il parse `argv`, charge la config, instancie `Engine` + `Campaign`, et délègue à `dispatchToolCall()` (qui existe déjà). Surface ~200 LOC dans un seul fichier `src/cli.ts`. Aucune nouvelle dépendance runtime.

---

## 1. Context

Le repo livre actuellement `@sneq/engine` (V2 alpha) comme **librairie TypeScript** consommée *in-process* : un agent qui peut embed Node/TS récupère les tool schemas (`Engine.tools.anthropic`/`openai`/`gemini`), les passe à son LLM, puis dispatch les tool calls via `campaign.handleToolCall(name, args)`.

Ce modèle exclut les consommateurs out-of-process : agents écrits dans un autre langage, scripts shell, agents qui tournent dans un runtime isolé sans accès au module TypeScript. Le cas concret immédiat est Hermes-Agent (Leeloo) sur Discord : elle a son propre cycle conversationnel et son propre LLM, et ne veut pas embed une lib Node — elle veut shellout par tour pour le bookkeeping pur.

Leeloo a sketché un spec CLI à 9 commandes (cf. message brainstorming 2026-05-20). Ce document formalise ce spec, l'aligne sur les 10 tools du dispatcher, et tranche les questions ouvertes (provenance des observations, format d'args, bootstrap config).

---

## 2. Locked Decisions

| # | Décision |
|---|----------|
| 1 | **Rôle**: le CLI est un wrapper mince qui coexiste avec la lib. La lib reste l'API canonique pour les intégrations TypeScript in-process. Le CLI sert les consommateurs out-of-process. |
| 2 | **Surface**: 10 tools du dispatcher exposés en kebab-case + 2 conveniences (`init-campaign`, `get-scene`) = 12 commandes. |
| 3 | **Format args**: JSON via stdin OU flag `--args '<json>'`, schema 1:1 sur les Zod existants. Pas de flags ad-hoc par paramètre. |
| 4 | **Observation policy**: champ `observation` rendu optionnel dans le CLI. Si absent, généré depuis `--source <preset>` (default `gm-narration`). Override via `--observation '<json>'`. |
| 5 | **Config**: env vars pour API keys + `defaultRouterConfig()` par défaut. Override via `--config <path>` optionnel. |
| 6 | **Packaging**: même package `@sneq/engine`, fichier `src/cli.ts` → `dist/cli.js`, exposé via `"bin": { "sneq-engine": "./dist/cli.js" }`. Aucune nouvelle dépendance runtime. |
| 7 | **Logger**: noop (silent). Erreurs JSON sur stdout. `SNEQ_DEBUG=1` → verbose sur stderr uniquement. |
| 8 | **Resolver L4**: désactivé en CLI (pas d'interaction humaine). Ambiguïté retournée comme `{ match: null, candidates: [...] }` ; l'agent appelant arbitre. |
| 9 | **Contradictions `register-fact`**: ne sont **pas une erreur**. Exit 0, payload `{ factId: null, contradictions: [...] }`. L'agent décide. |

---

## 3. Architecture

### 3.1 Fichier d'entrée

```
src/cli.ts        →   dist/cli.js
#!/usr/bin/env node
```

`package.json` gagne :

```json
"bin": { "sneq-engine": "./dist/cli.js" }
```

Build : `tsc -p tsconfig.build.json` (déjà en place). Le shebang est inclus dans le source TypeScript et préservé par tsc.

### 3.2 Flow d'exécution

```
process.argv
     │
     ▼
parseArgv(argv)  ──→  { command, db, campaign?, config?, source?, observation?, args?, help? }
     │
     ▼
si --help → printHelp(command) → exit 0
     │
     ▼
si command absente ou inconnue → erreur UNKNOWN_COMMAND
     │
     ▼
résoudre args finaux:
    base = args lu via --args OU stdin (si non-TTY) OU {}
    si command === "register-fact":
        base.observation = base.observation
                        ?? buildObservationFromFlags({ source, observation })
                        ?? buildObservation("gm-narration")
     │
     ▼
loadConfig(--config) ?? defaultRouterConfig() merged with env vars
     │
     ▼
repository = sqliteRepository({ path: db, embeddingDim: 768 })
engine     = new Engine({ repository, router: buildRouter(config) })
     │
     ▼
si command === "init-campaign":
    engine.createCampaign({ id: campaign, name: args.name, embeddingDim: args.embeddingDim ?? 768 })
    print { campaignId: campaign, created: true }
    exit 0
     │
     ▼
campaign = await engine.getCampaign(campaign)  // erreur CAMPAIGN_NOT_FOUND si absent
     │
     ▼
si command === "get-scene":
    print campaign.getCurrentScene()
    exit 0
     │
     ▼
sinon — 10 tools:
    toolName = `sneq__${command.replaceAll("-","_")}`
    ctx      = buildToolCallContext(campaign)  // dérivé du CampaignContext
    result   = await dispatchToolCall(toolName, args, ctx)
    print result
    exit 0
```

### 3.3 Modules exposés (pour tests)

`src/cli.ts` exporte les fonctions pures internes pour les tests unit :

```ts
export function parseArgv(argv: string[]): ParsedInvocation;
export function buildObservation(source: SourcePreset, override?: Partial<Observation>): Observation;
export function formatError(err: unknown): { json: string; exitCode: number };
export async function run(invocation: ParsedInvocation, deps: RunDeps): Promise<void>;
```

`main()` reste minimal : assemble les deps réelles (stdin, stdout, engine) et appelle `run`.

### 3.4 Bootstrap config

- API keys : lues depuis env vars conventionnelles (`ANTHROPIC_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `TOGETHER_API_KEY`, `GOOGLE_GENAI_API_KEY`).
- Provider chains : `defaultRouterConfig()` par défaut (heavy/light/embeddings tiers déjà définis dans la lib).
- Override : `--config <path>` charge un JSON via `loadConfigFromFile()` (déjà exposé par la lib).
- Mode dégradé : si aucune API key détectée et qu'une commande requiert un provider (lookup-entity en mode vector, collapse-attribute), erreur `PROVIDER_ERROR` avec un message clair. Pas de mode "offline implicite" — l'erreur force l'utilisateur à choisir.

### 3.5 Repository

`sqliteRepository({ path: db, embeddingDim: 768 })` (déjà importable via `@sneq/engine/sqlite`). `embeddingDim` non configurable côté CLI dans cette V1 (768 = défaut de la lib). Future amélioration possible via `--embedding-dim`.

Le fichier `db` est créé si absent (better-sqlite3 le fait par défaut). Aucune campagne n'est créée automatiquement — `init-campaign` est explicite.

---

## 4. Surface des commandes

### 4.1 Inventaire

| Commande               | Cible                                          | `--args` shape                                              |
|------------------------|------------------------------------------------|-------------------------------------------------------------|
| `init-campaign`        | `engine.createCampaign(...)` (convenience)     | `{ name: string, embeddingDim?: number }`                   |
| `get-scene`            | `campaign.getCurrentScene()` (convenience)     | `{}`                                                        |
| `lookup-entity`        | `sneq__lookup_entity`                          | `{ mention, type?, sceneId? }`                              |
| `get-entity`           | `sneq__get_entity`                             | `{ entityId }`                                              |
| `get-relevant-facts`   | `sneq__get_relevant_facts`                     | `{ entityId, attributeKeys?, depth? }`                      |
| `suggest-existing`     | `sneq__suggest_existing`                       | `{ mention, type }`                                         |
| `mention-entity`       | `sneq__mention_entity`                         | `{ canonicalName, type, aliases?, sceneId?, description }`  |
| `register-fact`        | `sneq__register_fact`                          | `{ entityId, attributeKey, value, category, observation? }` |
| `add-constraint`       | `sneq__add_constraint`                         | `{ entityId, attributeKey, rule, justification }`           |
| `collapse-attribute`   | `sneq__collapse_attribute`                     | `{ entityId, attributeKey, profondeur?, registre? }`        |
| `set-scene`            | `sneq__set_scene`                              | `{ locationEntityId, presentEntityIds, description }`       |
| `advance-turn`         | `sneq__advance_turn`                           | `{ summary? }`                                              |

Le schema d'`--args` est exactement le Zod schema du tool correspondant (cf. `src/tools/schemas.ts`). Aucune divergence sauf pour `register-fact` (observation optionnel + auto-fill).

### 4.2 Presets `--source`

Quatre presets permettant à `register-fact` de fabriquer une `Observation` sans verbosité :

| Preset                     | source              | method                  | fiabilite        |
|----------------------------|---------------------|-------------------------|------------------|
| `gm-narration` (default)   | `GM_NARRATION`      | `DIALOGUE_DIRECT`       | `CERTAINE`       |
| `player-utterance`         | `PLAYER_UTTERANCE`  | `DIALOGUE_DIRECT`       | `TEMOIGNAGE`     |
| `dice-roll`                | `DICE_ROLL`         | `DEMONSTRATION`         | `CERTAINE`       |
| `system`                   | `SYSTEM`            | `DEDUCTION_CONFIRMEE`   | `CERTAINE`       |

Champs auto-remplis quel que soit le preset : `timestamp = Date.now()`. `sceneId` repris de la scène courante de la campagne si disponible.

Précédence pour le champ `observation` final, du moins prioritaire au plus prioritaire :
1. Preset construit depuis `--source` (default `gm-narration`)
2. `--observation '<json>'` (override partiel, merge sur le preset)
3. Champ `observation` dans `--args` (override total)

### 4.3 Flags reconnus

| Flag                | Type      | Requis ?                              | Sémantique                                                       |
|---------------------|-----------|---------------------------------------|------------------------------------------------------------------|
| `--db <path>`       | string    | Toujours                              | Chemin du fichier SQLite (créé si absent)                        |
| `--campaign <id>`   | string    | Toutes sauf `--help`                  | Identifiant de la campagne (à créer pour `init-campaign`)        |
| `--config <path>`   | string    | Non                                   | Override de la config router                                     |
| `--source <preset>` | enum      | Non (default `gm-narration`)          | Preset d'observation pour `register-fact` (ignoré pour les autres commandes) |
| `--observation '<json>'` | string (JSON) | Non                              | Override partiel de l'observation                                |
| `--args '<json>'`   | string (JSON) | Non (lit stdin si absent)         | Arguments de la commande                                          |
| `--help`            | bool      | Non                                   | Aide générale ou spécifique à la commande                        |

Flag inconnu → erreur `INVALID_ARGS`.

### 4.4 Aide

- `sneq-engine --help` : liste des 12 commandes + 1 ligne par commande.
- `sneq-engine <command> --help` : schema d'`--args` (rendu lisible à partir du Zod), exemple JSON valide.

L'aide n'est **pas** au format JSON (lisible humain, texte plain sur stdout). C'est la seule exception au contrat JSON.

---

## 5. Contrat I/O

### 5.1 Entrée

Trois sources d'args fusionnées (override de la suivante sur la précédente) :
1. Observation construite depuis `--source` (uniquement pour `register-fact`)
2. JSON sur stdin (si stdin n'est pas un TTY)
3. JSON dans `--args '<json>'`

Si stdin et `--args` sont tous deux fournis, `--args` gagne. Si les deux sont absents et que la commande accepte un payload vide (`get-scene`, `advance-turn` sans summary), `args = {}`.

### 5.2 Sortie — succès

Une seule ligne JSON sur stdout, exit code `0`. La shape est exactement le retour du tool dispatcher (cf. `dispatcher.ts` pour les types). Pas de pretty-print, pas de logs sur stdout.

Exemples :
```json
{"match":{"entityId":"ent_abc","name":"Aldric Fervent","confidence":0.94},"candidates":[],"layerUsed":"vector"}
{"entityId":"ent_abc","isNew":true,"resolvedTo":null}
{"factId":"fact_xyz","contradictions":[]}
{"sceneId":"scene_42","turnNumber":17}
{"campaignId":"sang-artemis","created":true}
```

### 5.3 Sortie — erreur

Une ligne JSON sur stdout, exit code `1` (ou `2` pour `INTERNAL_ERROR`). Shape :

```json
{"error":"<message lisible>","code":"<CODE_ENUM>","details":<optionnel>}
```

### 5.4 Codes d'erreur

Enum stable (source of truth, à ne pas changer sans bump de version) :

| Code                          | Quand                                                                       | Exit |
|-------------------------------|-----------------------------------------------------------------------------|------|
| `INVALID_ARGS`                | Flag inconnu, JSON malformé sur `--args`/stdin, value type invalide         | 1    |
| `VALIDATION_FAILED`           | Zod rejette les args ; `details` contient les `ValidationFailureDetail`     | 1    |
| `CAMPAIGN_NOT_FOUND`          | `--campaign` n'existe pas (sauf pour `init-campaign`)                       | 1    |
| `CAMPAIGN_ALREADY_EXISTS`     | `init-campaign` sur un id déjà présent                                      | 1    |
| `ENTITY_NOT_FOUND`            | `entityId` inconnu pour la commande                                          | 1    |
| `PROVIDER_ERROR`              | Router exhausted / HTTP error ; `details.providerCode` enrichit             | 1    |
| `REPOSITORY_ERROR`            | SQLite IO ou intégrité                                                       | 1    |
| `UNKNOWN_COMMAND`             | Subcommand non reconnue                                                      | 1    |
| `INTERNAL_ERROR`              | Catch-all bug                                                                | 2    |

### 5.5 Cas spéciaux non-erreur

- **`register-fact` avec contradiction** : retour `{ factId: null, contradictions: [...] }`, exit `0`. Identique au dispatcher in-process.
- **`lookup-entity` ambigu (résolveur L4)** : retour `{ match: null, candidates: [...], layerUsed: "..." }`, exit `0`. L'agent décide.
- **`get-entity` sur id inconnu** : retour `null`, exit `0` (cohérent avec le dispatcher qui retourne `null`, pas une erreur).

### 5.6 Logger et streams

- Stdout : uniquement le JSON de résultat (succès ou erreur). Toujours une seule ligne.
- Stderr : silencieux par défaut. Si `SNEQ_DEBUG=1`, le logger interne écrit des logs structurés sur stderr. Stdout reste pur JSON dans tous les cas, donc parsable par l'agent appelant.

---

## 6. Exemples de workflow

### 6.1 Boucle MJ complète (Hermes en mode AI MJ)

```bash
# 1. Première session — bootstrap
sneq-engine init-campaign \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"name":"Le Sang dArtemis","embeddingDim":768}'
# → {"campaignId":"sang-artemis","created":true}
# (note: pour les noms avec apostrophes/caractères spéciaux, préférer stdin)

# 2. Joueur dit "je vais voir le forgeron"
sneq-engine lookup-entity \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"mention":"le forgeron","type":"PERSONNAGE"}'
# → {"match":null,"candidates":[],"layerUsed":"alias"}  (pas connu)

# 3. Vérifier qu'on ne crée pas un doublon
sneq-engine suggest-existing \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"mention":"un forgeron","type":"PERSONNAGE"}'
# → {"candidates":[],"recommendsNew":true}

# 4. Narration côté Hermes ("La forge est sombre. Un homme boiteux...")

# 5. Inscrire l'entité
sneq-engine mention-entity \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"canonicalName":"Aldric Fervent","type":"PERSONNAGE","aliases":["le forgeron","le vieux"],"description":"Ancien soldat boiteux, 50 ans"}'
# → {"entityId":"ent_abc123","isNew":true,"resolvedTo":null}

# 6. Figer un fait
sneq-engine register-fact \
  --db ./campagnes.db --campaign sang-artemis \
  --source gm-narration \
  --args '{"entityId":"ent_abc123","attributeKey":"ancien_metier","value":{"type":"STRING","value":"capitaine"},"category":"HISTORIQUE"}'
# → {"factId":"fact_xyz","contradictions":[]}

# 7. Déclarer la scène
sneq-engine set-scene \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"locationEntityId":"ent_loc_forge","presentEntityIds":["ent_player","ent_abc123"],"description":"La forge d'Aldric au crépuscule"}'
# → {"sceneId":"scene_42","turnNumber":17}

# 8. Clore le tour
sneq-engine advance-turn \
  --db ./campagnes.db --campaign sang-artemis \
  --args '{"summary":"Le joueur rencontre Aldric Fervent dans sa forge."}'
# → {"turnNumber":18}
```

### 6.2 Variantes via stdin

```bash
# Args via stdin (équivalent à --args)
echo '{"mention":"le forgeron","type":"PERSONNAGE"}' \
  | sneq-engine lookup-entity --db ./campagnes.db --campaign sang-artemis
```

### 6.3 Fait à fiabilité variable

```bash
# Joueur affirme un fait — la lib l'enregistre comme TEMOIGNAGE
sneq-engine register-fact \
  --db ./campagnes.db --campaign sang-artemis \
  --source player-utterance \
  --args '{"entityId":"ent_abc123","attributeKey":"rumeur_origine","value":{"type":"STRING","value":"déserteur"},"category":"HISTORIQUE"}'
```

### 6.4 Cas d'erreur

```bash
$ sneq-engine lookup-entity --db ./campagnes.db --campaign campagne-fantome --args '{"mention":"x"}'
{"error":"campaign 'campagne-fantome' not found","code":"CAMPAIGN_NOT_FOUND"}
$ echo $?
1
```

---

## 7. Tests

### 7.1 Couche 1 — Unit tests des fonctions pures

Cibles : `parseArgv`, `buildObservation`, `formatError`. ~15-20 tests.

Couverture :
- Parsing flags valides (chaque flag isolé et en combinaison)
- Flags inconnus → `INVALID_ARGS`
- JSON malformé sur `--args` → `INVALID_ARGS`
- Stdin vs `--args` (priorité)
- Expansion des 4 presets `--source`
- Override partiel via `--observation`
- Override total via `args.observation`

### 7.2 Couche 2 — End-to-end in-process

Pour chaque commande, ~1-3 tests appelant `run(invocation, { stdin, stdout, engine })` avec un repository SQLite tmpfile et stdout capturé. ~25-30 tests.

Couverture :
- `init-campaign` puis chaque commande sur la campagne fraîche
- Cas heureux par commande
- `register-fact` avec contradiction (exit 0 + payload contradictions)
- `lookup-entity` avec match alias, sans match (null), candidates non vide
- Erreurs typées : `CAMPAIGN_NOT_FOUND`, `ENTITY_NOT_FOUND`, `VALIDATION_FAILED`, `UNKNOWN_COMMAND`

### 7.3 Couche 3 (optionnelle) — Smoke test du binaire

Un seul test qui fork `dist/cli.js` via `execFile`. Valide shebang, build, parsing de bout en bout. Pas dans le path TDD quotidien.

### 7.4 Stratégie TDD

Itération par commande :
1. Red : test e2e pour la commande
2. Green : implémenter `parseArgv` + dispatch minimal
3. Refactor

Commence par `init-campaign` (le plus simple, pas de dépendance entity), puis chaîne `lookup-entity` → `mention-entity` → `register-fact` → `set-scene` → `advance-turn` → les autres.

### 7.5 État des tests existants

Les 51 tests existants restent verts. Aucune modification attendue côté lib, sauf possiblement exposer `Campaign.getCurrentScene()` si pas déjà public (à confirmer en phase de plan).

---

## 8. Hors-scope (V1 du CLI)

- **Mode daemon / serveur HTTP / MCP** : explicitement non. Le binaire est one-shot.
- **`--watch` ou mode REPL** : non.
- **Aide riche auto-générée depuis Zod** : la V1 affiche un schema brut + exemple. Une vraie aide humaine peut venir plus tard.
- **`--embedding-dim` configurable** : non, hardcodé à 768 en V1.
- **Auto-discovery de config** (`.sneqrc.json`) : non, `--config` est explicite.
- **Mode "offline"** (désactiver les providers automatiquement) : non, on émet une erreur claire.
- **Output streaming** pour `collapse-attribute` : non, on attend la fin de l'appel LLM.
- **Versioning du contrat** : pas de `--protocol-version` en V1. À ajouter si le contrat évolue.

---

## 9. Risques et mitigations

| Risque                                                                      | Mitigation                                                                                              |
|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Cold-start Node + chargement de `better-sqlite3` à chaque appel (~200-400ms)| Acceptable pour 6-8 appels/tour (< 2s total). Si problème, futur mode persistant via MCP.               |
| Maintenir lib + CLI en phase                                                 | Surface CLI = dispatcher + 2 convenience wrappers. Tout changement de tool propage automatiquement.      |
| Shell-quoting de JSON imbriqué dans `--args`                                 | Mode stdin documenté comme préférable pour les agents.                                                  |
| Hermes oublie de set `--source` → tous les facts deviennent `GM_NARRATION`  | Default explicite et documenté. Reste correct pour 90 % des cas (le MJ narre).                          |
| Race condition multi-process sur la même DB                                 | better-sqlite3 sérialise les writes via file lock. Acceptable tant qu'un seul agent écrit à la fois.    |

---

## 10. Livrables

1. `src/cli.ts` (~200-300 LOC)
2. `package.json` mis à jour avec `"bin"`
3. `dist/cli.js` (build artifact)
4. Tests vitest dans `test/cli.test.ts` (~40-50 tests)
5. Section README "CLI Usage" courte (~30 lignes) avec exemples
6. Aucune modification de la lib publique, sauf possiblement exposer `Campaign.getCurrentScene()` (à confirmer en phase de plan).

---

## 11. Prochaine étape

Invoquer `superpowers:writing-plans` pour produire le plan d'implémentation détaillé (découpage en tasks TDD, ordre, dépendances).
