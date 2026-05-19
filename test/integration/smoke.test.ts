import { describe, it, expect } from "vitest";
import { Engine, defaultRouterConfig, asCampaignId } from "../../src/index.js";
import { sqliteRepository } from "../../src/repository/sqlite/factory.js";

const RUN = process.env["SNEQ_INTEGRATION_SMOKE"] === "1";

describe.skipIf(!RUN)("integration · smoke", () => {
  it("end-to-end resolution + fact registration against real providers", async () => {
    const engine = new Engine({
      repository: sqliteRepository({ path: ":memory:", embeddingDim: 768 }),
      router: defaultRouterConfig()
    });
    const campaign = await engine.createCampaign({
      id: asCampaignId("smoke"),
      name: "Smoke",
      embeddingDim: 768
    });

    await campaign.mentionEntity({
      canonicalName: "Aldric Fervent",
      type: "PERSONNAGE",
      aliases: ["the blacksmith"],
      description: "A grizzled smith."
    });

    const res = await campaign.resolveEntity({ mention: "the blacksmith" });
    expect(res.match?.name).toBe("Aldric Fervent");

    await engine.close();
  }, 60_000);
});
