import type { CampaignId, HolderId } from "../domain/ids.js";
import type { EntityType } from "../domain/entity.js";
import type { Resolver } from "../resolver/resolver.js";
import type { Router } from "../router/router.js";
import type { RepositoryAccess } from "../repository/interface.js";

export interface NarrationGateInput {
  narration: string;
  type?: EntityType;
  /**
   * Read at last (§5.2): `strict` was accepted at the schema and the hook and
   * consulted nowhere in the Validator — an empty shell for two releases. It
   * now decides whether unresolved proper nouns downgrade the verdict to
   * `REPAIR` instead of merely being reported.
   */
  strict?: boolean;
  /**
   * The holder this narration is FOR (§11 phase F). With it the gate also runs
   * containment over the narration and can BLOCK. Without it the gate keeps its
   * 0.3 job — entity resolution — and is honest that it checked nothing else.
   */
  holderId?: HolderId;
}

export interface NarrationGateContext {
  campaignId: CampaignId;
  resolver: Resolver;
  router: Router;
  repo: RepositoryAccess;
}

export interface NarrationIssue {
  noun: string;
  kind: "no-match" | "below-threshold" | "ambiguous";
  suggestions: {
    entityId: string;
    canonicalName: string;
    confidence: number;
  }[];
  llmReasoning?: string;
}

/**
 * What the host must do with this narration.
 *
 * - `PASS` — show it.
 * - `REPAIR` — hand `repairHint` back to the model and ask for one rewrite.
 *   Bounded by the host: SNEQ states the problem, it does not run the loop.
 * - `BLOCK` — do not show it, and do not ask for a rewrite either. Reserved
 *   for a containment failure: the narration says something this holder cannot
 *   know, so the payload or the derivation is wrong and a reworded version of
 *   the same leak is still a leak.
 */
export type NarrationVerdict = "PASS" | "REPAIR" | "BLOCK";

/**
 * The gate's answer. 0.3's shape was `{ ok, partial, extractedNames, issues }`
 * — it reported and could never withhold, so all three live consumers invented
 * block, redaction and a repair loop on top of it (grimoire twice, including a
 * `blocked → partial` downgrade). Those three now live here, once.
 */
export interface ValidationReport {
  /** True only on `PASS`. Kept for callers that read nothing else. */
  ok: boolean;
  verdict: NarrationVerdict;
  partial?: boolean;
  extractedNames: string[];
  issues: NarrationIssue[];
  /**
   * Present when a `holderId` was supplied: the tokens this holder has not
   * learned, and which of them the narration used. `pass: false` is what makes
   * the verdict `BLOCK`.
   */
  containment?: { pass: boolean; forbidden: string[]; present: string[] };
  /** Present on `REPAIR` and `BLOCK`: what to tell the model, in its own terms. */
  repairHint?: string;
}

export interface NarrationGateHook {
  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport>;
}

export class NarrationGateRegistry {
  private current: NarrationGateHook;

  constructor(private readonly fallback: NarrationGateHook) {
    this.current = fallback;
  }

  register(h: NarrationGateHook): { dispose(): void } {
    this.current = h;
    return {
      dispose: () => {
        this.current = this.fallback;
      }
    };
  }

  validate(input: NarrationGateInput, ctx: NarrationGateContext): Promise<ValidationReport> {
    return this.current.validate(input, ctx);
  }
}
