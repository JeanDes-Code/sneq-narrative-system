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
import type { CampaignId, EntityID, ConstraintId, SceneId, HolderId } from "./domain/ids.js";
import { asEntityID, asConstraintId, asSceneId, asHolderId } from "./domain/ids.js";
import { CampaignLifecycle } from "./campaign-lifecycle.js";
import {
  SneqCampaignNotFoundError, SneqConcurrentEntityCreationError,
  SneqUnknownEntityError, SneqUnknownHolderError
} from "./errors.js";
import type { Entity, EntityType } from "./domain/entity.js";
import { normalizeAlias } from "./resolver/normalize.js";
import type { AttributValue, CategorieAttribut } from "./domain/attribute.js";
import type { Observation } from "./domain/observation.js";
import type { Potentialite, RegleContrainte } from "./domain/potentialite.js";
import type { Scene } from "./domain/scene.js";
import type { NarrativeEvent } from "./domain/event.js";
import type { OfficialRecord } from "./domain/record.js";
import type { Holder } from "./domain/holder.js";
import type { DispatchPolicy } from "./domain/carriage.js";
import type { ConstraintRole } from "./atomic/types.js";
import {
  dispatchToolCall, type ToolCallContext, type ToolCommitBundle, type HolderContextArgs
} from "./tools/dispatcher.js";
import { deriveBeliefs, type BeliefWorld } from "./core/derive-beliefs.js";
import { resolveHolder, type HolderResolution } from "./core/holder-resolution.js";
import {
  assertContainment, checkContainment, forbiddenTokensFor, PUBLIC_TAG,
  type ContainmentResult, type EntityLike, type TokenWorld
} from "./core/containment.js";
import {
  buildHolderContext, detectPlayerUptake, filterTranscript,
  type HolderContext, type IngestedPlayerInput,
  type TranscriptEntry, type TranscriptFilterResult
} from "./core/holder-context.js";
import { Validator, applyContainment } from "./core/validate-narration.js";
import { commitNarrative, type CommitNarrativeResult } from "./atomic/commit-narrative.js";
import { tick, worldHealth, type WorldHealth } from "./core/tick.js";
import { DEFAULT_GROUP_HOLDER_ID } from "./atomic/bootstrap.js";
import { runDoctor, type DoctorReport } from "./core/doctor.js";
import type { SalienceWeights } from "./core/salience.js";

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
  /** Fan-out cap for ALL_KNOWN_COMMUNITIES dispatch (#15). */
  maxDispatchFanout?: number;
  /** Salience weights override (§2.5) — the factor list itself is fixed. */
  salienceWeights?: SalienceWeights;
}

export interface MentionInput {
  canonicalName: string;
  type: EntityType;
  aliases?: string[];
  description: string;
  /** Create even when resolution is ambiguous (after the caller adjudicated). */
  force?: boolean;
  /**
   * Common knowledge: this entity's NAME is exempt from the containment floor
   * (`PUBLIC_TAG`). For landmarks, towns, factions everybody has heard of —
   * things whose name carries no secret. What HAPPENED to them is still
   * withheld; only the name stops being.
   */
  public?: boolean;
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
        tags: input.public ? [PUBLIC_TAG] : [],
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

