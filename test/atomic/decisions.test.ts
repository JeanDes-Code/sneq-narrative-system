import { describe, expect, it } from "vitest";

import { decideAdvanceTurn, decideRegisterFact, decideSetScene } from "../../src/atomic/decisions.js";
import type { AttributFige } from "../../src/domain/attribute.js";
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

describe("atomic decisions", () => {
  it("rejects a contradictory fact without producing a write", () => {
    const result = decideRegisterFact({
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
      campaignId,
      latestTurn: null,
      summary: "Ouverture",
      createdAt: 30,
    });

    expect(result.turn).toMatchObject({ turnNumber: 1, sceneId: null, summary: "Ouverture" });
  });
});
