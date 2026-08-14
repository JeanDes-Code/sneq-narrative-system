import { describe, it, expect, vi } from "vitest";
import { buildObservation, SOURCE_PRESETS } from "../../../src/cli/observation.js";

describe("buildObservation", () => {
  it("defaults to gm-narration", () => {
    const o = buildObservation(undefined);
    expect(o.source).toBe("GM_NARRATION");
    expect(o.method).toBe("DIALOGUE_DIRECT");
    expect(typeof o.timestamp).toBe("number");
  });

  it("expands player-utterance preset", () => {
    const o = buildObservation("player-utterance");
    expect(o.source).toBe("PLAYER_UTTERANCE");
    expect(o.method).toBe("DIALOGUE_DIRECT");
  });

  it("carries no fiabilite key — provenance only (#18)", () => {
    expect(Object.keys(buildObservation(undefined))).not.toContain("fiabilite");
  });

  it("expands dice-roll preset to DEMONSTRATION method", () => {
    const o = buildObservation("dice-roll");
    expect(o.source).toBe("DICE_ROLL");
    expect(o.method).toBe("DEMONSTRATION");
  });

  it("expands system preset", () => {
    const o = buildObservation("system");
    expect(o.source).toBe("SYSTEM");
    expect(o.method).toBe("DEDUCTION_CONFIRMEE");
  });

  it("partial override merges with preset", () => {
    const o = buildObservation("gm-narration", { excerpt: "entendu au marché" });
    expect(o.source).toBe("GM_NARRATION");
    expect(o.excerpt).toBe("entendu au marché");
  });

  it("passes through sceneId when provided", () => {
    const o = buildObservation("gm-narration", undefined, "scene_42");
    expect(o.sceneId).toBe("scene_42");
  });

  it("exposes the 5 known presets, out-of-band included (#22)", () => {
    expect(Object.keys(SOURCE_PRESETS).sort()).toEqual(
      ["dice-roll", "gm-narration", "out-of-band", "player-utterance", "system"]
    );
  });

  it("uses Date.now() for timestamp", () => {
    const spy = vi.spyOn(Date, "now").mockReturnValue(1234567890);
    try {
      expect(buildObservation(undefined).timestamp).toBe(1234567890);
    } finally {
      spy.mockRestore();
    }
  });
});
