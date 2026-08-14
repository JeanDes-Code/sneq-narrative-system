import type { Scene } from "../domain/scene.js";
import type { NarrativeEvent } from "../domain/event.js";
import type { Holder } from "../domain/holder.js";
import type { Potentialite } from "../domain/potentialite.js";
import type { MigrationFinding } from "../domain/migration.js";
import type { WorldHealth } from "./tick.js";
import type { EntityID } from "../domain/ids.js";
import { ADVERTISED_TOOL_NAMES } from "../tools/adapters.js";

/**
 * `INFO` is a checklist line §12.4 asks for that nothing persisted can answer.
 * It reports and never judges, so it stays out of the roll-up — a permanent
 * WARN would just teach the reader to ignore warnings.
 */
export type CheckStatus = "PASS" | "WARN" | "FAIL" | "INFO";

export interface DoctorCheck {
  id: string;
  status: CheckStatus;
  /** One line, written for whoever has to act on it. Names the fix when there is one. */
  message: string;
}

export interface DoctorReport {
  campaignId: string;
  day: number;
  turn: number;
  /** FAIL if any check failed, else WARN if any warned, else PASS. */
  status: CheckStatus;
  checks: DoctorCheck[];
}

export interface DoctorInput {
  campaignId: string;
  day: number;
  turn: number;
  scene: Scene | null;
  /** Every entity id the scene names, with whether the campaign actually knows it. */
  sceneEntityResolution: Array<{ entityId: EntityID; known: boolean }>;
  events: NarrativeEvent[];
  holders: Holder[];
  potentialites: Potentialite[];
  migrationFindings: MigrationFinding[];
  health: WorldHealth;
  /** From the last commit's `CommitHealth`, when the campaign has committed at all. */
  dispatch?: { uncovered: number; unroutable: number; truncated: number };
  /** Turns without an appended event before the ledger is called stale (§6.2). */
  staleAfterTurns?: number;
}

/**
 * §12.4's executable checklist. Four consumers, four silent misintegrations,
 * zero of them detectable from inside the consumer — this is the instrument
 * that says *why* when the campaign misbehaves, instead of leaving an
 * impression.
 *
 * Pure: the CLI gathers, this judges. Every FAIL names the corrective call.
 */
