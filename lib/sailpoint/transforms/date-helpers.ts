/**
 * Date utilities shared by the `dateCompare` and `dateMath` evaluators.
 *
 * Design choices (all UTC, all native):
 *
 *  - No external date library (date-fns / dayjs). The surface needed by the
 *    two specs is small enough that native `Date` + a couple of regex parsers
 *    keeps the bundle lean.
 *  - Every operation works in UTC. SailPoint stores and computes transform
 *    dates in UTC; mirroring that avoids the local-vs-UTC drift bug class
 *    (e.g. a YYYY-MM-DD parsed in Europe/Paris would shift by an hour).
 *  - Parsing is permissive but explicit: ISO 8601, common date-only and
 *    space-separated forms, and Unix timestamps (seconds or milliseconds).
 *    Anything outside that whitelist throws — we'd rather fail loudly than
 *    silently misalign with SailPoint's parser.
 */

import { TransformEvalError } from "./types";

const UNIT_NAMES: Record<string, string> = {
  y: "year",
  M: "month",
  w: "week",
  d: "day",
  H: "hour",
  m: "minute",
  s: "second",
};

export type DateMathUnit = "y" | "M" | "w" | "d" | "H" | "m" | "s";

export function isDateMathUnit(s: string): s is DateMathUnit {
  return s in UNIT_NAMES;
}

/**
 * Parse a date input into a UTC `Date`.
 *
 * Accepts:
 *  - ISO 8601 with explicit offset (e.g. `2026-05-11T10:00:00Z`,
 *    `2026-05-11T10:00:00+02:00`).
 *  - Date-only `YYYY-MM-DD` — treated as `T00:00:00Z`.
 *  - Space-separated `YYYY-MM-DD HH:mm:ss` — treated as UTC.
 *  - Unix timestamp (number, or all-digits string). 10 digits => seconds,
 *    13 digits => milliseconds. We disambiguate by length.
 *
 * Throws `TransformEvalError` for anything else — including ambiguous
 * formats like `05/11/2026` (US vs ISO).
 */
export function parseDate(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new TransformEvalError(
      `Invalid date: empty string. Supported: ISO 8601, YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, or Unix timestamp.`,
    );
  }

  // Unix timestamps (numeric)
  if (/^-?\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    // 10 digits or fewer => seconds; 13 digits => milliseconds. Anything
    // in between (or longer) is suspicious — disambiguate by length.
    const ms = trimmed.replace(/^-/, "").length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) {
      throw new TransformEvalError(`Invalid Unix timestamp: "${value}"`);
    }
    return d;
  }

  // Date-only YYYY-MM-DD — anchor at UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) {
      throw new TransformEvalError(`Invalid date format: "${value}"`);
    }
    return d;
  }

  // Space-separated YYYY-MM-DD HH:mm:ss — coerce to UTC by swapping space
  // for `T` and appending `Z`.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed.replace(" ", "T")}Z`);
    if (Number.isNaN(d.getTime())) {
      throw new TransformEvalError(`Invalid date format: "${value}"`);
    }
    return d;
  }

  // ISO 8601 with explicit offset or `Z`. Reject bare ISO without offset to
  // avoid silent local-tz parsing.
  if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/.test(
      trimmed,
    )
  ) {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) {
      throw new TransformEvalError(`Invalid date format: "${value}"`);
    }
    return d;
  }

  throw new TransformEvalError(
    `Invalid date format: "${value}". Supported: ISO 8601 (with offset), YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, or Unix timestamp.`,
  );
}

/**
 * Format a UTC `Date` as ISO 8601 (e.g. `2026-05-11T10:00:00.000Z`).
 * Centralised so callers don't sprinkle `toISOString()` directly.
 */
export function formatIso(date: Date): string {
  return date.toISOString();
}

/**
 * Apply a single `+1d` / `-3M` style operation to a date, IN PLACE on a
 * cloned date. All shifts are UTC.
 *
 * Note on units:
 *  - `y` year, `M` month (uppercase, per SailPoint convention)
 *  - `w` week (= 7 days)
 *  - `d` day
 *  - `H` hour (uppercase 24-hour), `m` minute, `s` second
 */
function applyShift(date: Date, sign: 1 | -1, amount: number, unit: DateMathUnit): void {
  const delta = sign * amount;
  switch (unit) {
    case "y":
      date.setUTCFullYear(date.getUTCFullYear() + delta);
      return;
    case "M":
      date.setUTCMonth(date.getUTCMonth() + delta);
      return;
    case "w":
      date.setUTCDate(date.getUTCDate() + delta * 7);
      return;
    case "d":
      date.setUTCDate(date.getUTCDate() + delta);
      return;
    case "H":
      date.setUTCHours(date.getUTCHours() + delta);
      return;
    case "m":
      date.setUTCMinutes(date.getUTCMinutes() + delta);
      return;
    case "s":
      date.setUTCSeconds(date.getUTCSeconds() + delta);
      return;
  }
}

