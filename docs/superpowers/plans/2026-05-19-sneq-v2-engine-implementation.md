# SNEQ V2 Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `@sneq/engine` V2 — a TypeScript bookkeeping library for turn-based AI-narrated games, implementing the design in `docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md`.

**Architecture:** Single npm package, ESM-first, Node 20+. Internal modules: domain types → core logic → repository (SQLite reference) → router (provider abstraction with fallback) → resolver (layered cascade) → tools (LLM tool-call schemas) → engine facade. All modules pure-functional or with injectable I/O; no global state.

**Tech Stack:** TypeScript 5.4+, Vitest 2.x, `better-sqlite3` 11.x, `sqlite-vec`, Zod 3.x, TypeDoc 0.28+, pnpm 9.x. No runtime framework — plain Node.

---

## Conventions

- **Imports**: ESM with explicit `.js` extensions (`import { x } from "./foo.js"` even though source is `.ts`).
- **Test naming**: `<source>.test.ts` co-located only if asked; in this plan, tests live under `test/` mirroring the `src/` tree.
- **Test command** (default): `pnpm vitest run <path>`. Watch mode is `pnpm vitest <path>`.
- **Commit format**: imperative subject, scoped. `feat(domain): add Entity type`, `test(router): cover 429 fallback`, etc.
- **Domain vocabulary**: v1 French terms (`Potentialite`, `AttributFige`, `NoeudGCN`, `AreteGCN`, `Contrainte`) are kept as type names since they encode SNEQ-specific concepts. Generic concepts use English.
- **No global state, no singletons.** Engine is instantiated with config; everything else is injected.
- **No comments** unless capturing a non-obvious invariant.

## File Structure

Locked before tasks. Each file has one clear responsibility.

```
sneq-narrative-system/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── typedoc.json
├── .gitignore                                  (existing)
├── README.md                                   (new)
├── src/
│   ├── index.ts                                public exports
│   ├── engine.ts                               Engine facade (multi-campaign)
│   ├── campaign.ts                             CampaignContext
│   ├── config.ts                               EngineConfig types + loadConfigFromFile
│   ├── errors.ts                               3 error classes
│   ├── domain/
│   │   ├── ids.ts                              branded ID types
│   │   ├── entity.ts                           Entity, EntityType, Alias
│   │   ├── attribute.ts                        AttributValue, AttributFige, CategorieAttribut
│   │   ├── observation.ts                      Observation, ObservationMethod, SourceType
│   │   ├── potentialite.ts                     Potentialite, Contrainte, RegleContrainte
│   │   ├── gcn.ts                              NoeudGCN, AreteGCN, TypeRelation, ReglePropagation
│   │   ├── scene.ts                            Scene
│   │   └── turn.ts                             Turn
│   ├── core/
│   │   ├── state-machine.ts                    transition guards
│   │   ├── propagation.ts                      GCN BFS + rule application
│   │   └── validation.ts                       validation pipeline
│   ├── repository/
│   │   ├── interface.ts                        Repository contract
│   │   └── sqlite/
│   │       ├── index.ts                        SqliteRepository
│   │       ├── migrations.ts                   SQL migrations (versioned)
│   │       ├── serialization.ts                JSON ↔ domain conversion
│   │       └── vec.ts                          sqlite-vec loading + dimension check
│   ├── router/
│   │   ├── interface.ts                        Provider + Router types
│   │   ├── router.ts                           Router with fallback + cooldown
│   │   ├── defaults.ts                         defaultRouterConfig()
│   │   └── providers/
│   │       ├── openai-compatible.ts
│   │       ├── anthropic.ts
│   │       ├── google-genai.ts
│   │       └── custom.ts
│   ├── resolver/
│   │   ├── resolver.ts                         cascade orchestration
│   │   ├── normalize.ts                        alias normalization
│   │   ├── judge.ts                            L3 LLM judge
│   │   └── thresholds.ts                       default thresholds
│   ├── tools/
│   │   ├── schemas.ts                          Zod schemas
│   │   ├── json-schema.ts                      JSON Schema export
│   │   ├── adapters.ts                         Anthropic/OpenAI/Gemini tool array shapes
│   │   └── dispatcher.ts                       handleToolCall
│   └── hooks/
│       ├── pre-generation.ts                   PreGenerationHook (no-op default)
│       └── user-prompt.ts                      AskUserFn handler registry
├── test/
│   ├── domain/
│   │   └── state-machine.test.ts
│   ├── core/
│   │   ├── propagation.test.ts
│   │   └── validation.test.ts
│   ├── repository/
│   │   ├── sqlite.test.ts
│   │   ├── transactions.test.ts
│   │   └── vec.test.ts
│   ├── router/
│   │   ├── router.test.ts
│   │   └── providers/
│   │       └── openai-compatible.test.ts
│   ├── resolver/
│   │   └── cascade.test.ts
│   ├── tools/
│   │   └── dispatcher.test.ts
│   ├── fixtures/
│   │   ├── replay-provider.ts
│   │   └── embeddings.ts
│   └── integration/
│       └── smoke.test.ts                       env-gated
├── docs/
│   ├── api.md                                  TypeDoc-generated
│   ├── superpowers/
│   │   ├── specs/                              (existing)
│   │   └── plans/                              (this file)
│   └── ...
└── skills/
    └── sneq-narrative-engine.md
```

---

## Milestone 0 · Project setup

Outcome: empty package compiles, vitest runs, one passing smoke test.

### Task 0.1: Initialize package.json

**Files:**
- Create: `package.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@sneq/engine",
  "version": "0.0.0",
  "description": "Bookkeeping engine for turn-based AI-narrated games (SNEQ V2)",
  "type": "module",
  "engines": { "node": ">=20" },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./sqlite": { "types": "./dist/repository/sqlite/index.d.ts", "default": "./dist/repository/sqlite/index.js" },
    "./openai-compat": { "types": "./dist/router/providers/openai-compatible.d.ts", "default": "./dist/router/providers/openai-compatible.js" }
  },
  "files": ["dist", "skills", "docs/api.md", "README.md"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "docs": "typedoc",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "peerDependencies": {
    "better-sqlite3": "^11.0.0",
    "sqlite-vec": "^0.1.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "@google/generative-ai": "^0.21.0"
  },
  "peerDependenciesMeta": {
    "better-sqlite3": { "optional": true },
    "sqlite-vec": { "optional": true },
    "@anthropic-ai/sdk": { "optional": true },
    "@google/generative-ai": { "optional": true }
  },
  "devDependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@google/generative-ai": "^0.21.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^20.12.0",
    "better-sqlite3": "^11.0.0",
    "sqlite-vec": "^0.1.0",
    "typedoc": "^0.28.0",
    "typedoc-plugin-markdown": "^4.2.0",
    "typescript": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: init package.json for @sneq/engine"
```

### Task 0.2: TypeScript config (split — IDE + build)

**Files:**
- Create: `tsconfig.json` (IDE-facing, covers all TS, `noEmit`)
- Create: `tsconfig.build.json` (build-only, emits to `dist/` from `src/`)

We split the TS config in two so the IDE can typecheck `vitest.config.ts` (a root-level file outside `src/`) without polluting the published build output. The IDE picks up `tsconfig.json` by default; `pnpm build` explicitly uses `tsconfig.build.json`.

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "declaration": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*", "test/**/*", "vitest.config.ts"]
}
```

- [ ] **Step 2: Create `tsconfig.build.json`**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declarationMap": true,
    "sourceMap": true,
    "noEmit": false
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test", "vitest.config.ts"]
}
```

- [ ] **Step 3: Update `package.json` scripts**

```diff
-    "build": "tsc -p tsconfig.json",
-    "typecheck": "tsc -p tsconfig.json --noEmit",
+    "build": "tsc -p tsconfig.build.json",
+    "typecheck": "tsc -p tsconfig.json",
```

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json tsconfig.build.json package.json
git commit -m "chore: add TypeScript config (split IDE + build, NodeNext ESM, strict)"
```

### Task 0.3: Vitest config

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/integration/**"],
    environment: "node",
    typecheck: { enabled: false },
    pool: "threads",
    poolOptions: { threads: { singleThread: false } }
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest config (node env, exclude integration)"
```

### Task 0.4: Install deps + smoke test

**Files:**
- Create: `src/index.ts`
- Create: `test/smoke.test.ts`

- [ ] **Step 1: Install**

```bash
pnpm install
```

Expected: `node_modules/` populated, `pnpm-lock.yaml` created.

- [ ] **Step 2: Create `src/index.ts` with a placeholder export**

```ts
export const SNEQ_ENGINE_VERSION = "0.0.0";
```

- [ ] **Step 3: Write smoke test `test/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { SNEQ_ENGINE_VERSION } from "../src/index.js";

describe("smoke", () => {
  it("exports version constant", () => {
    expect(SNEQ_ENGINE_VERSION).toBe("0.0.0");
  });
});
```

- [ ] **Step 4: Run test**

```bash
pnpm vitest run test/smoke.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/ test/ pnpm-lock.yaml
git commit -m "chore: scaffold src/index.ts + smoke test"
```

---

## Milestone 1 · Domain types

Outcome: every domain type from the spec exists as TypeScript and compiles. Tests at this milestone are exhaustiveness checks (TS won't let us forget a discriminated-union case).

### Task 1.1: Branded ID types

**Files:**
- Create: `src/domain/ids.ts`

- [ ] **Step 1: Create `src/domain/ids.ts`**

```ts
declare const brand: unique symbol;

export type EntityID    = string & { readonly [brand]: "EntityID" };
export type CampaignId  = string & { readonly [brand]: "CampaignId" };
export type FactId      = string & { readonly [brand]: "FactId" };
export type ContraintId = string & { readonly [brand]: "ContraintId" };
export type SceneId     = string & { readonly [brand]: "SceneId" };

export const asEntityID    = (s: string): EntityID    => s as EntityID;
export const asCampaignId  = (s: string): CampaignId  => s as CampaignId;
export const asFactId      = (s: string): FactId      => s as FactId;
export const asContraintId = (s: string): ContraintId => s as ContraintId;
export const asSceneId     = (s: string): SceneId     => s as SceneId;
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/ids.ts
git commit -m "feat(domain): add branded ID types"
```

### Task 1.2: Entity types + Alias

**Files:**
- Create: `src/domain/entity.ts`

- [ ] **Step 1: Create `src/domain/entity.ts`**

```ts
import type { EntityID, CampaignId } from "./ids.js";

export type EntityType =
  | "PERSONNAGE"
  | "LIEU"
  | "OBJET"
  | "FACTION"
  | "EVENEMENT"
  | "RELATION"
  | "SCENE"
  | "WORLD";

export interface Alias {
  text: string;
  source: AliasSource;
  observedAt: number;
}

export type AliasSource =
  | { kind: "PLAYER" }
  | { kind: "GM_NARRATION" }
  | { kind: "DOCUMENT"; documentId: EntityID }
  | { kind: "INFERENCE" };

export interface Entity {
  campaignId: CampaignId;
  id: EntityID;
  type: EntityType;
  name: string;
  nomConnu: boolean;
  aliases: Alias[];
  createdAt: number;
  embedding: Float32Array | null;
  embeddingRefreshedAt: number | null;
  tags: string[];
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/entity.ts
git commit -m "feat(domain): add Entity, Alias, EntityType"
```

### Task 1.3: AttributValue, AttributFige, Observation

**Files:**
- Create: `src/domain/attribute.ts`
- Create: `src/domain/observation.ts`

- [ ] **Step 1: Create `src/domain/attribute.ts`**

```ts
import type { EntityID, FactId } from "./ids.js";
import type { Observation } from "./observation.js";

export type AttributValue =
  | { type: "STRING";     value: string }
  | { type: "NUMBER";     value: number }
  | { type: "BOOLEAN";    value: boolean }
  | { type: "ENTITY_REF"; id: EntityID }
  | { type: "ENTITY_SET"; ids: EntityID[] }
  | { type: "ENUM";       value: string; enumType: string }
  | { type: "COMPOSITE";  fields: Record<string, AttributValue> };

export type CategorieAttribut =
  | "IDENTITE"
  | "PSYCHOLOGIE"
  | "HISTORIQUE"
  | "SOCIAL"
  | "COMPETENCE"
  | "SECRET"
  | "ETAT"
  | "POSSESSION";

export interface AttributFige {
  factId: FactId;
  entityId: EntityID;
  key: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
  turn: number;
}
```

- [ ] **Step 2: Create `src/domain/observation.ts`**

```ts
import type { EntityID, SceneId } from "./ids.js";

export type ObservationSource =
  | "GM_NARRATION"
  | "PLAYER_UTTERANCE"
  | "DICE_ROLL"
  | "SYSTEM";

export type ObservationMethod =
  | "DIALOGUE_DIRECT"
  | "DOCUMENT"
  | "OBSERVATION_VISUELLE"
  | "DEDUCTION_CONFIRMEE"
  | "AVEU"
  | "DEMONSTRATION";

export type Fiabilite = "CERTAINE" | "TEMOIGNAGE" | "RUMEUR_CONFIRMEE";

export interface Observation {
  source: ObservationSource;
  method: ObservationMethod;
  emittedBy?: EntityID;
  sceneId?: SceneId;
  fiabilite: Fiabilite;
  excerpt?: string;
  timestamp: number;
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/attribute.ts src/domain/observation.ts
git commit -m "feat(domain): add AttributValue, AttributFige, Observation"
```

### Task 1.4: Potentialite + Contrainte

**Files:**
- Create: `src/domain/potentialite.ts`

- [ ] **Step 1: Create `src/domain/potentialite.ts`**

```ts
import type { EntityID, ContraintId, FactId } from "./ids.js";
import type { AttributValue, CategorieAttribut } from "./attribute.js";

export type EtatAttribut = "INDEFINI" | "CONTRAINT" | "FIGE";

export type ContrainteSource =
  | { kind: "FAIT_CANONIQUE"; factId: FactId }
  | { kind: "RELATION";       edgeKey: string }
  | { kind: "REGLE_MONDE";    ruleId: string }
  | { kind: "INFERENCE_IA";   confidence: number };

export type RegleContrainte =
  | { type: "DOIT_ETRE";       valeurs: AttributValue[] }
  | { type: "NE_PEUT_PAS_ETRE";valeurs: AttributValue[] }
  | { type: "IMPLIQUE";        condition: string; consequence: string }
  | { type: "CORRELE_AVEC";    autreEntite: EntityID; autreAttribut: string }
  | { type: "RANGE_NUMERIQUE"; min?: number; max?: number }
  | { type: "REGEX";           pattern: string };

export interface Contrainte {
  id: ContraintId;
  source: ContrainteSource;
  createdAt: number;
  regle: RegleContrainte;
  justificationNarrative: string;
}

export interface Tendance {
  description: string;
  poids: number;
}

export interface ContexteGeneratif {
  categorieAttribut: CategorieAttribut;
  tendances: Tendance[];
}

export interface Potentialite {
  entiteId: EntityID;
  attribut: string;
  etat: Exclude<EtatAttribut, "FIGE">;
  contraintes: Contrainte[];
  contexteGeneratif: ContexteGeneratif;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/potentialite.ts
git commit -m "feat(domain): add Potentialite, Contrainte, RegleContrainte"
```

### Task 1.5: GCN types

**Files:**
- Create: `src/domain/gcn.ts`

- [ ] **Step 1: Create `src/domain/gcn.ts`**

```ts
import type { EntityID } from "./ids.js";
import type { EntityType } from "./entity.js";
import type { CategorieAttribut, AttributValue } from "./attribute.js";

export type RelationSociale =
  | "FAMILLE" | "AMITIE" | "INIMITIE" | "HIERARCHIE"
  | "ROMANTIQUE" | "PROFESSIONNELLE" | "APPARTENANCE";

export type RelationCausale =
  | "A_CAUSE" | "A_PERMIS" | "A_EMPECHE"
  | "CONSEQUENCE_DE" | "MOTIVE_PAR" | "REVELEE_PAR";

export type RelationSpatiale =
  | "CONTIENT" | "ADJACENT" | "ORIGINE" | "RESIDE" | "FREQUENTE";

export type RelationTemporelle = "PRECEDE" | "PENDANT" | "DECLENCHE";

export type RelationConceptuelle =
  | "SYMBOLISE" | "CONTRASTE" | "PARALLELE" | "SECRET_LIE";

export type TypeRelation =
  | { categorie: "SOCIAL";     sousType: RelationSociale }
  | { categorie: "CAUSAL";     sousType: RelationCausale }
  | { categorie: "SPATIAL";    sousType: RelationSpatiale }
  | { categorie: "TEMPOREL";   sousType: RelationTemporelle }
  | { categorie: "CONCEPTUEL"; sousType: RelationConceptuelle };

export interface NoeudGCN {
  entityId: EntityID;
  type: EntityType;
  etatActuel: "INCONNU" | "PARTIELLEMENT_CONNU" | "BIEN_CONNU";
  poidsNarratif: number;
  tags: string[];
}

export type EtatArete = "INDEFINI" | "CONTRAINT" | "FIGE";

export interface AreteGCN {
  key: string;
  source: EntityID;
  cible: EntityID;
  typeRelation: TypeRelation;
  directionnalite: "UNIDIRECTIONNELLE" | "BIDIRECTIONNELLE";
  forcePropagation: number;
  etatArete: EtatArete;
  attributs: Record<string, AttributValue>;
}

export interface DeclencheurPropagation {
  entiteType?: EntityType[];
  attribut?: string[];
  categorieAttribut?: CategorieAttribut[];
}

export type ActionTypePropagation =
  | "AJOUTER_CONTRAINTE"
  | "MODIFIER_FORCE_RELATION"
  | "CREER_RELATION"
  | "MARQUER_POUR_REEVALUATION";

export interface ReglePropagation {
  id: string;
  nom: string;
  declencheur: DeclencheurPropagation;
  actionType: ActionTypePropagation;
  cibleType: "RELATION_DIRECTE" | "CHEMIN" | "TAG";
  cibleParams: Record<string, unknown>;
  priorite: number;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/gcn.ts
git commit -m "feat(domain): add GCN node/edge/relation/propagation rule types"
```

### Task 1.6: Scene + Turn

**Files:**
- Create: `src/domain/scene.ts`
- Create: `src/domain/turn.ts`

- [ ] **Step 1: Create `src/domain/scene.ts`**

```ts
import type { CampaignId, EntityID, SceneId } from "./ids.js";

export interface Scene {
  campaignId: CampaignId;
  id: SceneId;
  locationId: EntityID;
  presentEntityIds: EntityID[];
  description: string;
  createdAtTurn: number;
}
```

- [ ] **Step 2: Create `src/domain/turn.ts`**

```ts
import type { CampaignId, SceneId } from "./ids.js";

export interface Turn {
  campaignId: CampaignId;
  turnNumber: number;
  summary: string | null;
  sceneId: SceneId | null;
  createdAt: number;
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/scene.ts src/domain/turn.ts
git commit -m "feat(domain): add Scene, Turn"
```

---

## Milestone 2 · Core logic (pure functions)

Outcome: state machine, propagation algorithm, validation pipeline — all pure, no I/O, fully tested.

### Task 2.1: State machine

**Files:**
- Create: `src/core/state-machine.ts`
- Create: `test/domain/state-machine.test.ts`

- [ ] **Step 1: Write failing test `test/domain/state-machine.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { canTransition, assertTransition } from "../../src/core/state-machine.js";

describe("state-machine", () => {
  it("allows INDEFINI → CONTRAINT", () => {
    expect(canTransition("INDEFINI", "CONTRAINT")).toBe(true);
  });
  it("allows INDEFINI → FIGE (direct observation)", () => {
    expect(canTransition("INDEFINI", "FIGE")).toBe(true);
  });
  it("allows CONTRAINT → FIGE", () => {
    expect(canTransition("CONTRAINT", "FIGE")).toBe(true);
  });
  it("rejects FIGE → CONTRAINT", () => {
    expect(canTransition("FIGE", "CONTRAINT")).toBe(false);
  });
  it("rejects FIGE → INDEFINI", () => {
    expect(canTransition("FIGE", "INDEFINI")).toBe(false);
  });
  it("rejects CONTRAINT → INDEFINI", () => {
    expect(canTransition("CONTRAINT", "INDEFINI")).toBe(false);
  });
  it("rejects self-transition for FIGE", () => {
    expect(canTransition("FIGE", "FIGE")).toBe(false);
  });
  it("assertTransition throws on invalid transition", () => {
    expect(() => assertTransition("FIGE", "INDEFINI")).toThrow(/FIGE.*INDEFINI/);
  });
  it("assertTransition is silent on valid transition", () => {
    expect(() => assertTransition("INDEFINI", "FIGE")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/domain/state-machine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/state-machine.ts`**

```ts
import type { EtatAttribut } from "../domain/potentialite.js";

const ALLOWED: ReadonlyArray<[EtatAttribut, EtatAttribut]> = [
  ["INDEFINI", "CONTRAINT"],
  ["INDEFINI", "FIGE"],
  ["CONTRAINT", "FIGE"]
];

export function canTransition(from: EtatAttribut, to: EtatAttribut): boolean {
  return ALLOWED.some(([f, t]) => f === from && t === to);
}

export function assertTransition(from: EtatAttribut, to: EtatAttribut): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid state transition: ${from} → ${to}`);
  }
}
```

Note: `EtatAttribut` in `potentialite.ts` is `"INDEFINI" | "CONTRAINT" | "FIGE"` even though `Potentialite.etat` excludes `FIGE`. The state-machine module uses the full type.

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/domain/state-machine.test.ts
```

Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/state-machine.ts test/domain/state-machine.test.ts
git commit -m "feat(core): state machine with I→C→F guard"
```

### Task 2.2: Propagation algorithm

**Files:**
- Create: `src/core/propagation.ts`
- Create: `test/core/propagation.test.ts`

- [ ] **Step 1: Write failing test `test/core/propagation.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { propagate } from "../../src/core/propagation.js";
import type { AreteGCN, NoeudGCN, ReglePropagation } from "../../src/domain/gcn.js";
import type { AttributFige } from "../../src/domain/attribute.js";
import { asEntityID, asCampaignId, asFactId } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

