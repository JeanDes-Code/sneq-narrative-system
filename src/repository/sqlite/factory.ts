import { SqliteRepository, type SqliteRepositoryOptions } from "./index.js";

export function sqliteRepository(opts: SqliteRepositoryOptions): SqliteRepository {
  return new SqliteRepository(opts);
}
