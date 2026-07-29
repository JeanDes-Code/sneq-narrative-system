export type ProviderKind = "openai-compatible" | "anthropic" | "google-genai" | "custom";

export interface ProviderRef {
  provider: ProviderKind;
  baseUrl?: string;
  apiKeyEnv: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  /** Output dimension of the embedding model. Embeddings refs only; lets the Router
   *  reject mixed-dim chains and lets the CLI derive a default campaign dim. */
  embeddingDim?: number;
  quotaHint?: { requestsPerMinute?: number; requestsPerDay?: number; isFreeTier?: boolean };
}

export interface ProviderChain {
  primary: ProviderRef;
  fallbacks: ProviderRef[];
}

export type Tier = "heavy" | "light" | "embeddings";

export interface RouterTiers {
  heavy: ProviderChain;
  light: ProviderChain;
  /** Optional: omit entirely to run keyless / alias-only (no vector resolution). */
  embeddings?: ProviderChain;
}

export interface RouterConfig {
  tiers: RouterTiers;
  defaults?: {
    timeoutMs?: number;
    maxRetries?: number;
    backoff?: { strategy: "exponential" | "fixed"; baseMs: number };
  };
}

export interface ChatRequest {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools?: Array<{ name: string; description: string; inputSchema: object }>;
  responseFormat?: "text" | "json";
  maxTokens?: number;
  temperature?: number;
}

/** Token-usage metadata reported by the provider, camelCased from the wire format.
 *  Every field is optional: providers omit what they don't track. A missing field
 *  means "not reported", never zero. */
export interface ProviderUsage {
  promptTokens?: number | undefined;
  completionTokens?: number | undefined;
  totalTokens?: number | undefined;
  promptCacheHitTokens?: number | undefined;
  promptCacheMissTokens?: number | undefined;
  reasoningTokens?: number | undefined;
}

export interface ChatResponse {
  text: string;
  toolCalls: Array<{ name: string; arguments: unknown }>;
  modelUsed: string;
  providerUsed: string;
  usage?: ProviderUsage | undefined;
}

export interface EmbeddingRequest {
  texts: string[];
}

export interface EmbeddingResponse {
  vectors: Float32Array[];
  dim: number;
  modelUsed: string;
  providerUsed: string;
  usage?: ProviderUsage | undefined;
}

export interface Provider {
  readonly ref: ProviderRef;
  chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse>;
  embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse>;
}

export type ProviderErrorCode = "QUOTA" | "AUTH" | "SERVER" | "TIMEOUT" | "MALFORMED" | "NETWORK" | "UNSUPPORTED";

export class ProviderHttpError extends Error {
  constructor(public code: ProviderErrorCode, public status: number | null, message: string) {
    super(message);
    this.name = "ProviderHttpError";
  }
}
