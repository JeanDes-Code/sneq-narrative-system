import type { Repository } from "../repository/interface.js";
import type { CampaignId, EntityID, HolderId } from "../domain/ids.js";

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
  const now = opts.now ?? Date.now;
  const defaultRealmId = asEntityID(DEFAULT_REALM_ENTITY_ID);
  const defaultGroupId = asHolderId(DEFAULT_GROUP_HOLDER_ID);

  const existing = await repo.getEntity(campaignId, defaultRealmId);
  if (existing) return { defaultRealmId, defaultGroupId };   // idempotent

  await repo.upsertEntity({
    campaignId, id: defaultRealmId, type: "WORLD",
    name: "Le Monde Connu",
    description: "Le royaume par défaut de la campagne — toute place sans realmId déclaré lui appartient (#26).",
    nomConnu: true, aliases: [], tags: ["realm"],
    createdAt: now(), embedding: null, embeddingRefreshedAt: null
  });

  await repo.upsertHolder({
    kind: "GROUP", holderId: defaultGroupId, campaignId,
    community: "le-monde", stratum: "commun",
    realmId: defaultRealmId, placeId: defaultRealmId,
    standing: 0.5
  });

  await repo.setDispatchPolicy(campaignId, {
    routes: [],
    rules: [{
      minGravity: 2, route: "RUMOUR",
      targets: "ALL_KNOWN_COMMUNITIES",
      carrierLabel: "le bruit qui court"
    }]
  });

  return { defaultRealmId, defaultGroupId };
}
