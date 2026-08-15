import type { Engine } from "../engine.js";
import type { ParsedInvocation } from "./types.js";
import { CliError, formatError } from "./errors.js";
import { helpText } from "./help.js";
import { asCampaignId, asHolderId, asEntityID } from "../domain/ids.js";
import type { EntityID, HolderId } from "../domain/ids.js";
import type { Holder } from "../domain/holder.js";
import type { DispatchPolicy } from "../domain/carriage.js";
import { dispatchToolCall } from "../tools/dispatcher.js";
import { buildObservation } from "./observation.js";

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
      // #21: holderless is the wake-up probe and returns the frame only. No
      // holder knowledge means no way to read the world sideways through it.
      const campaign = deps.engine.campaign(campaignId);
      const result = await campaign.prepareTurn(holderSelector(inv, false));
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    case "get-holder-context": {
      const selector = holderSelector(inv, true);
      const campaign = deps.engine.campaign(campaignId);
      const ctx = await campaign.getHolderContext({
        ...selector,
        ...(args["about"] !== undefined ? { about: args["about"] as EntityID } : {}),
        ...(args["topK"] !== undefined ? { topK: Number(args["topK"]) } : {})
      });
      deps.stdout.write(JSON.stringify(ctx) + "\n");
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
      const holderId = inv.holder ?? (argsObj["holderId"] as string | undefined);
      const campaign = deps.engine.campaign(campaignId);
      const report = await campaign.validateNarration({
        narration,
        ...(type !== undefined ? { type } : {}),
        ...(strict ? { strict: true } : {}),
        ...(holderId !== undefined ? { holderId: asHolderId(holderId) } : {})
      });
      deps.stdout.write(JSON.stringify(report) + "\n");
      // A BLOCK is always exit 1: it is not advisory, whatever --args said.
      if (report.verdict === "BLOCK") return 1;
      return strict && !report.ok ? 1 : 0;
    }
    case "upsert-holder": {
      // Special-cased rather than an eleventh tool (§5.3): holder authoring is a
      // host/setup concern, not a narration-loop one, and in-play creation
      // already rides commit_narrative's holders[].
      const holder = (await assembleToolArgs(inv, deps, args)) as unknown as Holder;
      if (holder?.kind !== "GROUP" && holder?.kind !== "INDIVIDUAL") {
        throw new CliError("INVALID_ARGS",
          `upsert-holder requires a holder object with kind "GROUP" or "INDIVIDUAL" via --args or stdin`);
      }
      const campaign = deps.engine.campaign(campaignId);
      await campaign.upsertHolder(holder);
      deps.stdout.write(JSON.stringify({ holderId: holder.holderId, kind: holder.kind }) + "\n");
      return 0;
    }
    case "show-dispatch-policy": {
      const campaign = deps.engine.campaign(campaignId);
      const policy = await campaign.getDispatchPolicy();
      deps.stdout.write(JSON.stringify(policy) + "\n");
      return 0;
    }
    case "set-dispatch-policy": {
      const patch = (await assembleToolArgs(inv, deps, args)) as { routes?: unknown[]; rules?: unknown[] };
      if (!Array.isArray(patch.routes) && !Array.isArray(patch.rules)) {
        throw new CliError("INVALID_ARGS",
          "set-dispatch-policy requires args.routes and/or args.rules (arrays). Both are additive: they accrete, they never replace.");
      }
      const campaign = deps.engine.campaign(campaignId);
      const merged = await campaign.setDispatchPolicy(patch as Partial<DispatchPolicy>);
      deps.stdout.write(JSON.stringify(merged) + "\n");
      return 0;
    }
    case "doctor": {
      const campaign = deps.engine.campaign(campaignId);
      const report = await campaign.doctor();
      deps.stdout.write(JSON.stringify(report) + "\n");
      // Exit 1 on FAIL so a CI step or a wrapper script can gate on it; a WARN
      // is worth reading, not worth failing a build over.
      return report.status === "FAIL" ? 1 : 0;
    }
    case "advance-turn": {
      const campaign = deps.engine.campaign(campaignId);
      const merged = await assembleToolArgs(inv, deps, args);
      const days = inv.days ?? (merged["days"] !== undefined ? Number(merged["days"]) : undefined);
      const result = await campaign.advanceTurn({
        ...(merged["summary"] !== undefined ? { summary: String(merged["summary"]) } : {}),
        ...(days !== undefined ? { days } : {})
      });
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
    default: {
      // The remaining tool commands: kebab-case → sneq__snake_case
      const toolName = `sneq__${inv.command.replaceAll("-", "_")}`;
      const finalArgs = await assembleToolArgs(inv, deps, args);
      const campaign = deps.engine.campaign(campaignId);
      const result = await dispatchToolCall(toolName, finalArgs, campaign);
      deps.stdout.write(JSON.stringify(result) + "\n");
      return 0;
    }
  }
}

/**
 * `--holder` / `--entity`, at most one. When `required`, absence is an error;
 * on `prepare-turn` absence is the wake-up probe and returns the frame alone.
 */
function holderSelector(
  inv: ParsedInvocation,
  required: boolean
): { holderId?: HolderId; entityId?: EntityID } {
  if (inv.holder !== undefined && inv.entity !== undefined) {
    throw new CliError("INVALID_ARGS",
      "pass --holder or --entity, not both: --holder reads a holder directly, --entity runs the resolution cascade");
  }
  if (inv.holder !== undefined) return { holderId: asHolderId(inv.holder) };
  if (inv.entity !== undefined) return { entityId: asEntityID(inv.entity) };
  if (required) {
    throw new CliError("INVALID_ARGS",
      "this read is always somebody's: pass --holder <holderId> or --entity <entityId>. " +
      "There is no way to ask what is true.");
  }
  return {};
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
  // The provenance presets survive the rename (§5.3): `--source` used to be
  // wired only to the now-deleted `register-fact`, so Hermes/Leeloo's live-play
  // flag would have died silently with it. Every record in the bundle that did
  // not bring its own observation gets the preset's.
  if (inv.command === "commit-narrative" && (inv.source !== undefined || inv.observationOverride !== undefined)) {
    const sceneId = await currentSceneId(deps, campaignIdFromInv(inv));
    const observation = buildObservation(inv.source, inv.observationOverride, sceneId);
    const records = merged["records"];
    if (Array.isArray(records)) {
      merged["records"] = records.map(r => {
        const row = r as Record<string, unknown>;
        return row["observation"] === undefined ? { ...row, observation } : row;
      });
    }
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
