import type { Repository } from "./repository/interface.js";
import type { Router } from "./router/router.js";
import type { Resolver, ResolutionResult, SuggestionResult, Embedder } from "./resolver/resolver.js";
import type { UserPromptRegistry, AskUserFn } from "./hooks/user-prompt.js";
import type { PreGenerationRegistry, PreGenerationHook } from "./hooks/pre-generation.js";
import type { Logger } from "./logger.js";
import type { CampaignId, EntityID, FactId, ContraintId, SceneId } from "./domain/ids.js";
import { asEntityID, asContraintId, asFactId, asSceneId } from "./domain/ids.js";
import type { Entity, EntityType } from "./domain/entity.js";
import type { AttributFige, AttributValue, CategorieAttribut } from "./domain/attribute.js";
import type { Observation } from "./domain/observation.js";
import type { RegleContrainte } from "./domain/potentialite.js";
import type { Scene } from "./domain/scene.js";
import { dispatchToolCall, type ToolCallContext } from "./tools/dispatcher.js";

export interface CampaignContextDeps {
  campaignId: CampaignId;
  repo: Repository;
  router: Router;
  resolver: Resolver;
  embedder: Embedder;
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

export class CampaignContext implements ToolCallContext {
  readonly id: CampaignId;

  constructor(private readonly deps: CampaignContextDeps) { this.id = deps.campaignId; }

  resolveEntity(opts: { mention: string; type?: EntityType; sceneId?: string }): Promise<ResolutionResult> {
    return this.deps.resolver.resolveEntity({
      campaignId: this.id,
      mention: opts.mention,
      ...(opts.type !== undefined ? { type: opts.type } : {})
    });
  }

  suggestExisting(mention: string, type: EntityType): Promise<SuggestionResult> {
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

  async currentScene(): Promise<Scene | null> { return this.deps.repo.currentScene(this.id); }

  async mentionEntity(input: MentionInput): Promise<{ entityId: EntityID; isNew: boolean; resolvedTo?: EntityID }> {
    const resolution = await this.resolveEntity({
      mention: input.canonicalName,
      type: input.type
    });
    if (resolution.match) {
      return { entityId: resolution.match.id, isNew: false, resolvedTo: resolution.match.id };
    }
    const id = asEntityID(`${input.type.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const embeddingText = `${input.canonicalName}. ${input.description}`;
    const embedding = await this.deps.embedder.embed(embeddingText);
    const entity: Entity = {
      campaignId: this.id, id, type: input.type, name: input.canonicalName,
      nomConnu: true,
      aliases: (input.aliases ?? []).map(text => ({ text, source: { kind: "GM_NARRATION" as const }, observedAt: Date.now() })),
      tags: [], createdAt: Date.now(),
      embedding, embeddingRefreshedAt: Date.now()
    };
    await this.deps.repo.upsertEntity(entity);
    return { entityId: id, isNew: true };
  }

  async registerFact(input: RegisterFactInput): Promise<{ factId: FactId; contradictions: AttributFige[] }> {
    const existing = await this.deps.repo.queryFacts(this.id, {
      entityId: input.entityId,
      attributeKey: input.attributeKey
    });
    const contradictions = existing.filter(e => JSON.stringify(e.value) !== JSON.stringify(input.value));
    if (contradictions.length > 0) {
      return { factId: asFactId("none"), contradictions };
    }
    const factId = asFactId(`f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const latest = await this.deps.repo.latestTurn(this.id);
    const fact: AttributFige & { campaignId: CampaignId } = {
      factId, entityId: input.entityId, key: input.attributeKey,
      value: input.value, category: input.category, observation: input.observation,
      turn: latest?.turnNumber ?? 0,
      campaignId: this.id
    };
    await this.deps.repo.appendFact(fact);
    return { factId, contradictions: [] };
  }

  async addConstraint(input: { entityId: EntityID; attributeKey: string; rule: RegleContrainte; justification: string }): Promise<{ constraintId: ContraintId }> {
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
    // V2 ships a minimal collapse: caller is expected to compose Router.chat + validateValue + registerFact themselves.
    throw new Error("collapseAttribute: not wired in V2 minimal scope. Use Router.chat directly with the heavy tier, then validateValue + registerFact.");
  }

  async setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }> {
    const sceneId = asSceneId(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const last = await this.deps.repo.latestTurn(this.id);
    const turnNumber = (last?.turnNumber ?? 0) + 1;
    await this.deps.repo.upsertScene({
      campaignId: this.id, id: sceneId,
      locationId: input.locationEntityId,
      presentEntityIds: input.presentEntityIds,
      description: input.description,
      createdAtTurn: turnNumber
    });
    await this.deps.repo.appendTurn({
      campaignId: this.id, turnNumber,
      summary: null,
      sceneId,
      createdAt: Date.now()
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "ENTRY_TO_SCENE", hint: {} });
    return { sceneId, turnNumber };
  }

  async advanceTurn(summary?: string): Promise<{ turnNumber: number }> {
    const last = await this.deps.repo.latestTurn(this.id);
    const turnNumber = (last?.turnNumber ?? 0) + 1;
    await this.deps.repo.appendTurn({
      campaignId: this.id, turnNumber,
      summary: summary ?? null,
      sceneId: last?.sceneId ?? null,
      createdAt: Date.now()
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return { turnNumber };
  }

  handleToolCall(name: string, args: unknown): Promise<unknown> {
    return dispatchToolCall(name, args, this);
  }

  registerUserPromptHandler(fn: AskUserFn): { dispose(): void } {
    return this.deps.userPrompt.register(fn);
  }

  registerPreGenerationHook(hook: PreGenerationHook): { dispose(): void } {
    return this.deps.preGen.register(hook);
  }
}
