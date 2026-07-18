import type { CampaignId } from "./domain/ids.js";
import { SneqCampaignContextInvalidatedError } from "./errors.js";

export type CampaignLifecycleState =
  | "unverified"
  | "active"
  | "deleting"
  | "deleted"
  | "engine-closed";

export class CampaignLifecycle {
  private state: CampaignLifecycleState = "unverified";

  constructor(private readonly campaignId: CampaignId) {}

  assertUsable(): void {
    if (this.state === "deleting" || this.state === "deleted" || this.state === "engine-closed") {
      throw new SneqCampaignContextInvalidatedError(this.campaignId, this.state);
    }
  }

  needsVerification(): boolean {
    this.assertUsable();
    return this.state === "unverified";
  }

  markVerified(): void {
    this.assertUsable();
    this.state = "active";
  }

  beginDelete(): void {
    this.assertUsable();
    this.state = "deleting";
  }

  deletionFailed(): void {
    if (this.state === "deleting") this.state = "unverified";
  }

  deletionSucceeded(): void {
    this.state = "deleted";
  }

  close(): void {
    this.state = "engine-closed";
  }
}
