import type { Repository } from "../repository/interface.js";
import { decideAdvanceTurn, decideRegisterFact, decideSetScene } from "./decisions.js";
import type { AtomicWriteStrategy } from "./types.js";

export function repositoryAtomicWriteStrategy(repo: Repository): AtomicWriteStrategy {
  return {
    registerFact: (command) => repo.transaction(async (tx) => {
      const existing = await tx.queryFacts(command.campaignId, {
        entityId: command.entityId,
        attributeKey: command.attributeKey,
      });
      const latest = await tx.latestTurn(command.campaignId);
      const decision = decideRegisterFact({
        ...command,
        existing,
        latestTurnNumber: latest?.turnNumber ?? 0,
      });
      if (decision.fact) await tx.appendFact(decision.fact);
      return {
        factId: decision.fact?.factId ?? null,
        contradictions: decision.contradictions,
      };
    }),
    setScene: (command) => repo.transaction(async (tx) => {
      const latest = await tx.latestTurn(command.campaignId);
      const decision = decideSetScene({
        ...command,
        latestTurnNumber: latest?.turnNumber ?? 0,
      });
      await tx.upsertScene(decision.scene);
      await tx.appendTurn(decision.turn);
      return {
        sceneId: decision.scene.id,
        turnNumber: decision.turn.turnNumber,
      };
    }),
    advanceTurn: (command) => repo.transaction(async (tx) => {
      const latest = await tx.latestTurn(command.campaignId);
      const decision = decideAdvanceTurn({ ...command, latestTurn: latest });
      await tx.appendTurn(decision.turn);
      return { turnNumber: decision.turn.turnNumber };
    }),
  };
}
