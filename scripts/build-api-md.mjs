import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const inDir = "docs/typedoc";
const outFile = "docs/api.md";
mkdirSync("docs", { recursive: true });

const ordered = ["classes", "interfaces", "type-aliases", "functions", "variables", "enumerations"];
const sections = [];

// typedoc emits one file per symbol and cross-links them by relative path. We
// concatenate those files into a single api.md, which leaves every one of those
// links pointing into docs/typedoc/ — gitignored, and not in package.json#files.
// The result shipped to npm with ~1000 links that resolve nowhere. Rewrite them
// to in-document anchors instead.
const KIND_BY_DIR = {
  classes: "Class",
  interfaces: "Interface",
  "type-aliases": "Type Alias",
  functions: "Function",
  variables: "Variable",
  enumerations: "Enumeration",
};
const ROOT_ANCHOR = "sneq-engine-api";

/**
 * GitHub's heading slug. Both the anchors we emit and the headings we check them
 * against go through this one function — deriving them separately is how you get
 * a link that looks right and lands nowhere (typedoc escapes `_` as `\_`, which
 * a naive alphanumeric strip silently eats).
 */
function slug(text) {
  return text.trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
}

/** Anchor of the `# <Kind>: <Name>` heading typedoc gives each symbol. */
function anchorFor(dir, name) {
  const kind = KIND_BY_DIR[dir];
  return kind ? slug(`${kind}: ${name}`) : null;
}

/**
 * `fromDir` is the directory of the file being rewritten (null for the root
 * README), which is what makes a bare `Entity.md` resolvable.
 * Fragments are dropped: per-file anchors like `#properties` collide once every
 * file lives in one document, so the symbol's own heading is the honest target.
 */
function rewriteLinks(md, fromDir) {
  return md.replace(/\]\(([^)\s]+?\.md)(#[^)]*)?\)/g, (whole, path) => {
    const parts = (path.startsWith("../") ? path.slice(3) : path).split("/");
    let dir, file;
    if (parts.length === 2) [dir, file] = parts;
    else if (parts.length === 1) [dir, file] = [fromDir, parts[0]];
    else return whole;

    const name = file.replace(/\.md$/, "");
    if (name === "README") return `](#${ROOT_ANCHOR})`;
    const anchor = anchorFor(dir, name);
    return anchor ? `](#${anchor})` : whole;
  });
}

function readMd(p) {
  try { return readFileSync(p, "utf-8"); } catch { return ""; }
}

const rootReadme = readMd(join(inDir, "README.md"));
if (rootReadme) sections.push(rewriteLinks(rootReadme, null));

for (const sub of ordered) {
  const dir = join(inDir, sub);
  if (!existsSync(dir)) continue;
  let entries;
  try { entries = readdirSync(dir).sort(); } catch { continue; }
  if (entries.length === 0) continue;
  sections.push(`\n## ${sub}\n`);
  for (const f of entries) sections.push(rewriteLinks(readMd(join(dir, f)), sub));
}

const out = sections.join("\n");

// Fail loudly rather than ship another silently-broken file: every anchor this
// document points at must be a heading inside it.
const headings = new Set([...out.matchAll(/^#{1,6} (.+)$/gm)].map(([, text]) => slug(text)));
const broken = [...new Set(
  [...out.matchAll(/\]\(#([^)]+)\)/g)].map(([, a]) => a).filter((a) => !headings.has(a)),
)];
const leftover = [...new Set(
  [...out.matchAll(/\]\(([^)\s]+?\.md(?:#[^)]*)?)\)/g)].map(([, p]) => p),
)];

if (broken.length || leftover.length) {
  if (broken.length) console.error(`${broken.length} anchor(s) with no heading: ${broken.slice(0, 10).join(", ")}`);
  if (leftover.length) console.error(`${leftover.length} unrewritten file link(s): ${leftover.slice(0, 10).join(", ")}`);
  process.exit(1);
}

writeFileSync(outFile, out);
console.log(`Wrote ${outFile} (${sections.length} sections, ${headings.size} anchors, 0 dead links)`);