/**
 * Truncate a date to the start of the given unit, in UTC. `roundUp=true`
 * advances by one unit before truncating, yielding the START of the NEXT
 * unit boundary (i.e. an exclusive end-of-period). This matches SailPoint's
 * `dateMath` rounding semantics where the rounded value represents the
 * inclusive boundary of the period the user wrote.
 */
function roundTo(date: Date, unit: DateMathUnit, roundUp: boolean): Date {
  const out = new Date(date.getTime());
  if (roundUp) {
    applyShift(out, 1, 1, unit);
  }
  switch (unit) {
    case "y":
      out.setUTCMonth(0, 1);
      out.setUTCHours(0, 0, 0, 0);
      return out;
    case "M":
      out.setUTCDate(1);
      out.setUTCHours(0, 0, 0, 0);
      return out;
    case "w": {
      // ISO week — Monday as the first day. JS getUTCDay returns 0 (Sun)…6 (Sat).
      const day = out.getUTCDay();
      const offsetToMonday = (day + 6) % 7;
      out.setUTCDate(out.getUTCDate() - offsetToMonday);
      out.setUTCHours(0, 0, 0, 0);
      return out;
    }
    case "d":
      out.setUTCHours(0, 0, 0, 0);
      return out;
    case "H":
      out.setUTCMinutes(0, 0, 0);
      return out;
    case "m":
      out.setUTCSeconds(0, 0);
      return out;
    case "s":
      out.setUTCMilliseconds(0);
      return out;
  }
}

export type ParsedDateMath = {
  /** `now` or omitted (caller supplies an explicit base). */
  base: "now" | "input";
  /** Ordered list of shifts to apply. */
  shifts: Array<{ sign: 1 | -1; amount: number; unit: DateMathUnit }>;
  /** Rounding unit, if the expression ended in `/X`. */
  round?: DateMathUnit;
};

/**
 * Parse a SailPoint date-math expression into its structural parts.
 *
 * Grammar (no whitespace allowed):
 *   expr     := base shifts? rounding?
 *   base     := "now" | ""             (empty => caller-supplied input)
 *   shifts   := ([+-]\d+[yMwdHms])+
 *   rounding := "/" [yMwdHms]
 *
 * Examples:
 *   `now`         -> base=now, no shifts, no round
 *   `now+1d`      -> +1 day
 *   `now-3M+5d`   -> -3 months then +5 days
 *   `+7d/d`       -> base=input, +7 days, round to start of day
 *   `/M`          -> base=input, no shift, round to start of month
 */
export function parseDateMathExpression(expression: string): ParsedDateMath {
  const trimmed = expression.trim();
  if (!trimmed) {
    throw new TransformEvalError("dateMath: empty expression");
  }

  let rest = trimmed;
  let base: ParsedDateMath["base"];

  if (rest.startsWith("now")) {
    base = "now";
    rest = rest.slice(3);
  } else {
    base = "input";
  }

  // Pull a trailing `/X` rounding unit if present.
  let round: DateMathUnit | undefined;
  const roundMatch = rest.match(/\/([yMwdHms])$/);
  if (roundMatch) {
    round = roundMatch[1] as DateMathUnit;
    rest = rest.slice(0, -2);
  }

  // Everything left must be a chain of `[+-]\d+[yMwdHms]` tokens, with no
  // gaps. We tokenize with a global regex, then assert that concatenating
  // the tokens reproduces the input — that catches stray characters that
  // the regex would otherwise quietly skip.
  const shiftRe = /([+-])(\d+)([yMwdHms])/g;
  const shifts: ParsedDateMath["shifts"] = [];
  let reconstructed = "";
  for (const m of rest.matchAll(shiftRe)) {
    const [token, signStr, amountStr, unitStr] = m;
    reconstructed += token;
    shifts.push({
      sign: signStr === "-" ? -1 : 1,
      amount: Number(amountStr),
      unit: unitStr as DateMathUnit,
    });
  }
  if (reconstructed !== rest) {
    throw new TransformEvalError(
      `dateMath: malformed expression "${expression}". Expected base ("now" or empty) followed by zero or more shifts like "+1d" or "-3M", optionally ending in "/<unit>".`,
    );
  }

  return { base, shifts, round };
}

/**
 * Evaluate a parsed date-math against an explicit base date.
 * Pure — does not mutate `baseDate`.
 */
export function evaluateDateMath(
  parsed: ParsedDateMath,
  baseDate: Date,
  roundUp = false,
): Date {
  const out = new Date(baseDate.getTime());
  for (const { sign, amount, unit } of parsed.shifts) {
    applyShift(out, sign, amount, unit);
  }
  if (parsed.round) {
    return roundTo(out, parsed.round, roundUp);
  }
  return out;
}
