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

  it("recognizes the 0.5.0 commands", () => {
    for (const cmd of ["get-holder-context", "commit-narrative", "upsert-holder",
                       "show-dispatch-policy", "set-dispatch-policy", "doctor"] as const) {
      expect(parseArgv([cmd, "--db", "x.db", "--campaign", "c1"]).command).toBe(cmd);
    }
  });

  it("no longer recognizes the deleted commands", () => {
    for (const cmd of ["register-fact", "get-relevant-facts"]) {
      expect(parseArgv([cmd, "--db", "x.db", "--campaign", "c1"]).command).toBe("unknown");
    }
  });

  // These two break the "every tool argument travels through --args/stdin"
  // convention, deliberately: they are typed by hand every turn of live play.
  it("parses --holder, --entity and --days", () => {
    const inv = parseArgv([
      "get-holder-context", "--db", "x.db", "--campaign", "c1",
      "--holder", "h1", "--entity", "e1", "--days", "3"
    ]);
    expect(inv.holder).toBe("h1");
    expect(inv.entity).toBe("e1");
    expect(inv.days).toBe(3);
  });

  it("rejects a negative or non-integer --days", () => {
    expect(() => parseArgv(["advance-turn", "--days", "-1"])).toThrow(/--days/);
    expect(() => parseArgv(["advance-turn", "--days", "1.5"])).toThrow(/--days/);
  });

  // #22: the sanctioned fifth road — "confirmed by the human, outside the
  // fiction". `--source player-utterance` for the same job was rejected because
  // the label would lie, and a lying provenance in an append-only ledger is forever.
  it("accepts --source out-of-band", () => {
    expect(parseArgv(["commit-narrative", "--source", "out-of-band"]).source).toBe("out-of-band");
  });

  it("flags an unknown command as 'unknown'", () => {
    const inv = parseArgv(["floop", "--db", "x.db", "--campaign", "c1"]);
    expect(inv.command).toBe("unknown");
  });
});
