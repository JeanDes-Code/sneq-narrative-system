import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const exec = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(__dirname, "..", "..", "dist", "cli.js");

describe("CLI smoke (built binary)", () => {
  let tmp: string;
  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "sneq-smoke-"));
  });
  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("--help prints general help and exits 0", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toMatch(/sneq-engine — narrative-state engine CLI/);
  });

  it("--help lists validate-narration, prepare-turn, and campaign-exists", async () => {
    const { stdout } = await exec("node", [CLI, "--help"]);
    expect(stdout).toMatch(/validate-narration/);
    expect(stdout).toMatch(/prepare-turn/);
    expect(stdout).toMatch(/campaign-exists/);
  });

  it("init-campaign round-trips through the binary", async () => {
    const db = join(tmp, "smoke.db");
    const { stdout } = await exec("node", [
      CLI, "init-campaign", "--db", db, "--campaign", "smoke",
      "--embedding-dim", "768",
      "--args", '{"name":"Smoke"}'
    ]);
    expect(JSON.parse(stdout.trim())).toEqual({ campaignId: "smoke", created: true, embeddingDim: 768 });
  });
});
