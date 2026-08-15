import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { InMemoryRepository, emptyMemoryState, type MemoryState } from "../memory/index.js";
import { migrateLegacyCampaign } from "../../core/migrate-legacy.js";
import { bootstrapPlan } from "../../atomic/bootstrap.js";
import { asCampaignId } from "../../domain/ids.js";
import type { CampaignId } from "../../domain/ids.js";
import type { LegacyFact } from "../../domain/migration.js";

export interface JsonFileRepositoryOptions {
  /** Path of the JSON store (created on first write; parent dirs created). */
  path: string;
  /** Vector dimension; omit to adopt from the file or the first createCampaign(). 0 = no vectors. */
  embeddingDim?: number;
}

/**
 * File-backed Repository with zero native dependencies: the in-memory adapter
 * plus write-through persistence (atomic tmp+rename on every mutation, once per
 * transaction). Human-readable saves, trivially debuggable. Single-process use;
 * not for concurrent writers.
 */
export class JsonFileRepository extends InMemoryRepository {
  private readonly filePath: string;

  constructor(opts: JsonFileRepositoryOptions) {
    super(opts.embeddingDim !== undefined ? { embeddingDim: opts.embeddingDim } : {});
    this.filePath = opts.path;
    const loaded = tryLoad(this.filePath);
    if (loaded) {
      if (this.dim !== null && loaded.dim !== null && loaded.dim !== this.dim) {
        throw new Error(`Embedding dim mismatch: stored=${loaded.dim}, configured=${this.dim}. Use a fresh store file or a matching embeddingDim.`);
      }
      this.state = loaded.state;
      this.dim = this.dim ?? loaded.dim;
    }
  }

  protected override async mutated(): Promise<void> {
    if (this.txDepth > 0) return; // a transaction persists once, at commit
    this.persist();
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    writeFileSync(tmp, encode(this.state, this.dim), "utf-8");
    renameSync(tmp, this.filePath);
  }
}

export function jsonFileRepository(opts: JsonFileRepositoryOptions): JsonFileRepository {
  return new JsonFileRepository(opts);
}

/**
 * v2 adds the 0.5.0 ledger collections and drops `facts`: `AttributFige` is a
 * clean break at 0.5.0 (§2.6, no alias), so a v1 file's fact store is read once
 * by the migration and never written again.
 */
interface PersistedShape { version: 1 | 2; dim: number | null; state: MemoryState; }

/** The v1 fact store, as it still sits in an old file on disk. */
type LegacyFactStore = Map<string, Map<string, LegacyFact & { campaignId: CampaignId }>>;

function encode(state: MemoryState, dim: number | null): string {
  return JSON.stringify({ version: 2, dim, state }, (_k, v: unknown) => {
    if (v instanceof Map) return { __map: [...v.entries()] };
    if (v instanceof Float32Array) return { __f32: [...v] };
    return v;
  });
}

function tryLoad(path: string): { dim: number | null; state: MemoryState } | null {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const parsed = JSON.parse(raw, (_k, v: unknown) => {
    if (v && typeof v === "object" && "__map" in (v as object)) {
      return new Map(((v as { __map: [string, unknown][] }).__map));
    }
    if (v && typeof v === "object" && "__f32" in (v as object)) {
      return new Float32Array((v as { __f32: number[] }).__f32);
    }
    return v;
  }) as PersistedShape;
  if (parsed.version !== 1 && parsed.version !== 2) {
    throw new Error(`unsupported sneq json store version: ${String((parsed as { version: unknown }).version)} (this build reads versions 1-2)`);
  }
  const legacyFacts = (parsed.state as unknown as { facts?: LegacyFactStore }).facts;
  const state: MemoryState = { ...emptyMemoryState(), ...parsed.state };
  delete (state as unknown as { facts?: unknown }).facts;
  if (parsed.version === 1) migrateV1State(state, legacyFacts);
  return { dim: parsed.dim, state };
}

/**
 * The migration epoch for v1 files (§4, #17 #18 #23) — same pure core as the
 * SQLite v5 data step, so the two adapters cannot drift.
 */
function migrateV1State(state: MemoryState, legacyFacts?: LegacyFactStore): void {
  for (const campaignId of state.campaigns.keys()) {
    const cid = asCampaignId(campaignId);
    const factsMap = legacyFacts?.get(campaignId);
    const potMap = state.potentialites.get(campaignId);
    const out = migrateLegacyCampaign({
      campaignId: cid,
      facts: [...(factsMap?.values() ?? [])],
      potentialites: [...(potMap?.values() ?? [])]
    });
    // `cleanedFacts` (#18) is not written back: the LEGACY_FACT canonical rows
    // below already carry the cleaned observation, and the v1 fact store has no
    // reader left.
    const canon = new Map(out.canonicalAttributes.map(r => [`${r.entityId}|${r.key}`, r] as const));
    if (canon.size > 0) state.canonicalAttributes.set(campaignId, canon);
    if (out.legacyEvents.length > 0) {
      state.events.set(campaignId, new Map(out.legacyEvents.map(e => [String(e.eventId), e] as const)));
    }
    if (out.findings.length > 0) state.migrationFindings.set(campaignId, out.findings);

    // Same reason as the SQLite path: a migrated campaign with no default group
    // has no floor to the holder cascade, so nobody can hold anything.
    const plan = bootstrapPlan(cid, 0);
    const entities = state.entities.get(campaignId) ?? new Map();
    if (!entities.has(plan.realmEntity.id)) {
      entities.set(plan.realmEntity.id, plan.realmEntity);
      state.entities.set(campaignId, entities);
      const holders = state.holders.get(campaignId) ?? new Map();
      holders.set(String(plan.defaultGroup.holderId), plan.defaultGroup);
      state.holders.set(campaignId, holders);
      state.dispatchPolicies.set(campaignId, plan.policy);
    }
  }
}
