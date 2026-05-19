export type ProviderKind = "openai-compatible" | "anthropic" | "google-genai" | "custom";

export interface ProviderRef {
  provider: ProviderKind;
  baseUrl?: string;
  apiKeyEnv: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  quotaHint?: { requestsPerMinute?: number; requestsPerDay?: number; isFreeTier?: boolean };
}

export interface ProviderChain {
  primary: ProviderRef;
  fallbacks: ProviderRef[];
}

export type Tier = "heavy" | "light" | "embeddings";

export interface RouterConfig {
  tiers: Record<Tier, ProviderChain>;
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

export interface ChatResponse {
  text: string;
  toolCalls: Array<{ name: string; arguments: unknown }>;
  modelUsed: string;
  providerUsed: string;
}

export interface EmbeddingRequest {
  texts: string[];
}

export interface EmbeddingResponse {
  vectors: Float32Array[];
  dim: number;
  modelUsed: string;
  providerUsed: string;
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
