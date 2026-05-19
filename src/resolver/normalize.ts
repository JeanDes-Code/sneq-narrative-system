export function normalizeAlias(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^(the |le |la |les |l['])/i, "")
    .trim();
}
