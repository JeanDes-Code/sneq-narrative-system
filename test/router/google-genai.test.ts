import { describe, it, expect, vi, beforeEach } from "vitest";

const { generateContent, getGenerativeModel } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const getGenerativeModel = vi.fn((_cfg: unknown) => ({ generateContent }));
  return { generateContent, getGenerativeModel };
});

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(cfg: unknown) { return getGenerativeModel(cfg); }
  }
}));

import { GoogleGenAIProvider } from "../../src/router/providers/google-genai.js";

describe("GoogleGenAIProvider", () => {
  beforeEach(() => {
    generateContent.mockReset();
    getGenerativeModel.mockClear();
    process.env["G_KEY"] = "k";
  });

  it("passes functionDeclarations and maps functionCalls back to toolCalls", async () => {
    generateContent.mockResolvedValue({
      response: { text: () => "", functionCalls: () => [{ name: "sneq__lookup_entity", args: { mention: "x" } }] }
    });
    const p = new GoogleGenAIProvider({ provider: "google-genai", apiKeyEnv: "G_KEY", model: "gemini-2.5-flash" });
    const r = await p.chat({
      messages: [{ role: "user", content: "hi" }],
      tools: [{ name: "sneq__lookup_entity", description: "d", inputSchema: { type: "object" } }]
    }, new AbortController().signal);
    expect(r.toolCalls).toEqual([{ name: "sneq__lookup_entity", arguments: { mention: "x" } }]);
    const req = generateContent.mock.calls[0]![0] as { tools?: Array<{ functionDeclarations: Array<{ name: string }> }> };
    expect(req.tools?.[0]?.functionDeclarations[0]?.name).toBe("sneq__lookup_entity");
  });

  it("sets responseMimeType for responseFormat json", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "{}", functionCalls: () => undefined } });
    const p = new GoogleGenAIProvider({ provider: "google-genai", apiKeyEnv: "G_KEY", model: "m" });
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }], responseFormat: "json" }, new AbortController().signal);
    expect(r.text).toBe("{}");
    const modelCfg = getGenerativeModel.mock.calls[0]![0] as { generationConfig?: { responseMimeType?: string } };
    expect(modelCfg.generationConfig?.responseMimeType).toBe("application/json");
  });

  it("returns plain text with no toolCalls when the model answers in prose", async () => {
    generateContent.mockResolvedValue({ response: { text: () => "bonjour", functionCalls: () => undefined } });
    const p = new GoogleGenAIProvider({ provider: "google-genai", apiKeyEnv: "G_KEY", model: "m" });
    const r = await p.chat({ messages: [{ role: "user", content: "hi" }] }, new AbortController().signal);
    expect(r.text).toBe("bonjour");
    expect(r.toolCalls).toEqual([]);
  });
});
