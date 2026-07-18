import { normalizeAlias } from "../resolver/normalize.js";
import type {
  AdvanceTurnDecision,
  AdvanceTurnDecisionInput,
  ConfirmEntityMatchDecision,
  ConfirmEntityMatchDecisionInput,
  RegisterFactDecision,
  RegisterFactDecisionInput,
  SetSceneDecision,
  SetSceneDecisionInput,
} from "./types.js";

export function decideRegisterFact(input: RegisterFactDecisionInput): RegisterFactDecision {
  const contradictions = input.existing.filter(
    (fact) => JSON.stringify(fact.value) !== JSON.stringify(input.value),
  );
  if (contradictions.length > 0) return { fact: null, contradictions };

  return {
    fact: {
      campaignId: input.campaignId,
      factId: input.factId,
      entityId: input.entityId,
      key: input.attributeKey,
      value: input.value,
      category: input.category,
      observation: input.observation,
      turn: input.latestTurnNumber,
    },
    contradictions: [],
  };
}

export function decideSetScene(input: SetSceneDecisionInput): SetSceneDecision {
  const turnNumber = input.latestTurnNumber + 1;
  return {
    scene: {
      campaignId: input.campaignId,
      id: input.sceneId,
      locationId: input.locationEntityId,
      presentEntityIds: input.presentEntityIds,
      description: input.description,
      createdAtTurn: turnNumber,
    },
    turn: {
      campaignId: input.campaignId,
      turnNumber,
      summary: null,
      sceneId: input.sceneId,
      createdAt: input.createdAt,
    },
  };
}

export function decideAdvanceTurn(input: AdvanceTurnDecisionInput): AdvanceTurnDecision {
  return {
    turn: {
      campaignId: input.campaignId,
      turnNumber: (input.latestTurn?.turnNumber ?? 0) + 1,
      summary: input.summary ?? null,
      sceneId: input.latestTurn?.sceneId ?? null,
      createdAt: input.createdAt,
    },
  };
}

export function decideConfirmEntityMatch(
  input: ConfirmEntityMatchDecisionInput,
): ConfirmEntityMatchDecision {
  const entity = input.entity;
  if (!entity) {
    throw new Error(
      `entity "${String(input.entityId)}" not found in campaign "${String(input.campaignId)}"`,
    );
  }
  if (entity.campaignId !== input.campaignId) {
    throw new Error(
      `entity campaign mismatch: expected ${String(input.campaignId)}, got ${String(entity.campaignId)}`,
    );
  }
  if (entity.id !== input.entityId) {
    throw new Error(`entity mismatch: expected ${String(input.entityId)}, got ${String(entity.id)}`);
  }
  if (entity.type !== input.type) {
    throw new Error(`entity type mismatch: expected ${input.type}, got ${entity.type}`);
  }

  const normalized = normalizeAlias(input.mention);
  const exists = normalizeAlias(entity.name) === normalized
    || entity.aliases.some((alias) => normalizeAlias(alias.text) === normalized);
  if (exists) {
    return { entity, result: { entityId: entity.id, aliasAdded: false } };
  }

  return {
    entity: {
      ...entity,
      aliases: [...entity.aliases, {
        text: input.mention,
        source: { kind: "PLAYER" },
        observedAt: input.observedAt,
      }],
    },
    result: { entityId: entity.id, aliasAdded: true },
  };
}
