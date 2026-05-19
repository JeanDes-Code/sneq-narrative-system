import { describe, it, expect } from "vitest";
import { canTransition, assertTransition } from "../../src/core/state-machine.js";

describe("state-machine", () => {
  it("allows INDEFINI → CONTRAINT", () => {
    expect(canTransition("INDEFINI", "CONTRAINT")).toBe(true);
  });
  it("allows INDEFINI → FIGE (direct observation)", () => {
    expect(canTransition("INDEFINI", "FIGE")).toBe(true);
  });
  it("allows CONTRAINT → FIGE", () => {
    expect(canTransition("CONTRAINT", "FIGE")).toBe(true);
  });
  it("rejects FIGE → CONTRAINT", () => {
    expect(canTransition("FIGE", "CONTRAINT")).toBe(false);
  });
  it("rejects FIGE → INDEFINI", () => {
    expect(canTransition("FIGE", "INDEFINI")).toBe(false);
  });
  it("rejects CONTRAINT → INDEFINI", () => {
    expect(canTransition("CONTRAINT", "INDEFINI")).toBe(false);
  });
  it("rejects self-transition for FIGE", () => {
    expect(canTransition("FIGE", "FIGE")).toBe(false);
  });
  it("assertTransition throws on invalid transition", () => {
    expect(() => assertTransition("FIGE", "INDEFINI")).toThrow(/FIGE.*INDEFINI/);
  });
  it("assertTransition is silent on valid transition", () => {
    expect(() => assertTransition("INDEFINI", "FIGE")).not.toThrow();
  });
});
