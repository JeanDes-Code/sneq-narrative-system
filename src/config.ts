import { readFileSync } from "node:fs";
import { extname } from "node:path";
import type { AtomicWriteStrategy } from "./atomic/types.js";
import type { Repository, RepositoryAccess } from "./repository/interface.js";
import type { RouterConfig } from "./router/interface.js";
import type { Router, RouterDeps } from "./router/router.js";
import type { Logger } from "./logger.js";
import type { ResolverThresholds } from "./resolver/thresholds.js";

export interface EngineConfig {
  repository: Repository | RepositoryAccess;
  /** Explicit write strategy for repositories without transaction(callback). */
  writeStrategy?: AtomicWriteStrategy;
  router: RouterConfig;
  /** Optional prebuilt Router shared with another consumer such as a GM brain. */
  routerInstance?: Router;
  /** Optional override for router provider resolution (useful in tests). */
  _routerDeps?: RouterDeps;
  resolver?: Partial<ResolverThresholds>;
  logger?: Logger;
  /**
   * Fan-out cap for ALL_KNOWN_COMMUNITIES dispatch (#15). The Convex bundle is
   * one transaction with a document-write ceiling; truncation is deterministic
   * (nearest declared travelDays first) and always counted, never silent.
   */
  maxDispatchFanout?: number;
  /** Salience weights override (§2.5) — the factor list itself is fixed. */
  salienceWeights?: import("./core/salience.js").SalienceWeights;
}

/** Default for EngineConfig.maxDispatchFanout (#15). */
export const DEFAULT_MAX_DISPATCH_FANOUT = 64;

export function loadConfigFromFile(path: string): { router: RouterConfig; resolver?: Partial<ResolverThresholds> } {
  const ext = extname(path).toLowerCase();
  const raw = readFileSync(path, "utf-8");
  if (ext === ".json") {
    return JSON.parse(raw) as { router: RouterConfig; resolver?: Partial<ResolverThresholds> };
  }
  throw new Error(`Unsupported config extension: ${ext}. Use .json or pass an object programmatically.`);
}
