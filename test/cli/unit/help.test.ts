import { describe, it, expect } from "vitest";
import { helpText } from "../../../src/cli/help.js";
import { KNOWN_COMMANDS } from "../../../src/cli/types.js";

describe("helpText", () => {
  it("lists the eighteen supported commands and omits collapse-attribute", () => {
    const out = helpText();
    expect(KNOWN_COMMANDS).toHaveLength(18);
    expect(out).not.toContain("collapse-attribute");
    for (const command of KNOWN_COMMANDS) expect(out).toContain(command);
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
