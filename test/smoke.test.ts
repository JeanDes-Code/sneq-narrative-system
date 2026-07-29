import { readFileSync } from "node:fs";

import { describe, it, expect } from "vitest";
import {
  SNEQ_ENGINE_VERSION,
  decideAdvanceTurn,
  decideConfirmEntityMatch,
  decideRegisterFact,
  decideSetScene,
} from "../src/index.js";

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { exports: Record<string, unknown> };

describe("smoke", () => {
  it("exports version constant", () => {
    expect(SNEQ_ENGINE_VERSION).toBe("0.3.0");
  });

  it("exports distributed-store decisions from the main entrypoint", () => {
    expect(decideRegisterFact).toBeTypeOf("function");
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
