import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { Repository } from "./repository/interface.js";
import type { RouterConfig } from "./router/interface.js";
import type { RouterDeps } from "./router/router.js";
import type { Logger } from "./logger.js";
import type { ResolverThresholds } from "./resolver/thresholds.js";

export interface EngineConfig {
  repository: Repository;
  router: RouterConfig;
  /** Optional override for router provider resolution (useful in tests). */
  _routerDeps?: RouterDeps;
  resolver?: Partial<ResolverThresholds>;
  logger?: Logger;
}

export function loadConfigFromFile(path: string): { router: RouterConfig; resolver?: Partial<ResolverThresholds> } {
  const ext = extname(path).toLowerCase();
  const raw = readFileSync(path, "utf-8");
  if (ext === ".json") {
    return JSON.parse(raw) as { router: RouterConfig; resolver?: Partial<ResolverThresholds> };
  }
  throw new Error(`Unsupported config extension: ${ext}. Use .json or pass an object programmatically.`);
}
