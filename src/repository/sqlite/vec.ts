import type BetterSqlite3 from "better-sqlite3";
import { createRequire } from "node:module";

// sqlite-vec 0.1.x does not support filtering by auxiliary (+col) columns in
// KNN queries, so we encode campaign_id into the primary key as
// "<campaignId>|<entityId>" to allow per-campaign isolation and deletion.

// Loaded lazily (and synchronously, via createRequire) so that repositories
// with embeddingDim 0 never touch the native module — sqlite-vec stays a
// genuinely optional peer for vector-free use.
let vecMod: { load(db: BetterSqlite3.Database): void } | null = null;

export function loadVec(db: BetterSqlite3.Database): void {
  if (!vecMod) {
    try {
      const require = createRequire(import.meta.url);
      vecMod = require("sqlite-vec") as { load(db: BetterSqlite3.Database): void };
    } catch (e) {
      throw new Error(
        `sqlite-vec is required for campaigns with embeddingDim > 0 — install the optional peers: pnpm add better-sqlite3 sqlite-vec (cause: ${e instanceof Error ? e.message : String(e)})`
      );
    }
  }
  vecMod.load(db);
}

export function ensureVecTable(db: BetterSqlite3.Database, dim: number): void {
  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_vec'`).get();
  if (exists) {
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'embedding_dim'`).get() as { value: string } | undefined;
    const stored = row ? Number(row.value) : null;
    if (stored !== null && stored !== dim) {
      throw new Error(`Embedding dim mismatch: stored=${stored}, configured=${dim}. Use a fresh database file or a different embedding provider.`);
    }
    return;
  }
  db.exec(`CREATE VIRTUAL TABLE entity_vec USING vec0(entity_id TEXT PRIMARY KEY, embedding FLOAT[${dim}] distance_metric=cosine)`);
  db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(dim));
}

/**
 * §14.5's migration, at the only granularity `vec0` allows: the virtual table
 * carries the dimension in its schema, so moving rungs means dropping and
 * recreating it. One database file therefore holds exactly one dimension —
 * which is why the caller must check that no *other* campaign still has
 * vectors before calling this.
 */
export function recreateVecTable(db: BetterSqlite3.Database, dim: number): void {
  db.exec(`DROP TABLE IF EXISTS entity_vec`);
  db.prepare(`DELETE FROM meta WHERE key = 'embedding_dim'`).run();
  if (dim > 0) {
    db.exec(`CREATE VIRTUAL TABLE entity_vec USING vec0(entity_id TEXT PRIMARY KEY, embedding FLOAT[${dim}] distance_metric=cosine)`);
  }
  db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(dim));
}

/** Entity ids (campaign-scoped) that still hold a vector, for a campaign other than `exceptCampaignId`. */
export function campaignsWithVectors(db: BetterSqlite3.Database, exceptCampaignId: string): string[] {
  const exists = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entity_vec'`).get();
  if (!exists) return [];
  const rows = db.prepare(`SELECT entity_id FROM entity_vec`).all() as Array<{ entity_id: string }>;
  const others = new Set<string>();
  for (const r of rows) {
    const cid = r.entity_id.slice(0, r.entity_id.indexOf("|"));
    if (cid && cid !== exceptCampaignId) others.add(cid);
  }
  return [...others];
}

function vecKey(campaignId: string, entityId: string): string {
  return `${campaignId}|${entityId}`;
}

export function upsertVec(db: BetterSqlite3.Database, campaignId: string, entityId: string, vec: Float32Array): void {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  db.prepare(`INSERT OR REPLACE INTO entity_vec (entity_id, embedding) VALUES (?, ?)`).run(vecKey(campaignId, entityId), buf);
}

export function searchVec(db: BetterSqlite3.Database, campaignId: string, vec: Float32Array, topK: number): Array<{ entity_id: string; distance: number }> {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  const prefix = `${campaignId}|`;
  // Fetch more than topK to account for cross-campaign rows that will be filtered out
  const rows = db.prepare(`
    SELECT entity_id, distance
    FROM entity_vec
    WHERE embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `).all(buf, topK * 10) as Array<{ entity_id: string; distance: number }>;
  return rows
    .filter(r => r.entity_id.startsWith(prefix))
    .slice(0, topK)
    .map(r => ({ entity_id: r.entity_id.slice(prefix.length), distance: r.distance }));
}

export function deleteVecForCampaign(db: BetterSqlite3.Database, campaignId: string): void {
  db.prepare(`DELETE FROM entity_vec WHERE entity_id LIKE ?`).run(`${campaignId}|%`);
}

export function deleteVecForEntity(db: BetterSqlite3.Database, campaignId: string, entityId: string): void {
  db.prepare(`DELETE FROM entity_vec WHERE entity_id = ?`).run(vecKey(campaignId, entityId));
}
