import type {
  AdvanceTurnDecision,
  AdvanceTurnDecisionInput,
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
