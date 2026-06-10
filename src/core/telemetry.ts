import type { ToolCallOutcome } from "../domain/feedback.js";

/** Pure classification of one tool-call result into a telemetry outcome.
 *  detail stays machine-minimal (error NAME, counts) — never raw args, never narration. */
export function classifyOutcome(
  tool: string,
  result: unknown,
  error?: unknown
): { outcome: ToolCallOutcome; detail?: string } {
  if (error !== undefined) {
    const name = error instanceof Error ? error.name : "unknown";
    return { outcome: "ERROR", detail: name };
  }
  const r = (typeof result === "object" && result !== null ? result : undefined) as Record<string, unknown> | undefined;
  switch (tool) {
    case "sneq__lookup_entity": {
      if (r && r["match"] === null) {
        const reason = r["notFoundReason"];
        return { outcome: "NO_MATCH", ...(typeof reason === "string" ? { detail: reason } : {}) };
      }
      return { outcome: "OK" };
    }
    case "sneq__get_entity":
      return result === null ? { outcome: "EMPTY" } : { outcome: "OK" };
    case "sneq__get_relevant_facts":
      return Array.isArray(result) && result.length === 0
        ? { outcome: "EMPTY", detail: "facts=0" }
        : { outcome: "OK" };
    case "sneq__suggest_existing": {
      const c = r?.["candidates"];
      return Array.isArray(c) && c.length === 0 ? { outcome: "EMPTY" } : { outcome: "OK" };
    }
    case "sneq__register_fact": {
      const c = r?.["contradictions"];
      return Array.isArray(c) && c.length > 0 ? { outcome: "CONTRADICTION" } : { outcome: "OK" };
    }
    case "sneq__validate_narration": {
      if (r && r["ok"] === false) {
        const issues = r["issues"];
        return { outcome: "OK", detail: `issues=${Array.isArray(issues) ? issues.length : 0}` };
      }
      return { outcome: "OK" };
    }
    default:
      return { outcome: "OK" };
  }
}