export function runDoctor(input: DoctorInput): DoctorReport {
  const checks: DoctorCheck[] = [];
  const add = (id: string, status: CheckStatus, message: string) => checks.push({ id, status, message });

  // 1. Every EntityID reaching the engine resolves — the grimoire bug, on day one.
  const unresolved = input.sceneEntityResolution.filter(r => !r.known);
  if (input.scene === null) {
    add("entity-ids-resolve", "PASS", "No scene is declared, so no scene entity id can dangle.");
  } else if (unresolved.length === 0) {
    add("entity-ids-resolve", "PASS",
      `All ${input.sceneEntityResolution.length} entity id(s) on the current scene resolve to a known entity.`);
  } else {
    add("entity-ids-resolve", "FAIL",
      `${unresolved.length} id(s) on the current scene are not known entities: ` +
      `${unresolved.map(r => JSON.stringify(String(r.entityId))).join(", ")}. ` +
      `These are almost certainly free-text names typed into an id field — every read against them returns null ` +
      `and the prompt runs with no canon. Call sneq__lookup_entity or sneq__mention_entity, then re-declare the scene.`);
  }

  // 2. A declared scene has somebody in it.
  if (input.scene === null) {
    add("scene-populated", "WARN",
      "No scene is declared. Ask the human where the player is — never guess (the #1 doctrine).");
  } else if (input.scene.presentEntityIds.length === 0) {
    add("scene-populated", "FAIL",
      `Scene "${input.scene.id}" declares nobody present. If people are in the room, sneq__set_scene was called ` +
      `with names instead of entity ids and they were silently dropped.`);
  } else {
    add("scene-populated", "PASS",
      `Scene "${input.scene.id}" declares ${input.scene.presentEntityIds.length} entity/entities present.`);
  }

  // 3. Narration outruns the ledger (§6.2).
  const staleAfter = input.staleAfterTurns ?? 5;
  const lastEventTurn = input.events.reduce((max, e) => Math.max(max, e.turn), -1);
  if (input.events.length === 0) {
    add("ledger-fresh", input.turn > 0 ? "FAIL" : "WARN",
      input.turn > 0
        ? `${input.turn} turn(s) have passed and not one event has been appended. The world is being narrated and ` +
          `never written down — call sneq__commit_narrative on the turns that changed something.`
        : "No events yet, and no turns yet. A fresh campaign looks exactly like this.");
  } else if (input.turn - lastEventTurn > staleAfter) {
    add("ledger-fresh", "WARN",
      `The last event landed on turn ${lastEventTurn}, ${input.turn - lastEventTurn} turns ago. ` +
      `Either nothing has happened, or narration is outrunning the ledger (§6.2).`);
  } else {
    add("ledger-fresh", "PASS",
      `${input.events.length} event(s) on the ledger; the most recent is turn ${lastEventTurn} of ${input.turn}.`);
  }

  // 4. Every advertised read is holder-scoped; no unrestricted ledger read on the surface.
  const OMNISCIENT = ["sneq__get_relevant_facts", "sneq__register_fact"];
  const leaked = ADVERTISED_TOOL_NAMES.filter(n => (OMNISCIENT as readonly string[]).includes(n));
  add("no-omniscient-read", leaked.length === 0 ? "PASS" : "FAIL",
    leaked.length === 0
      ? `The ${ADVERTISED_TOOL_NAMES.length} advertised tools expose no unrestricted "what is true" read. ` +
        `A leak would require information the API never handed over.`
      : `The tool surface still advertises ${leaked.join(", ")} — an omniscient read defeats the whole seam.`);

  // 5. Holders exist at all.
  const groups = input.holders.filter(h => h.kind === "GROUP");
  if (input.holders.length === 0) {
    add("holders-present", "FAIL",
      "This campaign has no holders, not even the bootstrap default group. deriveBeliefs cannot answer for anyone. " +
      "Recreate the campaign, or author the default group with sneq-engine upsert-holder.");
  } else if (groups.length === 0) {
    add("holders-present", "WARN",
      `${input.holders.length} holder(s), none of them a GROUP. Individuals inherit from a base group; ` +
      `without one the cascade has no floor.`);
  } else {
    add("holders-present", "PASS",
      `${input.holders.length} holder(s): ${groups.length} group(s), ${input.holders.length - groups.length} individual(s).`);
  }

  // 6. The world clock is not frozen (#20).
  add("clock-moving", input.health.frozenClock ? "FAIL" : "PASS",
    input.health.frozenClock
      ? `The world day has not moved across the last commits while ${input.health.inTransit} carriage(s) are in ` +
        `transit. Those carriages will never land. Something is answering daysElapsed: 0 every turn — pass the ` +
        `fiction's real elapsed time, or move the clock out of band with sneq-engine advance-turn --days N.`
      : `Day ${input.day}, ${input.health.inTransit} carriage(s) in transit; the clock is moving.`);

  // 7. Dispatch health (#15).
  if (!input.dispatch) {
    add("dispatch-health", "WARN", "No commit has run yet, so there is no dispatch health to read.");
  } else {
    const { uncovered, unroutable, truncated } = input.dispatch;
    if (uncovered === 0 && unroutable === 0 && truncated === 0) {
      add("dispatch-health", "PASS", "Dispatch is clean: nothing uncovered, nothing unroutable, nothing truncated.");
    } else {
      const parts: string[] = [];
      if (uncovered > 0)  parts.push(`${uncovered} uncovered (no rule matched the event — a policy hole)`);
      if (unroutable > 0) parts.push(`${unroutable} unroutable (a rule fired but no route reaches the target — a map hole; bootstrap ships rules with zero routes, so this is what an undeclared map looks like)`);
      if (truncated > 0)  parts.push(`${truncated} truncated by the fan-out cap`);
      add("dispatch-health", "WARN",
        `${parts.join("; ")}. Author routes and rules with sneq-engine set-dispatch-policy.`);
    }
  }

  // 8. OUT_OF_BAND is audited, not locked (#22).
  add("out-of-band-audited", input.health.outOfBandRecords === 0 ? "PASS" : "WARN",
    input.health.outOfBandRecords === 0
      ? "No OUT_OF_BAND records. The escape hatch is unused."
      : `${input.health.outOfBandRecords} record(s) carry the OUT_OF_BAND source — "confirmed by the human, outside ` +
        `the fiction". That is a sanctioned road, not an exception, but each one should have a rationale you can ` +
        `still name. A climbing count means confabulation is being laundered through it.`);

  // 9. No QUARANTINED constraints (#23).
  const quarantined = input.potentialites.flatMap(p =>
    p.contraintes.filter(c => c.status === "QUARANTINED").map(c => ({ p, c })));
  add("no-quarantined-constraints", quarantined.length === 0 ? "PASS" : "WARN",
    quarantined.length === 0
      ? "No quarantined constraints."
      : `${quarantined.length} constraint(s) are QUARANTINED: ` +
        `${quarantined.slice(0, 5).map(q => `${q.p.entiteId}.${q.p.attribut} (${q.c.id})`).join(", ")}. ` +
        `A quarantine is a data bug waiting for repair, never a permanent state — the constraint can reject on type ` +
        `alone, so it would block every promotion on that key. Fix the row and re-author it.`);

  // 10. Migration findings (#23), which quarantine's cousin surfaced at migration time.
  add("migration-findings", input.migrationFindings.length === 0 ? "PASS" : "WARN",
    input.migrationFindings.length === 0
      ? "The migration audit flagged nothing."
      : `The migration flagged ${input.migrationFindings.length} mis-encoded constraint(s): ` +
        `${[...new Set(input.migrationFindings.map(f => f.kind))].join(", ")}. ` +
        `They were never auto-fixed (guessing) and never deleted (data loss) — repair them by hand.`);

  // 11-12. Two §12.4 lines nothing persisted can answer. Said out loud rather
  // than quietly dropped, so the checklist stays honest about its own reach.
  add("containment-assertions", "INFO",
    "assertContainment is a pre-flight call the host makes over each composed payload (§11 phase D). " +
    "The engine keeps no session log of those calls, so doctor cannot confirm after the fact that you made them. " +
    "If your composition step does not call it, the containment guarantee is untested in your integration.");
  add("belief-cache", "INFO",
    "There is no belief cache in 0.5.0: deriveBeliefs is a pure derivation run on every read, so there is no hit " +
    "rate and no invalidation count to check. Cost grows with ledger size — measure before you assume it is fine.");

  const status: CheckStatus =
    checks.some(c => c.status === "FAIL") ? "FAIL"
    : checks.some(c => c.status === "WARN") ? "WARN"
    : "PASS";

  return { campaignId: input.campaignId, day: input.day, turn: input.turn, status, checks };
}
