import type BetterSqlite3 from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

// sqlite-vec 0.1.x does not support filtering by auxiliary (+col) columns in
// KNN queries, so we encode campaign_id into the primary key as
// "<campaignId>|<entityId>" to allow per-campaign isolation and deletion.

export function loadVec(db: BetterSqlite3.Database): void {
  sqliteVec.load(db);
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
