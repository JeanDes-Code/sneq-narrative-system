import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { Engine } from "../src/engine.js";
import { InMemoryRepository } from "../src/repository/memory/index.js";
import { SqliteRepository } from "../src/repository/sqlite/index.js";
import type { CampaignContext } from "../src/campaign.js";
import type { RouterConfig, Provider, ProviderRef, ChatRequest, EmbeddingRequest } from "../src/router/interface.js";
import { SneqContainmentError } from "../src/errors.js";
import { renderContextBlock } from "../src/core/holder-context.js";
import { asCampaignId, asEntityID, asHolderId } from "../src/domain/ids.js";
import type { EntityID } from "../src/domain/ids.js";
import { DEFAULT_REALM_ENTITY_ID } from "../src/atomic/bootstrap.js";

function fakeRouter(): { config: RouterConfig; deps: { resolveProvider(ref: ProviderRef): Provider } } {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model: "fake" };
  const provider: Provider = {
    ref,
    async chat(_req: ChatRequest) {
      return { text: "[]", toolCalls: [], modelUsed: ref.model, providerUsed: "custom" };
    },
    async embed(_req: EmbeddingRequest) {
      return { vectors: [new Float32Array([0])], dim: 1, modelUsed: ref.model, providerUsed: "custom" };
    }
  };
  return {
    config: {
      tiers: { heavy: { primary: ref, fallbacks: [] }, light: { primary: ref, fallbacks: [] } },
      defaults: { timeoutMs: 1000, maxRetries: 0 }
    },
    deps: { resolveProvider: () => provider }
  };
}

const cid = asCampaignId("valmure");
const FORGE = asEntityID("place_forge");
const TOLL = asEntityID("place_toll");
const SMITH = asEntityID("npc_smith");
const KEEPER = asEntityID("npc_keeper");
const H_FORGE = asHolderId("h_forge_commons");
const H_TOLL = asHolderId("h_toll_commons");

/**
 * §11's eight phases, run end to end on a real engine — the worked example
 * §12.2 rule 4 asks for, executed in CI so it cannot rot. All four consumers
 * reverse-engineered this loop from type signatures and all four got a
 * different answer.
 */