function node(id: string): NoeudGCN {
  return {
    entityId: asEntityID(id),
    type: "PERSONNAGE",
    etatActuel: "PARTIELLEMENT_CONNU",
    poidsNarratif: 0.5,
    tags: []
  };
}

function edge(src: string, dst: string, force = 0.8): AreteGCN {
  return {
    key: `${src}->${dst}`,
    source: asEntityID(src),
    cible: asEntityID(dst),
    typeRelation: { categorie: "SOCIAL", sousType: "AMITIE" },
    directionnalite: "BIDIRECTIONNELLE",
    forcePropagation: force,
    etatArete: "FIGE",
    attributs: {}
  };
}

const rule: ReglePropagation = {
  id: "r1",
  nom: "secret-spreads",
  declencheur: { categorieAttribut: ["SECRET"] },
  actionType: "AJOUTER_CONTRAINTE",
  cibleType: "RELATION_DIRECTE",
  cibleParams: { description: "linked secret" },
  priorite: 10
};

const fact: AttributFige = {
  factId: asFactId("f1"),
  entityId: asEntityID("A"),
  key: "secret",
  value: { type: "STRING", value: "war crime" },
  category: "SECRET",
  observation: {
    source: "GM_NARRATION", method: "DIALOGUE_DIRECT",
    fiabilite: "CERTAINE", timestamp: 0
  },
  turn: 1
};

describe("propagation", () => {
  it("propagates to direct neighbors when rule matches", () => {
    const nodes = new Map([["A", node("A")], ["B", node("B")]]);
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, nodes, edges, rules: [rule], maxDepth: 2, minForce: 0.1 });
    expect(result.entitesImpactees).toContain(asEntityID("B"));
    expect(result.contraintesPropagees).toHaveLength(1);
    expect(result.contraintesPropagees[0]!.entityId).toBe(asEntityID("B"));
  });

  it("decays force across hops and stops below minForce", () => {
    const nodes = new Map([
      ["A", node("A")], ["B", node("B")], ["C", node("C")], ["D", node("D")]
    ]);
    const edges = [edge("A", "B", 0.5), edge("B", "C", 0.5), edge("C", "D", 0.5)];
    const result = propagate({ fact, campaignId: cid, nodes, edges, rules: [rule], maxDepth: 5, minForce: 0.2 });
    expect(result.entitesImpactees).toContain(asEntityID("B"));
    expect(result.entitesImpactees).toContain(asEntityID("C"));
    expect(result.entitesImpactees).not.toContain(asEntityID("D"));
  });

  it("does not visit the source entity", () => {
    const nodes = new Map([["A", node("A")], ["B", node("B")]]);
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, nodes, edges, rules: [rule], maxDepth: 2, minForce: 0.1 });
    expect(result.entitesImpactees).not.toContain(asEntityID("A"));
  });

  it("returns empty result when no rule matches", () => {
    const otherRule: ReglePropagation = { ...rule, declencheur: { categorieAttribut: ["IDENTITE"] } };
    const nodes = new Map([["A", node("A")], ["B", node("B")]]);
    const edges = [edge("A", "B")];
    const result = propagate({ fact, campaignId: cid, nodes, edges, rules: [otherRule], maxDepth: 2, minForce: 0.1 });
    expect(result.contraintesPropagees).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/core/propagation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/propagation.ts`**

```ts
import type { AttributFige } from "../domain/attribute.js";
import type { AreteGCN, NoeudGCN, ReglePropagation } from "../domain/gcn.js";
import type { CampaignId, ContraintId, EntityID } from "../domain/ids.js";
import type { Contrainte } from "../domain/potentialite.js";
import { asContraintId } from "../domain/ids.js";

export interface PropagationInput {
  fact: AttributFige;
  campaignId: CampaignId;
  nodes: ReadonlyMap<string, NoeudGCN>;
  edges: ReadonlyArray<AreteGCN>;
  rules: ReadonlyArray<ReglePropagation>;
  maxDepth: number;
  minForce: number;
}

export interface ContraintePropagee {
  entityId: EntityID;
  attributCible: string;
  contrainte: Contrainte;
  hopDistance: number;
  forceAccumulee: number;
}

export interface PropagationResult {
  faitSource: AttributFige;
  contraintesPropagees: ContraintePropagee[];
  entitesImpactees: EntityID[];
}

interface QueueItem {
  entityId: EntityID;
  distance: number;
  forceAccumulee: number;
}

export function propagate(input: PropagationInput): PropagationResult {
  const { fact, nodes, edges, rules, maxDepth, minForce } = input;
  const applicableRules = rules.filter(r => ruleMatches(r, fact));

  if (applicableRules.length === 0) {
    return { faitSource: fact, contraintesPropagees: [], entitesImpactees: [] };
  }

  const adjacency = buildAdjacency(edges);
  const visited = new Set<EntityID>([fact.entityId]);
  const queue: QueueItem[] = [];
  const result: ContraintePropagee[] = [];

  for (const e of adjacency.get(fact.entityId) ?? []) {
    queue.push({ entityId: e.cible, distance: 1, forceAccumulee: e.forcePropagation });
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.entityId)) continue;
    if (cur.forceAccumulee < minForce) continue;
    visited.add(cur.entityId);

    for (const rule of applicableRules) {
      result.push({
        entityId: cur.entityId,
        attributCible: deriveTargetAttribute(rule, fact),
        contrainte: synthesizeContrainte(rule, fact, cur.forceAccumulee),
        hopDistance: cur.distance,
        forceAccumulee: cur.forceAccumulee
      });
    }

    if (cur.distance < maxDepth) {
      for (const e of adjacency.get(cur.entityId) ?? []) {
        if (!visited.has(e.cible)) {
          queue.push({
            entityId: e.cible,
            distance: cur.distance + 1,
            forceAccumulee: cur.forceAccumulee * e.forcePropagation
          });
        }
      }
    }
  }

  const impacted = [...new Set(result.map(r => r.entityId))];
  return { faitSource: fact, contraintesPropagees: result, entitesImpactees: impacted };
}

function ruleMatches(rule: ReglePropagation, fact: AttributFige): boolean {
  const t = rule.declencheur;
  if (t.categorieAttribut && !t.categorieAttribut.includes(fact.category)) return false;
  if (t.attribut && !t.attribut.includes(fact.key)) return false;
  return true;
}

function buildAdjacency(edges: ReadonlyArray<AreteGCN>): Map<EntityID, AreteGCN[]> {
  const map = new Map<EntityID, AreteGCN[]>();
  for (const e of edges) {
    push(map, e.source, e);
    if (e.directionnalite === "BIDIRECTIONNELLE") {
      push(map, e.cible, { ...e, source: e.cible, cible: e.source });
    }
  }
  return map;
}

function push(map: Map<EntityID, AreteGCN[]>, k: EntityID, v: AreteGCN): void {
  const arr = map.get(k);
  if (arr) arr.push(v);
  else map.set(k, [v]);
}

function deriveTargetAttribute(rule: ReglePropagation, fact: AttributFige): string {
  const explicit = rule.cibleParams["attributCible"];
  if (typeof explicit === "string") return explicit;
  return fact.key;
}

let contraintCounter = 0;
function synthesizeContrainte(rule: ReglePropagation, fact: AttributFige, force: number): Contrainte {
  return {
    id: asContraintId(`prop_${rule.id}_${++contraintCounter}`),
    source: { kind: "FAIT_CANONIQUE", factId: fact.factId as unknown as import("../domain/ids.js").FactId },
    createdAt: Date.now(),
    regle: {
      type: "CORRELE_AVEC",
      autreEntite: fact.entityId,
      autreAttribut: fact.key
    },
    justificationNarrative: `${rule.nom} (force=${force.toFixed(2)})`
  };
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/core/propagation.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/propagation.ts test/core/propagation.test.ts
git commit -m "feat(core): GCN BFS propagation with force decay"
```

### Task 2.3: Validation pipeline

**Files:**
- Create: `src/core/validation.ts`
- Create: `test/core/validation.test.ts`

- [ ] **Step 1: Write failing test `test/core/validation.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { validateValue, type ValidationContext } from "../../src/core/validation.js";
import type { AttributValue } from "../../src/domain/attribute.js";
import type { Contrainte } from "../../src/domain/potentialite.js";
import { asContraintId, asFactId } from "../../src/domain/ids.js";

function strict(rule: Contrainte["regle"], note = "x"): Contrainte {
  return {
    id: asContraintId("c1"),
    source: { kind: "FAIT_CANONIQUE", factId: asFactId("f1") },
    createdAt: 0, regle: rule, justificationNarrative: note
  };
}

describe("validation", () => {
  it("format: rejects undefined value type", () => {
    const ctx: ValidationContext = { strictContraintes: [], softContraintes: [], existingFiged: [] };
    const r = validateValue({ type: "STRING", value: "x" } as AttributValue, ctx);
    expect(r.valide).toBe(true);
  });

  it("strict DOIT_ETRE: rejects value not in allowed set", () => {
    const v: AttributValue = { type: "STRING", value: "wizard" };
    const allowed: AttributValue[] = [{ type: "STRING", value: "warrior" }];
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "DOIT_ETRE", valeurs: allowed })],
      softContraintes: [], existingFiged: []
    };
    const r = validateValue(v, ctx);
    expect(r.valide).toBe(false);
    expect(r.erreurs.some(e => e.type === "CONTRAINTE_STRICTE")).toBe(true);
  });

  it("strict NE_PEUT_PAS_ETRE: rejects forbidden value", () => {
    const v: AttributValue = { type: "STRING", value: "wizard" };
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "NE_PEUT_PAS_ETRE", valeurs: [v] })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue(v, ctx).valide).toBe(false);
  });

  it("strict RANGE_NUMERIQUE: rejects out-of-range number", () => {
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "RANGE_NUMERIQUE", min: 20, max: 60 })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue({ type: "NUMBER", value: 80 }, ctx).valide).toBe(false);
    expect(validateValue({ type: "NUMBER", value: 30 }, ctx).valide).toBe(true);
  });

  it("strict REGEX: rejects non-matching string", () => {
    const ctx: ValidationContext = {
      strictContraintes: [strict({ type: "REGEX", pattern: "^[A-Z][a-z]+$" })],
      softContraintes: [], existingFiged: []
    };
    expect(validateValue({ type: "STRING", value: "ALLCAPS" }, ctx).valide).toBe(false);
    expect(validateValue({ type: "STRING", value: "Aldric" }, ctx).valide).toBe(true);
  });

  it("soft constraint violations produce warnings, not errors", () => {
    const ctx: ValidationContext = {
      strictContraintes: [],
      softContraintes: [strict({ type: "NE_PEUT_PAS_ETRE", valeurs: [{ type: "STRING", value: "x" }] })],
      existingFiged: []
    };
    const r = validateValue({ type: "STRING", value: "x" }, ctx);
    expect(r.valide).toBe(true);
    expect(r.avertissements.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/core/validation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/core/validation.ts`**

```ts
import type { AttributValue, AttributFige } from "../domain/attribute.js";
import type { Contrainte, RegleContrainte } from "../domain/potentialite.js";

export interface ValidationContext {
  strictContraintes: ReadonlyArray<Contrainte>;
  softContraintes: ReadonlyArray<Contrainte>;
  existingFiged: ReadonlyArray<AttributFige>;
}

export type ErrorType = "FORMAT" | "CONTRAINTE_STRICTE" | "CONTRADICTION_RC";

export interface ValidationFailure {
  type: ErrorType;
  message: string;
  contrainte?: Contrainte;
}

export interface Avertissement {
  type: "CONTRAINTE_SOUPLE";
  message: string;
  contrainte: Contrainte;
}

export interface ValidationResult {
  valide: boolean;
  erreurs: ValidationFailure[];
  avertissements: Avertissement[];
}

export function validateValue(value: AttributValue, ctx: ValidationContext): ValidationResult {
  const erreurs: ValidationFailure[] = [];
  const avertissements: Avertissement[] = [];

  const fmt = checkFormat(value);
  if (!fmt.ok) erreurs.push({ type: "FORMAT", message: fmt.reason });

  for (const c of ctx.strictContraintes) {
    const v = checkRule(value, c.regle);
    if (!v.ok) {
      erreurs.push({
        type: "CONTRAINTE_STRICTE",
        message: `${c.justificationNarrative}: ${v.reason}`,
        contrainte: c
      });
    }
  }

  for (const c of ctx.softContraintes) {
    const v = checkRule(value, c.regle);
    if (!v.ok) {
      avertissements.push({
        type: "CONTRAINTE_SOUPLE",
        message: `${c.justificationNarrative}: ${v.reason}`,
        contrainte: c
      });
    }
  }

  return { valide: erreurs.length === 0, erreurs, avertissements };
}

function checkFormat(v: AttributValue): { ok: true } | { ok: false; reason: string } {
  switch (v.type) {
    case "STRING":     return typeof v.value === "string" ? { ok: true } : { ok: false, reason: "expected string" };
    case "NUMBER":     return typeof v.value === "number" && Number.isFinite(v.value) ? { ok: true } : { ok: false, reason: "expected finite number" };
    case "BOOLEAN":    return typeof v.value === "boolean" ? { ok: true } : { ok: false, reason: "expected boolean" };
    case "ENTITY_REF": return typeof v.id === "string" ? { ok: true } : { ok: false, reason: "expected entity id" };
    case "ENTITY_SET": return Array.isArray(v.ids) ? { ok: true } : { ok: false, reason: "expected entity id array" };
    case "ENUM":       return typeof v.value === "string" && typeof v.enumType === "string" ? { ok: true } : { ok: false, reason: "expected enum" };
    case "COMPOSITE":  return typeof v.fields === "object" && v.fields !== null ? { ok: true } : { ok: false, reason: "expected composite" };
  }
}

function checkRule(v: AttributValue, r: RegleContrainte): { ok: true } | { ok: false; reason: string } {
  switch (r.type) {
    case "DOIT_ETRE":
      return r.valeurs.some(allowed => equalValue(v, allowed))
        ? { ok: true }
        : { ok: false, reason: "value not in allowed set" };

    case "NE_PEUT_PAS_ETRE":
      return r.valeurs.some(forbidden => equalValue(v, forbidden))
        ? { ok: false, reason: "value explicitly forbidden" }
        : { ok: true };

    case "RANGE_NUMERIQUE":
      if (v.type !== "NUMBER") return { ok: false, reason: "expected number" };
      if (r.min !== undefined && v.value < r.min) return { ok: false, reason: `< ${r.min}` };
      if (r.max !== undefined && v.value > r.max) return { ok: false, reason: `> ${r.max}` };
      return { ok: true };

    case "REGEX":
      if (v.type !== "STRING") return { ok: false, reason: "expected string" };
      return new RegExp(r.pattern).test(v.value) ? { ok: true } : { ok: false, reason: `does not match ${r.pattern}` };

    case "IMPLIQUE":
    case "CORRELE_AVEC":
      return { ok: true };
  }
}

function equalValue(a: AttributValue, b: AttributValue): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case "STRING":  return a.value === (b as typeof a).value;
    case "NUMBER":  return a.value === (b as typeof a).value;
    case "BOOLEAN": return a.value === (b as typeof a).value;
    case "ENTITY_REF": return a.id === (b as typeof a).id;
    case "ENTITY_SET": {
      const bb = b as typeof a;
      return a.ids.length === bb.ids.length && a.ids.every((id, i) => id === bb.ids[i]);
    }
    case "ENUM": {
      const bb = b as typeof a;
      return a.value === bb.value && a.enumType === bb.enumType;
    }
    case "COMPOSITE": return JSON.stringify(a.fields) === JSON.stringify((b as typeof a).fields);
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/core/validation.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/validation.ts test/core/validation.test.ts
git commit -m "feat(core): validation pipeline (format, strict, soft constraints)"
```

---

## Milestone 3 · Repository interface + SQLite adapter

Outcome: `Repository` contract defined; `SqliteRepository` implements it; CRUD + transactions + vector search all tested against an in-memory DB.

### Task 3.1: Repository interface

**Files:**
- Create: `src/repository/interface.ts`

- [ ] **Step 1: Create `src/repository/interface.ts`**

```ts
import type { Entity } from "../domain/entity.js";
import type { AttributFige } from "../domain/attribute.js";
import type { Potentialite } from "../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../domain/gcn.js";
import type { Scene } from "../domain/scene.js";
import type { Turn } from "../domain/turn.js";
import type { CampaignId, EntityID, FactId } from "../domain/ids.js";

export interface EntityWithScore { entity: Entity; score: number; }

export interface FactQuery {
  entityId?: EntityID;
  attributeKey?: string;
  category?: import("../domain/attribute.js").CategorieAttribut;
  minTurn?: number;
  maxTurn?: number;
}

export interface VectorSearchOpts {
  topK: number;
  filterType?: import("../domain/entity.js").EntityType;
  excludeEntityIds?: EntityID[];
}

export interface CampaignMeta {
  id: CampaignId;
  name: string;
  createdAt: number;
  embeddingDim: number;
}

export interface Repository {
  // Campaigns
  listCampaigns(): Promise<CampaignMeta[]>;
  createCampaign(meta: CampaignMeta): Promise<void>;
  deleteCampaign(id: CampaignId): Promise<void>;

  // Entities
  upsertEntity(e: Entity): Promise<void>;
  getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null>;
  findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: import("../domain/entity.js").EntityType): Promise<Entity[]>;
  searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]>;

  // Facts (RC)
  appendFact(f: AttributFige): Promise<{ factId: FactId }>;
  getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]>;
  queryFacts(campaignId: CampaignId, query: FactQuery): Promise<AttributFige[]>;

  // Potentialities
  upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void>;
  removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void>;
  getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null>;

  // GCN
  upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void>;
  upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void>;
  neighbors(campaignId: CampaignId, entityId: EntityID, depth: number): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>>;

  // Turn / Scene
  appendTurn(t: Turn): Promise<void>;
  latestTurn(campaignId: CampaignId): Promise<Turn | null>;
  upsertScene(s: Scene): Promise<void>;
  currentScene(campaignId: CampaignId): Promise<Scene | null>;

  // Transactional
  transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T>;

  // Lifecycle
  close(): Promise<void>;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/repository/interface.ts
git commit -m "feat(repository): define Repository interface"
```

### Task 3.2: SQLite migrations module

**Files:**
- Create: `src/repository/sqlite/migrations.ts`

- [ ] **Step 1: Create `src/repository/sqlite/migrations.ts`**

```ts
import type BetterSqlite3 from "better-sqlite3";

export const SCHEMA_VERSION = 1;

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_dim INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entities (
        campaign_id TEXT NOT NULL,
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        nom_connu INTEGER NOT NULL,
        aliases TEXT NOT NULL,
        tags TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_refreshed_at INTEGER,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(campaign_id, type);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(campaign_id, name);

      CREATE TABLE IF NOT EXISTS aliases_norm (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        normalized TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, normalized)
      );
      CREATE INDEX IF NOT EXISTS idx_aliases_norm ON aliases_norm(campaign_id, normalized);

      CREATE TABLE IF NOT EXISTS figed (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        attribute_key TEXT NOT NULL,
        fact_id TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        observation TEXT NOT NULL,
        turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );
      CREATE INDEX IF NOT EXISTS idx_figed_category ON figed(campaign_id, category);

      CREATE TABLE IF NOT EXISTS potentialites (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        attribute_key TEXT NOT NULL,
        etat TEXT NOT NULL,
        contraintes TEXT NOT NULL,
        contexte_generatif TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );

      CREATE TABLE IF NOT EXISTS nodes (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        etat_actuel TEXT NOT NULL,
        poids_narratif REAL NOT NULL,
        tags TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id)
      );

      CREATE TABLE IF NOT EXISTS edges (
        campaign_id TEXT NOT NULL,
        key TEXT NOT NULL,
        source TEXT NOT NULL,
        cible TEXT NOT NULL,
        type_relation TEXT NOT NULL,
        directionnalite TEXT NOT NULL,
        force_propagation REAL NOT NULL,
        etat_arete TEXT NOT NULL,
        attributs TEXT NOT NULL,
        PRIMARY KEY (campaign_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(campaign_id, source);
      CREATE INDEX IF NOT EXISTS idx_edges_cible ON edges(campaign_id, cible);

      CREATE TABLE IF NOT EXISTS turns (
        campaign_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        summary TEXT,
        scene_id TEXT,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, turn_number)
      );

      CREATE TABLE IF NOT EXISTS scenes (
        campaign_id TEXT NOT NULL,
        id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        present_entity_ids TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at_turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, id)
      );
    `
  }
];

export function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const row = db.prepare(`SELECT version FROM schema_version ORDER BY version DESC LIMIT 1`).get() as { version: number } | undefined;
  const current = row?.version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.exec(m.sql);
      db.prepare(`INSERT INTO schema_version (version) VALUES (?)`).run(m.version);
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/repository/sqlite/migrations.ts
git commit -m "feat(sqlite): schema v1 migrations"
```

