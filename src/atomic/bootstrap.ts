import type { Repository } from "../repository/interface.js";
import type { CampaignId, EntityID, HolderId } from "../domain/ids.js";
import type { Entity } from "../domain/entity.js";
import type { GroupHolder } from "../domain/holder.js";
import type { DispatchPolicy } from "../domain/carriage.js";

/** The slice of the repository bootstrap needs — RepositoryAccess qualifies. */
export type BootstrapRepo = Pick<Repository, "getEntity" | "upsertEntity" | "upsertHolder" | "setDispatchPolicy">;
import { asEntityID, asHolderId } from "../domain/ids.js";

/** Deterministic ids — the executor and the CLI can rely on them without a lookup. */
export const DEFAULT_REALM_ENTITY_ID = "realm_default";
export const DEFAULT_GROUP_HOLDER_ID = "h_default_group";

export interface BootstrapResult {
  defaultRealmId: EntityID;
  defaultGroupId: HolderId;
}

export interface BootstrapPlan extends BootstrapResult {
  realmEntity: Entity;
  defaultGroup: GroupHolder;
  policy: DispatchPolicy;
}

/**
 * The bootstrap as pure data, so the three places that have to seed a campaign
 * — `createCampaign`, the SQLite v3→v5 migration and the JSON v1 loader —
 * write the same rows instead of three hand-copied versions that drift. Same
 * reason `migrateLegacyCampaign` is a pure core.
 */
export function bootstrapPlan(campaignId: CampaignId, now: number = Date.now()): BootstrapPlan {
  const defaultRealmId = asEntityID(DEFAULT_REALM_ENTITY_ID);
  const defaultGroupId = asHolderId(DEFAULT_GROUP_HOLDER_ID);
  return {
    defaultRealmId,
    defaultGroupId,
    realmEntity: {
      campaignId, id: defaultRealmId, type: "WORLD",
      name: "Le Monde Connu",
      description: "Le royaume par défaut de la campagne — toute place sans realmId déclaré lui appartient (#26).",
      nomConnu: true, aliases: [], tags: ["realm"],
      createdAt: now, embedding: null, embeddingRefreshedAt: null
    },
    defaultGroup: {
      kind: "GROUP", holderId: defaultGroupId, campaignId,
      community: "le-monde", stratum: "commun",
      realmId: defaultRealmId, placeId: defaultRealmId,
      standing: 0.5
    },
    policy: {
      routes: [],
      rules: [{
        minGravity: 2, route: "RUMOUR",
        targets: "ALL_KNOWN_COMMUNITIES",
        carrierLabel: "le bruit qui court"
      }]
    }
  };
}

/**
 * Campaign bootstrap (§2.3, decided at #15/#26): seed one default realm
 * ENTITY (realms are entities, not strings), one default community with a
 * single stratum (so `get_holder_context` never returns empty for lack of
 * authoring), and the default dispatch rules with ZERO routes — SNEQ owns no
 * map, so until the fiction declares its first route, rules fire and find
 * nothing, and that state is counted (§6.1 unroutable), never silent.
 */
export async function bootstrapCampaign(
  repo: BootstrapRepo,
  campaignId: CampaignId,
  opts: { now?: () => number } = {}
): Promise<BootstrapResult> {
  const plan = bootstrapPlan(campaignId, (opts.now ?? Date.now)());

  const existing = await repo.getEntity(campaignId, plan.defaultRealmId);
  if (existing) return { defaultRealmId: plan.defaultRealmId, defaultGroupId: plan.defaultGroupId };   // idempotent

  await repo.upsertEntity(plan.realmEntity);
  await repo.upsertHolder(plan.defaultGroup);
  await repo.setDispatchPolicy(campaignId, plan.policy);

  return { defaultRealmId: plan.defaultRealmId, defaultGroupId: plan.defaultGroupId };
}
