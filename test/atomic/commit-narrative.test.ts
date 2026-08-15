import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryRepository } from "../../src/repository/memory/index.js";
import type { Repository } from "../../src/repository/interface.js";
import { commitNarrative } from "../../src/atomic/commit-narrative.js";
import type { CommitNarrativeBundle } from "../../src/core/commit-narrative.js";
import { asCampaignId, asEntityID, asEventId, asHolderId } from "../../src/domain/ids.js";
import { SneqValidationError } from "../../src/errors.js";

const cid = asCampaignId("c1");
const VALMURE = asEntityID("place-valmure");
const BOURG = asEntityID("place-bourg");
const DEFAULT_REALM = asEntityID("realm_default");

function bundle(operationId: string, over: Partial<CommitNarrativeBundle> = {}): CommitNarrativeBundle {
  return {
    campaignId: cid, operationId, daysElapsed: 1,
    event: {
      eventId: asEventId(`e-${operationId}`), placeId: VALMURE, gravity: 2,
      acts: [{ actorId: asEntityID("actor"), verb: "STRIKE",
               sets: { entityId: asEntityID("actor"), key: "statut", value: { type: "STRING", value: "recherché" }, category: "ETAT" } }],
      circumstance: "L'homme est désormais recherché.",
      participants: [asEntityID("actor")],
      surfaceTokens: ["recherché"]
    },
    ...over
  };
}

let repo: InMemoryRepository;

beforeEach(async () => {
  repo = new InMemoryRepository({ embeddingDim: 0 });
  await repo.createCampaign({ id: cid, name: "T", createdAt: 0, embeddingDim: 0 });
  await repo.upsertHolder({
    kind: "GROUP", holderId: asHolderId("g-bourg"), campaignId: cid,
    community: "bourg", stratum: "commun", realmId: DEFAULT_REALM, placeId: BOURG, standing: 0.5
  });
  await repo.setDispatchPolicy(cid, {
    routes: [{ fromPlaceId: VALMURE, toPlaceId: BOURG, travelDays: 2, route: "RUMOUR" }],
    rules: [{ minGravity: 2, route: "RUMOUR", targets: "ALL_KNOWN_COMMUNITIES", carrierLabel: "le bruit qui court" }]
  });
});

describe("commitNarrative — one bundle or nothing (§7.5)", () => {
  it("applies the whole plan: event, dispatch, projection, clock, turn", async () => {
    const result = await commitNarrative(repo, bundle("op-1"));
    expect(result.replayed).toBe(false);
    expect(result.newWorldDay).toBe(1);
    expect(result.turn).toBe(1);
    expect(await repo.getEvents(cid)).toHaveLength(1);
    expect(await repo.listCarriages(cid, {})).toHaveLength(1);
    expect((await repo.getCanonicalAttributes(cid, asEntityID("actor")))[0]!.value)
      .toEqual({ type: "STRING", value: "recherché" });
    expect(await repo.getWorldDay(cid)).toBe(1);
    expect((await repo.latestTurn(cid))?.turnNumber).toBe(1);
  });

  it("a retried operationId replays the recorded result — exactly one event, one transition set (#29)", async () => {
    const first = await commitNarrative(repo, bundle("op-1"));
    const second = await commitNarrative(repo, bundle("op-1"));
    expect(second.replayed).toBe(true);
    expect(second.newWorldDay).toBe(first.newWorldDay);
    expect(await repo.getEvents(cid)).toHaveLength(1);
    expect(await repo.getWorldDay(cid)).toBe(1);       // no double time advance
  });

  it("refuses a bundle that re-prices an existing holder, and writes nothing at all (#46)", async () => {
    await expect(commitNarrative(repo, bundle("op-standing", {
      holders: [{
        kind: "GROUP", holderId: asHolderId("g-bourg"), campaignId: cid,
        community: "bourg", stratum: "commun", realmId: DEFAULT_REALM, placeId: BOURG, standing: 0.95
      }]
    }))).rejects.toThrow(SneqValidationError);

    const stored = (await repo.listHolders(cid)).find(h => String(h.holderId) === "g-bourg");
    expect(stored && stored.kind === "GROUP" ? stored.standing : null).toBe(0.5);
    expect(await repo.getEvents(cid)).toHaveLength(0);   // atomic: the event went nowhere either
    expect(await repo.getWorldDay(cid)).toBe(0);
  });

  it("the host path keeps its authority — upsertHolder still sets standing (§5.3)", async () => {
    await repo.upsertHolder({
      kind: "GROUP", holderId: asHolderId("g-bourg"), campaignId: cid,
      community: "bourg", stratum: "commun", realmId: DEFAULT_REALM, placeId: BOURG, standing: 0.95
    });
    const stored = (await repo.listHolders(cid)).find(h => String(h.holderId) === "g-bourg");
    expect(stored && stored.kind === "GROUP" ? stored.standing : null).toBe(0.95);
  });

  it("injected failure at a write boundary → nothing visible", async () => {
    class FailingRepo extends InMemoryRepository {
      override async appendCarriage(): Promise<void> {
        throw new Error("boundary failure: appendCarriage");
      }
    }
    const failing: Repository = new FailingRepo({ embeddingDim: 0 });
    await failing.createCampaign({ id: cid, name: "F", createdAt: 0, embeddingDim: 0 });
    await failing.upsertHolder({
      kind: "GROUP", holderId: asHolderId("g-bourg"), campaignId: cid,
      community: "bourg", stratum: "commun", realmId: DEFAULT_REALM, placeId: BOURG, standing: 0.5
    });
    await failing.setDispatchPolicy(cid, {
      routes: [{ fromPlaceId: VALMURE, toPlaceId: BOURG, travelDays: 2, route: "RUMOUR" }],
      rules: [{ minGravity: 2, route: "RUMOUR", targets: "ALL_KNOWN_COMMUNITIES", carrierLabel: "le bruit qui court" }]
    });
    await expect(commitNarrative(failing, bundle("op-boom"))).rejects.toThrow(/boundary failure/);
    expect(await failing.getEvents(cid)).toEqual([]);
    expect(await failing.getWorldDay(cid)).toBe(0);
    expect(await failing.findOperation(cid, "op-boom")).toBeNull();
  });

  it("a NEW operationId reusing an existing eventId fails loud — the ledger is append-only", async () => {
    await commitNarrative(repo, bundle("op-1"));
    const dup = bundle("op-2");
    dup.event!.eventId = asEventId("e-op-1");
    await expect(commitNarrative(repo, dup)).rejects.toThrow(/append-only/);
    expect(await repo.getWorldDay(cid)).toBe(1);       // the failed commit advanced nothing
  });

  it("an event-less commit still moves the day and burns a turn", async () => {
    const result = await commitNarrative(repo, { campaignId: cid, operationId: "op-idle", daysElapsed: 3 });
    expect(result.newWorldDay).toBe(3);
    expect(await repo.getEvents(cid)).toEqual([]);
    expect(await repo.getWorldDay(cid)).toBe(3);
  });
});