describe("the turn pipeline (§11), end to end", () => {
  let engine: Engine;
  let campaign: CampaignContext;

  beforeEach(async () => {
    const router = fakeRouter();
    engine = new Engine({
      repository: new InMemoryRepository({ embeddingDim: 0 }),
      router: router.config,
      _routerDeps: router.deps
    });
    campaign = await engine.createCampaign({ id: cid, name: "Valmure", embeddingDim: 0 });

    // Two places in the same realm, each with its own commons, and two people.
    for (const [id, name, type] of [
      [FORGE, "La Forge", "LIEU"], [TOLL, "Le Péage", "LIEU"],
      [SMITH, "Aldric", "PERSONNAGE"], [KEEPER, "Cassius", "PERSONNAGE"]
    ] as const) {
      await campaign.mentionEntity({ canonicalName: name, type, description: name });
      // mentionEntity issues its own id; author the fixture ids directly instead.
      await (engine as unknown as { repo: { upsertEntity(e: unknown): Promise<void> } }).repo.upsertEntity({
        campaignId: cid, id, type, name, nomConnu: true, aliases: [], tags: [],
        createdAt: 0, embedding: null, embeddingRefreshedAt: null,
        realmId: asEntityID(DEFAULT_REALM_ENTITY_ID)
      });
    }

    await campaign.upsertHolder({
      kind: "GROUP", holderId: H_FORGE, campaignId: cid, community: "forge", stratum: "commun",
      realmId: asEntityID(DEFAULT_REALM_ENTITY_ID), placeId: FORGE, standing: 0.5
    });
    await campaign.upsertHolder({
      kind: "GROUP", holderId: H_TOLL, campaignId: cid, community: "toll", stratum: "commun",
      realmId: asEntityID(DEFAULT_REALM_ENTITY_ID), placeId: TOLL, standing: 0.5
    });
  });

  afterEach(async () => { await engine.close(); });

  /** Phase G: the smith burns the toll-keeper's ledger, at the forge, witnessed by nobody from the toll. */
  async function commitTheBurning() {
    return campaign.commitNarrative({
      operationId: "op-burning",
      daysElapsed: 1,
      event: {
        eventId: "ev_burning" as never,
        placeId: FORGE,
        gravity: 2,
        circumstance: "Aldric jette le registre du péage dans le feu de la forge.",
        participants: [SMITH],
        surfaceTokens: ["le registre du péage"],
        acts: [{ actorId: SMITH, verb: "BURNS", objectId: TOLL }]
      }
    });
  }

  it("phase G: one bundle, atomic, and the day moves by what the fiction declared", async () => {
    const result = await commitTheBurning();
    expect(result.replayed).toBe(false);
    expect(result.newWorldDay).toBe(1);
    expect(result.eventId).toBe("ev_burning");
  });

  it("phase B: the witness knows it; the holder across town does not", async () => {
    await commitTheBurning();

    const atForge = await campaign.getHolderContext({ holderId: H_FORGE });
    expect(atForge.beliefs.length).toBeGreaterThan(0);
    expect(atForge.beliefs[0]!.certainty).toBe("WITNESSED");

    const atToll = await campaign.getHolderContext({ holderId: H_TOLL });
    expect(atToll.beliefs).toEqual([]);
    expect(atToll.explain).toMatch(/knows nothing/i);
  });

  // THE SLICE-5 GATE. The host composes whatever it wants and submits the final
  // string; SNEQ answers whether it carries a token this holder cannot hold.
  // Default posture is to throw: a containment failure is an engine bug, not a
  // gameplay outcome.
  it("phase D: containment over a composed payload throws for the holder who never learned it", async () => {
    await commitTheBurning();

    const witnessCtx = await campaign.getHolderContext({ holderId: H_FORGE });
    const payload = [
      renderContextBlock(witnessCtx),
      "",
      "Narrate what happens next."
    ].join("\n");

    // The witness may hold every token in their own context block.
    await expect(campaign.assertContainment({ holderId: H_FORGE, text: payload }))
      .resolves.toMatchObject({ pass: true });

    // The same payload handed to the holder across town is a leak, and it is
    // caught BEFORE the model speaks — which is the whole claim.
    await expect(campaign.assertContainment({ holderId: H_TOLL, text: payload }))
      .rejects.toThrow(SneqContainmentError);

    const report = await campaign.assertContainment({
      holderId: H_TOLL, text: payload, throwOnFail: false
    });
    expect(report.pass).toBe(false);
    expect(report.present).toContain("le registre du péage");
  });

  it("phase C: the transcript is filtered per holder, so the guarantee outlives one turn", async () => {
    await commitTheBurning();
    const entries = [
      { id: "t1", text: "Le vent se lève sur la route du nord." },
      { id: "t2", text: "Le registre du péage n'est plus que cendre." }
    ];
    const forHolderAcrossTown = await campaign.filterTranscript({ holderId: H_TOLL, entries });
    expect(forHolderAcrossTown.kept.map(e => e.id)).toEqual(["t1"]);
    expect(forHolderAcrossTown.dropped[0]!.present).toContain("le registre du péage");

    const forWitness = await campaign.filterTranscript({ holderId: H_FORGE, entries });
    expect(forWitness.kept).toHaveLength(2);
  });

  /**
   * The floor forbids the NAMES of an unlearned event's place, participants and
   * objects — not only the model-supplied tokens. Left alone that blocks the
   * host's own scene description: `prepare-turn` hands back `scene.description`,
   * the host composes it into the payload, and the place's own name fails the
   * pre-flight check for anyone who has not learned an event there.
   *
   * The direction of the error is right — containment fails loud rather than
   * leaking quiet — so the cure is an authored, per-entity exemption, not a
   * softer floor.
   */
  it("an undeclared place name is withheld once a secret event happens there", async () => {
    await commitTheBurning();
    const result = await campaign.filterTranscript({
      holderId: H_TOLL,
      entries: [{ id: "t1", text: "Vous poussez la porte de La Forge." }]
    });
    expect(result.kept).toEqual([]);
    expect(result.dropped[0]!.present).toContain("la forge");
  });

  it("declaring the place public frees its name, and nothing else", async () => {
    // Same fixture, one entity re-authored as common knowledge.
    await (engine as unknown as { repo: { upsertEntity(e: unknown): Promise<void> } }).repo.upsertEntity({
      campaignId: cid, id: FORGE, type: "LIEU", name: "La Forge",
      nomConnu: true, aliases: [], tags: ["public"],
      createdAt: 0, embedding: null, embeddingRefreshedAt: null,
      realmId: asEntityID(DEFAULT_REALM_ENTITY_ID)
    });
    await commitTheBurning();

    const result = await campaign.filterTranscript({
      holderId: H_TOLL,
      entries: [
        { id: "t1", text: "Vous poussez la porte de La Forge." },
        { id: "t2", text: "Le registre du péage n'est plus que cendre." }
      ]
    });
    // The name passes…
    expect(result.kept.map(e => e.id)).toEqual(["t1"]);
    // …and what happened there is still withheld. The exemption is about
    // identity, never about the secret.
    expect(result.dropped[0]!.present).toContain("le registre du péage");
  });

  it("phase F: the gate blocks a narration that leaks, and does not ask for a rewrite", async () => {
    await commitTheBurning();
    const report = await campaign.validateNarration({
      holderId: H_TOLL,
      narration: "Cassius hausse les épaules : le registre du péage a brûlé, dit-il."
    });
    expect(report.verdict).toBe("BLOCK");
    expect(report.ok).toBe(false);
    expect(report.containment?.present).toContain("le registre du péage");
    expect(report.repairHint).toMatch(/Do not reword it/);
  });

  it("phase F: without a holder the gate is honest that it checked nothing about entitlement", async () => {
    await commitTheBurning();
    const report = await campaign.validateNarration({
      narration: "Le registre du péage a brûlé."
    });
    expect(report.containment).toBeUndefined();
    expect(report.verdict).not.toBe("BLOCK");
  });

  // Phase A closes §2.6's hole: before 0.5.0 no tool, CLI command or bundle
  // field ever handed SNEQ the raw player utterance, so `promotionEvidence[]`
  // came from the caller and the model judged its own inventions.
  it("phase A → G: the engine detects uptake from the player's own words and promotes", async () => {
    await campaign.commitNarrative({
      operationId: "op-invent",
      daysElapsed: 0,
      event: {
        eventId: "ev_invent" as never, placeId: FORGE, gravity: 0,
        circumstance: "Aldric mentionne un vieux passeur nommé Bran.",
        participants: [SMITH], surfaceTokens: ["bran"],
        acts: [{ actorId: SMITH, verb: "MENTIONS" }]
      },
      inventions: [{
        inventionId: "inv_bran" as never,
        entityId: SMITH, attributeKey: "passeur_connu",
        value: { type: "STRING", value: "Bran" }, category: "SOCIAL",
        sourceNarration: "un vieux passeur nommé Bran",
        confidence: 0.4,
        surfaceTokens: ["Bran"]
      }]
    });

    // The preview: what the engine WOULD detect, without writing anything.
    const ingested = await campaign.ingestPlayerInput({
      holderId: H_FORGE, text: "Je demande à Bran de nous faire traverser."
    });
    expect(ingested.uptake).toEqual(["inv_bran"]);

    // The detection that counts, at commit, from the raw text — not from a
    // promotionEvidence[] the model could have written itself.
    const result = await campaign.commitNarrative({
      operationId: "op-uptake",
      daysElapsed: 1,
      playerUtterance: "Je demande à Bran de nous faire traverser.",
      event: {
        eventId: "ev_uptake" as never, placeId: FORGE, gravity: 0,
        circumstance: "Le joueur cherche Bran.",
        participants: [SMITH], surfaceTokens: [],
        acts: [{ actorId: SMITH, verb: "SEEKS" }]
      }
    });
    expect(result.promoted).toBe(1);
  });

  it("phase A: a same-turn echo of the GM's own phrasing is not uptake", async () => {
    await campaign.commitNarrative({
      operationId: "op-echo",
      daysElapsed: 0,
      playerUtterance: "Bran ? Qui est Bran ?",
      event: {
        eventId: "ev_echo" as never, placeId: FORGE, gravity: 0,
        circumstance: "Aldric mentionne Bran.",
        participants: [SMITH], surfaceTokens: [],
        acts: [{ actorId: SMITH, verb: "MENTIONS" }]
      },
      inventions: [{
        inventionId: "inv_echo" as never,
        entityId: SMITH, attributeKey: "passeur_connu",
        value: { type: "STRING", value: "Bran" }, category: "SOCIAL",
        sourceNarration: "Bran", confidence: 0.4, surfaceTokens: ["Bran"]
      }]
    }).then(r => expect(r.promoted).toBe(0));
  });

  it("phase H: tick moves the clock out of band and reports world health", async () => {
    await commitTheBurning();
    const { turnNumber, worldDay, health } = await campaign.advanceTurn({ summary: "downtime", days: 6 });
    expect(turnNumber).toBeGreaterThan(0);
    expect(worldDay).toBe(7);
    expect(health.frozenClock).toBe(false);
  });

  it("retrying the same operationId replays instead of writing twice (#29)", async () => {
    const first = await commitTheBurning();
    const retry = await commitTheBurning();
    expect(first.replayed).toBe(false);
    expect(retry.replayed).toBe(true);
    expect(retry.newWorldDay).toBe(first.newWorldDay);
  });

  it("resolving by entity runs the cascade, materializes the participant, and names the road (#21/#28)", async () => {
    await commitTheBurning();
    const ctx = await campaign.getHolderContext({ entityId: SMITH });
    expect(ctx.road).toBe("AUTO_PARTICIPANT");
    expect(ctx.resolvedFrom).toBe(SMITH);
    // Materialized holders are persisted, so doctor and listHolders can see them.
    expect((await campaign.listHolders()).map(h => String(h.holderId)))
      .toContain(`h_participant_${SMITH}`);
  });

  /**
   * You learn a place needs declaring AFTER it exists — when doctor says so, or
   * when a payload gets blocked. If `public: true` only worked on a brand-new
   * entity, the exemption would be unreachable for every entity that matters,
   * and it would fail silently.
   */
  it("mention_entity declares an entity public even when it already exists", async () => {
    const first = await campaign.mentionEntity({
      canonicalName: "La Taverne du Cerf", type: "LIEU", description: "une auberge"
    });
    const id = (first as { entityId: EntityID }).entityId;
    expect((await campaign.getEntity(id))!.tags).toEqual([]);

    const again = await campaign.mentionEntity({
      canonicalName: "La Taverne du Cerf", type: "LIEU", description: "une auberge", public: true
    });
    expect((again as { isNew: boolean }).isNew).toBe(false);
    expect((await campaign.getEntity(id))!.tags).toContain("public");

    // Idempotent: declaring it again does not duplicate the tag.
    await campaign.mentionEntity({
      canonicalName: "La Taverne du Cerf", type: "LIEU", description: "une auberge", public: true
    });
    expect((await campaign.getEntity(id))!.tags).toEqual(["public"]);
  });

  it("doctor lists the declared exemptions the ledger actually names", async () => {
    await (engine as unknown as { repo: { upsertEntity(e: unknown): Promise<void> } }).repo.upsertEntity({
      campaignId: cid, id: FORGE, type: "LIEU", name: "La Forge",
      nomConnu: true, aliases: [], tags: ["public"],
      createdAt: 0, embedding: null, embeddingRefreshedAt: null,
      realmId: asEntityID(DEFAULT_REALM_ENTITY_ID)
    });
    await commitTheBurning();
    const report = await campaign.doctor();
    const line = report.checks.find(c => c.id === "public-entities")!;
    expect(line.message).toMatch(/La Forge/);
  });

  it("an entity nobody has ever touched falls back to the campaign default group", async () => {
    const ctx = await campaign.getHolderContext({ entityId: KEEPER });
    expect(ctx.road).toBe("DEFAULT_GROUP");
    expect(ctx.beliefs).toEqual([]);
  });
});

