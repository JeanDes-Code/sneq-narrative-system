import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../interface.js";

export type CustomChatFn = (req: ChatRequest, signal: AbortSignal) => Promise<ChatResponse>;
export type CustomEmbedFn = (req: EmbeddingRequest, signal: AbortSignal) => Promise<EmbeddingResponse>;

export class CustomProvider implements Provider {
  constructor(public readonly ref: ProviderRef, private readonly chatFn: CustomChatFn, private readonly embedFn: CustomEmbedFn) {}
  chat(req: ChatRequest, signal: AbortSignal): Promise<ChatResponse> { return this.chatFn(req, signal); }
  embed(req: EmbeddingRequest, signal: AbortSignal): Promise<EmbeddingResponse> { return this.embedFn(req, signal); }
}
