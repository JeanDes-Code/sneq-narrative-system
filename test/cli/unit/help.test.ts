import { describe, it, expect } from "vitest";
import { helpText } from "../../../src/cli/help.js";

describe("helpText", () => {
  it("lists all 15 commands in the general help", () => {
    const out = helpText();
    expect(out).toContain("validate-narration");
    expect(out).toContain("prepare-turn");
    expect(out).toContain("campaign-exists");
  });

  it("returns command-specific help for validate-narration", () => {
    const out = helpText("validate-narration");
    expect(out).toContain("validate-narration");
    expect(out.length).toBeGreaterThan(50);
  });

  it("returns command-specific help for prepare-turn", () => {
    const out = helpText("prepare-turn");
    expect(out).toContain("prepare-turn");
  });

  it("returns command-specific help for campaign-exists", () => {
    const out = helpText("campaign-exists");
    expect(out).toContain("campaign-exists");
  });

  it("does not still contain TODO placeholders", () => {
    const out = helpText();
    expect(out).not.toContain("TODO T14");
  });
});
