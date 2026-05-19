import type { Provider, ProviderRef, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from "../../src/router/interface.js";
import { ProviderHttpError, type ProviderErrorCode } from "../../src/router/interface.js";

export type ScriptedResponse =
  | { kind: "chat"; response: Partial<ChatResponse> }
  | { kind: "embed"; vectors: number[][] }
  | { kind: "error"; code: ProviderErrorCode; status: number | null; message: string };

export class ReplayProvider implements Provider {
  private idx = 0;
  constructor(public readonly ref: ProviderRef, private readonly script: ScriptedResponse[]) {}

  async chat(_req: ChatRequest, _signal: AbortSignal): Promise<ChatResponse> {
    const next = this.next();
    if (next.kind === "error") throw new ProviderHttpError(next.code, next.status, next.message);
    if (next.kind !== "chat") throw new Error(`Script step ${this.idx - 1} is ${next.kind}, expected chat`);
    return {
      text: next.response.text ?? "",
      toolCalls: next.response.toolCalls ?? [],
      modelUsed: this.ref.model,
      providerUsed: this.ref.provider
    };
  }

  async embed(_req: EmbeddingRequest, _signal: AbortSignal): Promise<EmbeddingResponse> {
    const next = this.next();
    if (next.kind === "error") throw new ProviderHttpError(next.code, next.status, next.message);
    if (next.kind !== "embed") throw new Error(`Script step ${this.idx - 1} is ${next.kind}, expected embed`);
    const vectors = next.vectors.map(v => new Float32Array(v));
    return {
      vectors,
      dim: vectors[0]?.length ?? 0,
      modelUsed: this.ref.model,
      providerUsed: this.ref.provider
    };
  }

  callCount(): number { return this.idx; }

  private next(): ScriptedResponse {
    if (this.idx >= this.script.length) throw new Error(`ReplayProvider exhausted after ${this.idx} calls`);
    return this.script[this.idx++]!;
  }
}

export function replayProvider(model: string, script: ScriptedResponse[]): ReplayProvider {
  const ref: ProviderRef = { provider: "custom", apiKeyEnv: "_NOOP", model };
  return new ReplayProvider(ref, script);
}
