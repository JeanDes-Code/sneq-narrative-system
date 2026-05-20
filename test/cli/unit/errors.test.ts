import { describe, it, expect } from "vitest";
import { CliError, formatError } from "../../../src/cli/errors.js";
import { SneqValidationError, SneqContradictionError, SneqProviderError } from "../../../src/errors.js";

describe("formatError", () => {
  it("formats a CliError", () => {
    const r = formatError(new CliError("CAMPAIGN_NOT_FOUND", "campaign 'x' not found"));
    expect(r.exitCode).toBe(1);
    expect(JSON.parse(r.json)).toEqual({
      error: "campaign 'x' not found",
      code: "CAMPAIGN_NOT_FOUND"
    });
  });

  it("attaches details when present", () => {
    const r = formatError(new CliError("VALIDATION_FAILED", "bad shape", [{ path: ["x"], message: "missing" }]));
    expect(JSON.parse(r.json)).toEqual({
      error: "bad shape",
      code: "VALIDATION_FAILED",
      details: [{ path: ["x"], message: "missing" }]
    });
  });

  it("maps SneqValidationError to VALIDATION_FAILED", () => {
    // SneqValidationError(details) — no message arg; pass arbitrary detail shape
    const inner = new SneqValidationError([{ key: "x", reason: "MANQUANT" } as any]);
    const r = formatError(inner);
    const parsed = JSON.parse(r.json);
    expect(parsed.code).toBe("VALIDATION_FAILED");
    expect(parsed.details).toEqual([{ key: "x", reason: "MANQUANT" }]);
  });

  it("maps SneqContradictionError to VALIDATION_FAILED with contradictions in details", () => {
    // SneqContradictionError(contradictions: AttributFige[])
    // Pass a minimal stub — the real shape doesn't matter for the formatter contract.
    const contradictions = [{ factId: "f1", entityId: "e1", key: "x", value: { type: "STRING", value: "old" } }] as any;
    const inner = new SneqContradictionError(contradictions);
    const r = formatError(inner);
    expect(r.exitCode).toBe(1);
    const parsed = JSON.parse(r.json);
    expect(parsed.code).toBe("VALIDATION_FAILED");
    expect(parsed.details).toEqual({ contradictions });
  });

  it("maps SneqProviderError to PROVIDER_ERROR", () => {
    // SneqProviderError(tier: Tier, exhausted: boolean, message: string)
    const inner = new SneqProviderError("heavy", true, "router exhausted");
    const r = formatError(inner);
    expect(r.exitCode).toBe(1);
    const parsed = JSON.parse(r.json);
    expect(parsed.code).toBe("PROVIDER_ERROR");
    expect(parsed.error).toBe("router exhausted");
    expect(parsed.details).toEqual({ tier: "heavy", exhausted: true });
  });

  it("uses exit code 2 for INTERNAL_ERROR", () => {
    const r = formatError(new Error("oops"));
    expect(r.exitCode).toBe(2);
    expect(JSON.parse(r.json).code).toBe("INTERNAL_ERROR");
  });

  it("never throws", () => {
    expect(() => formatError(null)).not.toThrow();
    expect(() => formatError(undefined)).not.toThrow();
    expect(() => formatError("string")).not.toThrow();
  });
});
