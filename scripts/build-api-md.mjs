import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const inDir = "docs/typedoc";
const outFile = "docs/api.md";
mkdirSync("docs", { recursive: true });

const ordered = ["classes", "interfaces", "type-aliases", "functions", "variables", "enumerations"];
const sections = [];

function readMd(p) {
  try { return readFileSync(p, "utf-8"); } catch { return ""; }
}

const rootReadme = readMd(join(inDir, "README.md"));
if (rootReadme) sections.push(rootReadme);

for (const sub of ordered) {
  const dir = join(inDir, sub);
  if (!existsSync(dir)) continue;
  let entries;
  try { entries = readdirSync(dir).sort(); } catch { continue; }
  if (entries.length === 0) continue;
  sections.push(`\n## ${sub}\n`);
  for (const f of entries) sections.push(readMd(join(dir, f)));
}

writeFileSync(outFile, sections.join("\n"));
console.log(`Wrote ${outFile} (${sections.length} sections)`);
