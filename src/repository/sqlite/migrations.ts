import type BetterSqlite3 from "better-sqlite3";

export const SCHEMA_VERSION = 4;

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
}
