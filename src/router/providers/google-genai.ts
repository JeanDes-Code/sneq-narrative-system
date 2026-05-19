import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";
import { ProviderHttpError } from "../interface.js";

export class GoogleGenAIProvider implements Provider {
  private readonly client: GoogleGenerativeAI;

  constructor(public readonly ref: ProviderRef) {
    const key = process.env[ref.apiKeyEnv];
    if (!key) throw new ProviderHttpError("AUTH", null, `missing env var ${ref.apiKeyEnv}`);
    this.client = new GoogleGenerativeAI(key);
  }

  async chat(req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    try {
      const temperature = req.temperature ?? this.ref.temperature;
      const maxOutputTokens = req.maxTokens ?? this.ref.maxTokens;
      const model = this.client.getGenerativeModel({
        model: this.ref.model,
        ...(req.system !== undefined ? { systemInstruction: req.system } : {}),
        generationConfig: {
          ...(temperature !== undefined ? { temperature } : {}),
          ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {})
        }
      });
      const contents = req.messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));
      const result = await model.generateContent({ contents });
      const text = result.response.text();
      return { text, toolCalls: [], modelUsed: this.ref.model, providerUsed: "google-genai" };
    } catch (e) {
      throw mapGoogleError(e);
    }
  }

  async embed(req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    try {
      const model = this.client.getGenerativeModel({ model: this.ref.model });
      const vectors: Float32Array[] = [];
      for (const t of req.texts) {
        const r = await model.embedContent(t);
        vectors.push(new Float32Array(r.embedding.values));
      }
      return {
        vectors,
        dim: vectors[0]?.length ?? 0,
        modelUsed: this.ref.model,
        providerUsed: "google-genai"
      };
    } catch (e) {
      throw mapGoogleError(e);
    }
  }
}

function mapGoogleError(e: unknown): ProviderHttpError {
  const msg = e instanceof Error ? e.message : String(e);
  const match = msg.match(/\[(\d{3})/) || msg.match(/status[: ]+(\d{3})/i);
  const status = match ? Number(match[1]) : null;
  if (status === 401 || status === 403) return new ProviderHttpError("AUTH", status, msg);
  if (status === 429) return new ProviderHttpError("QUOTA", status, msg);
  if (status && status >= 500) return new ProviderHttpError("SERVER", status, msg);
  if (e instanceof Error && e.name === "AbortError") return new ProviderHttpError("TIMEOUT", null, msg);
  return new ProviderHttpError("NETWORK", status, msg);
}
