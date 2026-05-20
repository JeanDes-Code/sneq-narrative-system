import { describe, it, expect } from "vitest";
import { parseArgv } from "../../../src/cli/parse-argv.js";

describe("parseArgv", () => {
  it("recognizes a known command", () => {
    const r = parseArgv(["lookup-entity", "--db", "./x.db", "--campaign", "c1"]);
    expect(r.command).toBe("lookup-entity");
    expect(r.db).toBe("./x.db");
    expect(r.campaign).toBe("c1");
  });

  it("flags an unknown command", () => {
    const r = parseArgv(["bogus-cmd", "--db", "x"]);
    expect(r.command).toBe("unknown");
    expect(r.rawCommand).toBe("bogus-cmd");
  });

  it("treats --help as a help invocation with no command", () => {
    const r = parseArgv(["--help"]);
    expect(r.command).toBe("help");
    expect(r.help).toBe(true);
  });

  it("treats `<cmd> --help` as help for that command", () => {
    const r = parseArgv(["register-fact", "--help"]);
    expect(r.command).toBe("register-fact");
    expect(r.help).toBe(true);
  });

  it("parses --args as JSON", () => {
    const r = parseArgv(["lookup-entity", "--args", '{"mention":"x"}']);
    expect(r.argsInline).toEqual({ mention: "x" });
  });

  it("throws on malformed --args JSON", () => {
    expect(() => parseArgv(["lookup-entity", "--args", "{not json"]))
      .toThrow(/INVALID_ARGS/);
  });

  it("parses --source preset", () => {
    const r = parseArgv(["register-fact", "--source", "player-utterance"]);
    expect(r.source).toBe("player-utterance");
  });

  it("rejects unknown --source preset", () => {
    expect(() => parseArgv(["register-fact", "--source", "made-up"]))
      .toThrow(/INVALID_ARGS/);
  });

  it("parses --observation as partial JSON", () => {
    const r = parseArgv(["register-fact", "--observation", '{"fiabilite":"RUMEUR_CONFIRMEE"}']);
    expect(r.observationOverride).toEqual({ fiabilite: "RUMEUR_CONFIRMEE" });
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgv(["lookup-entity", "--bogus", "x"]))
      .toThrow(/INVALID_ARGS/);
  });

  it("rejects a flag missing its value", () => {
    expect(() => parseArgv(["lookup-entity", "--db"]))
      .toThrow(/INVALID_ARGS/);
  });
});
