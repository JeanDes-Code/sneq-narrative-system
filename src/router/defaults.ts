import type { RouterConfig } from "./interface.js";

export function defaultRouterConfig(): RouterConfig {
  return {
    tiers: {
      heavy: {
        primary: { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" },
        fallbacks: [
          { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "gemini-2.5-pro" },
          { provider: "anthropic",    apiKeyEnv: "ANTHROPIC_API_KEY",   model: "claude-haiku-4-5-20251001" }
        ]
      },
      light: {
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "gemini-2.5-flash" },
        fallbacks: [
          { provider: "openai-compatible", baseUrl: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY", model: "mistral-small-latest" },
          { provider: "openai-compatible", baseUrl: "https://api.deepseek.com/v1", apiKeyEnv: "DEEPSEEK_API_KEY", model: "deepseek-chat" }
        ]
      },
      embeddings: {
        // Single provider on purpose: text-embedding-004 outputs 768-dim vectors and
        // the vector store is locked to one dim per database — a fallback with a
        // different dim (e.g. mistral-embed at 1024) would poison writes on failover.
        // Add your own fallbacks only if they produce the same dimension.
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "text-embedding-004", embeddingDim: 768 },
        fallbacks: []
      }
    },
    defaults: { timeoutMs: 30_000, maxRetries: 1, backoff: { strategy: "exponential", baseMs: 500 } }
  };
}