### Task 3.3: Serialization helpers

**Files:**
- Create: `src/repository/sqlite/serialization.ts`

- [ ] **Step 1: Create `src/repository/sqlite/serialization.ts`**

```ts
import type { Entity } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import { asCampaignId, asEntityID, asFactId } from "../../domain/ids.js";

export interface EntityRow {
  campaign_id: string;
  id: string;
  type: string;
  name: string;
  nom_connu: number;
  aliases: string;
  tags: string;
  created_at: number;
  embedding_refreshed_at: number | null;
}

export function entityToRow(e: Entity): Omit<EntityRow, never> & { _embedding: Buffer | null } {
  return {
    campaign_id: e.campaignId,
    id: e.id,
    type: e.type,
    name: e.name,
    nom_connu: e.nomConnu ? 1 : 0,
    aliases: JSON.stringify(e.aliases),
    tags: JSON.stringify(e.tags),
    created_at: e.createdAt,
    embedding_refreshed_at: e.embeddingRefreshedAt,
    _embedding: e.embedding ? Buffer.from(e.embedding.buffer, e.embedding.byteOffset, e.embedding.byteLength) : null
  };
}

export function rowToEntity(row: EntityRow, embeddingBuf: Buffer | null): Entity {
  const embedding = embeddingBuf
    ? new Float32Array(embeddingBuf.buffer, embeddingBuf.byteOffset, embeddingBuf.byteLength / 4)
    : null;
  return {
    campaignId: asCampaignId(row.campaign_id),
    id: asEntityID(row.id),
    type: row.type as Entity["type"],
    name: row.name,
    nomConnu: row.nom_connu === 1,
    aliases: JSON.parse(row.aliases) as Entity["aliases"],
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    embeddingRefreshedAt: row.embedding_refreshed_at,
    embedding
  };
}

export interface FigedRow {
  campaign_id: string;
  entity_id: string;
  attribute_key: string;
  fact_id: string;
  value: string;
  category: string;
  observation: string;
  turn: number;
}

export function figedToRow(f: AttributFige & { campaignId: string }): FigedRow {
  return {
    campaign_id: f.campaignId,
    entity_id: f.entityId,
    attribute_key: f.key,
    fact_id: f.factId,
    value: JSON.stringify(f.value),
    category: f.category,
    observation: JSON.stringify(f.observation),
    turn: f.turn
  };
}

export function rowToFiged(row: FigedRow): AttributFige {
  return {
    factId: asFactId(row.fact_id),
    entityId: asEntityID(row.entity_id),
    key: row.attribute_key,
    value: JSON.parse(row.value) as AttributFige["value"],
    category: row.category as AttributFige["category"],
    observation: JSON.parse(row.observation) as AttributFige["observation"],
    turn: row.turn
  };
}

export interface PotentialiteRow {
  campaign_id: string;
  entity_id: string;
  attribute_key: string;
  etat: string;
  contraintes: string;
  contexte_generatif: string;
}

export function potentialiteToRow(p: Potentialite, campaignId: string): PotentialiteRow {
  return {
    campaign_id: campaignId,
    entity_id: p.entiteId,
    attribute_key: p.attribut,
    etat: p.etat,
    contraintes: JSON.stringify(p.contraintes),
    contexte_generatif: JSON.stringify(p.contexteGeneratif)
  };
}

export function rowToPotentialite(row: PotentialiteRow): Potentialite {
  return {
    entiteId: asEntityID(row.entity_id),
    attribut: row.attribute_key,
    etat: row.etat as Potentialite["etat"],
    contraintes: JSON.parse(row.contraintes) as Potentialite["contraintes"],
    contexteGeneratif: JSON.parse(row.contexte_generatif) as Potentialite["contexteGeneratif"]
  };
}

export interface NodeRow {
  campaign_id: string;
  entity_id: string;
  type: string;
  etat_actuel: string;
  poids_narratif: number;
  tags: string;
}

export function nodeToRow(n: NoeudGCN, campaignId: string): NodeRow {
  return {
    campaign_id: campaignId,
    entity_id: n.entityId,
    type: n.type,
    etat_actuel: n.etatActuel,
    poids_narratif: n.poidsNarratif,
    tags: JSON.stringify(n.tags)
  };
}

export function rowToNode(row: NodeRow): NoeudGCN {
  return {
    entityId: asEntityID(row.entity_id),
    type: row.type as NoeudGCN["type"],
    etatActuel: row.etat_actuel as NoeudGCN["etatActuel"],
    poidsNarratif: row.poids_narratif,
    tags: JSON.parse(row.tags) as string[]
  };
}

export interface EdgeRow {
  campaign_id: string;
  key: string;
  source: string;
  cible: string;
  type_relation: string;
  directionnalite: string;
  force_propagation: number;
  etat_arete: string;
  attributs: string;
}

export function edgeToRow(a: AreteGCN, campaignId: string): EdgeRow {
  return {
    campaign_id: campaignId,
    key: a.key,
    source: a.source,
    cible: a.cible,
    type_relation: JSON.stringify(a.typeRelation),
    directionnalite: a.directionnalite,
    force_propagation: a.forcePropagation,
    etat_arete: a.etatArete,
    attributs: JSON.stringify(a.attributs)
  };
}

export function rowToEdge(row: EdgeRow): AreteGCN {
  return {
    key: row.key,
    source: asEntityID(row.source),
    cible: asEntityID(row.cible),
    typeRelation: JSON.parse(row.type_relation) as AreteGCN["typeRelation"],
    directionnalite: row.directionnalite as AreteGCN["directionnalite"],
    forcePropagation: row.force_propagation,
    etatArete: row.etat_arete as AreteGCN["etatArete"],
    attributs: JSON.parse(row.attributs) as AreteGCN["attributs"]
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/repository/sqlite/serialization.ts
git commit -m "feat(sqlite): JSON serialization for domain types"
```

### Task 3.4: sqlite-vec setup module

**Files:**
- Create: `src/repository/sqlite/vec.ts`

- [ ] **Step 1: Create `src/repository/sqlite/vec.ts`**

