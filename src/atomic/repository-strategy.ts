import type { Entity } from "../domain/entity.js";
import type { Repository } from "../repository/interface.js";
import {
  decideAddConstraint,
  decideAdvanceTurn,
  decideCreateEntity,
  decideConfirmEntityMatch,
  decideSetScene,
} from "./decisions.js";
import type { AtomicWriteStrategy } from "./types.js";

export function repositoryAtomicWriteStrategy(repo: Repository): AtomicWriteStrategy {
  return {
    addConstraint: (command) => repo.transaction(async (tx) => {
      const existing = await tx.getPotentialite(
        command.campaignId,
        command.entityId,
        command.attributeKey,
      );
      const decision = decideAddConstraint({ ...command, existing });
      await tx.upsertPotentialite(command.campaignId, decision.potentialite);
      return decision.result;
    }),
    createEntity: (command) => repo.transaction(async (tx) => {
      // The revision/alias checks below are scoped to command.campaignId, but the
      // write targets candidate.campaignId. A mismatch would validate one campaign
      // and mutate another — reject it rather than corrupt canon.
      if (command.candidate.campaignId !== command.campaignId) {
        throw new Error(
          `createEntity campaign mismatch: command targets "${String(command.campaignId)}" but candidate belongs to "${String(command.candidate.campaignId)}"`,
        );
      }
      const currentEntityRevision = await tx.entityRevision(command.campaignId);
      const matches = new Map<string, Entity>();
      for (const identityKey of command.identityKeys) {
        for (const entity of await tx.findEntitiesByAlias(
          command.campaignId,
          identityKey,
          command.candidate.type,
        )) matches.set(entity.id, entity);
      }
      const decision = decideCreateEntity({
        ...command,
        currentEntityRevision,
        exactMatches: [...matches.values()],
      });
      if (decision.entity) await tx.upsertEntity(decision.entity);
      return decision.result;
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
    confirmEntityMatch: (command) => repo.transaction(async (tx) => {
      const entity = await tx.getEntity(command.campaignId, command.entityId);
      const decision = decideConfirmEntityMatch({ ...command, entity });
      if (decision.result.aliasAdded) {
        await tx.upsertEntity(decision.entity);
      }
      return decision.result;
    }),
  };
}
