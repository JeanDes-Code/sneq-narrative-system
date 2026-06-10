import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { JsonFileRepository } from "../../src/repository/json/index.js";
import { repositoryContract, DIM } from "./contract.js";
import { asCampaignId, asEntityID, asFeedbackId } from "../../src/domain/ids.js";

repositoryContract("json-file", () => {
  const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
  return new JsonFileRepository({ path: join(dir, "store.json"), embeddingDim: DIM });
});

describe("JsonFileRepository · persistence", () => {
  it("reloads state (including Float32Array embeddings and the adopted dim) from disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const cid = asCampaignId("c1");
    const r1 = new JsonFileRepository({ path });
    await r1.createCampaign({ id: cid, name: "Persist", createdAt: 0, embeddingDim: 4 });
    await r1.upsertEntity({
      campaignId: cid, id: asEntityID("e1"), type: "PERSONNAGE", name: "Aldric",
      nomConnu: true, aliases: [], tags: [], createdAt: 0, description: "smith",
      embedding: new Float32Array([1, 0, 0, 0]), embeddingRefreshedAt: 1
    });
    await r1.appendFeedback(cid, {
      id: asFeedbackId("fb_1"), origin: "AGENT", kind: "FRICTION",
      body: "persist me", status: "OPEN", createdAt: 1
    });
    await r1.appendToolCallLog(cid, { tool: "sneq__get_entity", outcome: "OK", durationMs: 5, createdAt: 1 });
    await r1.close();
    const r2 = new JsonFileRepository({ path }); // no dim: adopt from file
    const got = await r2.getEntity(cid, asEntityID("e1"));
    expect(got?.description).toBe("smith");
    expect(got?.embedding).toBeInstanceOf(Float32Array);
    expect(Array.from(got!.embedding!)).toEqual([1, 0, 0, 0]);
    expect(await r2.queryFeedback(cid, {})).toHaveLength(1);
    const agg = await r2.aggregateToolCalls(cid);
    expect(agg).toHaveLength(1);
    expect(agg[0]?.calls).toBe(1);
    await expect(r2.createCampaign({ id: asCampaignId("c2"), name: "bad", createdAt: 0, embeddingDim: 9 }))
      .rejects.toThrow(/dim/i);
    await r2.close();
  });

  it("rejects opening with a dim that contradicts the stored one", async () => {
    const dir = mkdtempSync(join(tmpdir(), "sneq-json-"));
    const path = join(dir, "store.json");
    const r1 = new JsonFileRepository({ path, embeddingDim: 4 });
    await r1.createCampaign({ id: asCampaignId("c1"), name: "x", createdAt: 0, embeddingDim: 4 });
    await r1.close();
    expect(() => new JsonFileRepository({ path, embeddingDim: 8 })).toThrow(/dim mismatch/i);
  });
});
