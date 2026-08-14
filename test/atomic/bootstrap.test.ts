import { describe, it, expect } from "vitest";
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import { bootstrapCampaign, DEFAULT_REALM_ENTITY_ID, DEFAULT_GROUP_HOLDER_ID } from "../../src/atomic/bootstrap.js";
import { asCampaignId, asEntityID } from "../../src/domain/ids.js";

const cid = asCampaignId("c1");

describe("bootstrapCampaign (§2.3, #15, #26)", () => {
  it("seeds the default realm ENTITY, the default group, and the default dispatch rule", async () => {
    const repo = new InMemoryRepository({ embeddingDim: 0 });
    await repo.createCampaign({ id: cid, name: "B", createdAt: 0, embeddingDim: 0 });
    const out = await bootstrapCampaign(repo, cid, { now: () => 0 });

    // #26: the default realm is a real entity, not a string
    const realm = await repo.getEntity(cid, out.defaultRealmId);
    expect(realm).not.toBeNull();
    expect(realm!.type).toBe("WORLD");
    expect(out.defaultRealmId).toBe(asEntityID(DEFAULT_REALM_ENTITY_ID));

    // §2.3: get_holder_context never returns empty for lack of authoring
    const holders = await repo.listHolders(cid);
    expect(holders).toHaveLength(1);
    const group = holders[0]!;
    expect(group.kind).toBe("GROUP");
    if (group.kind === "GROUP") {
      expect(group.holderId).toBe(out.defaultGroupId);
      expect(String(group.holderId)).toBe(DEFAULT_GROUP_HOLDER_ID);
      expect(group.realmId).toBe(out.defaultRealmId);
    }

    // #15: default rules, ZERO routes — SNEQ owns no map; unroutable is loud, not silent
    const policy = await repo.getDispatchPolicy(cid);
    expect(policy.routes).toEqual([]);
    expect(policy.rules).toHaveLength(1);
    expect(policy.rules[0]!.minGravity).toBe(2);
    expect(policy.rules[0]!.route).toBe("RUMOUR");
    expect(policy.rules[0]!.targets).toBe("ALL_KNOWN_COMMUNITIES");
  });

  it("is idempotent — bootstrapping twice seeds once", async () => {
    const repo = new InMemoryRepository({ embeddingDim: 0 });
    await repo.createCampaign({ id: cid, name: "B", createdAt: 0, embeddingDim: 0 });
    await bootstrapCampaign(repo, cid, { now: () => 0 });
    await bootstrapCampaign(repo, cid, { now: () => 0 });
    expect(await repo.listHolders(cid)).toHaveLength(1);
    expect((await repo.getDispatchPolicy(cid)).rules).toHaveLength(1);
  });
});