/**
 * THE OTHER SLICE-5 GATE: `doctor` green on a migrated fixture campaign.
 * A 0.3 database, opened by 0.5.0, must come out the far side of the migration
 * with nothing failing — or the migration produced a campaign nobody can play.
 */
describe("doctor over a migrated 0.3 campaign", () => {
  function v3Db(): string {
    const path = `${process.env["TMPDIR"] ?? "/tmp"}/sneq-doctor-${Date.now()}-${Math.random().toString(36).slice(2)}.db`;
    const legacy = new Database(path);
    legacy.exec(`
      CREATE TABLE schema_version (version INTEGER PRIMARY KEY);
      INSERT INTO schema_version (version) VALUES (3);
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL,
        embedding_dim INTEGER NOT NULL, entity_revision INTEGER NOT NULL DEFAULT 0
      );
      INSERT INTO campaigns (id, name, created_at, embedding_dim) VALUES ('c1', 'Legacy', 0, 0);
      CREATE TABLE entities (
        campaign_id TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL,
        nom_connu INTEGER NOT NULL, aliases TEXT NOT NULL, tags TEXT NOT NULL,
        created_at INTEGER NOT NULL, embedding_refreshed_at INTEGER, description TEXT,
        PRIMARY KEY (campaign_id, id)
      );
      INSERT INTO entities VALUES ('c1', 'e1', 'PERSONNAGE', 'Aldric', 1, '[]', '[]', 0, NULL, 'smith');
      CREATE TABLE figed (
        campaign_id TEXT NOT NULL, entity_id TEXT NOT NULL, attribute_key TEXT NOT NULL,
        fact_id TEXT NOT NULL, value TEXT NOT NULL, category TEXT NOT NULL,
        observation TEXT NOT NULL, turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );
      CREATE TABLE potentialites (
        campaign_id TEXT NOT NULL, entity_id TEXT NOT NULL, attribute_key TEXT NOT NULL,
        etat TEXT NOT NULL, contraintes TEXT NOT NULL, contexte_generatif TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );
      CREATE TABLE turns (
        campaign_id TEXT NOT NULL, turn_number INTEGER NOT NULL, summary TEXT,
        scene_id TEXT, created_at INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, turn_number)
      );
      CREATE TABLE scenes (
        campaign_id TEXT NOT NULL, id TEXT NOT NULL, location_id TEXT NOT NULL,
        present_entity_ids TEXT NOT NULL, description TEXT NOT NULL,
        created_at_turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE TABLE nodes (
        campaign_id TEXT NOT NULL, entity_id TEXT NOT NULL, type TEXT NOT NULL,
        etat_actuel TEXT NOT NULL, poids_narratif REAL NOT NULL, tags TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id)
      );
      CREATE TABLE edges (
        campaign_id TEXT NOT NULL, key TEXT NOT NULL, source TEXT NOT NULL, cible TEXT NOT NULL,
        type_relation TEXT NOT NULL, directionnalite TEXT NOT NULL, force_propagation REAL NOT NULL,
        etat_arete TEXT NOT NULL, attributs TEXT NOT NULL,
        PRIMARY KEY (campaign_id, key)
      );
    `);
    legacy.prepare(`INSERT INTO figed VALUES ('c1', 'e1', 'metier', 'f1', ?, 'HISTORIQUE', ?, 3)`).run(
      JSON.stringify({ type: "STRING", value: "forgeron" }),
      JSON.stringify({ source: "GM_NARRATION", method: "DIALOGUE_DIRECT", timestamp: 0, fiabilite: "CERTAINE" })
    );
    legacy.close();
    return path;
  }

  it("comes out of the migration with nothing failing", async () => {
    const router = fakeRouter();
    const engine = new Engine({
      repository: new SqliteRepository({ path: v3Db(), embeddingDim: 0 }),
      router: router.config,
      _routerDeps: router.deps
    });
    const campaign = engine.campaign(asCampaignId("c1"));

    const report = await campaign.doctor();
    const failures = report.checks.filter(c => c.status === "FAIL");
    expect(failures.map(f => `${f.id}: ${f.message}`)).toEqual([]);
    expect(report.status).not.toBe("FAIL");

    // The migration epoch is on the ledger, not just in the projection: the
    // day-0 LEGACY_CANON event is what keeps rebuild(ledger) === projection
    // free of a special case.
    expect(report.checks.find(c => c.id === "ledger-fresh")!.status).toBe("PASS");
    await engine.close();
  });
});
