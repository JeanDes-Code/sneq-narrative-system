import type {
  RouterConfig, Tier, ProviderRef, Provider,
  ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse
} from "./interface.js";
import { ProviderHttpError } from "./interface.js";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";
import { CustomProvider, type CustomChatFn, type CustomEmbedFn } from "./providers/custom.js";

export interface RouterDeps {
  resolveProvider(ref: ProviderRef): Provider | Promise<Provider>;
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
    const maxRetries = this.cfg.defaults?.maxRetries ?? 0;

    for (const ref of chain) {
      const key = refKey(ref);
      if (this.disabled.has(key)) continue;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const provider = await this.deps.resolveProvider(ref);
          const r = await op(provider, ctrl.signal);
          clearTimeout(timer);
          return r;
        } catch (e) {
          clearTimeout(timer);
          const err = normalizeError(e);
          attempts.push({ provider: ref.provider, model: ref.model, error: `${err.code}:${err.message}` });
          if (err.code === "AUTH") { this.disabled.add(key); break; }
          if (!RETRYABLE.has(err.code) || attempt === maxRetries) break;
          await sleep(backoffDelay(this.cfg.defaults, attempt));
        }
      }
    }
    throw new RouterExhaustedError(tier, attempts);
  }
}

const RETRYABLE: ReadonlySet<string> = new Set(["QUOTA", "SERVER", "TIMEOUT", "NETWORK"]);

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function backoffDelay(defaults: RouterConfig["defaults"], attempt: number): number {
  const b = defaults?.backoff ?? { strategy: "exponential" as const, baseMs: 500 };
  return b.strategy === "fixed" ? b.baseMs : b.baseMs * 2 ** attempt;
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

type SdkProviderKind = "anthropic" | "google-genai";
type ProviderCtor = new (ref: ProviderRef) => Provider;

const PEER_BY_KIND: Record<SdkProviderKind, string> = {
  "anthropic": "@anthropic-ai/sdk",
  "google-genai": "@google/generative-ai"
};

// The SDK-backed providers are loaded lazily so that @anthropic-ai/sdk and
// @google/generative-ai stay genuinely optional peers: a consumer who only
// uses openai-compatible (DeepSeek, Mistral, …) or custom never imports them.
async function defaultImportProvider(kind: SdkProviderKind): Promise<ProviderCtor> {
  if (kind === "anthropic") return (await import("./providers/anthropic.js")).AnthropicProvider;
  return (await import("./providers/google-genai.js")).GoogleGenAIProvider;
}

export interface DefaultDepsOptions {
  customChat?: CustomChatFn;
  customEmbed?: CustomEmbedFn;
  /** @internal test seam for the dynamic SDK-provider loading. */
  _importProvider?: (kind: SdkProviderKind) => Promise<ProviderCtor>;
}

export function createDefaultDeps(opts: DefaultDepsOptions = {}): RouterDeps {
  const cache = new Map<string, Provider>();
  const importProvider = opts._importProvider ?? defaultImportProvider;

  async function importPeer(kind: SdkProviderKind): Promise<ProviderCtor> {
    try {
      return await importProvider(kind);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes(PEER_BY_KIND[kind])) {
        throw new ProviderHttpError("UNSUPPORTED", null,
          `provider "${kind}" requires the optional peer dependency "${PEER_BY_KIND[kind]}" — install it: pnpm add ${PEER_BY_KIND[kind]}`);
      }
      throw e;
    }
  }

  return {
    async resolveProvider(ref) {
      const key = `${ref.provider}|${ref.baseUrl ?? ""}|${ref.model}`;
      const hit = cache.get(key);
      if (hit) return hit;
      let p: Provider;
      switch (ref.provider) {
        case "openai-compatible": p = new OpenAICompatibleProvider(ref); break;
        case "anthropic":         p = new (await importPeer("anthropic"))(ref); break;
        case "google-genai":      p = new (await importPeer("google-genai"))(ref); break;
        case "custom":
          if (!opts.customChat || !opts.customEmbed) {
            throw new Error("custom provider needs customChat and customEmbed functions in DefaultDepsOptions");
          }
          p = new CustomProvider(ref, opts.customChat, opts.customEmbed);
          break;
      }
      cache.set(key, p);
      return p;
    }
  };
}
