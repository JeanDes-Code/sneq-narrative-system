import type {
  RouterConfig, Tier, ProviderRef, Provider,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse
} from "./interface.js";
import { ProviderHttpError } from "./interface.js";

export interface RouterDeps {
  resolveProvider(ref: ProviderRef): Provider;
}

export class RouterExhaustedError extends Error {
  constructor(public tier: Tier, public attempts: Array<{ provider: string; model: string; error: string }>) {
    super(`Router chain exhausted for tier ${tier} after ${attempts.length} attempts`);
    this.name = "RouterExhaustedError";
  }
}

export class Router {
  private disabled = new Set<string>();

  constructor(private readonly cfg: RouterConfig, private readonly deps: RouterDeps) {}

  async chat(tier: Tier, req: ChatRequest): Promise<ChatResponse> {
    return this.runWithFallback(tier, async (provider, signal) => provider.chat(req, signal));
  }

  async embed(req: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.runWithFallback("embeddings", async (provider, signal) => provider.embed(req, signal));
  }

  private chainFor(tier: Tier): ProviderRef[] {
    const c = this.cfg.tiers[tier];
    return [c.primary, ...c.fallbacks];
  }

  private async runWithFallback<T>(tier: Tier, op: (p: Provider, s: AbortSignal) => Promise<T>): Promise<T> {
    const chain = this.chainFor(tier);
    const attempts: Array<{ provider: string; model: string; error: string }> = [];
    const timeoutMs = this.cfg.defaults?.timeoutMs ?? 30_000;

    for (const ref of chain) {
      const key = refKey(ref);
      if (this.disabled.has(key)) continue;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const provider = this.deps.resolveProvider(ref);
        const r = await op(provider, ctrl.signal);
        clearTimeout(timer);
        return r;
      } catch (e) {
        clearTimeout(timer);
        const err = normalizeError(e);
        attempts.push({ provider: ref.provider, model: ref.model, error: `${err.code}:${err.message}` });
        if (err.code === "AUTH") this.disabled.add(key);
        continue;
      }
    }
    throw new RouterExhaustedError(tier, attempts);
  }
}

function refKey(r: ProviderRef): string {
  return `${r.provider}|${r.baseUrl ?? ""}|${r.model}`;
}

function normalizeError(e: unknown): ProviderHttpError {
  if (e instanceof ProviderHttpError) return e;
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, "request aborted");
  if (e instanceof Error) return new ProviderHttpError("NETWORK", null, e.message);
  return new ProviderHttpError("NETWORK", null, String(e));
}

// Task 4.8 — stub factory; real providers (openai-compatible / anthropic / google-genai) land in the next dispatch.
export function createDefaultDeps(): RouterDeps {
  return {
    resolveProvider(ref) {
      throw new Error(
        `No provider factory wired for "${ref.provider}". ` +
        `Provide a custom RouterDeps to Router, or wait for the openai-compatible / anthropic / google-genai factory to be wired in.`
      );
    }
  };
}
