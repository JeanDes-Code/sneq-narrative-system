import type { CampaignId, EntityID } from "../domain/ids.js";

export interface PredictionEvent {
  campaignId: CampaignId;
  triggerKind: "ENTRY_TO_SCENE" | "DIALOGUE_OPENED" | "TURN_ADVANCED";
  hint: { entityId?: EntityID; attribute?: string };
}

export interface PreGenerationHook {
  onEvent(e: PredictionEvent): void | Promise<void>;
}

export const noopPreGenerationHook: PreGenerationHook = { onEvent() {} };

export class PreGenerationRegistry {
  private hook: PreGenerationHook = noopPreGenerationHook;
  private onError: (err: unknown) => void = () => {};

  setErrorHandler(fn: (err: unknown) => void): void { this.onError = fn; }

  register(h: PreGenerationHook): { dispose(): void } {
    this.hook = h;
    return { dispose: () => { this.hook = noopPreGenerationHook; } };
  }

  emit(e: PredictionEvent): void {
    try {
      const r = this.hook.onEvent(e);
      if (r && typeof (r as Promise<unknown>).then === "function") {
        (r as Promise<unknown>).catch(err => this.onError(err));
      }
    } catch (err) {
      this.onError(err);
    }
  }
}
