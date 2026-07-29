import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, ProviderUsage } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

/** Wire format of the OpenAI-compatible `usage` object (snake_case, all optional —
 *  DeepSeek adds prompt_cache_*, reasoning models add completion_tokens_details). */
interface RawUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  prompt_cache_hit_tokens?: number;
  prompt_cache_miss_tokens?: number;
  completion_tokens_details?: { reasoning_tokens?: number };
}

function parseUsage(raw: RawUsage | undefined): ProviderUsage | undefined {
  if (!raw) return undefined;
  return {
    promptTokens: raw.prompt_tokens,
    completionTokens: raw.completion_tokens,
    totalTokens: raw.total_tokens,
    promptCacheHitTokens: raw.prompt_cache_hit_tokens,
    promptCacheMissTokens: raw.prompt_cache_miss_tokens,
    reasoningTokens: raw.completion_tokens_details?.reasoning_tokens
  };
}

export class OpenAICompatibleProvider implements Provider {
  constructor(public readonly ref: ProviderRef, private readonly fetchImpl: typeof fetch = fetch) {
    if (!ref.baseUrl) throw new Error("openai-compatible provider requires baseUrl");
  }

  async chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> {
    const apiKey = process.env[this.ref.apiKeyEnv];
    if (!apiKey) throw new ProviderHttpError("AUTH", null, `missing env var ${this.ref.apiKeyEnv}`);

    const body: Record<string, unknown> = {
      model: this.ref.model,
      messages: [
        ...(req.system ? [{ role: "system", content: req.system }] : []),
        ...req.messages
      ],
      max_tokens: req.maxTokens ?? this.ref.maxTokens,
      temperature: req.temperature ?? this.ref.temperature
    };
    if (req.tools && req.tools.length > 0) {
      body["tools"] = req.tools.map(t => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.inputSchema }
      }));
    }
    if (req.responseFormat === "json") body["response_format"] = { type: "json_object" };

    const url = `${this.ref.baseUrl!.replace(/\/$/, "")}/chat/completions`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) throw codeForStatus(res.status, await res.text());
    const data = await res.json() as {
      choices: Array<{ message: { content: string | null; tool_calls?: Array<{ function: { name: string; arguments: string } }> } }>
      usage?: RawUsage;
    };
    const choice = data.choices[0];
    if (!choice) throw new ProviderHttpError("MALFORMED", res.status, "no choices in response");
    const toolCalls = (choice.message.tool_calls ?? []).map(tc => ({
      name: tc.function.name,
      arguments: safeJson(tc.function.arguments)
    }));
    return {
      text: choice.message.content ?? "",
      toolCalls,
      modelUsed: this.ref.model,
      providerUsed: this.ref.baseUrl!,
      usage: parseUsage(data.usage)
    };
  }

  async embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse> {
    const apiKey = process.env[this.ref.apiKeyEnv];
    if (!apiKey) throw new ProviderHttpError("AUTH", null, `missing env var ${this.ref.apiKeyEnv}`);

    const url = `${this.ref.baseUrl!.replace(/\/$/, "")}/embeddings`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model: this.ref.model, input: req.texts }),
      signal
    });

    if (!res.ok) throw codeForStatus(res.status, await res.text());
    const data = await res.json() as { data: Array<{ embedding: number[] }>; usage?: RawUsage };
    const vectors = data.data.map(d => new Float32Array(d.embedding));
    return {
      vectors,
      dim: vectors[0]?.length ?? 0,
      modelUsed: this.ref.model,
      providerUsed: this.ref.baseUrl!,
      usage: parseUsage(data.usage)
    };
  }
}

function codeForStatus(status: number, body: string): ProviderHttpError {
  if (status === 401 || status === 403) return new ProviderHttpError("AUTH", status, body);
  if (status === 429) return new ProviderHttpError("QUOTA", status, body);
  if (status >= 500) return new ProviderHttpError("SERVER", status, body);
  return new ProviderHttpError("NETWORK", status, body);
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}
