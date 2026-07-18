import type { AttributFige } from "../domain/attribute.js";
import type { AreteGCN, ReglePropagation } from "../domain/gcn.js";
import type { CampaignId, EntityID } from "../domain/ids.js";
import type { Contrainte } from "../domain/potentialite.js";
import { asConstraintId } from "../domain/ids.js";

export interface PropagationInput {
  fact: AttributFige;
  campaignId: CampaignId;
  edges: ReadonlyArray<AreteGCN>;
  rules: ReadonlyArray<ReglePropagation>;
  maxDepth: number;
  minForce: number;
  createdAt?: number;
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
  const { fact, edges, rules, maxDepth, minForce } = input;
  const applicableRules = rules.filter(r => ruleMatches(r, fact));

  if (applicableRules.length === 0) {
    return { faitSource: fact, contraintesPropagees: [], entitesImpactees: [] };
  }

  const adjacency = buildAdjacency(edges);
  const visited = new Set<EntityID>([fact.entityId]);
  const queue: QueueItem[] = [];
  const result: ContraintePropagee[] = [];

  // maxDepth is the maximum hop distance; maxDepth < 1 disables propagation
  // entirely (the source itself is never a target). Seeding distance-1 neighbors
  // unconditionally would leak hop-1 constraints even when the caller asked for zero.
  if (maxDepth >= 1) {
    for (const e of adjacency.get(fact.entityId) ?? []) {
      queue.push({ entityId: e.cible, distance: 1, forceAccumulee: e.forcePropagation });
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur.entityId)) continue;
    if (cur.forceAccumulee < minForce) continue;
    visited.add(cur.entityId);

    for (const rule of applicableRules) {
      const targetAttribute = deriveTargetAttribute(rule, fact);
      result.push({
        entityId: cur.entityId,
        attributCible: targetAttribute,
        contrainte: synthesizeContrainte(
          input,
          rule,
          cur.entityId,
          targetAttribute,
          cur.distance,
          cur.forceAccumulee,
        ),
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

function stableHash(input: string): string {
  // Two FNV-1a passes with distinct offset bases give ~64 bits of output, keeping
  // the accidental-collision probability negligible for realistic constraint counts
  // (a single 32-bit hash reaches ~50% collision odds around 65k constraints).
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let index = 0; index < input.length; index++) {
    const c = input.charCodeAt(index);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c;
    h2 = Math.imul(h2, 0x85ebca77);
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

function synthesizeContrainte(
  input: PropagationInput,
  rule: ReglePropagation,
  targetEntityId: EntityID,
  targetAttribute: string,
  hopDistance: number,
  force: number,
): Contrainte {
  // JSON.stringify is delimiter-safe: a field containing the old "|" separator
  // (e.g. factId="f|r" vs rule.id="r|x") can no longer shift the boundary and
  // collide with a different tuple, because array structure and quoting are preserved.
  const identity = JSON.stringify([
    input.campaignId,
    input.fact.factId,
    rule.id,
    targetEntityId,
    targetAttribute,
    hopDistance,
  ]);
  return {
    id: asConstraintId(`prop_${stableHash(identity)}`),
    source: { kind: "FAIT_CANONIQUE", factId: input.fact.factId },
    createdAt: input.createdAt ?? input.fact.observation.timestamp,
    regle: {
      type: "CORRELE_AVEC",
      autreEntite: input.fact.entityId,
      autreAttribut: input.fact.key
    },
    justificationNarrative: `${rule.nom} (force=${force.toFixed(2)})`
  };
}
