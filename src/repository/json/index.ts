import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { InMemoryRepository, emptyMemoryState, type MemoryState } from "../memory/index.js";

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

interface PersistedShape { version: 1; dim: number | null; state: MemoryState; }

function encode(state: MemoryState, dim: number | null): string {
  return JSON.stringify({ version: 1, dim, state }, (_k, v: unknown) => {
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
  if (parsed.version !== 1) {
    throw new Error(`unsupported sneq json store version: ${String((parsed as { version: unknown }).version)} (this build reads version 1)`);
  }
  const state: MemoryState = { ...emptyMemoryState(), ...parsed.state };
  return { dim: parsed.dim, state };
}
