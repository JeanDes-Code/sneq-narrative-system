import type BetterSqlite3 from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

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
  db.exec(`CREATE VIRTUAL TABLE entity_vec USING vec0(entity_id TEXT PRIMARY KEY, embedding FLOAT[${dim}])`);
  db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('embedding_dim', ?)`).run(String(dim));
}

export function upsertVec(db: BetterSqlite3.Database, entityId: string, vec: Float32Array): void {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  db.prepare(`INSERT OR REPLACE INTO entity_vec (entity_id, embedding) VALUES (?, ?)`).run(entityId, buf);
}

export function searchVec(db: BetterSqlite3.Database, vec: Float32Array, topK: number): Array<{ entity_id: string; distance: number }> {
  const buf = Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
  return db.prepare(`
    SELECT entity_id, vec_distance_cosine(embedding, ?) AS distance
    FROM entity_vec
    ORDER BY distance
    LIMIT ?
  `).all(buf, topK) as Array<{ entity_id: string; distance: number }>;
}
