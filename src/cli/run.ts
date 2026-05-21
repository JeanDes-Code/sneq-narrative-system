import type { Engine } from "../engine.js";
import type { ParsedInvocation } from "./types.js";
import { CliError, formatError } from "./errors.js";
import { helpText } from "./help.js";
import { asCampaignId } from "../domain/ids.js";
import { dispatchToolCall } from "../tools/dispatcher.js";
import { buildObservation } from "./observation.js";

export interface FullRunDeps {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
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

async function readStdinJson(stdin: NodeJS.ReadableStream): Promise<unknown | undefined> {
  if ((stdin as { isTTY?: boolean }).isTTY) return undefined;
  let buf = "";
  for await (const chunk of stdin as AsyncIterable<Buffer | string>) {
    buf += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (buf.length > 1_000_000) throw new CliError("INVALID_ARGS", "stdin payload exceeds 1 MB");
  }
  const trimmed = buf.trim();
  if (trimmed.length === 0) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new CliError("INVALID_ARGS", `stdin is not valid JSON: ${(err as Error).message}`);
  }
}

async function dispatch(inv: ParsedInvocation, deps: FullRunDeps): Promise<number> {
  if (inv.command === "help" || inv.help) {
    const target = (inv.command !== "help" && inv.command !== "unknown") ? inv.command : undefined;
    deps.stdout.write(helpText(target));
    return 0;
  }
  if (inv.command === "unknown") {
    throw new CliError("UNKNOWN_COMMAND", `unknown command: ${inv.rawCommand}`);
  }
  if (!inv.db) throw new CliError("INVALID_ARGS", "--db is required");
  if (!inv.campaign) throw new CliError("INVALID_ARGS", "--campaign is required");

  const args = (inv.argsInline as Record<string, unknown> | undefined) ?? {};
  const campaignId = asCampaignId(inv.campaign);

  if (inv.command !== "init-campaign" && inv.command !== "campaign-exists") {
    const existing = await deps.engine.listCampaigns();
    if (!existing.some(c => c.id === inv.campaign)) {
      throw new CliError("CAMPAIGN_NOT_FOUND", `campaign '${inv.campaign}' not found`);
    }
  }

  switch (inv.command) {
    case "init-campaign": {
      const existing = await deps.engine.listCampaigns();
      if (existing.some(c => c.id === inv.campaign)) {
        throw new CliError("CAMPAIGN_ALREADY_EXISTS", `campaign '${inv.campaign}' already exists`);
      }
      const name = String(args["name"] ?? inv.campaign);
      const embeddingDim = inv.embeddingDim ?? Number(args["embeddingDim"] ?? 1024);
      await deps.engine.createCampaign({ id: campaignId, name, embeddingDim });
      deps.stdout.write(JSON.stringify({ campaignId: inv.campaign, created: true, embeddingDim }) + "\n");
      return 0;
    }
    case "campaign-exists": {
      const existing = await deps.engine.listCampaigns();
      const hit = existing.find(c => c.id === inv.campaign);
      if (hit) {
        deps.stdout.write(JSON.stringify({
          exists: true,
          name: hit.name,
          embeddingDim: hit.embeddingDim
        }) + "\n");
      } else {
        deps.stdout.write(JSON.stringify({ exists: false }) + "\n");
      }
      return 0;
    }
    case "get-scene": {
      const campaign = deps.engine.campaign(campaignId);
      const scene = await campaign.currentScene();
      deps.stdout.write(JSON.stringify(scene) + "\n");
      return 0;
    }
    case "prepare-turn": {
      const campaign = deps.engine.campaign(campaignId);
      const result = await campaign.prepareTurn();
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    case "validate-narration": {
      const argsObj = (inv.argsInline ?? {}) as Record<string, unknown>;
      const narration = argsObj["narration"];
      if (typeof narration !== "string" || narration.length === 0) {
        throw new CliError("INVALID_ARGS", "validate-narration requires args.narration (string)");
      }
      const type = argsObj["type"] as import("../domain/entity.js").EntityType | undefined;
      const strict = argsObj["strict"] === true;
      const campaign = deps.engine.campaign(campaignId);
      const report = await campaign.validateNarration({
        narration,
        ...(type !== undefined ? { type } : {}),
        ...(strict ? { strict: true } : {})
      });
      deps.stdout.write(JSON.stringify(report) + "\n");
      return strict && !report.ok ? 1 : 0;
    }
    default: {
      // 10 tool commands: kebab-case → sneq__snake_case
      const toolName = `sneq__${inv.command.replaceAll("-", "_")}`;
      const finalArgs = await assembleToolArgs(inv, deps, args);
      const campaign = deps.engine.campaign(campaignId);
      const result = await dispatchToolCall(toolName, finalArgs, campaign);
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
  }
}

async function assembleToolArgs(
  inv: ParsedInvocation,
  deps: FullRunDeps,
  inlineArgs: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let merged: Record<string, unknown> = { ...inlineArgs };
  if (inv.argsInline === undefined) {
    const fromStdin = await readStdinJson(deps.stdin);
    if (fromStdin && typeof fromStdin === "object") {
      merged = { ...(fromStdin as Record<string, unknown>) };
    }
  }
  if (inv.command === "register-fact" && merged["observation"] === undefined) {
    const sceneId = await currentSceneId(deps, campaignIdFromInv(inv));
    merged["observation"] = buildObservation(
      inv.source,
      inv.observationOverride,
      sceneId
    );
  }
  return merged;
}

function campaignIdFromInv(inv: ParsedInvocation): string {
  // inv.campaign is asserted non-null at this point (dispatch checks earlier).
  return inv.campaign!;
}

async function currentSceneId(deps: FullRunDeps, campaignIdStr: string): Promise<string | undefined> {
  const ctx = deps.engine.campaign(asCampaignId(campaignIdStr));
  const scene = await ctx.currentScene();
  return scene?.id;
}
