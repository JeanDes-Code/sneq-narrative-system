import type { Observation } from "../domain/observation.js";
import type { SourcePreset } from "./types.js";
import { asSceneId } from "../domain/ids.js";

type PresetBody = Pick<Observation, "source" | "method">;

// fiabilite left Observation (#18) — reliability is Belief vocabulary now.
export const SOURCE_PRESETS: Record<SourcePreset, PresetBody> = {
  "gm-narration":     { source: "GM_NARRATION",     method: "DIALOGUE_DIRECT" },
  "player-utterance": { source: "PLAYER_UTTERANCE", method: "DIALOGUE_DIRECT" },
  "dice-roll":        { source: "DICE_ROLL",        method: "DEMONSTRATION" },
  "system":           { source: "SYSTEM",           method: "DEDUCTION_CONFIRMEE" }
};

export function buildObservation(
  preset: SourcePreset | undefined,
  override?: Partial<Observation>,
  sceneId?: string
): Observation {
  const body = SOURCE_PRESETS[preset ?? "gm-narration"];
  const base: Observation = {
    ...body,
    timestamp: Date.now(),
    ...(sceneId !== undefined ? { sceneId: asSceneId(sceneId) } : {})
  };
  return { ...base, ...(override ?? {}) };
}