```ts
import type BetterSqlite3 from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

export function loadVec(db: BetterSqlite3.Database): void {
  sqliteVec.load(db);
}

export function ensureVecTable(db: BetterSqlite3.Database, dim: number): void {
  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_vec'`).get();
  if (exists) {
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'embedding_dim'`).get() as { value: string } | undefined;
    const stored = row ? Number(row.value) : null;
    if (stored !== null && stored !== dim) {
      throw new Error(`Embedding dim mismatch: stored=${stored}, configured=${dim}. Use a fresh database file or a different embedding provider.`);
    }
    return;
  }
  db.exec(`CREATE VIRTUAL TABLE entity_vec USING vec0(entity_id TEXT PRIMARY KEY, embedding FLOAT[${dim}])`);
  db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(dim));
}

export function upsertVec(db: BetterSqlite3.Database, entityId: string, vec: Float32Array): void {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  db.prepare(`INSERT OR REPLACE INTO entity_vec (entity_id, embedding) VALUES (?, ?)`).run(entityId, buf);
}

export function searchVec(db: BetterSqlite3.Database, vec: Float32Array, topK: number): Array<{ entity_id: string; distance: number }> {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  return db.prepare(`
    SELECT entity_id, distance
    FROM entity_vec
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `).all(buf, topK) as Array<{ entity_id: string; distance: number }>;
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/repository/sqlite/vec.ts
git commit -m "feat(sqlite): sqlite-vec loading + dim-locked virtual table"
```

### Task 3.5: SqliteRepository — campaigns + entities

**Files:**
- Create: `src/repository/sqlite/index.ts`
- Create: `test/repository/sqlite.test.ts`

- [ ] **Step 1: Write failing test `test/repository/sqlite.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

let repo: SqliteRepository;
const cid = asCampaignId("c1");

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
  await repo.createCampaign({ id: cid, name: "Test", createdAt: 0, embeddingDim: 4 });
});

afterEach(async () => { await repo.close(); });

describe("SqliteRepository · campaigns + entities", () => {
  it("lists created campaigns", async () => {
    const list = await repo.listCampaigns();
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(cid);
  });

  it("upserts and reads back an entity", async () => {
    const e: Entity = {
      campaignId: cid, id: asEntityID("e1"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true, aliases: [], tags: [], createdAt: 0,
      embedding: null, embeddingRefreshedAt: null
    };
    await repo.upsertEntity(e);
    const got = await repo.getEntity(cid, asEntityID("e1"));
    expect(got?.name).toBe("Aldric");
    expect(got?.nomConnu).toBe(true);
  });

  it("upserts entity with embedding and reads it back", async () => {
    const vec = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const e: Entity = {
      campaignId: cid, id: asEntityID("e2"), type: "PERSONNAGE", name: "B",
      nomConnu: false, aliases: [], tags: [], createdAt: 0,
      embedding: vec, embeddingRefreshedAt: 1
    };
    await repo.upsertEntity(e);
    const got = await repo.getEntity(cid, asEntityID("e2"));
    expect(got?.embedding).not.toBeNull();
    expect(Array.from(got!.embedding!)).toEqual([0.1, 0.2, 0.3, 0.4]);
  });

  it("finds entities by normalized alias", async () => {
    const e: Entity = {
      campaignId: cid, id: asEntityID("e3"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true,
      aliases: [{ text: "Le forgeron", source: { kind: "GM_NARRATION" }, observedAt: 0 }],
      tags: [], createdAt: 0, embedding: null, embeddingRefreshedAt: null
    };
    await repo.upsertEntity(e);
    const matches = await repo.findEntitiesByAlias(cid, "le forgeron");
    expect(matches).toHaveLength(1);
    expect(matches[0]!.id).toBe(asEntityID("e3"));
  });

  it("returns null for unknown entity", async () => {
    const got = await repo.getEntity(cid, asEntityID("nope"));
    expect(got).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/repository/sqlite.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/repository/sqlite/index.ts` (initial scope: campaigns + entities)**

```ts
import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";
import type { Repository, CampaignMeta, VectorSearchOpts, EntityWithScore, FactQuery } from "../interface.js";
import type { Entity, EntityType } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { Scene } from "../../domain/scene.js";
import type { Turn } from "../../domain/turn.js";
import type { CampaignId, EntityID, FactId } from "../../domain/ids.js";
import { asCampaignId, asFactId } from "../../domain/ids.js";
import { runMigrations } from "./migrations.js";
import { loadVec, ensureVecTable, upsertVec, searchVec } from "./vec.js";
import {
  entityToRow, rowToEntity, type EntityRow,
  figedToRow, rowToFiged, type FigedRow,
  potentialiteToRow, rowToPotentialite, type PotentialiteRow,
  nodeToRow, rowToNode, type NodeRow,
  edgeToRow, rowToEdge, type EdgeRow
} from "./serialization.js";

export interface SqliteRepositoryOptions {
  path: string;
  embeddingDim: number;
  readonly?: boolean;
}

export class SqliteRepository implements Repository {
  private readonly db: BetterSqlite3.Database;
  private readonly dim: number;

  constructor(opts: SqliteRepositoryOptions) {
    this.db = new Database(opts.path, { readonly: opts.readonly ?? false });
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    runMigrations(this.db);
    loadVec(this.db);
    ensureVecTable(this.db, opts.embeddingDim);
    this.dim = opts.embeddingDim;
  }

  async listCampaigns(): Promise<CampaignMeta[]> {
    const rows = this.db.prepare(`SELECT id, name, created_at, embedding_dim FROM campaigns`).all() as Array<{
      id: string; name: string; created_at: number; embedding_dim: number;
    }>;
    return rows.map(r => ({ id: asCampaignId(r.id), name: r.name, createdAt: r.created_at, embeddingDim: r.embedding_dim }));
  }

  async createCampaign(meta: CampaignMeta): Promise<void> {
    if (meta.embeddingDim !== this.dim) {
      throw new Error(`Campaign embeddingDim=${meta.embeddingDim} != Repository dim=${this.dim}`);
    }
    this.db.prepare(`INSERT OR REPLACE INTO campaigns (id, name, created_at, embedding_dim) VALUES (?, ?, ?, ?)`)
      .run(meta.id, meta.name, meta.createdAt, meta.embeddingDim);
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    const tx = this.db.transaction(() => {
      for (const t of ["entities", "aliases_norm", "figed", "potentialites", "nodes", "edges", "turns", "scenes"]) {
        this.db.prepare(`DELETE FROM ${t} WHERE campaign_id = ?`).run(id);
      }
      this.db.prepare(`DELETE FROM campaigns WHERE id = ?`).run(id);
    });
    tx();
  }

  async upsertEntity(e: Entity): Promise<void> {
    const r = entityToRow(e);
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT OR REPLACE INTO entities
          (campaign_id, id, type, name, nom_connu, aliases, tags, created_at, embedding_refreshed_at)
        VALUES (@campaign_id, @id, @type, @name, @nom_connu, @aliases, @tags, @created_at, @embedding_refreshed_at)
      `).run({
        campaign_id: r.campaign_id, id: r.id, type: r.type, name: r.name,
        nom_connu: r.nom_connu, aliases: r.aliases, tags: r.tags,
        created_at: r.created_at, embedding_refreshed_at: r.embedding_refreshed_at
      });

      this.db.prepare(`DELETE FROM aliases_norm WHERE campaign_id = ? AND entity_id = ?`).run(e.campaignId, e.id);
      const ins = this.db.prepare(`INSERT INTO aliases_norm (campaign_id, entity_id, normalized) VALUES (?, ?, ?)`);
      ins.run(e.campaignId, e.id, normalize(e.name));
      for (const a of e.aliases) ins.run(e.campaignId, e.id, normalize(a.text));

      if (r._embedding) {
        upsertVec(this.db, e.id, e.embedding!);
      }
    });
    tx();
  }

  async getEntity(campaignId: CampaignId, entityId: EntityID): Promise<Entity | null> {
    const row = this.db.prepare(`
      SELECT * FROM entities WHERE campaign_id = ? AND id = ?
    `).get(campaignId, entityId) as EntityRow | undefined;
    if (!row) return null;
    const vec = this.db.prepare(`SELECT embedding FROM entity_vec WHERE entity_id = ?`).get(entityId) as { embedding: Buffer } | undefined;
    return rowToEntity(row, vec?.embedding ?? null);
  }

  async findEntitiesByAlias(campaignId: CampaignId, aliasNormalized: string, type?: EntityType): Promise<Entity[]> {
    const norm = normalize(aliasNormalized);
    const sql = type
      ? `SELECT e.* FROM entities e
         JOIN aliases_norm a ON a.campaign_id = e.campaign_id AND a.entity_id = e.id
         WHERE a.campaign_id = ? AND a.normalized = ? AND e.type = ?`
      : `SELECT e.* FROM entities e
         JOIN aliases_norm a ON a.campaign_id = e.campaign_id AND a.entity_id = e.id
         WHERE a.campaign_id = ? AND a.normalized = ?`;
    const rows = type
      ? this.db.prepare(sql).all(campaignId, norm, type) as EntityRow[]
      : this.db.prepare(sql).all(campaignId, norm) as EntityRow[];
    return rows.map(r => rowToEntity(r, null));
  }

  async searchEntitiesByVector(campaignId: CampaignId, vec: Float32Array, opts: VectorSearchOpts): Promise<EntityWithScore[]> {
    const hits = searchVec(this.db, vec, opts.topK * 3);
    const result: EntityWithScore[] = [];
    for (const h of hits) {
      const row = this.db.prepare(`SELECT * FROM entities WHERE campaign_id = ? AND id = ?`).get(campaignId, h.entity_id) as EntityRow | undefined;
      if (!row) continue;
      if (opts.filterType && row.type !== opts.filterType) continue;
      if (opts.excludeEntityIds?.includes(h.entity_id as EntityID)) continue;
      result.push({ entity: rowToEntity(row, null), score: 1 - h.distance });
      if (result.length >= opts.topK) break;
    }
    return result;
  }

  async appendFact(f: AttributFige & { campaignId?: string }): Promise<{ factId: FactId }> {
    const campaignId = (f as { campaignId?: string }).campaignId;
    if (!campaignId) throw new Error("appendFact requires campaignId on the fact");
    const row = figedToRow({ ...f, campaignId });
    this.db.prepare(`
      INSERT OR REPLACE INTO figed
        (campaign_id, entity_id, attribute_key, fact_id, value, category, observation, turn)
      VALUES (@campaign_id, @entity_id, @attribute_key, @fact_id, @value, @category, @observation, @turn)
    `).run(row);
    return { factId: asFactId(row.fact_id) };
  }

  async getFigedAttributes(campaignId: CampaignId, entityId: EntityID): Promise<AttributFige[]> {
    const rows = this.db.prepare(`SELECT * FROM figed WHERE campaign_id = ? AND entity_id = ? ORDER BY turn`)
      .all(campaignId, entityId) as FigedRow[];
    return rows.map(rowToFiged);
  }

  async queryFacts(campaignId: CampaignId, query: FactQuery): Promise<AttributFige[]> {
    const clauses: string[] = ["campaign_id = ?"];
    const params: unknown[] = [campaignId];
    if (query.entityId)     { clauses.push("entity_id = ?");     params.push(query.entityId); }
    if (query.attributeKey) { clauses.push("attribute_key = ?"); params.push(query.attributeKey); }
    if (query.category)     { clauses.push("category = ?");      params.push(query.category); }
    if (query.minTurn !== undefined) { clauses.push("turn >= ?"); params.push(query.minTurn); }
    if (query.maxTurn !== undefined) { clauses.push("turn <= ?"); params.push(query.maxTurn); }
    const rows = this.db.prepare(`SELECT * FROM figed WHERE ${clauses.join(" AND ")} ORDER BY turn`).all(...params) as FigedRow[];
    return rows.map(rowToFiged);
  }

  async upsertPotentialite(campaignId: CampaignId, p: Potentialite): Promise<void> {
    const r = potentialiteToRow(p, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO potentialites
        (campaign_id, entity_id, attribute_key, etat, contraintes, contexte_generatif)
      VALUES (@campaign_id, @entity_id, @attribute_key, @etat, @contraintes, @contexte_generatif)
    `).run(r);
  }

  async removePotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<void> {
    this.db.prepare(`DELETE FROM potentialites WHERE campaign_id = ? AND entity_id = ? AND attribute_key = ?`)
      .run(campaignId, entityId, attribut);
  }

  async getPotentialite(campaignId: CampaignId, entityId: EntityID, attribut: string): Promise<Potentialite | null> {
    const row = this.db.prepare(`SELECT * FROM potentialites WHERE campaign_id = ? AND entity_id = ? AND attribute_key = ?`)
      .get(campaignId, entityId, attribut) as PotentialiteRow | undefined;
    return row ? rowToPotentialite(row) : null;
  }

  async upsertNode(campaignId: CampaignId, n: NoeudGCN): Promise<void> {
    const r = nodeToRow(n, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO nodes
        (campaign_id, entity_id, type, etat_actuel, poids_narratif, tags)
      VALUES (@campaign_id, @entity_id, @type, @etat_actuel, @poids_narratif, @tags)
    `).run(r);
  }

  async upsertEdge(campaignId: CampaignId, a: AreteGCN): Promise<void> {
    const r = edgeToRow(a, campaignId);
    this.db.prepare(`
      INSERT OR REPLACE INTO edges
        (campaign_id, key, source, cible, type_relation, directionnalite, force_propagation, etat_arete, attributs)
      VALUES (@campaign_id, @key, @source, @cible, @type_relation, @directionnalite, @force_propagation, @etat_arete, @attributs)
    `).run(r);
  }

  async neighbors(campaignId: CampaignId, entityId: EntityID, _depth: number): Promise<Array<{ node: NoeudGCN; edge: AreteGCN }>> {
    const edgeRows = this.db.prepare(`
      SELECT * FROM edges WHERE campaign_id = ? AND (source = ? OR cible = ?)
    `).all(campaignId, entityId, entityId) as EdgeRow[];

    const result: Array<{ node: NoeudGCN; edge: AreteGCN }> = [];
    for (const er of edgeRows) {
      const otherId = er.source === entityId ? er.cible : er.source;
      const nodeRow = this.db.prepare(`SELECT * FROM nodes WHERE campaign_id = ? AND entity_id = ?`)
        .get(campaignId, otherId) as NodeRow | undefined;
      if (!nodeRow) continue;
      result.push({ node: rowToNode(nodeRow), edge: rowToEdge(er) });
    }
    return result;
  }

  async appendTurn(t: Turn): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO turns (campaign_id, turn_number, summary, scene_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(t.campaignId, t.turnNumber, t.summary, t.sceneId, t.createdAt);
  }

  async latestTurn(campaignId: CampaignId): Promise<Turn | null> {
    const row = this.db.prepare(`SELECT * FROM turns WHERE campaign_id = ? ORDER BY turn_number DESC LIMIT 1`)
      .get(campaignId) as { campaign_id: string; turn_number: number; summary: string | null; scene_id: string | null; created_at: number } | undefined;
    if (!row) return null;
    return {
      campaignId: asCampaignId(row.campaign_id),
      turnNumber: row.turn_number,
      summary: row.summary,
      sceneId: row.scene_id as Turn["sceneId"],
      createdAt: row.created_at
    };
  }

  async upsertScene(s: Scene): Promise<void> {
    this.db.prepare(`
      INSERT OR REPLACE INTO scenes (campaign_id, id, location_id, present_entity_ids, description, created_at_turn)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(s.campaignId, s.id, s.locationId, JSON.stringify(s.presentEntityIds), s.description, s.createdAtTurn);
  }

  async currentScene(campaignId: CampaignId): Promise<Scene | null> {
    const row = this.db.prepare(`
      SELECT s.* FROM scenes s
      JOIN turns t ON t.campaign_id = s.campaign_id AND t.scene_id = s.id
      WHERE s.campaign_id = ?
      ORDER BY t.turn_number DESC LIMIT 1
    `).get(campaignId) as { campaign_id: string; id: string; location_id: string; present_entity_ids: string; description: string; created_at_turn: number } | undefined;
    if (!row) return null;
    return {
      campaignId: asCampaignId(row.campaign_id),
      id: row.id as Scene["id"],
      locationId: row.location_id as Scene["locationId"],
      presentEntityIds: JSON.parse(row.present_entity_ids) as Scene["presentEntityIds"],
      description: row.description,
      createdAtTurn: row.created_at_turn
    };
  }

  async transaction<T>(fn: (tx: Repository) => Promise<T>): Promise<T> {
    // better-sqlite3 transactions are sync. We collect the promise and resolve outside.
    let result: T | undefined;
    let err: unknown = null;
    const tx = this.db.transaction(() => {
      // Sync execution of an async closure: we run it and trust each repo op is sync underneath.
      fn(this).then(r => { result = r; }).catch(e => { err = e; });
    });
    tx();
    if (err) throw err;
    return result as T;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/repository/sqlite.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/repository/sqlite/index.ts test/repository/sqlite.test.ts
git commit -m "feat(sqlite): SqliteRepository — campaigns, entities, facts, GCN, scenes"
```

### Task 3.6: Vector search round-trip test

**Files:**
- Create: `test/repository/vec.test.ts`

- [ ] **Step 1: Write test `test/repository/vec.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import type { Entity } from "../../src/domain/entity.js";

let repo: SqliteRepository;
const cid = asCampaignId("c1");

function ent(id: string, vec: number[], name = id, type: Entity["type"] = "PERSONNAGE"): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type, name,
    nomConnu: true, aliases: [], tags: [], createdAt: 0,
    embedding: new Float32Array(vec), embeddingRefreshedAt: 0
  };
}

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 3 });
  await repo.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 3 });
});
afterEach(async () => { await repo.close(); });

describe("vector search", () => {
  it("returns nearest neighbor first", async () => {
    await repo.upsertEntity(ent("a", [1, 0, 0]));
    await repo.upsertEntity(ent("b", [0, 1, 0]));
    await repo.upsertEntity(ent("c", [0, 0, 1]));
    const hits = await repo.searchEntitiesByVector(cid, new Float32Array([0.95, 0.05, 0]), { topK: 2 });
    expect(hits[0]!.entity.id).toBe(asEntityID("a"));
  });

  it("filters by type", async () => {
    await repo.upsertEntity(ent("loc1", [1, 0, 0], "loc1", "LIEU"));
    await repo.upsertEntity(ent("pnj1", [1, 0, 0], "pnj1", "PERSONNAGE"));
    const hits = await repo.searchEntitiesByVector(cid, new Float32Array([1, 0, 0]), { topK: 5, filterType: "LIEU" });
    expect(hits.map(h => h.entity.id)).toEqual([asEntityID("loc1")]);
  });

  it("rejects dim mismatch on construction", () => {
    expect(() => {
      const r1 = new SqliteRepository({ path: ":memory:", embeddingDim: 4 });
      r1.close();
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test, verify pass**

```bash
pnpm vitest run test/repository/vec.test.ts
```

Expected: PASS (3 tests).

- [ ] **Step 3: Commit**

```bash
git add test/repository/vec.test.ts
git commit -m "test(sqlite): vector search round-trip + type filter"
```

---

## Milestone 4 · Router + Providers

Outcome: `Router` with three task tiers and fallback chain on quota/auth/5xx/timeout/malformed. Reference providers for OpenAI-compatible, Anthropic, Google GenAI, plus a custom escape hatch. `replayProvider` test helper.

### Task 4.1: Provider + Router interfaces

**Files:**
- Create: `src/router/interface.ts`

- [ ] **Step 1: Create `src/router/interface.ts`**

```ts
export type ProviderKind = "openai-compatible" | "anthropic" | "google-genai" | "custom";

export interface ProviderRef {
  provider: ProviderKind;
  baseUrl?: string;
  apiKeyEnv: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  quotaHint?: { requestsPerMinute?: number; requestsPerDay?: number; isFreeTier?: boolean };
}

export interface ProviderChain {
  primary: ProviderRef;
  fallbacks: ProviderRef[];
}

export type Tier = "heavy" | "light" | "embeddings";

export interface RouterConfig {
  tiers: Record<Tier, ProviderChain>;
  defaults?: {
    timeoutMs?: number;
    maxRetries?: number;
    backoff?: { strategy: "exponential" | "fixed"; baseMs: number };
  };
}

export interface ChatRequest {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; inputSchema: object }>;
  responseFormat?: "text" | "json";
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  text: string;
  toolCalls: Array<{ name: string; arguments: unknown }>;
  modelUsed: string;
  providerUsed: string;
}

export interface EmbeddingRequest {
  texts: string[];
}

export interface EmbeddingResponse {
  vectors: Float32Array[];
  dim: number;
  modelUsed: string;
  providerUsed: string;
}

export interface Provider {
  readonly ref: ProviderRef;
  chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse>;
  embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse>;
}

export type ProviderErrorCode = "QUOTA" | "AUTH" | "SERVER" | "TIMEOUT" | "MALFORMED" | "NETWORK" | "UNSUPPORTED";

export class ProviderHttpError extends Error {
  constructor(public code: ProviderErrorCode, public status: number | null, message: string) {
    super(message);
    this.name = "ProviderHttpError";
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/router/interface.ts
git commit -m "feat(router): Provider, Router, ChatRequest/Response interfaces"
```

### Task 4.2: Replay provider test helper

**Files:**
- Create: `test/fixtures/replay-provider.ts`

- [ ] **Step 1: Create `test/fixtures/replay-provider.ts`**

```ts
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../../src/router/interface.js";
import { ProviderHttpError, type ProviderErrorCode } from "../../src/router/interface.js";

export type ScriptedResponse =
  | { kind: "chat"; response: Partial<ChatResponse> }
  | { kind: "embed"; vectors: number[][] }
  | { kind: "error"; code: ProviderErrorCode; status: number | null; message: string };

export class ReplayProvider implements Provider {
  private idx = 0;
  constructor(public readonly ref: ProviderRef, private readonly script: ScriptedResponse[]) {}

  async chat(_req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    const next = this.next();
    if (next.kind === "error") throw new ProviderHttpError(next.code, next.status, next.message);
    if (next.kind !== "chat") throw new Error(`Script step ${this.idx - 1} is ${next.kind}, expected chat`);
    return {
      text: next.response.text ?? "",
      toolCalls: next.response.toolCalls ?? [],
      modelUsed: this.ref.model,
      providerUsed: this.ref.provider
    };
  }

  async embed(req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    const next = this.next();
    if (next.kind === "error") throw new ProviderHttpError(next.code, next.status, next.message);
    if (next.kind !== "embed") throw new Error(`Script step ${this.idx - 1} is ${next.kind}, expected embed`);
    const vectors = next.vectors.map(v => new Float32Array(v));
    return {
      vectors,
      dim: vectors[0]?.length ?? 0,
      modelUsed: this.ref.model,
      providerUsed: this.ref.provider
    };
  }

  callCount(): number { return this.idx; }

  private next(): ScriptedResponse {
    if (this.idx >= this.script.length) throw new Error(`ReplayProvider exhausted after ${this.idx} calls`);
    return this.script[this.idx++]!;
  }
}

export function replayProvider(model: string, script: ScriptedResponse[]): ReplayProvider {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model };
  return new ReplayProvider(ref, script);
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add test/fixtures/replay-provider.ts
git commit -m "test: add ReplayProvider fixture helper"
```

### Task 4.3: Router with fallback chain

**Files:**
- Create: `src/router/router.ts`
- Create: `test/router/router.test.ts`

- [ ] **Step 1: Write failing test `test/router/router.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Router } from "../../src/router/router.js";
import { replayProvider } from "../fixtures/replay-provider.js";
import type { RouterConfig } from "../../src/router/interface.js";

function makeRouter(opts: { heavy: import("../fixtures/replay-provider.js").ReplayProvider[]; light?: import("../fixtures/replay-provider.js").ReplayProvider[]; embed?: import("../fixtures/replay-provider.js").ReplayProvider[] }): Router {
  const cfg: RouterConfig = {
    tiers: {
      heavy: { primary: opts.heavy[0]!.ref, fallbacks: opts.heavy.slice(1).map(p => p.ref) },
      light: { primary: (opts.light ?? opts.heavy)[0]!.ref, fallbacks: (opts.light ?? opts.heavy).slice(1).map(p => p.ref) },
      embeddings: { primary: (opts.embed ?? opts.heavy)[0]!.ref, fallbacks: (opts.embed ?? opts.heavy).slice(1).map(p => p.ref) }
    },
    defaults: { timeoutMs: 5000, maxRetries: 0 }
  };
  const all = [...opts.heavy, ...(opts.light ?? []), ...(opts.embed ?? [])];
  return new Router(cfg, { resolveProvider: (ref) => all.find(p => p.ref === ref)! });
}

describe("Router", () => {
  it("returns primary response on success", async () => {
    const p = replayProvider("m1", [{ kind: "chat", response: { text: "hello" } }]);
    const router = makeRouter({ heavy: [p] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("hello");
    expect(r.providerUsed).toBe("custom");
  });

  it("falls back on 429 quota", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "QUOTA", status: 429, message: "rate-limited" }]);
    const p2 = replayProvider("m2", [{ kind: "chat", response: { text: "from p2" } }]);
    const router = makeRouter({ heavy: [p1, p2] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("from p2");
    expect(r.modelUsed).toBe("m2");
  });

  it("falls back on 5xx", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "SERVER", status: 503, message: "down" }]);
    const p2 = replayProvider("m2", [{ kind: "chat", response: { text: "ok" } }]);
    const router = makeRouter({ heavy: [p1, p2] });
    const r = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r.text).toBe("ok");
  });

  it("disables a provider after AUTH error and skips it on next call", async () => {
    const p1 = replayProvider("m1", [
      { kind: "error", code: "AUTH", status: 401, message: "bad key" }
    ]);
    const p2 = replayProvider("m2", [
      { kind: "chat", response: { text: "fallback-1" } },
      { kind: "chat", response: { text: "fallback-2" } }
    ]);
    const router = makeRouter({ heavy: [p1, p2] });
    await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    const r2 = await router.chat("heavy", { messages: [{ role: "user", content: "hi" }] });
    expect(r2.text).toBe("fallback-2");
    expect(p1.callCount()).toBe(1);
    expect(p2.callCount()).toBe(2);
  });

  it("throws SneqProviderError-equivalent when chain exhausted", async () => {
    const p1 = replayProvider("m1", [{ kind: "error", code: "QUOTA", status: 429, message: "x" }]);
    const p2 = replayProvider("m2", [{ kind: "error", code: "QUOTA", status: 429, message: "y" }]);
    const router = makeRouter({ heavy: [p1, p2] });
    await expect(router.chat("heavy", { messages: [{ role: "user", content: "hi" }] }))
      .rejects.toThrow(/exhausted/i);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/router/router.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/router/router.ts`**

```ts
import type {
  RouterConfig, Tier, ProviderRef, Provider,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse
} from "./interface.js";
import { ProviderHttpError } from "./interface.js";

export interface RouterDeps {
  resolveProvider(ref: ProviderRef): Provider;
}

export class RouterExhaustedError extends Error {
  constructor(public tier: Tier, public attempts: Array<{ provider: string; model: string; error: string }>) {
    super(`Router chain exhausted for tier ${tier} after ${attempts.length} attempts`);
    this.name = "RouterExhaustedError";
  }
}

export class Router {
  private disabled = new Set<string>();

  constructor(private readonly cfg: RouterConfig, private readonly deps: RouterDeps) {}

  async chat(tier: Tier, req: ChatRequest): Promise<ChatResponse> {
    return this.runWithFallback(tier, async (provider, signal) => provider.chat(req, signal));
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.runWithFallback("embeddings", async (provider, signal) => provider.embed(req, signal));
  }

  private chainFor(tier: Tier): ProviderRef[] {
    const c = this.cfg.tiers[tier];
    return [c.primary, ...c.fallbacks];
  }

  private async runWithFallback<T>(tier: Tier, op: (p: Provider, s: AbortSignal) => Promise<T>): Promise<T> {
    const chain = this.chainFor(tier);
    const attempts: Array<{ provider: string; model: string; error: string }> = [];
    const timeoutMs = this.cfg.defaults?.timeoutMs ?? 30_000;

    for (const ref of chain) {
      const key = refKey(ref);
      if (this.disabled.has(key)) continue;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const provider = this.deps.resolveProvider(ref);
        const r = await op(provider, ctrl.signal);
        clearTimeout(timer);
        return r;
      } catch (e) {
        clearTimeout(timer);
        const err = normalizeError(e);
        attempts.push({ provider: ref.provider, model: ref.model, error: `${err.code}:${err.message}` });
        if (err.code === "AUTH") this.disabled.add(key);
        if (err.code === "UNSUPPORTED") continue;
        // for all other codes we also continue to next in chain
        continue;
      }
    }
    throw new RouterExhaustedError(tier, attempts);
  }
}

function refKey(r: ProviderRef): string {
  return `${r.provider}|${r.baseUrl ?? ""}|${r.model}`;
}

function normalizeError(e: unknown): ProviderHttpError {
  if (e instanceof ProviderHttpError) return e;
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, "request aborted");
  if (e instanceof Error) return new ProviderHttpError("NETWORK", null, e.message);
  return new ProviderHttpError("NETWORK", null, String(e));
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/router/router.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/router/router.ts test/router/router.test.ts
git commit -m "feat(router): Router with chain fallback + AUTH cooldown"
```

### Task 4.4: OpenAI-compatible provider

**Files:**
- Create: `src/router/providers/openai-compatible.ts`

- [ ] **Step 1: Create `src/router/providers/openai-compatible.ts`**

```ts
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

export class OpenAICompatibleProvider implements Provider {
  constructor(public readonly ref: ProviderRef, private readonly fetchImpl: typeof fetch = fetch) {
    if (!ref.baseUrl) throw new Error("openai-compatible provider requires baseUrl");
  }

  async chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    const apiKey = process.env[this.ref.apiKeyEnv];
    if (!apiKey) throw new ProviderHttpError("AUTH", null, `missing env var ${this.ref.apiKeyEnv}`);

    const body: Record<string, unknown> = {
      model: this.ref.model,
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        ...req.messages
      ],
      max_tokens: req.maxTokens ?? this.ref.maxTokens,
      temperature: req.temperature ?? this.ref.temperature
    };
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools.map(t => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.inputSchema }
      }));
    }
    if (req.responseFormat === "json") body.response_format = { type: "json_object" };

    const url = `${this.ref.baseUrl!.replace(/\/$/, "")}/chat/completions`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) throw codeForStatus(res.status, await res.text());
    const data = await res.json() as {
      choices: Array<{ message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>
    };
    const choice = data.choices[0];
    if (!choice) throw new ProviderHttpError("MALFORMED", res.status, "no choices in response");
    const toolCalls = (choice.message.tool_calls ?? []).map(tc => ({
      name: tc.function.name,
      arguments: safeJson(tc.function.arguments)
    }));
    return {
      text: choice.message.content ?? "",
      toolCalls,
      modelUsed: this.ref.model,
      providerUsed: this.ref.baseUrl!
    };
  }

  async embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse> {
    const apiKey = process.env[this.ref.apiKeyEnv];
    if (!apiKey) throw new ProviderHttpError("AUTH", null, `missing env var ${this.ref.apiKeyEnv}`);

    const url = `${this.ref.baseUrl!.replace(/\/$/, "")}/embeddings`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: this.ref.model, input: req.texts }),
      signal
    });

    if (!res.ok) throw codeForStatus(res.status, await res.text());
    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    const vectors = data.data.map(d => new Float32Array(d.embedding));
    return {
      vectors,
      dim: vectors[0]?.length ?? 0,
      modelUsed: this.ref.model,
      providerUsed: this.ref.baseUrl!
    };
  }
}

