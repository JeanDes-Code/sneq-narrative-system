import { repositoryAtomicWriteStrategy } from "./atomic/repository-strategy.js";
import type { AtomicWriteStrategy, CreateEntityResult } from "./atomic/types.js";
import type { Repository, RepositoryAccess } from "./repository/interface.js";
import type { Router } from "./router/router.js";
import type { Resolver, ResolutionResult, SuggestionResult, Embedder } from "./resolver/resolver.js";
import type { UserPromptRegistry, AskUserFn } from "./hooks/user-prompt.js";
import type { PreGenerationRegistry, PreGenerationHook } from "./hooks/pre-generation.js";
import type {
  NarrationGateHook,
  NarrationGateInput,
  NarrationGateRegistry,
  ValidationReport
} from "./hooks/narration-gate.js";
import type { Logger } from "./logger.js";
import type { CampaignId, EntityID, FactId, ConstraintId, SceneId } from "./domain/ids.js";
import { asEntityID, asConstraintId, asFactId, asSceneId } from "./domain/ids.js";
import { CampaignLifecycle } from "./campaign-lifecycle.js";
import { SneqCampaignNotFoundError, SneqConcurrentEntityCreationError } from "./errors.js";
import type { Entity, EntityType } from "./domain/entity.js";
import { normalizeAlias } from "./resolver/normalize.js";
import type { AttributFige, AttributValue, CategorieAttribut } from "./domain/attribute.js";
import type { Observation } from "./domain/observation.js";
import type { RegleContrainte } from "./domain/potentialite.js";
import type { Scene } from "./domain/scene.js";
import { dispatchToolCall, type ToolCallContext } from "./tools/dispatcher.js";

export interface CampaignContextDeps {
  campaignId: CampaignId;
  repo: RepositoryAccess;
  router: Router;
  resolver: Resolver;
  writeStrategy?: AtomicWriteStrategy;
  /** null = keyless mode (no embeddings tier): entities are stored without vectors. */
  embedder: Embedder | null;
  userPrompt: UserPromptRegistry;
  preGen: PreGenerationRegistry;
  narrationGate: NarrationGateRegistry;
  logger: Logger;
  lifecycle?: CampaignLifecycle;
}

export interface MentionInput {
  canonicalName: string;
  type: EntityType;
  aliases?: string[];
  description: string;
  /** Create even when resolution is ambiguous (after the caller adjudicated). */
  force?: boolean;
}

export interface ConfirmEntityMatchInput {
  mention: string;
  entityId: EntityID;
  type: EntityType;
}

export type MentionResult =
  | { entityId: EntityID; isNew: boolean; resolvedTo?: EntityID; needsAdjudication?: false }
  | { entityId: null; isNew: false; needsAdjudication: true;
      reason?: "ambiguous" | "unavailable";
      candidates: Array<{ entityId: EntityID; name: string; type: EntityType }> };

export interface RegisterFactInput {
  entityId: EntityID;
  attributeKey: string;
  value: AttributValue;
  category: CategorieAttribut;
  observation: Observation;
}

function createOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const MAX_ENTITY_CREATION_ATTEMPTS = 3;

export class CampaignContext implements ToolCallContext {
  readonly id: CampaignId;
  private readonly lifecycle: CampaignLifecycle;
  private readonly writeStrategy: AtomicWriteStrategy;

  constructor(private readonly deps: CampaignContextDeps) {
    this.id = deps.campaignId;
    this.lifecycle = deps.lifecycle ?? new CampaignLifecycle(deps.campaignId);
    if (deps.writeStrategy) {
      this.writeStrategy = deps.writeStrategy;
      return;
    }

    const candidate = deps.repo as Partial<Repository>;
    if (typeof candidate.transaction !== "function") {
      throw new Error("repository without transaction requires CampaignContextDeps.writeStrategy");
    }
    this.writeStrategy = repositoryAtomicWriteStrategy(candidate as Repository);
  }

  private async ensureUsable(): Promise<void> {
    this.lifecycle.assertUsable();
    if (!this.lifecycle.needsVerification()) return;
    const all = await this.deps.repo.listCampaigns();
    this.lifecycle.assertUsable();
    if (!all.some(c => c.id === this.id)) throw new SneqCampaignNotFoundError(this.id);
    this.lifecycle.markVerified();
  }

