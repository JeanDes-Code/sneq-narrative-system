import type { Engine } from "../engine.js";
import type { ParsedInvocation } from "./types.js";
import { CliError, formatError } from "./errors.js";
import { helpText } from "./help.js";
import { asCampaignId } from "../domain/ids.js";
import { dispatchToolCall } from "../tools/dispatcher.js";
import { buildObservation } from "./observation.js";
import type { FeedbackStatus } from "../domain/feedback.js";

export interface FullRunDeps {
  stdin: NodeJS.ReadableStream;
  stdout: NodeJS.WritableStream;
  engine: Engine;
  /** Default dim for init-campaign when --embedding-dim is absent: derived from the
   *  router config's embeddings primary (embeddingDim metadata), 0 when the config
   *  has no embeddings tier, null/undefined when underivable (explicit flag required). */
  defaultEmbeddingDim?: number | null;
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
      const fromArgs = args["embeddingDim"] !== undefined ? Number(args["embeddingDim"]) : undefined;
      const embeddingDim = inv.embeddingDim ?? fromArgs ?? deps.defaultEmbeddingDim ?? undefined;
      if (embeddingDim === undefined || Number.isNaN(embeddingDim)) {
        throw new CliError("INVALID_ARGS",
          "embedding dimension required: pass --embedding-dim <N> (0 = no embeddings). The router config's embeddings primary has no embeddingDim metadata to derive a default from.");
      }
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
    case "collapse-attribute":
      throw new CliError("NOT_IMPLEMENTED",
        "collapse-attribute is not wired in V2 — compose your own LLM call (heavy tier) + validateValue + register-fact. The tool is no longer advertised to LLM agents either.");
    case "feedback": {
      const statusRaw = inv.status ?? (typeof args["status"] === "string" ? (args["status"] as string) : undefined);
      let status: FeedbackStatus | undefined;
      if (statusRaw !== undefined) {
        const up = statusRaw.toUpperCase();
        // Valid values mirror FeedbackStatus — keep both sites (feedback / triage-feedback) in sync with domain/feedback.ts.
        if (!["OPEN", "TRIAGED", "PROMOTED", "DISMISSED"].includes(up)) {
          throw new CliError("INVALID_ARGS", `--status must be one of open|triaged|promoted|dismissed, got: ${statusRaw}`);
        }
        status = up as FeedbackStatus;
      }
      const since = inv.since ?? (typeof args["since"] === "number" ? (args["since"] as number) : undefined);
      const campaign = deps.engine.campaign(campaignId);
      const digest = await campaign.feedbackDigest({
        ...(status !== undefined ? { status } : {}),
        ...(since !== undefined ? { since } : {})
      });
      deps.stdout.write(JSON.stringify(digest) + "\n");
      return 0;
    }
    case "triage-feedback": {
      const id = args["id"];
      const statusRaw = args["status"];
      const promotedTo = args["promotedTo"];
      if (typeof id !== "string" || id.length === 0) {
        throw new CliError("INVALID_ARGS", "triage-feedback requires args.id (string)");
      }
      const up = typeof statusRaw === "string" ? statusRaw.toUpperCase() : "";
      if (!["OPEN", "TRIAGED", "PROMOTED", "DISMISSED"].includes(up)) {
        throw new CliError("INVALID_ARGS",
          `triage-feedback requires args.status (open|triaged|promoted|dismissed)${typeof statusRaw === "string" ? `, got: ${statusRaw}` : ""}`);
      }
      if (promotedTo !== undefined && typeof promotedTo !== "string") {
        throw new CliError("INVALID_ARGS", "args.promotedTo must be a string URL");
      }
      const campaign = deps.engine.campaign(campaignId);
      const result = await campaign.triageFeedback({
        id, status: up as FeedbackStatus,
        ...(promotedTo !== undefined ? { promotedTo } : {})
      });
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    default: {
      // 10 remaining tool commands: kebab-case → sneq__snake_case
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