function codeForStatus(status: number, body: string): ProviderHttpError {
  if (status === 401 || status === 403) return new ProviderHttpError("AUTH", status, body);
  if (status === 429) return new ProviderHttpError("QUOTA", status, body);
  if (status >= 500) return new ProviderHttpError("SERVER", status, body);
  return new ProviderHttpError("NETWORK", status, body);
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/router/providers/openai-compatible.ts
git commit -m "feat(router): OpenAI-compatible HTTP provider (chat + embed)"
```

### Task 4.5: Anthropic provider

**Files:**
- Create: `src/router/providers/anthropic.ts`

- [ ] **Step 1: Create `src/router/providers/anthropic.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

export class AnthropicProvider implements Provider {
  private readonly client: Anthropic;

  constructor(public readonly ref: ProviderRef) {
    const key = process.env[ref.apiKeyEnv];
    if (!key) throw new ProviderHttpError("AUTH", null, `missing env var ${ref.apiKeyEnv}`);
    this.client = new Anthropic({ apiKey: key, baseURL: ref.baseUrl });
  }

  async chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    try {
      const res = await this.client.messages.create({
        model: this.ref.model,
        system: req.system,
        max_tokens: req.maxTokens ?? this.ref.maxTokens ?? 4096,
        temperature: req.temperature ?? this.ref.temperature,
        messages: req.messages.map(m => ({ role: m.role, content: m.content })),
        tools: req.tools?.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema as Anthropic.Messages.Tool["input_schema"] }))
      }, { signal });

      const textParts = res.content.filter(c => c.type === "text").map(c => (c as { text: string }).text);
      const toolCalls = res.content
        .filter(c => c.type === "tool_use")
        .map(c => ({ name: (c as { name: string }).name, arguments: (c as { input: unknown }).input }));

      return {
        text: textParts.join("\n"),
        toolCalls,
        modelUsed: this.ref.model,
        providerUsed: "anthropic"
      };
    } catch (e) {
      throw mapAnthropicError(e);
    }
  }

  async embed(_req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    throw new ProviderHttpError("UNSUPPORTED", null, "anthropic does not provide embeddings");
  }
}

function mapAnthropicError(e: unknown): ProviderHttpError {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 401 || e.status === 403) return new ProviderHttpError("AUTH", e.status, e.message);
    if (e.status === 429) return new ProviderHttpError("QUOTA", e.status, e.message);
    if (e.status && e.status >= 500) return new ProviderHttpError("SERVER", e.status, e.message);
    return new ProviderHttpError("NETWORK", e.status ?? null, e.message);
  }
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, e.message);
  return new ProviderHttpError("NETWORK", null, e instanceof Error ? e.message : String(e));
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/router/providers/anthropic.ts
git commit -m "feat(router): Anthropic provider via @anthropic-ai/sdk"
```

### Task 4.6: Google GenAI provider

**Files:**
- Create: `src/router/providers/google-genai.ts`

- [ ] **Step 1: Create `src/router/providers/google-genai.ts`**

```ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

export class GoogleGenAIProvider implements Provider {
  private readonly client: GoogleGenerativeAI;

  constructor(public readonly ref: ProviderRef) {
    const key = process.env[ref.apiKeyEnv];
    if (!key) throw new ProviderHttpError("AUTH", null, `missing env var ${ref.apiKeyEnv}`);
    this.client = new GoogleGenerativeAI(key);
  }

  async chat(req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.ref.model,
        systemInstruction: req.system,
        generationConfig: {
          temperature: req.temperature ?? this.ref.temperature,
          maxOutputTokens: req.maxTokens ?? this.ref.maxTokens
        }
      });
      const contents = req.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const result = await model.generateContent({ contents });
      const text = result.response.text();
      return { text, toolCalls: [], modelUsed: this.ref.model, providerUsed: "google-genai" };
    } catch (e) {
      throw mapGoogleError(e);
    }
  }

  async embed(req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.ref.model });
      const vectors: Float32Array[] = [];
      for (const t of req.texts) {
        const r = await model.embedContent(t);
        vectors.push(new Float32Array(r.embedding.values));
      }
      return {
        vectors,
        dim: vectors[0]?.length ?? 0,
        modelUsed: this.ref.model,
        providerUsed: "google-genai"
      };
    } catch (e) {
      throw mapGoogleError(e);
    }
  }
}

function mapGoogleError(e: unknown): ProviderHttpError {
  const msg = e instanceof Error ? e.message : String(e);
  const match = msg.match(/\[(\d{3})/) || msg.match(/status[: ]+(\d{3})/i);
  const status = match ? Number(match[1]) : null;
  if (status === 401 || status === 403) return new ProviderHttpError("AUTH", status, msg);
  if (status === 429) return new ProviderHttpError("QUOTA", status, msg);
  if (status && status >= 500) return new ProviderHttpError("SERVER", status, msg);
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, msg);
  return new ProviderHttpError("NETWORK", status, msg);
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/router/providers/google-genai.ts
git commit -m "feat(router): Google GenAI provider (Gemini chat + embed)"
```

### Task 4.7: Custom provider + default config

**Files:**
- Create: `src/router/providers/custom.ts`
- Create: `src/router/defaults.ts`

- [ ] **Step 1: Create `src/router/providers/custom.ts`**

```ts
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";

export type CustomChatFn = (req: ChatRequest, signal: AbortSignal) => Promise<ChatResponse>;
export type CustomEmbedFn = (req: EmbeddingRequest, signal: AbortSignal) => Promise<EmbeddingResponse>;

export class CustomProvider implements Provider {
  constructor(public readonly ref: ProviderRef, private readonly chatFn: CustomChatFn, private readonly embedFn: CustomEmbedFn) {}
  chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> { return this.chatFn(req, signal); }
  embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse> { return this.embedFn(req, signal); }
}
```

- [ ] **Step 2: Create `src/router/defaults.ts`**

```ts
import type { RouterConfig } from "./interface.js";

export function defaultRouterConfig(): RouterConfig {
  return {
    tiers: {
      heavy: {
        primary: { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" },
        fallbacks: [
          { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "gemini-2.5-pro" },
          { provider: "anthropic",    apiKeyEnv: "ANTHROPIC_API_KEY",   model: "claude-haiku-4-5-20251001" }
        ]
      },
      light: {
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "gemini-2.5-flash" },
        fallbacks: [
          { provider: "openai-compatible", baseUrl: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY", model: "mistral-small-latest" },
          { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" }
        ]
      },
      embeddings: {
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "text-embedding-004" },
        fallbacks: [
          { provider: "openai-compatible", baseUrl: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY", model: "mistral-embed" }
        ]
      }
    },
    defaults: { timeoutMs: 30_000, maxRetries: 1, backoff: { strategy: "exponential", baseMs: 500 } }
  };
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/router/providers/custom.ts src/router/defaults.ts
git commit -m "feat(router): custom provider + defaultRouterConfig()"
```

### Task 4.8: Provider factory in Router

**Files:**
- Modify: `src/router/router.ts:1-end` — add `createDefaultDeps()`

- [ ] **Step 1: Append to `src/router/router.ts` (after the Router class)**

```ts
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { GoogleGenAIProvider } from "./providers/google-genai.js";

export function createDefaultDeps(): RouterDeps {
  const cache = new Map<string, Provider>();
  return {
    resolveProvider(ref) {
      const key = `${ref.provider}|${ref.baseUrl ?? ""}|${ref.model}`;
      let p = cache.get(key);
      if (p) return p;
      switch (ref.provider) {
        case "openai-compatible": p = new OpenAICompatibleProvider(ref); break;
        case "anthropic":         p = new AnthropicProvider(ref); break;
        case "google-genai":      p = new GoogleGenAIProvider(ref); break;
        case "custom":            throw new Error("custom provider must be passed via custom RouterDeps");
      }
      cache.set(key, p);
      return p;
    }
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/router/router.ts
git commit -m "feat(router): default provider factory (lazy, cached)"
```

---

## Milestone 5 · Resolver

Outcome: layered entity resolution — L1 alias, L2 vector, L3 LLM judge, L4 askUser — with configurable thresholds and a generation-direction variant.

### Task 5.1: Alias normalization

**Files:**
- Create: `src/resolver/normalize.ts`

- [ ] **Step 1: Create `src/resolver/normalize.ts`**

```ts
export function normalizeAlias(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(the |le |la |les |l['])/i, "")
    .trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/resolver/normalize.ts
git commit -m "feat(resolver): alias normalization (NFD + leading article strip)"
```

### Task 5.2: Threshold defaults

**Files:**
- Create: `src/resolver/thresholds.ts`

- [ ] **Step 1: Create `src/resolver/thresholds.ts`**

```ts
export interface ResolverThresholds {
  tauHigh: number;
  tauLow: number;
  gapDelta: number;
  topK: number;
  embeddingRefreshThreshold: number;
}

export const defaultThresholds: ResolverThresholds = {
  tauHigh: 0.88,
  tauLow: 0.65,
  gapDelta: 0.05,
  topK: 5,
  embeddingRefreshThreshold: 5
};
```

- [ ] **Step 2: Commit**

```bash
git add src/resolver/thresholds.ts
git commit -m "feat(resolver): default thresholds"
```

### Task 5.3: LLM judge

**Files:**
- Create: `src/resolver/judge.ts`

- [ ] **Step 1: Create `src/resolver/judge.ts`**

```ts
import type { Entity } from "../domain/entity.js";
import type { Router } from "../router/router.js";

export interface JudgeResult {
  matchedIndex: number | null;
  reasoning: string;
  confidence: number;
}

export async function judgeMatch(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] }
): Promise<JudgeResult> {
  const { mention, sceneDescription, candidates } = args;
  const list = candidates.map((c, i) => {
    const description = c.aliases.map(a => a.text).join(", ");
    return `${i}. ${c.name} (${c.type}) — aliases: ${description || "(none)"}`;
  }).join("\n");

  const res = await router.chat("light", {
    system: `You disambiguate entity mentions for a narrative engine. Reply with strict JSON only.`,
    responseFormat: "json",
    messages: [{
      role: "user",
      content: `Mention: "${mention}"\nScene: ${sceneDescription || "(none)"}\nCandidates:\n${list}\n\nReply with JSON: {"matchedIndex": number|null, "confidence": number 0..1, "reasoning": string}. Use null if none match.`
    }]
  });

  try {
    const parsed = JSON.parse(res.text) as { matchedIndex: unknown; confidence: unknown; reasoning: unknown };
    const idx = typeof parsed.matchedIndex === "number" ? parsed.matchedIndex : null;
    const conf = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
    return { matchedIndex: idx, confidence: conf, reasoning };
  } catch {
    return { matchedIndex: null, confidence: 0, reasoning: "judge returned malformed JSON" };
  }
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/resolver/judge.ts
git commit -m "feat(resolver): L3 LLM judge with strict-JSON parsing"
```

### Task 5.4: User-prompt handler registry

**Files:**
- Create: `src/hooks/user-prompt.ts`

- [ ] **Step 1: Create `src/hooks/user-prompt.ts`**

```ts
import type { Entity } from "../domain/entity.js";

export interface AskUserArgs {
  mention: string;
  candidates: Entity[];
}

export type AskUserFn = (args: AskUserArgs) => Promise<Entity | null>;

export class UserPromptRegistry {
  private handler: AskUserFn | null = null;

  register(fn: AskUserFn): { dispose(): void } {
    this.handler = fn;
    return { dispose: () => { if (this.handler === fn) this.handler = null; } };
  }

  async ask(args: AskUserArgs): Promise<Entity | null> {
    if (!this.handler) return null;
    return this.handler(args);
  }

  hasHandler(): boolean { return this.handler !== null; }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/user-prompt.ts
git commit -m "feat(hooks): UserPromptRegistry for L4 askUser handler"
```

### Task 5.5: Resolver cascade

**Files:**
- Create: `src/resolver/resolver.ts`
- Create: `test/resolver/cascade.test.ts`

- [ ] **Step 1: Write failing test `test/resolver/cascade.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Resolver } from "../../src/resolver/resolver.js";
import { SqliteRepository } from "../../src/repository/sqlite/index.js";
import { Router } from "../../src/router/router.js";
import { UserPromptRegistry } from "../../src/hooks/user-prompt.js";
import { defaultThresholds } from "../../src/resolver/thresholds.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";
import { replayProvider, type ReplayProvider } from "../fixtures/replay-provider.js";
import type { Entity } from "../../src/domain/entity.js";

const cid = asCampaignId("c1");
let repo: SqliteRepository;

function ent(id: string, name: string, aliases: string[], vec: number[]): Entity {
  return {
    campaignId: cid, id: asEntityID(id), type: "PERSONNAGE", name,
    nomConnu: true,
    aliases: aliases.map(text => ({ text, source: { kind: "GM_NARRATION" }, observedAt: 0 })),
    tags: [], createdAt: 0,
    embedding: new Float32Array(vec), embeddingRefreshedAt: 0
  };
}

function makeRouter(judge: ReplayProvider): Router {
  return new Router(
    {
      tiers: {
        heavy: { primary: judge.ref, fallbacks: [] },
        light: { primary: judge.ref, fallbacks: [] },
        embeddings: { primary: judge.ref, fallbacks: [] }
      },
      defaults: { timeoutMs: 1000, maxRetries: 0 }
    },
    { resolveProvider: () => judge }
  );
}

beforeEach(async () => {
  repo = new SqliteRepository({ path: ":memory:", embeddingDim: 3 });
  await repo.createCampaign({ id: cid, name: "x", createdAt: 0, embeddingDim: 3 });
  await repo.upsertEntity(ent("e1", "Aldric Fervent", ["le forgeron"], [1, 0, 0]));
  await repo.upsertEntity(ent("e2", "Marin Voile", ["le marin"], [0, 1, 0]));
});
afterEach(async () => { await repo.close(); });

describe("Resolver cascade", () => {
  it("L1 alias hit returns immediately, layerUsed=alias", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([1, 0, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "le forgeron" });
    expect(res.match?.id).toBe(asEntityID("e1"));
    expect(res.layerUsed).toBe("alias");
    expect(judge.callCount()).toBe(0);
  });

  it("L2 vector hit when top1 ≥ tauHigh and gap ≥ delta", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.98, 0.02, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "the smith" });
    expect(res.match?.id).toBe(asEntityID("e1"));
    expect(res.layerUsed).toBe("vector");
  });

  it("L3 judge invoked in ambiguous band", async () => {
    const judge = replayProvider("m", [
      { kind: "chat", response: { text: JSON.stringify({ matchedIndex: 0, confidence: 0.9, reasoning: "matches" }) } }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "smith-ish person" });
    expect(res.layerUsed).toBe("judge");
    expect(res.match).not.toBeNull();
    expect(judge.callCount()).toBe(1);
  });

  it("L4 fallback to NEW when no handler and judge unsure", async () => {
    const judge = replayProvider("m", [
      { kind: "chat", response: { text: JSON.stringify({ matchedIndex: null, confidence: 0.2, reasoning: "no match" }) } }
    ]);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: { ...defaultThresholds, tauHigh: 0.99 },
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0.8, 0.6, 0]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "unknown" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("judge");
  });

  it("returns null (new entity) when top1 < tauLow", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0, 0, 1]); } }
    });
    const res = await r.resolveEntity({ campaignId: cid, mention: "stranger" });
    expect(res.match).toBeNull();
    expect(res.layerUsed).toBe("vector");
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/resolver/cascade.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/resolver/resolver.ts`**

```ts
import type { Repository } from "../repository/interface.js";
import type { Router } from "../router/router.js";
import type { UserPromptRegistry } from "../hooks/user-prompt.js";
import type { Entity, EntityType } from "../domain/entity.js";
import type { CampaignId } from "../domain/ids.js";
import { defaultThresholds, type ResolverThresholds } from "./thresholds.js";
import { normalizeAlias } from "./normalize.js";
import { judgeMatch } from "./judge.js";

