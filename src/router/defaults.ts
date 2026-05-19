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
        primary: { provider: "google-genai", apiKeyEnv: "GOOGLE_GENAI_API_KEY", model: "text-embedding-004" },
        fallbacks: [
          { provider: "openai-compatible", baseUrl: "https://api.mistral.ai/v1", apiKeyEnv: "MISTRAL_API_KEY", model: "mistral-embed" }
        ]
      }
    },
    defaults: { timeoutMs: 30_000, maxRetries: 1, backoff: { strategy: "exponential", baseMs: 500 } }
  };
}
