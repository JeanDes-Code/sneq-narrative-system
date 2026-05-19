import type BetterSqlite3 from "better-sqlite3";

export const SCHEMA_VERSION = 1;

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
