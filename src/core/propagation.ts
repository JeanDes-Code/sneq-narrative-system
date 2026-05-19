import type { AttributFige } from "../domain/attribute.js";
import type { AreteGCN, ReglePropagation } from "../domain/gcn.js";
import type { CampaignId, EntityID } from "../domain/ids.js";
import type { Contrainte } from "../domain/potentialite.js";
import { asContraintId } from "../domain/ids.js";

export interface PropagationInput {
  fact: AttributFige;
  campaignId: CampaignId;
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
  const { fact, edges, rules, maxDepth, minForce } = input;
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
    source: { kind: "FAIT_CANONIQUE", factId: fact.factId },
    createdAt: Date.now(),
    regle: {
      type: "CORRELE_AVEC",
      autreEntite: fact.entityId,
      autreAttribut: fact.key
    },
    justificationNarrative: `${rule.nom} (force=${force.toFixed(2)})`
  };
}
