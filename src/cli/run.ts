import type { Engine } from "../engine.js";
import type { ParsedInvocation, RunDeps } from "./types.js";
import { CliError, formatError } from "./errors.js";
import { asCampaignId } from "../domain/ids.js";

export interface FullRunDeps extends RunDeps {
  engine: Engine;
}

export async function run(invocation: ParsedInvocation, deps: FullRunDeps): Promise<number> {
  try {
    return await dispatch(invocation, deps);
  } catch (err) {
    const f = formatError(err);
    deps.stdout.write(f.json + "\n");
    return f.exitCode;
  }
}

async function dispatch(inv: ParsedInvocation, deps: FullRunDeps): Promise<number> {
  if (inv.command === "unknown") {
    throw new CliError("UNKNOWN_COMMAND", `unknown command: ${inv.rawCommand}`);
  }
  if (inv.command === "help" || inv.help) {
    // Help text rendering arrives in a later task.
    deps.stdout.write("sneq-engine: help not yet implemented\n");
    return 0;
  }
  if (!inv.db) throw new CliError("INVALID_ARGS", "--db is required");
  if (!inv.campaign) throw new CliError("INVALID_ARGS", "--campaign is required");

  const args = (inv.argsInline as Record<string, unknown> | undefined) ?? {};
  const campaignId = asCampaignId(inv.campaign);

  switch (inv.command) {
    case "init-campaign": {
      const existing = await deps.engine.listCampaigns();
      if (existing.some(c => c.id === inv.campaign)) {
        throw new CliError("CAMPAIGN_ALREADY_EXISTS", `campaign '${inv.campaign}' already exists`);
      }
      const name = String(args["name"] ?? inv.campaign);
      const embeddingDim = Number(args["embeddingDim"] ?? 768);
      await deps.engine.createCampaign({ id: campaignId, name, embeddingDim });
      deps.stdout.write(JSON.stringify({ campaignId: inv.campaign, created: true }) + "\n");
      return 0;
    }
    default:
      throw new CliError("INTERNAL_ERROR", `command not yet wired: ${inv.command}`);
  }
}
