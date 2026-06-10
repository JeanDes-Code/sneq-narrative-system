import type { Entity } from "../domain/entity.js";
import type { Router } from "../router/router.js";

export interface JudgeResult {
  matchedIndex: number | null;
  reasoning: string;
  confidence: number;
}

/** One retry on malformed output: light-tier models occasionally wrap JSON in
 *  prose or fences; a malformed verdict must not silently fork canon. */
export async function judgeMatch(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] }
): Promise<JudgeResult> {
  const first = await askJudge(router, args, false);
  if (first !== null) return first;
  const second = await askJudge(router, args, true);
  return second ?? { matchedIndex: null, confidence: 0, reasoning: "judge returned malformed JSON twice" };
}

const FENCES = /^```(?:json)?\s*|\s*```$/gi;

async function askJudge(
  router: Router,
  args: { mention: string; sceneDescription: string; candidates: Entity[] },
  strict: boolean
): Promise<JudgeResult | null> {
  const { mention, sceneDescription, candidates } = args;
  const list = candidates.map((c, i) => {
    const aliasText = c.aliases.map(a => a.text).join(", ");
    return `${i}. ${c.name} (${c.type})${c.description ? ` — ${c.description}` : ""} — aliases: ${aliasText || "(none)"}`;
  }).join("\n");

  const res = await router.chat("light", {
    system: `You disambiguate entity mentions for a narrative engine. Reply with strict JSON only.`,
    responseFormat: "json",
    messages: [{
      role: "user",
      content: `Mention: "${mention}"\nScene: ${sceneDescription || "(none)"}\nCandidates:\n${list}\n\nReply with JSON: {"matchedIndex": number|null, "confidence": number 0..1, "reasoning": string}. Use null if none match.`
        + (strict ? `\nIMPORTANT: return ONLY the raw JSON object — no prose, no markdown fences.` : "")
    }]
  });

  try {
    const stripped = res.text.trim().replace(FENCES, "").trim();
    const parsed = JSON.parse(stripped) as { matchedIndex: unknown; confidence: unknown; reasoning: unknown };
    return {
      matchedIndex: typeof parsed.matchedIndex === "number" ? parsed.matchedIndex : null,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : ""
    };
  } catch {
    return null;
  }
}
