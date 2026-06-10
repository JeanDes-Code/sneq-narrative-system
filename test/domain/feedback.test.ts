import { describe, it, expect } from "vitest";
import { asFeedbackId } from "../../src/domain/ids.js";
import type { FeedbackEntry, ToolCallLogEntry } from "../../src/domain/feedback.js";

describe("feedback domain types", () => {
  it("asFeedbackId brands a string", () => {
    const id = asFeedbackId("fb_123");
    expect(id).toBe("fb_123");
    // @ts-expect-error a raw string is not assignable to FeedbackId
    const notBranded: import("../../src/domain/ids.js").FeedbackId = "raw";
    void notBranded;
  });

  it("FeedbackEntry compiles with and without optional fields", () => {
    const minimal: FeedbackEntry = {
      id: asFeedbackId("fb_1"), origin: "AGENT", kind: "MISSING",
      body: "no temporary relations", status: "OPEN", createdAt: 1
    };
    const full: FeedbackEntry = {
      ...minimal, subject: "sneq__add_constraint", severity: "MED",
      promotedTo: "https://github.com/x/y/issues/1", createdTurn: 4
    };
    expect(minimal.status).toBe("OPEN");
    expect(full.severity).toBe("MED");
  });

  it("ToolCallLogEntry compiles with and without optional fields", () => {
    const e: ToolCallLogEntry = { tool: "sneq__get_entity", outcome: "EMPTY", durationMs: 3, createdAt: 1 };
    const f: ToolCallLogEntry = { ...e, detail: "facts=0", turn: 2 };
    expect(f.outcome).toBe("EMPTY");
  });
});
