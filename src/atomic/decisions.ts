import { normalizeAlias } from "../resolver/normalize.js";
import type { ContrainteSource } from "../domain/potentialite.js";
import type {
  AddConstraintDecision,
  ConstraintRole,
  AddConstraintDecisionInput,
  AdvanceTurnDecision,
  AdvanceTurnDecisionInput,
  ConfirmEntityMatchDecision,
  ConfirmEntityMatchDecisionInput,
  CreateEntityDecision,
  CreateEntityDecisionInput,
  SetSceneDecision,
  SetSceneDecisionInput,
} from "./types.js";

/** The caller's declared role, as the stored `ContrainteSource` (#19). */
function constraintSourceOf(role: ConstraintRole): ContrainteSource {
  switch (role.role) {
    case "REGLE_MONDE":    return { kind: "REGLE_MONDE",    ruleId: role.ruleId };
    case "INFERENCE_IA":   return { kind: "INFERENCE_IA",   confidence: role.confidence };
    case "FAIT_CANONIQUE": return { kind: "FAIT_CANONIQUE", factId: role.factId };
    case "RELATION":       return { kind: "RELATION",       edgeKey: role.edgeKey };
  }
}

export function decideAddConstraint(input: AddConstraintDecisionInput): AddConstraintDecision {
  const constraint = {
    id: input.constraintId,
    source: constraintSourceOf(input.role),
    createdAt: input.createdAt,
    regle: input.rule,
    justificationNarrative: input.justification,
  };
  const base = input.existing ?? {
    entiteId: input.entityId,
    attribut: input.attributeKey,
    etat: "INDEFINI" as const,
    contraintes: [],
    contexteGeneratif: { categorieAttribut: "PSYCHOLOGIE" as const, tendances: [] },
  };
  return {
    potentialite: {
      ...base,
      etat: "CONTRAINT",
      contraintes: [...base.contraintes, constraint],
      contexteGeneratif: {
        ...base.contexteGeneratif,
        tendances: [...base.contexteGeneratif.tendances],
      },
    },
    result: { constraintId: input.constraintId },
  };
}

export function decideCreateEntity(input: CreateEntityDecisionInput): CreateEntityDecision {
  if (input.currentEntityRevision !== input.expectedEntityRevision) {
    return { entity: null, result: { status: "stale" } };
  }

  const matches = [...new Map(
    input.exactMatches
      .filter((match) => match.type === input.candidate.type)
      .map((match) => [match.id, match]),
  ).values()];

  if (matches.length === 1) {
    const match = matches[0]!;
    return {
      entity: null,
      result: { status: "existing", entityId: match.id, isNew: false, resolvedTo: match.id },
    };
  }

  if (matches.length > 1 && !input.force) {
    return {
      entity: null,
      result: {
        status: "conflict",
        candidates: matches.slice(0, 5).map((match) => ({
          entityId: match.id,
          name: match.name,
          type: match.type,
        })),
      },
    };
  }

  return {
    entity: input.candidate,
    result: { status: "created", entityId: input.candidate.id, isNew: true },
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