  async addConstraint(input: {
    entityId: EntityID; attributeKey: string; rule: RegleContrainte;
    justification: string; role: ConstraintRole;
  }): Promise<{ constraintId: ConstraintId }> {
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
      role: input.role,
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

  /**
   * Phase H (§11), and the out-of-band clock road (#20). `days` is downtime and
   * session breaks — the fiction's own elapsed time rides on
   * `commitNarrative.daysElapsed`, because that is the call carrying the events
   * the time applies to. Moving the clock here also lands the carriages whose
   * journeys end in the interval, which is why the health report comes back
   * with the turn number: somebody has to run the world, and if that somebody
   * is the GM model, a deaf world is the default outcome (§6.1).
   */
  async advanceTurn(input: { summary?: string; days?: number } = {}): Promise<{ turnNumber: number; worldDay: number; health: WorldHealth }> {
    await this.ensureUsable();
    const result = await this.writeStrategy.advanceTurn({
      operationId: createOperationId(),
      campaignId: this.id,
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      createdAt: Date.now(),
    });
    const ticked = await tick(this.repository(), this.id, { days: input.days ?? 0 });
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return { turnNumber: result.turnNumber, worldDay: ticked.worldDay, health: ticked.health };
  }

  /**
   * The single write (§5.1), on the campaign. Idempotent by `operationId`: a
   * retry replays the recorded result rather than writing twice.
   */
  async commitNarrative(bundle: ToolCommitBundle): Promise<CommitNarrativeResult> {
    await this.ensureUsable();
    const result = await commitNarrative(
      this.repository(),
      { ...bundle, campaignId: this.id },
      {
        ...(this.deps.maxDispatchFanout !== undefined ? { maxDispatchFanout: this.deps.maxDispatchFanout } : {})
      }
    );
    this.deps.preGen.emit({ campaignId: this.id, triggerKind: "TURN_ADVANCED", hint: {} });
    return result;
  }

  async upsertHolder(holder: Holder): Promise<void> {
    await this.ensureUsable();
    await this.repository().upsertHolder({ ...holder, campaignId: this.id });
  }

  async listHolders(): Promise<Holder[]> {
    await this.ensureUsable();
    return this.repository().listHolders(this.id);
  }

  async getDispatchPolicy(): Promise<DispatchPolicy> {
    await this.ensureUsable();
    return this.repository().getDispatchPolicy(this.id);
  }

  /** Additive, like the bundle's `policy` (#15): routes and rules accrete, they never replace. */
  async setDispatchPolicy(patch: Partial<DispatchPolicy>): Promise<DispatchPolicy> {
    await this.ensureUsable();
    const repo = this.repository();
    const current = await repo.getDispatchPolicy(this.id);
    const merged: DispatchPolicy = {
      routes: [...current.routes, ...(patch.routes ?? [])],
      rules: [...current.rules, ...(patch.rules ?? [])]
    };
    await repo.setDispatchPolicy(this.id, merged);
    return merged;
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

  /**
   * Phase F (§11) — holder-aware, and able to withhold. Without `holderId` this
   * is 0.3's behaviour and says so: proper nouns only, nothing about
   * entitlement. With one, the narration is also run through containment, and
   * a leak comes back `BLOCK`.
   */
  async validateNarration(input: NarrationGateInput): Promise<ValidationReport> {
    await this.ensureUsable();
    const report = await this.deps.narrationGate.validate(input, {
      campaignId: this.id,
      resolver: this.deps.resolver,
      router: this.deps.router,
      repo: this.deps.repo
    });
    if (input.holderId === undefined) return report;

    const world = await this.loadKnowledgeWorld();
    const beliefs = deriveBeliefs(world.beliefWorld, input.holderId, world.day);
    return applyContainment(report, checkContainment(
      forbiddenTokensFor(world.tokenWorld, beliefs), input.narration
    ));
  }

  /** Phase F's spelling for hosts that read the pipeline names rather than the 0.3 ones. */
  gateNarration(input: NarrationGateInput): Promise<ValidationReport> {
    return this.validateNarration(input);
  }

  registerNarrationGate(hook: NarrationGateHook): { dispose(): void } {
    this.lifecycle.assertUsable();
    return this.deps.narrationGate.register(hook);
  }

  /**
   * The wake-up probe (#21). Holderless it returns the **frame** the host
   * authored and nothing else — day, turn, scene, who is present by identity.
   * No holder knowledge, so no way to read the world sideways through it.
   * With a holder or an entity it also carries that holder's context, so a
   * turn starts in one call.
   *
   * `scene: null` is a literal, distinct answer: nobody has said where the
   * player is. Ask the human — never guess.
   */
  async prepareTurn(opts: { holderId?: HolderId; entityId?: EntityID; topK?: number } = {}): Promise<{
    day: number;
    turn: number;
    scene: Scene | null;
    presentEntities: Entity[];
    holder: HolderContext | null;
  }> {
    await this.ensureUsable();
    const repo = this.deps.repo;
    const [scene, day, latestTurn] = await Promise.all([
      repo.currentScene(this.id),
      repo.getWorldDay(this.id),
      repo.latestTurn(this.id)
    ]);
    const present = scene
      ? (await Promise.all(scene.presentEntityIds.map(eid => repo.getEntity(this.id, eid))))
          .filter((e): e is Entity => e !== null)
      : [];
    const holder = (opts.holderId !== undefined || opts.entityId !== undefined)
      ? await this.getHolderContext({
          ...(opts.holderId !== undefined ? { holderId: opts.holderId } : {}),
          ...(opts.entityId !== undefined ? { entityId: opts.entityId } : {}),
          ...(opts.topK !== undefined ? { topK: opts.topK } : {})
        })
      : null;

    return { day, turn: latestTurn?.turnNumber ?? 0, scene, presentEntities: present, holder };
  }

  // -- §11: the turn pipeline ----------------------------------------------------

  /** Everything the knowledge seam reads, loaded once per call. */
  private async loadKnowledgeWorld(): Promise<{
    day: number;
    turn: number;
    beliefWorld: BeliefWorld;
    tokenWorld: TokenWorld;
    holders: Holder[];
    events: NarrativeEvent[];
    records: OfficialRecord[];
  }> {
    const repo = this.deps.repo;
    const [events, records, carriages, carriageEffects, holders, day, latestTurn] = await Promise.all([
      repo.getEvents(this.id),
      repo.getRecords(this.id),
      repo.listCarriages(this.id, {}),
      repo.listCarriageEffects(this.id),
      repo.listHolders(this.id),
      repo.getWorldDay(this.id),
      repo.latestTurn(this.id)
    ]);
    // Only the entities the ledger actually names: the containment floor reads
    // names and aliases, and an entity nothing refers to contributes no token.
    const ids = new Set<EntityID>();
    for (const e of events) {
      for (const p of e.participants) ids.add(p);
      if (e.placeId) ids.add(e.placeId);
      for (const a of e.acts) {
        ids.add(a.actorId);
        if (a.objectId) ids.add(a.objectId);
      }
    }
    for (const r of records) { ids.add(r.entityId); ids.add(r.authoredBy); }
    const entities: EntityLike[] = [];
    for (const id of ids) {
      const e = await repo.getEntity(this.id, id);
      if (e) entities.push({ id: e.id, name: e.name, aliases: e.aliases.map(a => a.text), tags: e.tags });
    }

    return {
      day,
      turn: latestTurn?.turnNumber ?? 0,
      beliefWorld: {
        events, records, carriages, carriageEffects, holders,
        defaultGroupId: asHolderId(DEFAULT_GROUP_HOLDER_ID),
        ...(this.deps.salienceWeights !== undefined ? { salienceWeights: this.deps.salienceWeights } : {})
      },
      tokenWorld: { events, records, entities },
      holders, events, records
    };
  }

  /**
   * The #21 cascade, run in the engine. Exactly one of `holderId` / `entityId`.
   * The entity road materializes a PARTICIPANT holder lazily (#28) and persists
   * it, so the same entity resolves to the same holder forever.
   */
  private async resolve(args: { holderId?: HolderId; entityId?: EntityID }, holders: Holder[], events: NarrativeEvent[]): Promise<HolderResolution> {
    if ((args.holderId === undefined) === (args.entityId === undefined)) {
      throw new Error("getHolderContext: pass exactly one of holderId or entityId");
    }
    if (args.holderId !== undefined) {
      const holder = holders.find(h => h.holderId === args.holderId);
      if (!holder) throw new SneqUnknownHolderError(String(args.holderId));
      return { holder, road: holder.kind === "GROUP" ? "DEFAULT_GROUP" : "DECLARED_INDIVIDUAL" };
    }
    const entityId = args.entityId!;
    if (!(await this.deps.repo.getEntity(this.id, entityId))) {
      throw new SneqUnknownEntityError("sneq__get_holder_context", "entityId", String(entityId));
    }
    const resolution = resolveHolder(entityId, {
      holders, events, defaultGroupId: asHolderId(DEFAULT_GROUP_HOLDER_ID)
    });
    // Deterministic id, so persisting is idempotent — and a materialized holder
    // that is never written would be re-derived on every read and never appear
    // in listHolders, which doctor reads.
    if (resolution.materialized) await this.deps.repo.upsertHolder(resolution.materialized);
    return resolution;
  }

  /** Phase B (§11), the only read of world knowledge on the surface — and it is always somebody's. */
  async getHolderContext(args: HolderContextArgs): Promise<HolderContext> {
    await this.ensureUsable();
    const world = await this.loadKnowledgeWorld();
    const resolution = await this.resolve(args, world.holders, world.events);
    // A holder materialized this call is not in the loaded list yet, and
    // deriveBeliefs looks its holder up by id.
    const holders = world.beliefWorld.holders.some(h => h.holderId === resolution.holder.holderId)
      ? world.beliefWorld.holders
      : [...world.beliefWorld.holders, resolution.holder];
    const beliefs = deriveBeliefs({ ...world.beliefWorld, holders }, resolution.holder.holderId, world.day);

    return buildHolderContext({
      holderId: resolution.holder.holderId,
      road: resolution.road,
      ...(args.entityId !== undefined ? { resolvedFrom: args.entityId } : {}),
      day: world.day,
      turn: world.turn,
      beliefs,
      events: world.events,
      records: world.records,
      ...(args.about !== undefined ? { about: args.about } : {}),
      ...(args.topK !== undefined ? { topK: args.topK } : {})
    });
  }

  /**
   * Phase A (§11) — the ingress that closes §2.6's hole. Before this, nothing
   * ever handed SNEQ the raw player utterance, so `promotionEvidence[]` was
   * supplied by the caller and the model decided its own promotions: exactly
   * what §2.6 forbids.
   *
   * What comes back is a preview. The detection that counts runs again inside
   * `commitNarrative` from `playerUtterance`, where it cannot be edited on the
   * way.
   */
  async ingestPlayerInput(input: { holderId?: HolderId; entityId?: EntityID; text: string }): Promise<IngestedPlayerInput> {
    await this.ensureUsable();
    const [world, provisionals] = await Promise.all([
      this.loadKnowledgeWorld(),
      this.deps.repo.listInventions(this.id, "PROVISIONAL")
    ]);
    const resolution = await this.resolve(input, world.holders, world.events);

    const validator = new Validator(this.deps.resolver, this.deps.router);
    const mentions: IngestedPlayerInput["mentions"] = [];
    for (const noun of validator.extract(input.text)) {
      const r = await this.deps.resolver.resolveEntity({ campaignId: this.id, mention: noun });
      mentions.push({ mention: noun, entityId: r.match?.id ?? null, confidence: r.confidence });
    }

    return {
      holderId: resolution.holder.holderId,
      road: resolution.road,
      mentions,
      uptake: detectPlayerUptake(input.text, provisionals, world.turn + 1)
    };
  }

  /**
   * Phase D (§11) — the decisive seam. The host composes whatever it wants and
   * submits the final string; SNEQ answers whether it carries a token this
   * holder cannot hold. Default posture is to throw, because a containment
   * failure is an engine bug, not a gameplay outcome. Pass `throwOnFail: false`
   * when you want the report instead.
   */
  async assertContainment(input: {
    holderId?: HolderId; entityId?: EntityID; text: string; throwOnFail?: boolean;
  }): Promise<ContainmentResult> {
    await this.ensureUsable();
    const world = await this.loadKnowledgeWorld();
    const resolution = await this.resolve(input, world.holders, world.events);
    const holders = world.beliefWorld.holders.some(h => h.holderId === resolution.holder.holderId)
      ? world.beliefWorld.holders
      : [...world.beliefWorld.holders, resolution.holder];
    const beliefs = deriveBeliefs({ ...world.beliefWorld, holders }, resolution.holder.holderId, world.day);
    if (input.throwOnFail === false) {
      return checkContainment(forbiddenTokensFor(world.tokenWorld, beliefs), input.text);
    }
    return assertContainment(world.tokenWorld, beliefs, resolution.holder.holderId, input.text);
  }

  /**
   * Phase C (§11) — which transcript entries this holder may still see. Without
   * it the guarantee expires after one turn: turn 2's prompt replays turn 1's
   * prose, and no per-call filter can help.
   */
  async filterTranscript(input: {
    holderId?: HolderId; entityId?: EntityID; entries: TranscriptEntry[];
  }): Promise<TranscriptFilterResult> {
    await this.ensureUsable();
    const world = await this.loadKnowledgeWorld();
    const resolution = await this.resolve(input, world.holders, world.events);
    const holders = world.beliefWorld.holders.some(h => h.holderId === resolution.holder.holderId)
      ? world.beliefWorld.holders
      : [...world.beliefWorld.holders, resolution.holder];
    const beliefs = deriveBeliefs({ ...world.beliefWorld, holders }, resolution.holder.holderId, world.day);
    return filterTranscript(world.tokenWorld, beliefs, input.entries);
  }

  /** §12.4's conformance harness, over this campaign's persisted state. */
  async doctor(opts: { staleAfterTurns?: number } = {}): Promise<DoctorReport> {
    await this.ensureUsable();
    const repo = this.deps.repo;
    const [scene, day, latestTurn, events, holders, canon, findings, carriages, carriageEffects, records, policy] =
      await Promise.all([
        repo.currentScene(this.id),
        repo.getWorldDay(this.id),
        repo.latestTurn(this.id),
        repo.getEvents(this.id),
        repo.listHolders(this.id),
        repo.getCanonicalAttributes(this.id),
        repo.listMigrationFindings(this.id),
        repo.listCarriages(this.id, {}),
        repo.listCarriageEffects(this.id),
        repo.getRecords(this.id),
        repo.getDispatchPolicy(this.id)
      ]);

    const publicEntities = (await repo.topEntities(this.id, 1000))
      .filter(e => e.tags.includes(PUBLIC_TAG))
      .map(e => ({ entityId: e.id, name: e.name }));

    const sceneIds = scene ? [scene.locationId, ...scene.presentEntityIds] : [];
    const sceneEntityResolution = await Promise.all(sceneIds.map(async entityId => ({
      entityId, known: (await repo.getEntity(this.id, entityId)) !== null
    })));

    // Constraints live on potentialites, keyed by (entity, attribute); walk the
    // keys canon knows about plus the ones the migration flagged.
    const keys = new Map<string, { entityId: EntityID; attribut: string }>();
    for (const row of canon) keys.set(`${row.entityId}|${row.key}`, { entityId: row.entityId, attribut: row.key });
    for (const f of findings) keys.set(`${f.entityId}|${f.attributeKey}`, { entityId: f.entityId, attribut: f.attributeKey });
    const potentialites = (await Promise.all(
      [...keys.values()].map(k => repo.getPotentialite(this.id, k.entityId, k.attribut))
    )).filter((p): p is Potentialite => p !== null);

    const health = worldHealth({
      events, carriages, carriageEffects, records, worldDay: day
    });

    return runDoctor({
      campaignId: String(this.id),
      day,
      turn: latestTurn?.turnNumber ?? 0,
      scene,
      sceneEntityResolution,
      events,
      holders,
      potentialites,
      migrationFindings: findings,
      publicEntities,
      health,
      // No route and no rule means nothing can ever be dispatched: bootstrap
      // ships rules with zero routes, which is what an undeclared map looks like.
      dispatch: {
        uncovered: 0,
        unroutable: policy.rules.length > 0 && policy.routes.length === 0 ? policy.rules.length : 0,
        truncated: 0
      },
      ...(opts.staleAfterTurns !== undefined ? { staleAfterTurns: opts.staleAfterTurns } : {})
    });
  }

  /**
   * The full `Repository` behind the access surface. A distributed store that
   * only supplies `RepositoryAccess` injects its own write strategy for the
   * atomic commands, but `commit_narrative` is one transaction by definition —
   * there is no honest way to fake it.
   */
  private repository(): Repository {
    const candidate = this.deps.repo as Partial<Repository>;
    if (typeof candidate.transaction !== "function") {
      throw new Error(
        "this call needs a transactional Repository: commit_narrative, tick and holder authoring write as one unit. " +
        "A RepositoryAccess-only store must implement them itself (see decideCommitNarrative, which is exported for exactly that)."
      );
    }
    return candidate as Repository;
  }
}
