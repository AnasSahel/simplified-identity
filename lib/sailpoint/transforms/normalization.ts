import type { TransformSpec } from "./types";

const TOPONYMIC = new Set([
  "von",
  "van",
  "der",
  "den",
  "del",
  "de",
  "la",
  "le",
  "of",
  "y",
]);

const ROMAN_NUMERAL_RE = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

function normalizeSegment(segment: string, isFirst: boolean): string {
  if (!segment) return "";
  const lower = segment.toLowerCase();

  // Roman numerals → all-uppercase. Don't roman-ify a leading word that's
  // really a name (e.g. "Iv" the person), so require length > 0 and a strict
  // match.
  if (lower.length > 0 && lower.length <= 5 && ROMAN_NUMERAL_RE.test(lower)) {
    return lower.toUpperCase();
  }

  // Toponymic prefixes lowercase — but never as the first word
  // (a sentence shouldn't start with "von ...").
  if (!isFirst && TOPONYMIC.has(lower)) return lower;

  // Patronymic prefixes: "Mc" + capitalized rest, "Mac" + capitalized rest.
  if (lower.startsWith("mc") && lower.length > 2) {
    return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  if (lower.startsWith("mac") && lower.length > 3) {
    return "Mac" + lower.charAt(3).toUpperCase() + lower.slice(4);
  }

  // Default: Title Case the first letter, lowercase the rest.
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Splits on spaces, hyphens, and apostrophes (the doc-listed boundaries),
 * normalizes each segment, then re-joins with the original separator.
 *
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/name-normalizer
 */
function normalizeNamesString(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  // Capture both segments and their separators (\\s, -, ').
  const tokens = trimmed.split(/([\s\-'])/);
  let firstWordSeen = false;
  return tokens
    .map((tok) => {
      if (!tok || /^[\s\-']$/.test(tok)) return tok;
      const normalized = normalizeSegment(tok, !firstWordSeen);
      firstWordSeen = true;
      return normalized;
    })
    .join("");
}

export const normalizeNames: TransformSpec = {
  type: "normalizeNames",
  group: "normalization",
  description:
    "Title-cases names with SailPoint rules: Mc/Mac patronymics, toponymic prefixes lowercased (von/de/la/of...), Roman numerals upper.",
  evaluate: (_attrs, input) => normalizeNamesString(input),
};

export const decomposeDiacriticalMarks: TransformSpec = {
  type: "decomposeDiacriticalMarks",
  group: "normalization",
  description:
    "Strips diacritical marks (e.g. Café → Cafe) via Unicode NFD normalization.",
  evaluate: (_attrs, input) =>
    input.normalize("NFD").replace(/[̀-ͯ]/g, ""),
};

export const NORMALIZATION_SPECS = [
  normalizeNames,
  decomposeDiacriticalMarks,
];
