import Anthropic from "@anthropic-ai/sdk";
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

export class AnthropicProvider implements Provider {
  private readonly client: Anthropic;

  constructor(public readonly ref: ProviderRef) {
    const key = process.env[ref.apiKeyEnv];
    if (!key) throw new ProviderHttpError("AUTH", null, `missing env var ${ref.apiKeyEnv}`);
    this.client = new Anthropic({ apiKey: key, baseURL: ref.baseUrl });
  }

  async chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    try {
      const res = await this.client.messages.create({
        model: this.ref.model,
        ...(req.system !== undefined ? { system: req.system } : {}),
        max_tokens: req.maxTokens ?? this.ref.maxTokens ?? 4096,
        ...(req.temperature !== undefined || this.ref.temperature !== undefined
          ? { temperature: req.temperature ?? this.ref.temperature }
          : {}),
        messages: req.messages.map(m => ({ role: m.role, content: m.content })),
        ...(req.tools && req.tools.length > 0
          ? {
              tools: req.tools.map(t => ({
                name: t.name,
                description: t.description,
                input_schema: t.inputSchema as Anthropic.Messages.Tool["input_schema"]
              }))
            }
          : {})
      }, { signal });

      const textParts = res.content.filter(c => c.type === "text").map(c => (c as { text: string }).text);
      const toolCalls = res.content
        .filter(c => c.type === "tool_use")
        .map(c => ({ name: (c as { name: string }).name, arguments: (c as { input: unknown }).input }));

      return {
        text: textParts.join("\n"),
        toolCalls,
        modelUsed: this.ref.model,
        providerUsed: "anthropic"
      };
    } catch (e) {
      throw mapAnthropicError(e);
    }
  }

  async embed(_req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    throw new ProviderHttpError("UNSUPPORTED", null, "anthropic does not provide embeddings");
  }
}

function mapAnthropicError(e: unknown): ProviderHttpError {
  if (e instanceof Anthropic.APIError) {
    if (e.status === 401 || e.status === 403) return new ProviderHttpError("AUTH", e.status, e.message);
    if (e.status === 429) return new ProviderHttpError("QUOTA", e.status, e.message);
    if (e.status && e.status >= 500) return new ProviderHttpError("SERVER", e.status, e.message);
    return new ProviderHttpError("NETWORK", e.status ?? null, e.message);
  }
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, e.message);
  return new ProviderHttpError("NETWORK", null, e instanceof Error ? e.message : String(e));
}
