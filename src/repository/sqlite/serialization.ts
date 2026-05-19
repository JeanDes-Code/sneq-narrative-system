import type { Entity } from "../../domain/entity.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import type { AreteGCN, NoeudGCN } from "../../domain/gcn.js";
import type { CampaignId } from "../../domain/ids.js";
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

export function entityToRow(e: Entity): EntityRow & { _embedding: Buffer | null } {
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
    ? new Float32Array(embeddingBuf.buffer.slice(embeddingBuf.byteOffset, embeddingBuf.byteOffset + embeddingBuf.byteLength))
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

export function figedToRow(f: AttributFige & { campaignId: CampaignId }): FigedRow {
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

export function potentialiteToRow(p: Potentialite, campaignId: CampaignId): PotentialiteRow {
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

export function nodeToRow(n: NoeudGCN, campaignId: CampaignId): NodeRow {
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

export function edgeToRow(a: AreteGCN, campaignId: CampaignId): EdgeRow {
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
