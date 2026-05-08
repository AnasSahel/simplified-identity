import type { TransformSpec } from "./types";

export const normalizeNames: TransformSpec = {
  type: "normalizeNames",
  group: "normalization",
  description:
    "Trims, collapses whitespace, and applies Title Case (preserves hyphens and apostrophes).",
  evaluate: (_attrs, input) => {
    const cleaned = input.trim().replace(/\s+/g, " ").toLowerCase();
    return cleaned.replace(
      /(?:^|[\s\-'])(\p{L})/gu,
      (m) => m.toUpperCase(),
    );
  },
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
