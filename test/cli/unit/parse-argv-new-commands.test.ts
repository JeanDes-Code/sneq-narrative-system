import { describe, it, expect } from "vitest";
import { parseArgv } from "../../../src/cli/parse-argv.js";

describe("parseArgv — new commands", () => {
  it("recognizes validate-narration", () => {
    const inv = parseArgv(["validate-narration", "--db", "x.db", "--campaign", "c1", "--args", "{}"]);
    expect(inv.command).toBe("validate-narration");
  });

  it("recognizes prepare-turn", () => {
    const inv = parseArgv(["prepare-turn", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("prepare-turn");
  });

  it("recognizes campaign-exists", () => {
    const inv = parseArgv(["campaign-exists", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("campaign-exists");
  });

  it("flags an unknown command as 'unknown'", () => {
    const inv = parseArgv(["floop", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("unknown");
  });
});
