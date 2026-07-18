import { describe, expect, it } from "vitest";

import {
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideRegisterFact,
  decideSetScene,
} from "../../src/atomic/decisions.js";
import type { AttributFige } from "../../src/domain/attribute.js";
import type { Entity } from "../../src/domain/entity.js";
import { asCampaignId, asEntityID, asFactId, asSceneId } from "../../src/domain/ids.js";

const campaignId = asCampaignId("c1");
const entityId = asEntityID("e1");
const observation = {
  source: "GM_NARRATION",
  method: "DIALOGUE_DIRECT",
  fiabilite: "CERTAINE",
  timestamp: 10,
} as const;

function existing(value: string): AttributFige {
  return {
    factId: asFactId("old"),
    entityId,
    key: "role",
    value: { type: "STRING", value },
    category: "SOCIAL",
    observation,
    turn: 1,
  };
}

function entity(overrides: Partial<Entity> = {}): Entity {
  return {
    campaignId,
    id: entityId,
    type: "PERSONNAGE",
    name: "Roric",
    description: "Capitaine de la garde",
    nomConnu: true,
    aliases: [],
    tags: [],
    createdAt: 1,
    embedding: null,
    embeddingRefreshedAt: null,
    ...overrides,
  };
}

describe("atomic decisions", () => {
  it("rejects a contradictory fact without producing a write", () => {
    const result = decideRegisterFact({
      operationId: "op-register",
      campaignId,
      factId: asFactId("new"),
      entityId,
      attributeKey: "role",
      value: { type: "STRING", value: "traître" },
      category: "SOCIAL",
      observation,
      existing: [existing("allié")],
      latestTurnNumber: 2,
    });

    expect(result).toEqual({ fact: null, contradictions: [existing("allié")] });
  });

  it("builds a fact at the latest turn when compatible", () => {
    const result = decideRegisterFact({
      operationId: "op-register",
      campaignId,
      factId: asFactId("new"),
      entityId,
      attributeKey: "role",
      value: { type: "STRING", value: "allié" },
      category: "SOCIAL",
      observation,
      existing: [existing("allié")],
      latestTurnNumber: 3,
    });

    expect(result.fact).toMatchObject({ factId: asFactId("new"), turn: 3 });
    expect(result.contradictions).toEqual([]);
  });

  it("builds scene and next turn atomically", () => {
    const result = decideSetScene({
      operationId: "op-scene",
      campaignId,
      sceneId: asSceneId("s2"),
      locationEntityId: entityId,
      presentEntityIds: [],
      description: "La forge",
      latestTurnNumber: 4,
      createdAt: 20,
    });

    expect(result.turn.turnNumber).toBe(5);
    expect(result.scene.createdAtTurn).toBe(5);
    expect(result.turn.sceneId).toBe(asSceneId("s2"));
  });

  it("advances from zero and preserves the previous scene", () => {
    const result = decideAdvanceTurn({
      operationId: "op-turn",
      campaignId,
      latestTurn: null,
      summary: "Ouverture",
      createdAt: 30,
    });

    expect(result.turn).toMatchObject({ turnNumber: 1, sceneId: null, summary: "Ouverture" });
  });

  it("rejects confirmation for an unknown entity", () => {
    expect(() => decideConfirmEntityMatch({
      operationId: "op-confirm-missing",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 20,
      entity: null,
    })).toThrow(/not found in campaign/i);
  });

  it("rejects confirmation when the entity type differs", () => {
    expect(() => decideConfirmEntityMatch({
      operationId: "op-confirm-type",
      campaignId,
      entityId,
      mention: "la ville",
      type: "LIEU",
      observedAt: 20,
      entity: entity(),
    })).toThrow(/type mismatch/i);
  });

  it("rejects confirmation when the entity belongs to another campaign", () => {
    expect(() => decideConfirmEntityMatch({
      operationId: "op-confirm-campaign",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 20,
      entity: entity({ campaignId: asCampaignId("other-campaign") }),
    })).toThrow(/campaign mismatch/i);
  });

  it("rejects confirmation when the loaded entity ID differs", () => {
    expect(() => decideConfirmEntityMatch({
      operationId: "op-confirm-entity",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 20,
      entity: entity({ id: asEntityID("other-entity") }),
    })).toThrow(/entity mismatch/i);
  });

  it("returns an idempotent result for normalized canonical names and aliases", () => {
    const canonical = decideConfirmEntityMatch({
      operationId: "op-confirm-name",
      campaignId,
      entityId,
      mention: "roric",
      type: "PERSONNAGE",
      observedAt: 20,
      entity: entity(),
    });
    const alias = decideConfirmEntityMatch({
      operationId: "op-confirm-alias",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 21,
      entity: entity({
        aliases: [{ text: "Le Capitaine", source: { kind: "PLAYER" }, observedAt: 10 }],
      }),
    });

    expect(canonical.result).toEqual({ entityId, aliasAdded: false });
    expect(alias.result).toEqual({ entityId, aliasAdded: false });
  });

  it("returns a new entity value without mutating the input", () => {
    const original = entity();
    const decision = decideConfirmEntityMatch({
      operationId: "op-confirm-add",
      campaignId,
      entityId,
      mention: "le capitaine",
      type: "PERSONNAGE",
      observedAt: 20,
      entity: original,
    });

    expect(decision.result).toEqual({ entityId, aliasAdded: true });
    expect(decision.entity.aliases).toContainEqual({
      text: "le capitaine",
      source: { kind: "PLAYER" },
      observedAt: 20,
    });
    expect(original.aliases).toEqual([]);
  });
});
