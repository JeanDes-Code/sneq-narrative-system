import type { Entity } from "../domain/entity.js";
import type { Router } from "../router/router.js";

export interface JudgeResult {
  matchedIndex: number | null;
  reasoning: string;
  confidence: number;
}

export async function judgeMatch(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] }
): Promise<JudgeResult> {
  const { mention, sceneDescription, candidates } = args;
  const list = candidates.map((c, i) => {
    const description = c.aliases.map(a => a.text).join(", ");
    return `${i}. ${c.name} (${c.type}) — aliases: ${description || "(none)"}`;
  }).join("\n");

  const res = await router.chat("light", {
    system: `You disambiguate entity mentions for a narrative engine. Reply with strict JSON only.`,
    responseFormat: "json",
    messages: [{
      role: "user",
      content: `Mention: "${mention}"\nScene: ${sceneDescription || "(none)"}\nCandidates:\n${list}\n\nReply with JSON: {"matchedIndex": number|null, "confidence": number 0..1, "reasoning": string}. Use null if none match.`
    }]
  });

  try {
    const parsed = JSON.parse(res.text) as { matchedIndex: unknown; confidence: unknown; reasoning: unknown };
    const idx = typeof parsed.matchedIndex === "number" ? parsed.matchedIndex : null;
    const conf = typeof parsed.confidence === "number" ? parsed.confidence : 0;
    const reasoning = typeof parsed.reasoning === "string" ? parsed.reasoning : "";
    return { matchedIndex: idx, confidence: conf, reasoning };
  } catch {
    return { matchedIndex: null, confidence: 0, reasoning: "judge returned malformed JSON" };
  }
}