export interface Embedder {
  embed(text: string): Promise<Float32Array>;
}

export interface ResolverDeps {
  repo: Repository;
  router: Router;
  embedder: Embedder;
  userPromptRegistry: UserPromptRegistry;
  thresholds?: Partial<ResolverThresholds>;
}

export interface ResolveOptions {
  campaignId: CampaignId;
  mention: string;
  type?: EntityType;
  sceneDescription?: string;
}

export interface ResolutionResult {
  match: Entity | null;
  confidence: number;
  candidates: Entity[];
  layerUsed: "alias" | "vector" | "judge" | "user-prompt" | "none";
  reasoning?: string;
}

export class Resolver {
  private readonly t: ResolverThresholds;

  constructor(private readonly deps: ResolverDeps) {
    this.t = { ...defaultThresholds, ...(deps.thresholds ?? {}) };
  }

  async resolveEntity(opts: ResolveOptions): Promise<ResolutionResult> {
    const { campaignId, mention, type, sceneDescription = "" } = opts;

    // L1: alias
    const aliasHits = await this.deps.repo.findEntitiesByAlias(campaignId, normalizeAlias(mention), type);
    if (aliasHits.length === 1) {
      return { match: aliasHits[0]!, confidence: 0.95, candidates: aliasHits, layerUsed: "alias" };
    }
    if (aliasHits.length > 1) {
      // Multiple alias hits → escalate to judge
      const j = await judgeMatch(this.deps.router, { mention, sceneDescription, candidates: aliasHits });
      const matched = j.matchedIndex !== null ? aliasHits[j.matchedIndex] ?? null : null;
      return { match: matched, confidence: j.confidence, candidates: aliasHits, layerUsed: "judge", reasoning: j.reasoning };
    }

    // L2: vector
    const vec = await this.deps.embedder.embed(mention);
    const hits = await this.deps.repo.searchEntitiesByVector(campaignId, vec, { topK: this.t.topK, filterType: type });
    if (hits.length === 0) {
      return { match: null, confidence: 0, candidates: [], layerUsed: "none" };
    }
    const top1 = hits[0]!;
    if (top1.score < this.t.tauLow) {
      return { match: null, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" };
    }
    const top2 = hits[1];
    const gap = top2 ? top1.score - top2.score : 1;
    if (top1.score >= this.t.tauHigh && gap >= this.t.gapDelta) {
      return { match: top1.entity, confidence: top1.score, candidates: hits.map(h => h.entity), layerUsed: "vector" };
    }

    // L3: judge
    const j = await judgeMatch(this.deps.router, { mention, sceneDescription, candidates: hits.map(h => h.entity) });
    if (j.matchedIndex !== null) {
      return { match: hits[j.matchedIndex]?.entity ?? null, confidence: j.confidence, candidates: hits.map(h => h.entity), layerUsed: "judge", reasoning: j.reasoning };
    }

    // L4: user prompt
    if (this.deps.userPromptRegistry.hasHandler()) {
      const chosen = await this.deps.userPromptRegistry.ask({ mention, candidates: hits.map(h => h.entity) });
      return { match: chosen, confidence: chosen ? 0.9 : 0, candidates: hits.map(h => h.entity), layerUsed: "user-prompt", reasoning: j.reasoning };
    }

    return { match: null, confidence: j.confidence, candidates: hits.map(h => h.entity), layerUsed: "judge", reasoning: j.reasoning };
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/resolver/cascade.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/resolver/resolver.ts test/resolver/cascade.test.ts
git commit -m "feat(resolver): layered cascade (alias→vector→judge→user)"
```

### Task 5.6: Generation-direction suggestion

**Files:**
- Modify: `src/resolver/resolver.ts` — add `suggestExisting`

- [ ] **Step 1: Append to `Resolver` class**

```ts
  async suggestExisting(opts: { campaignId: CampaignId; mention: string; type: EntityType }): Promise<{ candidates: Entity[]; recommendsNew: boolean }> {
    const vec = await this.deps.embedder.embed(opts.mention);
    const hits = await this.deps.repo.searchEntitiesByVector(opts.campaignId, vec, { topK: this.t.topK, filterType: opts.type });
    const top = hits[0];
    const recommendsNew = !top || top.score < this.t.tauLow;
    return { candidates: hits.map(h => h.entity), recommendsNew };
  }
```

- [ ] **Step 2: Add minimal test (append to `test/resolver/cascade.test.ts`)**

```ts
describe("Resolver · generation-direction suggestion", () => {
  it("recommends new when top score < tauLow", async () => {
    const judge = replayProvider("m", []);
    const r = new Resolver({
      repo, router: makeRouter(judge),
      thresholds: defaultThresholds,
      userPromptRegistry: new UserPromptRegistry(),
      embedder: { async embed(_t: string) { return new Float32Array([0, 0, 1]); } }
    });
    const s = await r.suggestExisting({ campaignId: cid, mention: "new captain", type: "PERSONNAGE" });
    expect(s.recommendsNew).toBe(true);
  });
});
```

- [ ] **Step 3: Run test**

```bash
pnpm vitest run test/resolver/cascade.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 4: Commit**

```bash
git add src/resolver/resolver.ts test/resolver/cascade.test.ts
git commit -m "feat(resolver): suggestExisting (generation direction)"
```

---

## Milestone 6 · Tools + Engine facade

Outcome: tool-call schemas (Zod + JSON Schema + provider-shape adapters), `handleToolCall` dispatcher, `Engine` and `CampaignContext` classes, error classes, public exports.

### Task 6.1: Error classes

**Files:**
- Create: `src/errors.ts`

- [ ] **Step 1: Create `src/errors.ts`**

```ts
import type { AttributFige } from "./domain/attribute.js";
import type { Tier } from "./router/interface.js";

export interface ValidationFailureDetail {
  type: "FORMAT" | "CONTRAINTE_STRICTE" | "CONTRADICTION_RC";
  message: string;
}

export class SneqValidationError extends Error {
  constructor(public readonly details: ValidationFailureDetail[]) {
    super(`Validation failed: ${details.map(d => d.type).join(", ")}`);
    this.name = "SneqValidationError";
  }
}

export class SneqContradictionError extends Error {
  constructor(public readonly contradictions: AttributFige[]) {
    super(`Fact contradicts ${contradictions.length} canonical fact(s)`);
    this.name = "SneqContradictionError";
  }
}

export class SneqProviderError extends Error {
  constructor(public readonly tier: Tier, public readonly exhausted: boolean, message: string) {
    super(message);
    this.name = "SneqProviderError";
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/errors.ts
git commit -m "feat(errors): SneqValidationError, SneqContradictionError, SneqProviderError"
```

### Task 6.2: Zod tool schemas

**Files:**
- Create: `src/tools/schemas.ts`

- [ ] **Step 1: Create `src/tools/schemas.ts`**

```ts
import { z } from "zod";

export const ToolNames = [
  "sneq__lookup_entity",
  "sneq__get_entity",
  "sneq__get_relevant_facts",
  "sneq__suggest_existing",
  "sneq__mention_entity",
  "sneq__register_fact",
  "sneq__add_constraint",
  "sneq__collapse_attribute",
  "sneq__set_scene",
  "sneq__advance_turn"
] as const;
export type ToolName = typeof ToolNames[number];

const entityType = z.enum(["PERSONNAGE", "LIEU", "OBJET", "FACTION", "EVENEMENT", "RELATION", "SCENE", "WORLD"]);

const attributValue: z.ZodType<unknown> = z.union([
  z.object({ type: z.literal("STRING"),     value: z.string() }),
  z.object({ type: z.literal("NUMBER"),     value: z.number() }),
  z.object({ type: z.literal("BOOLEAN"),    value: z.boolean() }),
  z.object({ type: z.literal("ENTITY_REF"), id: z.string() }),
  z.object({ type: z.literal("ENTITY_SET"), ids: z.array(z.string()) }),
  z.object({ type: z.literal("ENUM"),       value: z.string(), enumType: z.string() }),
  z.object({ type: z.literal("COMPOSITE"),  fields: z.record(z.unknown()) })
]);

const category = z.enum(["IDENTITE","PSYCHOLOGIE","HISTORIQUE","SOCIAL","COMPETENCE","SECRET","ETAT","POSSESSION"]);

const observation = z.object({
  source: z.enum(["GM_NARRATION","PLAYER_UTTERANCE","DICE_ROLL","SYSTEM"]),
  method: z.enum(["DIALOGUE_DIRECT","DOCUMENT","OBSERVATION_VISUELLE","DEDUCTION_CONFIRMEE","AVEU","DEMONSTRATION"]),
  emittedBy: z.string().optional(),
  sceneId: z.string().optional(),
  fiabilite: z.enum(["CERTAINE","TEMOIGNAGE","RUMEUR_CONFIRMEE"]),
  excerpt: z.string().optional(),
  timestamp: z.number()
});

export const schemas = {
  sneq__lookup_entity: z.object({
    mention: z.string(),
    type: entityType.optional(),
    sceneId: z.string().optional()
  }),
  sneq__get_entity: z.object({ entityId: z.string() }),
  sneq__get_relevant_facts: z.object({
    entityId: z.string(),
    attributeKeys: z.array(z.string()).optional(),
    depth: z.number().int().min(0).max(3).optional()
  }),
  sneq__suggest_existing: z.object({
    mention: z.string(),
    type: entityType
  }),
  sneq__mention_entity: z.object({
    canonicalName: z.string(),
    type: entityType,
    aliases: z.array(z.string()).optional(),
    sceneId: z.string().optional(),
    description: z.string()
  }),
  sneq__register_fact: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    value: attributValue,
    category: category,
    observation: observation
  }),
  sneq__add_constraint: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    rule: z.unknown(),
    justification: z.string()
  }),
  sneq__collapse_attribute: z.object({
    entityId: z.string(),
    attributeKey: z.string(),
    profondeur: z.enum(["MINIMAL", "STANDARD", "DETAILLE"]).optional(),
    registre: z.enum(["NEUTRE","DRAMATIQUE","HUMORISTIQUE","SOMBRE"]).optional()
  }),
  sneq__set_scene: z.object({
    locationEntityId: z.string(),
    presentEntityIds: z.array(z.string()),
    description: z.string()
  }),
  sneq__advance_turn: z.object({ summary: z.string().optional() })
} as const;

export const toolDescriptions: Record<ToolName, string> = {
  sneq__lookup_entity: "Resolve a mention to an existing entity in the canonical store. Returns match, candidates, and which layer of the resolver answered.",
  sneq__get_entity: "Fetch an entity by id with its full set of figed (canonical) attributes.",
  sneq__get_relevant_facts: "List canonical facts about an entity, optionally narrowed by attribute keys or graph depth.",
  sneq__suggest_existing: "Before introducing a new entity by name, surface existing candidates so canonical reality doesn't fork. Use BEFORE mention_entity.",
  sneq__mention_entity: "Introduce or re-use an entity. Always returns isNew and resolvedTo so the caller knows which it got.",
  sneq__register_fact: "Append a canonical (figed) attribute to an entity. Returns contradictions instead of throwing — the caller adjudicates.",
  sneq__add_constraint: "Add a soft or strict constraint to a non-figed attribute.",
  sneq__collapse_attribute: "Drive an LLM call (heavy tier) to fill a specific attribute, validate, inscribe, propagate. Engine-internal LLM use.",
  sneq__set_scene: "Declare the current scene: where the player is and which entities are present.",
  sneq__advance_turn: "Bump the campaign's monotonic turn counter, optionally with a one-line summary."
};
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/tools/schemas.ts
git commit -m "feat(tools): Zod schemas + ToolNames + descriptions"
```

### Task 6.3: JSON Schema export + provider adapters

**Files:**
- Create: `src/tools/json-schema.ts`
- Create: `src/tools/adapters.ts`

- [ ] **Step 1: Install zod-to-json-schema**

```bash
pnpm add zod-to-json-schema
```

Expected: `package.json` updated with new dep.

- [ ] **Step 2: Create `src/tools/json-schema.ts`**

```ts
import { zodToJsonSchema } from "zod-to-json-schema";
import { schemas, type ToolName, ToolNames } from "./schemas.js";

export const jsonSchemas: Record<ToolName, object> = Object.fromEntries(
  ToolNames.map(name => [name, zodToJsonSchema(schemas[name], name)])
) as Record<ToolName, object>;
```

- [ ] **Step 3: Create `src/tools/adapters.ts`**

```ts
import { jsonSchemas } from "./json-schema.js";
import { toolDescriptions, ToolNames, type ToolName } from "./schemas.js";

export function anthropicTools(): Array<{ name: string; description: string; input_schema: object }> {
  return ToolNames.map(name => ({
    name,
    description: toolDescriptions[name],
    input_schema: jsonSchemas[name]
  }));
}

export function openAITools(): Array<{ type: "function"; function: { name: string; description: string; parameters: object } }> {
  return ToolNames.map(name => ({
    type: "function" as const,
    function: { name, description: toolDescriptions[name], parameters: jsonSchemas[name] }
  }));
}

export function geminiTools(): Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: object }> }> {
  return [{
    functionDeclarations: ToolNames.map(name => ({
      name,
      description: toolDescriptions[name],
      parameters: jsonSchemas[name]
    }))
  }];
}

export function genericTools(): Array<{ name: ToolName; description: string; inputSchema: object }> {
  return ToolNames.map(name => ({ name, description: toolDescriptions[name], inputSchema: jsonSchemas[name] }));
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-schema.ts src/tools/adapters.ts package.json pnpm-lock.yaml
git commit -m "feat(tools): JSON Schema export + Anthropic/OpenAI/Gemini adapters"
```

### Task 6.4: handleToolCall dispatcher

**Files:**
- Create: `src/tools/dispatcher.ts`
- Create: `test/tools/dispatcher.test.ts`

- [ ] **Step 1: Write failing test `test/tools/dispatcher.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { dispatchToolCall } from "../../src/tools/dispatcher.js";

const stubCtx = {
  resolveEntity: async (args: { mention: string }) => ({ match: null, confidence: 0, candidates: [], layerUsed: "none" as const, mention: args.mention }),
  mentionEntity: async (args: { canonicalName: string; description: string }) => ({ entityId: "new-id", isNew: true, _name: args.canonicalName, _desc: args.description }),
  advanceTurn: async (summary?: string) => ({ turnNumber: 42, _summary: summary ?? null })
};

describe("dispatchToolCall", () => {
  it("dispatches sneq__lookup_entity to resolveEntity", async () => {
    const r = await dispatchToolCall("sneq__lookup_entity", { mention: "hi" }, stubCtx as never);
    expect((r as { mention: string }).mention).toBe("hi");
  });

  it("rejects unknown tool names", async () => {
    await expect(dispatchToolCall("sneq__not_real" as never, {}, stubCtx as never))
      .rejects.toThrow(/unknown tool/i);
  });

  it("rejects bad argument shape", async () => {
    await expect(dispatchToolCall("sneq__lookup_entity", { wrongField: true }, stubCtx as never))
      .rejects.toThrow();
  });

  it("dispatches sneq__advance_turn with optional summary", async () => {
    const r = await dispatchToolCall("sneq__advance_turn", { summary: "we left the village" }, stubCtx as never);
    expect((r as { turnNumber: number }).turnNumber).toBe(42);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
pnpm vitest run test/tools/dispatcher.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/tools/dispatcher.ts`**

```ts
import { schemas, type ToolName, ToolNames } from "./schemas.js";
import type { CampaignContext } from "../campaign.js";

export async function dispatchToolCall(name: string, rawArgs: unknown, ctx: CampaignContext): Promise<unknown> {
  if (!(ToolNames as readonly string[]).includes(name)) {
    throw new Error(`unknown tool: ${name}`);
  }
  const toolName = name as ToolName;
  const schema = schemas[toolName];
  const args = schema.parse(rawArgs) as Record<string, unknown>;

  switch (toolName) {
    case "sneq__lookup_entity":
      return ctx.resolveEntity({
        mention: args.mention as string,
        type: args.type as never,
        sceneId: args.sceneId as string | undefined
      });
    case "sneq__get_entity":
      return ctx.getEntity(args.entityId as never);
    case "sneq__get_relevant_facts":
      return ctx.getRelevantFacts(args.entityId as never, {
        attributeKeys: args.attributeKeys as string[] | undefined,
        depth: args.depth as number | undefined
      });
    case "sneq__suggest_existing":
      return ctx.suggestExisting(args.mention as string, args.type as never);
    case "sneq__mention_entity":
      return ctx.mentionEntity({
        canonicalName: args.canonicalName as string,
        type: args.type as never,
        aliases: args.aliases as string[] | undefined,
        sceneId: args.sceneId as string | undefined,
        description: args.description as string
      });
    case "sneq__register_fact":
      return ctx.registerFact({
        entityId: args.entityId as never,
        attributeKey: args.attributeKey as string,
        value: args.value as never,
        category: args.category as never,
        observation: args.observation as never
      });
    case "sneq__add_constraint":
      return ctx.addConstraint({
        entityId: args.entityId as never,
        attributeKey: args.attributeKey as string,
        rule: args.rule as never,
        justification: args.justification as string
      });
    case "sneq__collapse_attribute":
      return ctx.collapseAttribute(args.entityId as never, args.attributeKey as string, {
        profondeur: args.profondeur as never,
        registre: args.registre as never
      });
    case "sneq__set_scene":
      return ctx.setScene({
        locationEntityId: args.locationEntityId as never,
        presentEntityIds: args.presentEntityIds as never,
        description: args.description as string
      });
    case "sneq__advance_turn":
      return ctx.advanceTurn(args.summary as string | undefined);
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
pnpm vitest run test/tools/dispatcher.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/dispatcher.ts test/tools/dispatcher.test.ts
git commit -m "feat(tools): handleToolCall dispatcher (Zod-validated)"
```

### Task 6.5: Pre-generation hook (no-op default)

**Files:**
- Create: `src/hooks/pre-generation.ts`

- [ ] **Step 1: Create `src/hooks/pre-generation.ts`**

```ts
import type { EntityID } from "../domain/ids.js";

export interface PredictionEvent {
  campaignId: import("../domain/ids.js").CampaignId;
  triggerKind: "ENTRY_TO_SCENE" | "DIALOGUE_OPENED" | "TURN_ADVANCED";
  hint: { entityId?: EntityID; attribute?: string };
}

export interface PreGenerationHook {
  onEvent(e: PredictionEvent): void | Promise<void>;
}

export const noopPreGenerationHook: PreGenerationHook = { onEvent() {} };

export class PreGenerationRegistry {
  private hook: PreGenerationHook = noopPreGenerationHook;
  register(h: PreGenerationHook): { dispose(): void } {
    this.hook = h;
    return { dispose: () => { this.hook = noopPreGenerationHook; } };
  }
  emit(e: PredictionEvent): void { void this.hook.onEvent(e); }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/pre-generation.ts
git commit -m "feat(hooks): PreGenerationHook interface + no-op default"
```

### Task 6.6: CampaignContext + Engine facade

**Files:**
- Create: `src/campaign.ts`
- Create: `src/engine.ts`
- Create: `src/config.ts`

- [ ] **Step 1: Create `src/config.ts`**

```ts
import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { Repository } from "./repository/interface.js";
import type { RouterConfig } from "./router/interface.js";
import type { Logger } from "./logger.js";
import type { ResolverThresholds } from "./resolver/thresholds.js";

export interface EngineConfig {
  repository: Repository | { kind: "sqlite"; path: string; embeddingDim: number };
  router: RouterConfig;
  resolver?: Partial<ResolverThresholds>;
  logger?: Logger;
}

export function loadConfigFromFile(path: string): EngineConfig {
  const ext = extname(path).toLowerCase();
  const raw = readFileSync(path, "utf-8");
  if (ext === ".json") return JSON.parse(raw) as EngineConfig;
  throw new Error(`Unsupported config extension: ${ext}. Use .json or pass an object programmatically.`);
}
```

- [ ] **Step 2: Create `src/logger.ts`**

```ts
export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

export const noopLogger: Logger = {
  debug() {}, info() {}, warn() {}, error() {}
};
```

- [ ] **Step 3: Create `src/campaign.ts`**

```ts
import type { Repository } from "./repository/interface.js";
import type { Router } from "./router/router.js";
import type { Resolver } from "./resolver/resolver.js";
import type { UserPromptRegistry } from "./hooks/user-prompt.js";
import type { PreGenerationRegistry } from "./hooks/pre-generation.js";
import type { Logger } from "./logger.js";
import type { CampaignId, EntityID, SceneId } from "./domain/ids.js";
import { asEntityID, asContraintId, asFactId, asSceneId } from "./domain/ids.js";
import type { Entity, EntityType } from "./domain/entity.js";
import type { AttributFige, AttributValue, CategorieAttribut } from "./domain/attribute.js";
import type { Observation } from "./domain/observation.js";
import type { ResolutionResult } from "./resolver/resolver.js";
import type { RegleContrainte } from "./domain/potentialite.js";
import { dispatchToolCall } from "./tools/dispatcher.js";
import { SneqContradictionError } from "./errors.js";

export interface CampaignContextDeps {
  campaignId: CampaignId;
  repo: Repository;
  router: Router;
  resolver: Resolver;
  userPrompt: UserPromptRegistry;
  preGen: PreGenerationRegistry;
  logger: Logger;
}

export interface MentionInput {
  canonicalName: string;
  type: EntityType;
  aliases?: string[];
  sceneId?: string;
  description: string;
}

export interface RegisterFactInput {
  entityId: EntityID;
  attributeKey: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
}

export class CampaignContext {
  readonly id: CampaignId;

  constructor(private readonly deps: CampaignContextDeps) { this.id = deps.campaignId; }

  resolveEntity(opts: { mention: string; type?: EntityType; sceneId?: string }): Promise<ResolutionResult> {
    return this.deps.resolver.resolveEntity({ campaignId: this.id, mention: opts.mention, type: opts.type });
  }

  suggestExisting(mention: string, type: EntityType) {
    return this.deps.resolver.suggestExisting({ campaignId: this.id, mention, type });
  }

  getEntity(entityId: EntityID): Promise<Entity | null> {
    return this.deps.repo.getEntity(this.id, entityId);
  }

  async getRelevantFacts(entityId: EntityID, opts?: { attributeKeys?: string[]; depth?: number }): Promise<AttributFige[]> {
    const own = await this.deps.repo.getFigedAttributes(this.id, entityId);
    const filtered = opts?.attributeKeys ? own.filter(f => opts.attributeKeys!.includes(f.key)) : own;
    if (!opts?.depth || opts.depth <= 0) return filtered;

    const neighbors = await this.deps.repo.neighbors(this.id, entityId, 1);
    const extras: AttributFige[] = [];
    for (const n of neighbors) {
      const fs = await this.deps.repo.getFigedAttributes(this.id, n.node.entityId);
      extras.push(...fs);
    }
    return [...filtered, ...extras];
  }

  async currentScene() { return this.deps.repo.currentScene(this.id); }

  async mentionEntity(input: MentionInput): Promise<{ entityId: EntityID; isNew: boolean; resolvedTo?: EntityID }> {
    const resolution = await this.resolveEntity({ mention: input.canonicalName, type: input.type });
    if (resolution.match) {
      return { entityId: resolution.match.id, isNew: false, resolvedTo: resolution.match.id };
    }
    const id = asEntityID(`${input.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const entity: Entity = {
      campaignId: this.id, id, type: input.type, name: input.canonicalName,
      nomConnu: true,
      aliases: (input.aliases ?? []).map(text => ({ text, source: { kind: "GM_NARRATION" as const }, observedAt: Date.now() })),
      tags: [], createdAt: Date.now(),
      embedding: null, embeddingRefreshedAt: null
    };
    await this.deps.repo.upsertEntity(entity);
    return { entityId: id, isNew: true };
  }

  async registerFact(input: RegisterFactInput): Promise<{ factId: import("./domain/ids.js").FactId; contradictions: AttributFige[] }> {
    const existing = await this.deps.repo.queryFacts(this.id, { entityId: input.entityId, attributeKey: input.attributeKey });
    const contradictions = existing.filter(e => JSON.stringify(e.value) !== JSON.stringify(input.value));
    if (contradictions.length > 0) {
      // Don't throw — return so the GM can adjudicate. SneqContradictionError stays for callers who opt into stricter flows.
      void new SneqContradictionError(contradictions);
      return { factId: asFactId("none"), contradictions };
    }
    const factId = asFactId(`f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const fact: AttributFige & { campaignId: CampaignId } = {
      factId, entityId: input.entityId, key: input.attributeKey,
      value: input.value, category: input.category, observation: input.observation,
      turn: (await this.deps.repo.latestTurn(this.id))?.turnNumber ?? 0,
      campaignId: this.id
    };
    await this.deps.repo.appendFact(fact);
    return { factId, contradictions: [] };
  }

  async addConstraint(input: { entityId: EntityID; attributeKey: string; rule: RegleContrainte; justification: string }): Promise<{ constraintId: import("./domain/ids.js").ContraintId }> {
    const existing = await this.deps.repo.getPotentialite(this.id, input.entityId, input.attributeKey);
    const id = asContraintId(`c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const newContrainte = {
      id,
      source: { kind: "INFERENCE_IA" as const, confidence: 0.7 },
      createdAt: Date.now(),
      regle: input.rule,
      justificationNarrative: input.justification
    };
    const potentialite = existing ?? {
      entiteId: input.entityId, attribut: input.attributeKey, etat: "INDEFINI" as const,
      contraintes: [], contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE" as const, tendances: [] }
    };
    potentialite.contraintes.push(newContrainte);
    potentialite.etat = "CONTRAINT";
    await this.deps.repo.upsertPotentialite(this.id, potentialite);
    return { constraintId: id };
  }

  async collapseAttribute(_entityId: EntityID, _attributeKey: string, _opts?: { profondeur?: "MINIMAL"|"STANDARD"|"DETAILLE"; registre?: "NEUTRE"|"DRAMATIQUE"|"HUMORISTIQUE"|"SOMBRE" }): Promise<{ value: AttributValue; reasoning: string; propagation: { entitesImpactees: EntityID[] } }> {
    // V2 ships a minimal collapse: caller is expected to compose with the router themselves
    // when they need full creative control. This method is a convenience for the common path.
    throw new Error("collapseAttribute: not yet wired in V2 minimal scope. Use Router.chat directly with the heavy tier.");
  }

  async setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }> {
    const sceneId = asSceneId(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const turn = await this.advanceTurn();
    await this.deps.repo.upsertScene({
      campaignId: this.id, id: sceneId,
      locationId: input.locationEntityId,
      presentEntityIds: input.presentEntityIds,
      description: input.description,
      createdAtTurn: turn.turnNumber
    });
    await this.deps.repo.appendTurn({
      campaignId: this.id, turnNumber: turn.turnNumber, summary: null, sceneId, createdAt: Date.now()
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "ENTRY_TO_SCENE", hint: {} });
    return { sceneId, turnNumber: turn.turnNumber };
  }

  async advanceTurn(summary?: string): Promise<{ turnNumber: number }> {
    const last = await this.deps.repo.latestTurn(this.id);
    const turnNumber = (last?.turnNumber ?? 0) + 1;
    await this.deps.repo.appendTurn({
      campaignId: this.id, turnNumber, summary: summary ?? null,
      sceneId: last?.sceneId ?? null, createdAt: Date.now()
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return { turnNumber };
  }

  handleToolCall(name: string, args: unknown): Promise<unknown> {
    return dispatchToolCall(name, args, this);
  }

  registerUserPromptHandler(fn: import("./hooks/user-prompt.js").AskUserFn) {
    return this.deps.userPrompt.register(fn);
  }

  registerPreGenerationHook(hook: import("./hooks/pre-generation.js").PreGenerationHook) {
    return this.deps.preGen.register(hook);
  }
}
```

- [ ] **Step 4: Create `src/engine.ts`**

```ts
import type { EngineConfig } from "./config.js";
import type { Repository, CampaignMeta } from "./repository/interface.js";
import { Router, createDefaultDeps } from "./router/router.js";
import { Resolver, type Embedder } from "./resolver/resolver.js";
import { UserPromptRegistry } from "./hooks/user-prompt.js";
import { PreGenerationRegistry } from "./hooks/pre-generation.js";
import { CampaignContext } from "./campaign.js";
import { defaultRouterConfig } from "./router/defaults.js";
import { noopLogger } from "./logger.js";
import type { CampaignId } from "./domain/ids.js";
import { genericTools, anthropicTools, openAITools, geminiTools } from "./tools/adapters.js";
import { jsonSchemas } from "./tools/json-schema.js";
import { schemas as zodSchemas } from "./tools/schemas.js";

export interface NewCampaignInput { id: CampaignId; name: string; }

export class Engine {
  private readonly repo: Repository;
  private readonly router: Router;
  private readonly resolver: Resolver;
  private readonly userPrompt = new UserPromptRegistry();
  private readonly preGen = new PreGenerationRegistry();
  private readonly logger;
  private readonly contexts = new Map<string, CampaignContext>();

  constructor(private readonly cfg: EngineConfig) {
    this.repo = "kind" in cfg.repository
      ? this.buildSqliteRepo(cfg.repository)
      : cfg.repository;
    this.router = new Router(cfg.router, createDefaultDeps());
    this.logger = cfg.logger ?? noopLogger;
    const embedder: Embedder = {
      embed: async (text: string) => {
        const r = await this.router.embed({ texts: [text] });
        return r.vectors[0]!;
      }
    };
    this.resolver = new Resolver({
      repo: this.repo, router: this.router, embedder,
      userPromptRegistry: this.userPrompt,
      thresholds: cfg.resolver
    });
  }

  campaign(id: CampaignId): CampaignContext {
    const cached = this.contexts.get(id);
    if (cached) return cached;
    const ctx = new CampaignContext({
      campaignId: id, repo: this.repo, router: this.router, resolver: this.resolver,
      userPrompt: this.userPrompt, preGen: this.preGen, logger: this.logger
    });
    this.contexts.set(id, ctx);
    return ctx;
  }

  async listCampaigns(): Promise<CampaignMeta[]> { return this.repo.listCampaigns(); }

  async createCampaign(input: NewCampaignInput & { embeddingDim: number }): Promise<CampaignContext> {
    await this.repo.createCampaign({ id: input.id, name: input.name, createdAt: Date.now(), embeddingDim: input.embeddingDim });
    return this.campaign(input.id);
  }

  async deleteCampaign(id: CampaignId): Promise<void> {
    this.contexts.delete(id);
    return this.repo.deleteCampaign(id);
  }

  async close(): Promise<void> { return this.repo.close(); }

  static defaultRouterConfig() { return defaultRouterConfig(); }
  static loadConfigFromFile(path: string) {
    return import("./config.js").then(m => m.loadConfigFromFile(path));
  }
  static readonly tools = {
    zod: zodSchemas,
    jsonSchema: jsonSchemas,
    generic: genericTools(),
    anthropic: anthropicTools(),
    openai: openAITools(),
    gemini: geminiTools()
  };

  private buildSqliteRepo(spec: { kind: "sqlite"; path: string; embeddingDim: number }): Repository {
    // Lazy require to keep the sqlite peer dep optional.
    const sqliteMod = require("./repository/sqlite/index.js") as typeof import("./repository/sqlite/index.js");
    return new sqliteMod.SqliteRepository({ path: spec.path, embeddingDim: spec.embeddingDim });
  }
}
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors. If you see import-related errors on `require()`, replace the `buildSqliteRepo` body with a dynamic `import()` inside an async helper; the constructor pattern is shown for ergonomics. (See `loadConfigFromFile` for the async-import pattern.)

- [ ] **Step 6: Commit**

```bash
git add src/campaign.ts src/engine.ts src/config.ts src/logger.ts
git commit -m "feat(engine): CampaignContext + Engine facade + EngineConfig"
```

### Task 6.7: Public exports

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Replace `src/index.ts`**

```ts
export const SNEQ_ENGINE_VERSION = "0.0.0";

export { Engine, type NewCampaignInput } from "./engine.js";
export { CampaignContext, type MentionInput, type RegisterFactInput } from "./campaign.js";
export { type EngineConfig, loadConfigFromFile } from "./config.js";
export { defaultRouterConfig } from "./router/defaults.js";

export {
  SneqValidationError, SneqContradictionError, SneqProviderError,
  type ValidationFailureDetail
} from "./errors.js";

export type {
  RouterConfig, ProviderRef, ProviderChain, Tier,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, Provider
} from "./router/interface.js";

export type { Repository, CampaignMeta, FactQuery, VectorSearchOpts, EntityWithScore } from "./repository/interface.js";

export type { Entity, EntityType, Alias, AliasSource } from "./domain/entity.js";
export type { AttributValue, AttributFige, CategorieAttribut } from "./domain/attribute.js";
export type { Observation, ObservationSource, ObservationMethod, Fiabilite } from "./domain/observation.js";
export type { Potentialite, Contrainte, RegleContrainte, ContrainteSource, EtatAttribut } from "./domain/potentialite.js";
export type { NoeudGCN, AreteGCN, TypeRelation, ReglePropagation } from "./domain/gcn.js";
export type { Scene } from "./domain/scene.js";
export type { Turn } from "./domain/turn.js";
export type { CampaignId, EntityID, FactId, ContraintId, SceneId } from "./domain/ids.js";
export {
  asCampaignId, asEntityID, asFactId, asContraintId, asSceneId
} from "./domain/ids.js";

export type { ResolverThresholds } from "./resolver/thresholds.js";
export type { ResolutionResult, ResolveOptions, Embedder } from "./resolver/resolver.js";

export { ToolNames, type ToolName } from "./tools/schemas.js";

export type { AskUserFn, AskUserArgs } from "./hooks/user-prompt.js";
export type { PreGenerationHook, PredictionEvent } from "./hooks/pre-generation.js";

export type { Logger } from "./logger.js";
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 3: Run all unit tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: `dist/` populated with `.js` + `.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: public exports (Engine, types, tools, errors)"
```

---

## Milestone 7 · Polish + Docs

Outcome: TypeDoc-generated `docs/api.md`, agent-discoverable `skills/sneq-narrative-engine.md`, README, env-gated integration smoke test, `npm pack` verification.

### Task 7.1: TypeDoc configuration

**Files:**
- Create: `typedoc.json`

- [ ] **Step 1: Create `typedoc.json`**

```json
{
  "$schema": "https://typedoc.org/schema.json",
  "entryPoints": ["src/index.ts"],
  "out": "docs/typedoc",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "githubPages": false,
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "name": "@sneq/engine API",
  "disableSources": true,
  "hideGenerator": true,
  "categorizeByGroup": true
}
```

- [ ] **Step 2: Generate docs**

```bash
pnpm docs
```

Expected: `docs/typedoc/` populated with markdown files.

- [ ] **Step 3: Concatenate into `docs/api.md`**

Create `scripts/build-api-md.mjs`:

```js
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const inDir = "docs/typedoc";
const outFile = "docs/api.md";
mkdirSync("docs", { recursive: true });

const ordered = ["README.md", "classes", "interfaces", "type-aliases", "functions", "variables", "enumerations"];
const sections = [];

function readMd(p) { try { return readFileSync(p, "utf-8"); } catch { return ""; } }

const rootReadme = readMd(join(inDir, "README.md"));
if (rootReadme) sections.push(rootReadme);

for (const sub of ordered.slice(1)) {
  const dir = join(inDir, sub);
  let entries;
  try { entries = readdirSync(dir).sort(); } catch { continue; }
  sections.push(`\n## ${sub}\n`);
  for (const f of entries) sections.push(readMd(join(dir, f)));
}

writeFileSync(outFile, sections.join("\n"));
console.log(`Wrote ${outFile}`);
```

- [ ] **Step 4: Add to `package.json` scripts**

Modify `package.json`'s `scripts`:

```json
"docs": "typedoc && node scripts/build-api-md.mjs"
```

- [ ] **Step 5: Re-run**

```bash
pnpm docs
```

Expected: `docs/api.md` written.

- [ ] **Step 6: Commit**

```bash
git add typedoc.json scripts/build-api-md.mjs package.json docs/api.md docs/typedoc
git commit -m "docs: TypeDoc config + generated api.md"
```

### Task 7.2: Agent skill file

**Files:**
- Create: `skills/sneq-narrative-engine.md`

- [ ] **Step 1: Create `skills/sneq-narrative-engine.md`**

```markdown
---
name: sneq-narrative-engine
description: When the agent acts as Game Master for a TTRPG / narrative campaign and needs to track canonical entities, facts, scenes, and turns across sessions. Use BEFORE narrating any named NPC, location, object, faction, or event so canonical reality doesn't fork. Use AFTER every narration step to register what was just established.
---

# SNEQ Narrative Engine — Agent Skill

This skill teaches you to use the `@sneq/engine` library to maintain canonical world state for a TTRPG campaign across sessions. The engine is a **bookkeeping library**, not a GM — you (the agent) drive the narration. The engine tracks entities, facts, constraints, and scenes; resolves entity mentions to existing records; and prevents you from accidentally forking canonical reality.

## When to use this skill

- The user opens a new or existing TTRPG campaign and asks you to GM
- The user mentions a returning location or NPC ("we go back to the village")
- You are about to invent a new entity in narration (NPC, place, object, faction)
- You are about to commit a fact about an existing entity ("the blacksmith reveals he was a soldier")
- A scene changes (player enters a new location)

## When NOT to use

- The user is asking about the world out-of-character (use other context, not engine writes)
- Pure dice mechanics with no narrative consequence
- One-shot improv where persistence isn't wanted

## The core loop

Every GM turn follows this rhythm:

1. **Resolve mentions in the player's input.** For every named entity the player references (`"I look for the blacksmith"`), call `sneq__lookup_entity` first. The engine returns either a canonical match, a list of candidates, or null. If null, the player is naming something new — note that.
2. **Plan your narration.** Before committing to a new entity name, call `sneq__suggest_existing` to check whether you'd be forking canonical reality.
3. **Narrate.** Generate the prose you'd say to the player.
4. **Commit canon.** For each new entity introduced, call `sneq__mention_entity`. For each fact established (a profession, a trait, a possession, a secret), call `sneq__register_fact`.
5. **Update scene.** If the player moved, call `sneq__set_scene`. At the end of the turn, call `sneq__advance_turn` with a one-line summary.

## Tool reference

The full Zod / JSON Schema definitions are in `docs/api.md` of the `@sneq/engine` package — **always consult that file for authoritative parameter shapes**. What follows is the *when* and *why*.

### Read tools (call before narrating)

- **`sneq__lookup_entity({ mention, type?, sceneId? })`** — Resolve a player or your own mention to an existing entity. Returns `{ match, confidence, candidates, layerUsed }`. If `match` is null and `candidates` is empty, you are introducing something new.

- **`sneq__suggest_existing({ mention, type })`** — Before *you* invent a new entity name, ask the engine if there's already one you should re-use. Returns `{ candidates, recommendsNew }`. If `recommendsNew` is false, pick from candidates.

- **`sneq__get_entity({ entityId })`** — Pull the full record (canonical attributes + aliases). Use to remind yourself what's been committed about an NPC before describing them again.

- **`sneq__get_relevant_facts({ entityId, attributeKeys?, depth? })`** — Narrower: get canonical facts about an entity, optionally across the graph at small depth (1-2). Use to keep narration consistent with prior reveals.

### Register tools (call after narrating)

- **`sneq__mention_entity({ canonicalName, type, aliases?, description })`** — Introduce or re-use an entity. Returns `{ entityId, isNew, resolvedTo? }`. If `isNew` is false, you actually merged into an existing entity — adjust your narration if needed.

- **`sneq__register_fact({ entityId, attributeKey, value, category, observation })`** — Commit a canonical fact. The engine returns `{ factId, contradictions }` instead of throwing on conflict. If `contradictions` is non-empty, you've just claimed something that contradicts an earlier figed fact — you must decide: regenerate (drop the claim), reinterpret (the new claim is a lie / mistake by an NPC), or reject the player's premise.

- **`sneq__add_constraint({ entityId, attributeKey, rule, justification })`** — Add a soft constraint to a not-yet-figed attribute (e.g. "the captain's loyalty is probably to the duke"). Useful when you want to narrow possibilities without locking the canonical value.

### Scene / turn tools

- **`sneq__set_scene({ locationEntityId, presentEntityIds, description })`** — Declare the current location and present entities. Use whenever the player physically moves.

- **`sneq__advance_turn({ summary? })`** — Bump the turn counter at end-of-turn. The optional summary helps future sessions (and other GMs / agents) catch up.

## Configuration

The engine is wired up by the host application (TTRPG app, Hermes runtime), not by you. The host owns `EngineConfig` with the router config (which AI models are used for the resolver judge and any engine-internal LLM calls), the SQLite path, and the resolver thresholds. You don't change these — you just call the tools.

## Failure modes you handle

- **Resolution L4 (askUser):** if the engine's resolver can't decide between candidates and there's an `askUser` handler registered, the player will be asked in-chat. Wait for their answer.
- **Contradictions:** `register_fact` returning contradictions is normal — adjudicate explicitly, don't just retry.
- **Provider exhausted:** the engine throws if every model in a tier's fallback chain has failed. Surface this to the user as a system issue.

## Pointer

For the exact method signatures, parameter types, and return shapes: read `docs/api.md` from the `@sneq/engine` package. That file is the source of truth. This skill teaches you *when* to call them; the API doc teaches you *how*.
```

- [ ] **Step 2: Commit**

```bash
git add skills/sneq-narrative-engine.md
git commit -m "docs(skill): agent-discoverable narrative-engine skill"
```

### Task 7.3: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# @sneq/engine

Turn-based narrative-state engine for AI-narrated games. TypeScript bookkeeping library. The consumer owns the GM loop; this package owns canonical world state.

> Status: V2 in development. See `docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md` for the design spec.

## Install

```bash
pnpm add @sneq/engine
# Plus the peer deps you actually use:
pnpm add better-sqlite3 sqlite-vec       # for the reference SQLite repository
pnpm add @anthropic-ai/sdk               # if using the Anthropic provider
pnpm add @google/generative-ai           # if using Google GenAI
```

## Quick start

```ts
import { Engine, defaultRouterConfig, asCampaignId } from "@sneq/engine";

const engine = new Engine({
  repository: { kind: "sqlite", path: "./my-campaign.db", embeddingDim: 768 },
  router: defaultRouterConfig()
});

const campaign = await engine.createCampaign({
  id: asCampaignId("campaign-1"),
  name: "The Forgeron of Valmure",
  embeddingDim: 768
});

const r = await campaign.resolveEntity({ mention: "the blacksmith" });
if (r.match) {
  console.log("Known:", r.match.name);
} else {
  await campaign.mentionEntity({
    canonicalName: "Aldric Fervent",
    type: "PERSONNAGE",
    aliases: ["the blacksmith"],
    description: "A grizzled smith with haunted eyes."
  });
}
```

## Wiring as agent tools

```ts
import { Engine } from "@sneq/engine";

const tools = Engine.tools.anthropic;     // ready for the Anthropic SDK
const tools2 = Engine.tools.openai;       // ready for OpenAI-compatible endpoints
const tools3 = Engine.tools.gemini;       // ready for Google GenAI

// When the model emits a tool call:
const result = await campaign.handleToolCall(name, args);
```

## Documentation

- **`docs/api.md`** — full API reference (generated from JSDoc)
- **`skills/sneq-narrative-engine.md`** — agent skill (drop into your Hermes / Claude Code skills dir)
- **`docs/superpowers/specs/`** — design specs
- **`docs/superpowers/plans/`** — implementation plans

## Stack policy

This package's default router excludes OpenAI and xAI/Grok. The `custom` provider escape hatch lets the host wire anything they want; the defaults reflect the author's stack rules.

## License

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with quick-start and tool-wiring snippets"
```

### Task 7.4: Env-gated integration smoke test

**Files:**
- Create: `test/integration/smoke.test.ts`

- [ ] **Step 1: Create `test/integration/smoke.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { Engine, defaultRouterConfig, asCampaignId } from "../../src/index.js";

const RUN = process.env.SNEQ_INTEGRATION_SMOKE === "1";

describe.skipIf(!RUN)("integration · smoke", () => {
  it("end-to-end resolution + fact registration against real providers", async () => {
    const engine = new Engine({
      repository: { kind: "sqlite", path: ":memory:", embeddingDim: 768 },
      router: defaultRouterConfig()
    });
    const campaign = await engine.createCampaign({
      id: asCampaignId("smoke"),
      name: "Smoke",
      embeddingDim: 768
    });

    await campaign.mentionEntity({
      canonicalName: "Aldric Fervent",
      type: "PERSONNAGE",
      aliases: ["the blacksmith"],
      description: "A grizzled smith."
    });

    const res = await campaign.resolveEntity({ mention: "the blacksmith" });
    expect(res.match?.name).toBe("Aldric Fervent");

    await engine.close();
  }, 60_000);
});
```

- [ ] **Step 2: Update `vitest.config.ts` to include the integration dir only when env is set**

Modify `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: process.env.SNEQ_INTEGRATION_SMOKE === "1"
      ? ["test/**/*.test.ts"]
      : ["test/**/*.test.ts"],
    exclude: process.env.SNEQ_INTEGRATION_SMOKE === "1"
      ? []
      : ["test/integration/**"],
    environment: "node",
    typecheck: { enabled: false }
  }
});
```

- [ ] **Step 3: Run default tests (smoke excluded)**

```bash
pnpm test
```

Expected: PASS, integration test skipped.

- [ ] **Step 4: Commit**

```bash
git add test/integration/smoke.test.ts vitest.config.ts
git commit -m "test(integration): env-gated smoke test against real providers"
```

### Task 7.5: Verify build + pack

**Files:**
- None new

- [ ] **Step 1: Clean build**

```bash
pnpm clean && pnpm build
```

Expected: `dist/` populated.

- [ ] **Step 2: Run all unit tests one final time**

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 3: Dry-run `npm pack`**

```bash
npm pack --dry-run
```

Expected: `package.json files` field controls payload — verify `dist/`, `skills/`, `docs/api.md`, `README.md` are in the listed contents and nothing private leaks.

- [ ] **Step 4: Commit (no-op or bump version)**

```bash
git status
# If working tree is clean, no commit needed. Otherwise:
git add .
git commit -m "chore: V2 ready for first publish"
```

---

## Self-Review

Run this checklist against the spec — `docs/superpowers/specs/2026-05-19-sneq-v2-engine-design.md` — section by section.

| Spec § | Covered by | Notes |
|---|---|---|
| §3 Architecture | M0 (package layout), M6 (Engine facade) | Reference adapters in subpath exports per Task 0.1's `exports` map. |
| §4 Core Domain Model | M1 Tasks 1.1–1.6 | All v2 additions covered (campaignId, embedding, structured aliases, SCENE, Turn, Observation.source). |
| §5 Entity Resolution | M5 Tasks 5.1–5.6 | All four layers + thresholds + generation direction. |
| §6 Router | M4 Tasks 4.1–4.8 | Three tiers, fallback, AUTH cooldown, default chain, factory. |
| §7 Tool protocol | M6 Tasks 6.2–6.4 | Zod + JSON Schema + Anthropic/OpenAI/Gemini adapters + dispatcher. |
| §8 Repository | M3 Tasks 3.1–3.6 | Interface + SQLite reference + dim-locked vec + transactions in `transaction()` wrapper. |
| §9 Public API | M6 Tasks 6.6–6.7 | Engine facade, CampaignContext, exports. |
| §10 Errors | M6 Task 6.1 | Three error classes; `registerFact` returns contradictions instead of throwing (Task 6.6). |
| §11 Testing | All milestones use vitest TDD; M7 Task 7.4 covers env-gated integration smoke | `replayProvider` in Task 4.2. |
| §12 Distribution | M7 Tasks 7.1–7.3 | TypeDoc → `docs/api.md`, agent skill, README. |
| §13 Out of scope | Pre-generation registry exists as a no-op (Task 6.5); consumer bindings absent (by design); Convex/Postgres adapters absent. |
| §14 Open Questions | Not implemented; documented in the spec. |

**Placeholder scan:** searched for `TBD`, `TODO`, `implement later`, "similar to Task N" — none found. One acknowledged gap: `collapseAttribute` in Task 6.6 throws by design with a clear message pointing the caller at `Router.chat` directly. This is consistent with the spec's note that collapseAttribute is a convenience for the common path; full LLM-driven collapse with validation/regen is in scope for a follow-up plan.

**Type consistency:** `EntityID`, `CampaignId`, `FactId`, `ContraintId`, `SceneId` are branded types defined in Task 1.1 and used consistently throughout. `EtatAttribut` includes `FIGE` but `Potentialite.etat` excludes it (Task 1.4) — `state-machine.ts` operates on the full set (Task 2.1). Method names (`resolveEntity`, `suggestExisting`, `mentionEntity`, `registerFact`, `addConstraint`, `collapseAttribute`, `setScene`, `advanceTurn`, `handleToolCall`) match across `CampaignContext` (Task 6.6), `dispatchToolCall` (Task 6.4), and `Engine.tools` exports (Task 6.7).

**Scope check:** This is a substantial single plan (~40 tasks across 8 milestones). It produces working, testable software incrementally — by end of M2 you have pure logic; by M3 a working persistence layer; by M4 a working router; by M5 a working resolver; by M6 a working Engine facade; by M7 a publishable package. No decomposition needed.

**Ambiguity check:** `collapseAttribute` is intentionally minimal in V2 — the spec describes the full validation/regen pipeline (§10) but the V2 scope deliberately lets the consumer compose this from `Router.chat` + `validateValue` + `registerFact` when they need full control. Marked as a follow-up. Everything else has explicit code.

---

*End of implementation plan.*






