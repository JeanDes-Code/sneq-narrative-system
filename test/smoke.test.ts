import { readFileSync } from "node:fs";

import { describe, it, expect } from "vitest";
import {
  SNEQ_ENGINE_VERSION,
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideAddConstraint,
  decideSetScene,
} from "../src/index.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown>; version: string };

describe("smoke", () => {
  it("exports version constant", () => {
    expect(SNEQ_ENGINE_VERSION).toBe("0.5.0");
  });

  // They disagreed for two releases. An agent reading the constant and a
  // consumer reading the manifest were told different things about the same build.
  it("keeps SNEQ_ENGINE_VERSION and package.json#version in lockstep", () => {
    expect(SNEQ_ENGINE_VERSION).toBe(packageJson.version);
  });

  it("exports distributed-store decisions from the main entrypoint", () => {
    expect(decideAddConstraint).toBeTypeOf("function");
    expect(decideSetScene).toBeTypeOf("function");
    expect(decideAdvanceTurn).toBeTypeOf("function");
    expect(decideConfirmEntityMatch).toBeTypeOf("function");
  });

  it("publishes the framework-free atomic subpath", () => {
    expect(packageJson.exports["./atomic"]).toEqual({
      types: "./dist/atomic/index.d.ts",
      default: "./dist/atomic/index.js",
    });
  });
});
