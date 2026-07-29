import { describe, it, expect, vi, beforeEach } from "vitest";

import { OpenAICompatibleProvider } from "../../src/router/providers/openai-compatible.js";
import type { ProviderRef } from "../../src/router/interface.js";

function makeRef(): ProviderRef {
  return { provider: "openai-compatible", baseUrl: "https://api.example.com/v1", apiKeyEnv: "OAI_KEY", model: "test-model" };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("OpenAICompatibleProvider", () => {
  beforeEach(() => {
    process.env["OAI_KEY"] = "k";
  });

  it("maps text and tool calls from the chat response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: "hello", tool_calls: [{ function: { name: "sneq__lookup_entity", arguments: "{\"mention\":\"x\"}" } }] } }]
    }));
    const p = new OpenAICompatibleProvider(makeRef(), fetchImpl);
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }] }, new AbortController().signal);
    expect(r.text).toBe("hello");
    expect(r.toolCalls).toEqual([{ name: "sneq__lookup_entity", arguments: { mention: "x" } }]);
  });

  it("exposes provider usage metadata with camelCased fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: "hello", tool_calls: [] } }],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 25,
        total_tokens: 125,
        prompt_cache_hit_tokens: 64,
        prompt_cache_miss_tokens: 36,
        completion_tokens_details: { reasoning_tokens: 10 }
      }
    }));
    const p = new OpenAICompatibleProvider(makeRef(), fetchImpl);
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }] }, new AbortController().signal);
    expect(r.usage).toEqual({
      promptTokens: 100,
      completionTokens: 25,
      totalTokens: 125,
      promptCacheHitTokens: 64,
      promptCacheMissTokens: 36,
      reasoningTokens: 10
    });
  });

  it("parses missing usage fields as undefined, never zero", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: "hello", tool_calls: [] } }],
      usage: { prompt_tokens: 100, total_tokens: 125 }
    }));
    const p = new OpenAICompatibleProvider(makeRef(), fetchImpl);
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }] }, new AbortController().signal);
    expect(r.usage?.promptTokens).toBe(100);
    expect(r.usage?.totalTokens).toBe(125);
    expect(r.usage?.completionTokens).toBeUndefined();
    expect(r.usage?.promptCacheHitTokens).toBeUndefined();
    expect(r.usage?.promptCacheMissTokens).toBeUndefined();
    expect(r.usage?.reasoningTokens).toBeUndefined();
  });

  it("leaves usage undefined when the provider omits the usage object entirely", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { content: "hello", tool_calls: [] } }]
    }));
    const p = new OpenAICompatibleProvider(makeRef(), fetchImpl);
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }] }, new AbortController().signal);
    expect(r.usage).toBeUndefined();
  });

  it("surfaces embedding usage metadata", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
      usage: { prompt_tokens: 12, total_tokens: 12 }
    }));
    const p = new OpenAICompatibleProvider(makeRef(), fetchImpl);
    const r = await p.embed({ texts: ["a", "b"] }, new AbortController().signal);
    expect(r.dim).toBe(3);
    expect(r.usage).toEqual({ promptTokens: 12, totalTokens: 12 });
  });
});