  async resolveEntity(opts: { mention: string; type?: EntityType }): Promise<ResolutionResult> {
    await this.ensureUsable();
    const scene = await this.deps.repo.currentScene(this.id);
    return this.deps.resolver.resolveEntity({
      campaignId: this.id,
      mention: opts.mention,
      ...(opts.type !== undefined ? { type: opts.type } : {}),
      ...(scene?.description ? { sceneDescription: scene.description } : {})
    });
  }

  async suggestExisting(mention: string, type: EntityType): Promise<SuggestionResult> {
    await this.ensureUsable();
    return this.deps.resolver.suggestExisting({ campaignId: this.id, mention, type });
  }

  async getEntity(entityId: EntityID): Promise<Entity | null> {
    await this.ensureUsable();
    return this.deps.repo.getEntity(this.id, entityId);
  }

  async confirmEntityMatch(input: ConfirmEntityMatchInput): Promise<{ entityId: EntityID; aliasAdded: boolean }> {
    await this.ensureUsable();
    return this.writeStrategy.confirmEntityMatch({
      operationId: createOperationId(),
      campaignId: this.id,
      mention: input.mention,
      entityId: input.entityId,
      type: input.type,
      observedAt: Date.now(),
    });
  }

  async getRelevantFacts(entityId: EntityID, opts?: { attributeKeys?: string[]; depth?: 0 | 1 }): Promise<AttributFige[]> {
    await this.ensureUsable();
    const own = await this.deps.repo.getFigedAttributes(this.id, entityId);
    const filtered = opts?.attributeKeys ? own.filter(f => opts.attributeKeys!.includes(f.key)) : own;
    if (!opts?.depth || opts.depth <= 0) return filtered;

    const neighbors = await this.deps.repo.neighbors(this.id, entityId);
    const extras: AttributFige[] = [];
    for (const n of neighbors) {
      const fs = await this.deps.repo.getFigedAttributes(this.id, n.node.entityId);
      extras.push(...fs);
    }
    return [...filtered, ...extras];
  }

  async currentScene(): Promise<Scene | null> {
    await this.ensureUsable();
    return this.deps.repo.currentScene(this.id);
  }

