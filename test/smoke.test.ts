import { describe, it, expect } from "vitest";
import { SNEQ_ENGINE_VERSION } from "../src/index.js";

describe("smoke", () => {
  it("exports version constant", () => {
    expect(SNEQ_ENGINE_VERSION).toBe("0.0.0");
  });
});
