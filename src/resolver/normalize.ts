/** Diacritics-stripped, lowercased, whitespace-collapsed — the alias index key. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** normalizeText + leading article stripping (the/le/la/les/l'). */
export function normalizeAlias(s: string): string {
  return normalizeText(s).replace(/^(the |le |la |les |l['’])/i, "").trim();
}