  async mentionEntity(input: MentionInput): Promise<MentionResult> {
    await this.ensureUsable();
    const operationId = createOperationId();
    const createdAt = Date.now();
    const entityId = asEntityID(
      `${input.type.toLowerCase()}_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
    );
    const aliasObservedAt = createdAt;
    let embeddingComputed = false;
    let embedding: Float32Array | null = null;
    let embeddingRefreshedAt: number | null = null;

    for (let attempt = 1; attempt <= MAX_ENTITY_CREATION_ATTEMPTS; attempt++) {
      const expectedEntityRevision = await this.deps.repo.entityRevision(this.id);
      const resolution = await this.resolveEntity({
        mention: input.canonicalName,
        type: input.type,
      });

      if (resolution.match) {
        return { entityId: resolution.match.id, isNew: false, resolvedTo: resolution.match.id };
      }
      if (!input.force && resolution.unavailableReason) {
        return {
          entityId: null,
          isNew: false,
          needsAdjudication: true,
          reason: "unavailable",
          candidates: [],
        };
      }
      if (!input.force && resolution.notFoundReason === "ambiguous" && resolution.candidates.length > 0) {
        return {
          entityId: null,
          isNew: false,
          needsAdjudication: true,
          reason: "ambiguous",
          candidates: resolution.candidates.slice(0, 5).map((candidate) => ({
            entityId: candidate.id,
            name: candidate.name,
            type: candidate.type,
          })),
        };
      }

      if (!embeddingComputed) {
        embeddingComputed = true;
        if (this.deps.embedder) {
          try {
            embedding = await this.deps.embedder.embed(`${input.canonicalName}. ${input.description}`);
            embeddingRefreshedAt = Date.now();
          } catch {
            embedding = null;
            embeddingRefreshedAt = null;
          }
        }
      }

      const candidate: Entity = {
        campaignId: this.id,
        id: entityId,
        type: input.type,
        name: input.canonicalName,
        description: input.description,
        nomConnu: true,
        aliases: (input.aliases ?? []).map((text) => ({
          text,
          source: { kind: "GM_NARRATION" as const },
          observedAt: aliasObservedAt,
        })),
        tags: [],
        createdAt,
        embedding,
        embeddingRefreshedAt,
      };
      const identityKeys = [...new Set(
        [candidate.name, ...candidate.aliases.map((alias) => alias.text)].map(normalizeAlias),
      )];
      // Embedding/resolution above can await for a long time, during which this
      // campaign may have been deleted (and the id possibly recreated as a fresh
      // campaign). Re-assert the retained context's lifecycle so a stale context
      // cannot commit an entity into a campaign it no longer represents.
      this.lifecycle.assertUsable();
      const result: CreateEntityResult = await this.writeStrategy.createEntity({
        operationId,
        campaignId: this.id,
        expectedEntityRevision,
        candidate,
        identityKeys,
        force: input.force === true,
      });

      if (result.status === "stale") continue;
      if (result.status === "created") return { entityId: result.entityId, isNew: true };
      if (result.status === "existing") {
        return { entityId: result.entityId, isNew: false, resolvedTo: result.resolvedTo };
      }
      return {
        entityId: null,
        isNew: false,
        needsAdjudication: true,
        reason: "ambiguous",
        candidates: result.candidates,
      };
    }

    throw new SneqConcurrentEntityCreationError(this.id, MAX_ENTITY_CREATION_ATTEMPTS);
  }

  async registerFact(input: RegisterFactInput): Promise<{ factId: FactId | null; contradictions: AttributFige[] }> {
    await this.ensureUsable();
    return this.writeStrategy.registerFact({
      operationId: createOperationId(),
      campaignId: this.id,
      factId: asFactId(`f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      entityId: input.entityId,
      attributeKey: input.attributeKey,
      value: input.value,
      category: input.category,
      observation: input.observation,
    });
  }

  async addConstraint(input: { entityId: EntityID; attributeKey: string; rule: RegleContrainte; justification: string }): Promise<{ constraintId: ConstraintId }> {
    await this.ensureUsable();
    const createdAt = Date.now();
    return this.writeStrategy.addConstraint({
      operationId: createOperationId(),
      campaignId: this.id,
      constraintId: asConstraintId(`c_${createdAt}_${Math.random().toString(36).slice(2, 8)}`),
      entityId: input.entityId,
      attributeKey: input.attributeKey,
      rule: input.rule,
      justification: input.justification,
      createdAt,
    });
  }

  async setScene(input: { locationEntityId: EntityID; presentEntityIds: EntityID[]; description: string }): Promise<{ sceneId: SceneId; turnNumber: number }> {
    await this.ensureUsable();
    const result = await this.writeStrategy.setScene({
      operationId: createOperationId(),
      campaignId: this.id,
      sceneId: asSceneId(`s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      locationEntityId: input.locationEntityId,
      presentEntityIds: input.presentEntityIds,
      description: input.description,
      createdAt: Date.now(),
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "ENTRY_TO_SCENE", hint: {} });
    return result;
  }

  async advanceTurn(summary?: string): Promise<{ turnNumber: number }> {
    await this.ensureUsable();
    const result = await this.writeStrategy.advanceTurn({
      operationId: createOperationId(),
      campaignId: this.id,
      ...(summary !== undefined ? { summary } : {}),
      createdAt: Date.now(),
    });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return result;
  }

  handleToolCall(name: string, args: unknown): Promise<unknown> {
    this.lifecycle.assertUsable();
    return dispatchToolCall(name, args, this);
  }

  registerUserPromptHandler(fn: AskUserFn): { dispose(): void } {
    this.lifecycle.assertUsable();
    return this.deps.userPrompt.register(fn);
  }

  registerPreGenerationHook(hook: PreGenerationHook): { dispose(): void } {
    this.lifecycle.assertUsable();
    return this.deps.preGen.register(hook);
  }

  async validateNarration(input: NarrationGateInput): Promise<ValidationReport> {
    await this.ensureUsable();
    return this.deps.narrationGate.validate(input, {
      campaignId: this.id,
      resolver: this.deps.resolver,
      router: this.deps.router,
      repo: this.deps.repo
    });
  }

  registerNarrationGate(hook: NarrationGateHook): { dispose(): void } {
    this.lifecycle.assertUsable();
    return this.deps.narrationGate.register(hook);
  }

  async prepareTurn(): Promise<{
    scene: Scene | null;
    presentEntities: { entity: Entity; facts: AttributFige[] }[];
  }> {
    await this.ensureUsable();
    const scene = await this.deps.repo.currentScene(this.id);
    if (!scene) return { scene: null, presentEntities: [] };

    const present = await Promise.all(
      scene.presentEntityIds.map(async (eid) => {
        const entity = await this.deps.repo.getEntity(this.id, eid);
        if (!entity) return null;
        const facts = await this.deps.repo.getFigedAttributes(this.id, eid);
        return { entity, facts };
      })
    );
    return {
      scene,
      presentEntities: present.filter((p): p is { entity: Entity; facts: AttributFige[] } => p !== null)
    };
  }
}
