/**
 * Text normalisation used by search. Handles Arabic letter variants,
 * diacritics, tatweel, the definite article, Arabic-Indic digits, extra
 * spaces and Latin case so that "الأهلى" / "الاهلي" / "اهلي" / "Al Ahly"
 * resolve to the same tokens.
 */

const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;
const TATWEEL = /\u0640/g;
const ARABIC_INDIC_DIGITS = /[\u0660-\u0669]/g;
const EXTENDED_ARABIC_DIGITS = /[\u06F0-\u06F9]/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(TATWEEL, "")
    .replace(ARABIC_INDIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(EXTENDED_ARABIC_DIGITS, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const LATIN_ARTICLES = new Set(["al", "el", "fc", "sc", "cf", "afc", "club", "the"]);

/** Removes the Arabic article "ال" (and common Latin prefixes/suffixes) from a token. */
export function stripArticle(token: string): string {
  if (token.length > 3 && token.startsWith("ال")) return token.slice(2);
  if (token.length > 4 && (token.startsWith("وال") || token.startsWith("بال"))) return token.slice(3);
  return token;
}

/** Normalised tokens without articles and filler words. */
export function searchTokens(input: string): string[] {
  return normalizeText(input)
    .split(" ")
    .filter(Boolean)
    .map(stripArticle)
    .filter((t) => !LATIN_ARTICLES.has(t) && t !== "نادي" && t !== "فريق");
}

/** Single compact key (no spaces/articles) used for typo-tolerant matching. */
export function compactKey(input: string): string {
  return searchTokens(input).join("");
}

export function isArabic(input: string): boolean {
  return /[\u0600-\u06FF]/.test(input);
}

/** Levenshtein distance with an early exit when it exceeds `max`. */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min((prev[j] ?? 0) + 1, (curr[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      curr.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    prev = curr;
  }
  return prev[b.length] ?? max + 1;
}

/**
 * Scores how well `query` matches any of the candidate names (0 = no match).
 * Higher is better. Pure function, used by both server search and tests.
 */
export function matchScore(query: string, names: readonly string[]): number {
  const qTokens = searchTokens(query);
  if (qTokens.length === 0) return 0;
  const qCompact = qTokens.join("");
  let best = 0;
  for (const name of names) {
    if (!name) continue;
    const nTokens = searchTokens(name);
    if (nTokens.length === 0) continue;
    const nCompact = nTokens.join("");
    let score = 0;
    if (nCompact === qCompact) score = 100;
    else if (nCompact.startsWith(qCompact)) score = 85;
    else if (qTokens.every((q) => nTokens.some((n) => n.startsWith(q)))) score = 75;
    else if (nCompact.includes(qCompact) && qCompact.length >= 3) score = 65;
    else if (qTokens.every((q) => nTokens.some((n) => n.includes(q))) && qCompact.length >= 3) score = 55;
    else if (qCompact.length >= 4) {
      const allowed = qCompact.length >= 8 ? 2 : 1;
      if (editDistance(qCompact, nCompact, allowed) <= allowed) score = 45;
      else if (
        qTokens.every((q) =>
          nTokens.some((n) => q.length >= 4 && editDistance(q, n, q.length >= 8 ? 2 : 1) <= (q.length >= 8 ? 2 : 1)),
        )
      )
        score = 35;
      else if (nCompact.length > qCompact.length) {
        const prefix = nCompact.slice(0, qCompact.length);
        if (editDistance(qCompact, prefix, allowed) <= allowed) score = 30;
      }
    }
    if (score > best) best = score;
    if (best === 100) break;
  }
  return best;
}
