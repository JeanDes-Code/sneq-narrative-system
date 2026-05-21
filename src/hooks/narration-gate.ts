import type { CampaignId } from "../domain/ids.js";
import type { EntityType } from "../domain/entity.js";
import type { Resolver } from "../resolver/resolver.js";
import type { Router } from "../router/router.js";
import type { Repository } from "../repository/interface.js";

export interface NarrationGateInput {
  narration: string;
  type?: EntityType;
  strict?: boolean;
}

export interface NarrationGateContext {
  campaignId: CampaignId;
  resolver: Resolver;
  router: Router;
  repo: Repository;
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

export interface ValidationReport {
  ok: boolean;
  partial?: boolean;
  extractedNames: string[];
  issues: NarrationIssue[];
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
