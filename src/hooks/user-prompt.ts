import type { Entity } from "../domain/entity.js";

export interface AskUserArgs {
  mention: string;
  candidates: Entity[];
}

export type AskUserFn = (args: AskUserArgs) => Promise<Entity | null>;

export class UserPromptRegistry {
  private handler: AskUserFn | null = null;

  register(fn: AskUserFn): { dispose(): void } {
    this.handler = fn;
    return { dispose: () => { if (this.handler === fn) this.handler = null; } };
  }

  async ask(args: AskUserArgs): Promise<Entity | null> {
    if (!this.handler) return null;
    return this.handler(args);
  }

  hasHandler(): boolean { return this.handler !== null; }
}
