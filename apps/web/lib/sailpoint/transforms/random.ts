import type { TransformSpec } from "./types";

/**
 * Random / generator specs. Grouped in their own file because:
 *   - they share an alphabet helper (`pickRandomChars`)
 *   - none of them resolves a contextual input (they ignore the parent
 *     pipe and the optional `attrs.input` — they're generators, not
 *     transformers)
 *   - each run produces a different output, which is intentional and
 *     surfaced as-is in the step trace
 *
 * Determinism: out of scope for v0. SailPoint's behaviour is non-seeded
 * too — every evaluation produces a fresh value. The Test tab will show
 * a new output each Run, which is the expected UX here.
 */

const LOWER_ALPHA = "abcdefghijklmnopqrstuvwxyz";
const UPPER_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SPECIAL_CHARS = "!@#$%^&*()-_=+[]{}";

function pickRandomChars(length: number, alphabet: string): string {
  if (alphabet.length === 0 || length <= 0) return "";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function coerceLength(raw: unknown, fallback: number): number {
  const n = Number(raw ?? fallback);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

// https://developer.sailpoint.com/docs/extensibility/transforms/operations/generate-random-string
export const generateRandomString: TransformSpec = {
  type: "generateRandomString",
  group: "string-ops",
  description:
    "Generates a random string of the given length. Letters always; digits and special chars are opt-in via flags.",
  evaluate: (attrs) => {
    const length = coerceLength(attrs.length, 12);
    const includeNumbers = attrs.includeNumbers !== false; // default true
    const includeSpecialChars = attrs.includeSpecialChars === true; // default false
    let alphabet = LOWER_ALPHA + UPPER_ALPHA;
    if (includeNumbers) alphabet += DIGITS;
    if (includeSpecialChars) alphabet += SPECIAL_CHARS;
    return pickRandomChars(length, alphabet);
  },
};

// https://developer.sailpoint.com/docs/extensibility/transforms/operations/random-alphanumeric
export const randomAlphanumeric: TransformSpec = {
  type: "randomAlphanumeric",
  group: "string-ops",
  description:
    "Generates a random alphanumeric string (letters + digits) of the given length.",
  evaluate: (attrs) => {
    const length = coerceLength(attrs.length, 12);
    return pickRandomChars(length, LOWER_ALPHA + UPPER_ALPHA + DIGITS);
  },
};

// https://developer.sailpoint.com/docs/extensibility/transforms/operations/random-numeric
export const randomNumeric: TransformSpec = {
  type: "randomNumeric",
  group: "string-ops",
  description:
    "Generates a random numeric string (digits only) of the given length.",
  evaluate: (attrs) => {
    const length = coerceLength(attrs.length, 12);
    return pickRandomChars(length, DIGITS);
  },
};

// https://developer.sailpoint.com/docs/extensibility/transforms/operations/uuid-generator
export const uuid: TransformSpec = {
  type: "uuid",
  group: "string-ops",
  description: "Generates a random UUID v4.",
  evaluate: () => {
    if (
      typeof globalThis.crypto !== "undefined" &&
      typeof globalThis.crypto.randomUUID === "function"
    ) {
      return globalThis.crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID — rare, but keeps
    // the spec usable in older runtimes.
    return fallbackUuidV4();
  },
};

function fallbackUuidV4(): string {
  // RFC 4122 §4.4 — version 4, variant 10x.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const RANDOM_SPECS: TransformSpec[] = [
  generateRandomString,
  randomAlphanumeric,
  randomNumeric,
  uuid,
];
