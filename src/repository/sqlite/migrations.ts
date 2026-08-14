import type BetterSqlite3 from "better-sqlite3";
import { migrateLegacyCampaign } from "../../core/migrate-legacy.js";
import type { AttributFige } from "../../domain/attribute.js";
import type { Potentialite } from "../../domain/potentialite.js";
import { asCampaignId } from "../../domain/ids.js";
import type { CampaignId } from "../../domain/ids.js";

export const SCHEMA_VERSION = 6;

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_dim INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS entities (
        campaign_id TEXT NOT NULL,
        id TEXT NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        nom_connu INTEGER NOT NULL,
        aliases TEXT NOT NULL,
        tags TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        embedding_refreshed_at INTEGER,
        PRIMARY KEY (campaign_id, id)
      );
      CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(campaign_id, type);
      CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(campaign_id, name);

      CREATE TABLE IF NOT EXISTS aliases_norm (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        normalized TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, normalized)
      );
      CREATE INDEX IF NOT EXISTS idx_aliases_norm ON aliases_norm(campaign_id, normalized);

      CREATE TABLE IF NOT EXISTS figed (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        attribute_key TEXT NOT NULL,
        fact_id TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT NOT NULL,
        observation TEXT NOT NULL,
        turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );
      CREATE INDEX IF NOT EXISTS idx_figed_category ON figed(campaign_id, category);

      CREATE TABLE IF NOT EXISTS potentialites (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        attribute_key TEXT NOT NULL,
        etat TEXT NOT NULL,
        contraintes TEXT NOT NULL,
        contexte_generatif TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );

      CREATE TABLE IF NOT EXISTS nodes (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        type TEXT NOT NULL,
        etat_actuel TEXT NOT NULL,
        poids_narratif REAL NOT NULL,
        tags TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id)
      );

      CREATE TABLE IF NOT EXISTS edges (
        campaign_id TEXT NOT NULL,
        key TEXT NOT NULL,
        source TEXT NOT NULL,
        cible TEXT NOT NULL,
        type_relation TEXT NOT NULL,
        directionnalite TEXT NOT NULL,
        force_propagation REAL NOT NULL,
        etat_arete TEXT NOT NULL,
        attributs TEXT NOT NULL,
        PRIMARY KEY (campaign_id, key)
      );
      CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(campaign_id, source);
      CREATE INDEX IF NOT EXISTS idx_edges_cible ON edges(campaign_id, cible);

      CREATE TABLE IF NOT EXISTS turns (
        campaign_id TEXT NOT NULL,
        turn_number INTEGER NOT NULL,
        summary TEXT,
        scene_id TEXT,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, turn_number)
      );

      CREATE TABLE IF NOT EXISTS scenes (
        campaign_id TEXT NOT NULL,
        id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        present_entity_ids TEXT NOT NULL,
        description TEXT NOT NULL,
        created_at_turn INTEGER NOT NULL,
        PRIMARY KEY (campaign_id, id)
      );
    `
  },
  {
    version: 2,
    sql: `ALTER TABLE entities ADD COLUMN description TEXT;`
  },
  {
    version: 3,
    sql: `ALTER TABLE campaigns ADD COLUMN entity_revision INTEGER NOT NULL DEFAULT 0;`
  },
  {
    // 0.5.0 ledger (§5.4). Events/records/effects/transitions are append-only:
    // no UPDATE statement for them exists anywhere in the adapter, and the
    // contract test asserts the absence of a mutation path on the surface.
    // Data migration (figed → canonical_attributes copy, LEGACY_CANON
    // synthesis, observation-blob rewrite) is build slice 2, not this schema.
    version: 4,
    sql: `
      CREATE TABLE IF NOT EXISTS events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        day INTEGER NOT NULL,
        turn INTEGER NOT NULL,
        place_id TEXT,
        gravity INTEGER NOT NULL,
        acts TEXT NOT NULL,
        circumstance TEXT NOT NULL,
        participants TEXT NOT NULL,
        surface_tokens TEXT NOT NULL,
        UNIQUE (campaign_id, event_id)
      );
      CREATE INDEX IF NOT EXISTS idx_events_order ON events(campaign_id, day, turn, seq);

      CREATE TABLE IF NOT EXISTS records (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        day INTEGER NOT NULL,
        turn INTEGER NOT NULL,
        payload TEXT NOT NULL,
        UNIQUE (campaign_id, record_id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_entity ON records(campaign_id, entity_id);

      CREATE TABLE IF NOT EXISTS holders (
        campaign_id TEXT NOT NULL,
        holder_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (campaign_id, holder_id)
      );

      CREATE TABLE IF NOT EXISTS carriages (
        campaign_id TEXT NOT NULL,
        carriage_id TEXT NOT NULL,
        to_place_id TEXT NOT NULL,
        arrival_day INTEGER,
        payload TEXT NOT NULL,
        PRIMARY KEY (campaign_id, carriage_id)
      );
      CREATE INDEX IF NOT EXISTS idx_carriages_arrival ON carriages(campaign_id, to_place_id, arrival_day);

      CREATE TABLE IF NOT EXISTS carriage_effects (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        carriage_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_carriage_effects ON carriage_effects(campaign_id, carriage_id);

      CREATE TABLE IF NOT EXISTS inventions (
        campaign_id TEXT NOT NULL,
        invention_id TEXT NOT NULL,
        status TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (campaign_id, invention_id)
      );
      CREATE INDEX IF NOT EXISTS idx_inventions_status ON inventions(campaign_id, status);

      CREATE TABLE IF NOT EXISTS invention_transitions (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        invention_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_invention_transitions ON invention_transitions(campaign_id, invention_id);

      CREATE TABLE IF NOT EXISTS operations (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        result TEXT NOT NULL,
        UNIQUE (campaign_id, operation_id)
      );

      CREATE TABLE IF NOT EXISTS dispatch_policies (
        campaign_id TEXT PRIMARY KEY,
        policy TEXT NOT NULL
      );

      ALTER TABLE campaigns ADD COLUMN world_day INTEGER NOT NULL DEFAULT 0;
    `
  },
  {
    // Projection storage (#27) + migration audit (#23). The data migration
    // itself (figed copy, LEGACY_CANON synthesis, blob rewrite, audit) runs
    // as a post-schema step in runMigrations, via core/migrate-legacy.
    version: 5,
    sql: `
      CREATE TABLE IF NOT EXISTS canonical_attributes (
        campaign_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        attribute_key TEXT NOT NULL,
        payload TEXT NOT NULL,
        PRIMARY KEY (campaign_id, entity_id, attribute_key)
      );

      CREATE TABLE IF NOT EXISTS migration_findings (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id TEXT NOT NULL,
        payload TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_migration_findings ON migration_findings(campaign_id);
    `
  },
  {
    // Place → realm membership as entity metadata (#26).
    version: 6,
    sql: `ALTER TABLE entities ADD COLUMN realm_id TEXT;`
  }
];

export function runMigrations(db: BetterSqlite3.Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const row = db.prepare(`SELECT version FROM schema_version ORDER BY version DESC LIMIT 1`).get() as { version: number } | undefined;
  const current = row?.version ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.exec(m.sql);
      db.prepare(`INSERT INTO schema_version (version) VALUES (?)`).run(m.version);
    }
  }
  // Data migration — the migration epoch (§4, #17 #18 #23). Runs exactly once:
  // only when this open moved an EXISTING pre-ledger DB (version 1-4) to 5.
  // A fresh DB (version 0) has no legacy canon to import.
  if (current > 0 && current < 5) {
    db.transaction(() => migrateLegacyData(db))();
  }
}

function migrateLegacyData(db: BetterSqlite3.Database): void {
  const campaigns = db.prepare(`SELECT id FROM campaigns`).all() as Array<{ id: string }>;
  for (const { id } of campaigns) {
    const campaignId: CampaignId = asCampaignId(id);
    const factRows = db.prepare(
      `SELECT * FROM figed WHERE campaign_id = ?`
    ).all(campaignId) as Array<{
      campaign_id: string; entity_id: string; attribute_key: string; fact_id: string;
      value: string; category: string; observation: string; turn: number;
    }>;
    const potRows = db.prepare(
      `SELECT * FROM potentialites WHERE campaign_id = ?`
    ).all(campaignId) as Array<{ entity_id: string; attribute_key: string; etat: string; contraintes: string; contexte_generatif: string }>;

    const facts = factRows.map(r => ({
      campaignId,
      factId: r.fact_id, entityId: r.entity_id, key: r.attribute_key,
      value: JSON.parse(r.value), category: r.category,
      observation: JSON.parse(r.observation), turn: r.turn
    })) as Array<AttributFige & { campaignId: CampaignId }>;
    const potentialites = potRows.map(r => ({
      entiteId: r.entity_id, attribut: r.attribute_key, etat: r.etat,
      contraintes: JSON.parse(r.contraintes), contexteGeneratif: JSON.parse(r.contexte_generatif)
    })) as Potentialite[];

    const out = migrateLegacyCampaign({ campaignId, facts, potentialites });

    for (const row of out.canonicalAttributes) {
      db.prepare(
        `INSERT OR REPLACE INTO canonical_attributes (campaign_id, entity_id, attribute_key, payload) VALUES (?, ?, ?, ?)`
      ).run(campaignId, row.entityId, row.key, JSON.stringify(row));
    }
    for (const e of out.legacyEvents) {
      db.prepare(
        `INSERT INTO events (campaign_id, event_id, day, turn, place_id, gravity, acts, circumstance, participants, surface_tokens)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(campaignId, e.eventId, e.day, e.turn, e.placeId ?? null, e.gravity,
            JSON.stringify(e.acts), e.circumstance, JSON.stringify(e.participants), JSON.stringify(e.surfaceTokens));
    }
    // #18: rewrite persisted observation blobs in place — the stale key dies here.
    for (const f of out.cleanedFacts) {
      db.prepare(`UPDATE figed SET observation = ? WHERE campaign_id = ? AND entity_id = ? AND attribute_key = ?`)
        .run(JSON.stringify(f.observation), campaignId, f.entityId, f.key);
    }
    for (const finding of out.findings) {
      db.prepare(`INSERT INTO migration_findings (campaign_id, payload) VALUES (?, ?)`)
        .run(campaignId, JSON.stringify(finding));
    }
  }
}
