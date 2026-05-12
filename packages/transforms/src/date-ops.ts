/**
 * Date-aware specs: `dateCompare` and `dateMath`.
 *
 * Both delegate the heavy lifting to `./date-helpers`:
 *  - `parseDate` to coerce strings/timestamps to UTC Dates;
 *  - `parseDateMathExpression` + `evaluateDateMath` for shifts and rounding.
 *
 * Kept in their own module (rather than appending to `format.ts`) because
 * they share a non-trivial helper surface and grouping them keeps the
 * date-related code easy to evolve together.
 */

import { TransformEvalError, type TransformSpec } from "./types";
import { evalValue, resolveInput } from "./_shared";
import {
  evaluateDateMath,
  formatIso,
  parseDate,
  parseDateMathExpression,
} from "./date-helpers";

const COMPARE_OPERATORS = ["LT", "LTE", "EQ", "GT", "GTE", "NEQ"] as const;
type CompareOperator = (typeof COMPARE_OPERATORS)[number];

function isCompareOperator(s: string): s is CompareOperator {
  return (COMPARE_OPERATORS as readonly string[]).includes(s);
}

function compare(operator: CompareOperator, a: number, b: number): boolean {
  switch (operator) {
    case "LT":
      return a < b;
    case "LTE":
      return a <= b;
    case "EQ":
      return a === b;
    case "GT":
      return a > b;
    case "GTE":
      return a >= b;
    case "NEQ":
      return a !== b;
  }
}

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/date-compare
 *
 * Compares `firstDate` and `secondDate` using a SailPoint operator
 * (LT|LTE|EQ|GT|GTE|NEQ) and branches to `positiveCondition` /
 * `negativeCondition`. Each branch and date input can be a primitive
 * string or a nested sub-transform — we route everything through
 * `evalValue` so the polymorphism is uniform.
 *
 * Dates are compared by their numeric UTC timestamps after parsing through
 * `parseDate`, which only accepts unambiguous formats (ISO 8601 with
 * offset, YYYY-MM-DD, etc.). See `date-helpers.ts` for the full list.
 */
export const dateCompare: TransformSpec = {
  type: "dateCompare",
  group: "date",
  description:
    "Compares two dates (LT/LTE/EQ/GT/GTE/NEQ) and branches between positiveCondition and negativeCondition.",
  evaluate: (attrs, input, ctx, depth) => {
    if (attrs.firstDate === undefined) {
      throw new TransformEvalError(
        "dateCompare: missing `firstDate` attribute",
      );
    }
    if (attrs.secondDate === undefined) {
      throw new TransformEvalError(
        "dateCompare: missing `secondDate` attribute",
      );
    }
    if (attrs.positiveCondition === undefined) {
      throw new TransformEvalError(
        "dateCompare: missing `positiveCondition` attribute",
      );
    }
    if (attrs.negativeCondition === undefined) {
      throw new TransformEvalError(
        "dateCompare: missing `negativeCondition` attribute",
      );
    }

    const rawOp = String(attrs.operator ?? "");
    if (!isCompareOperator(rawOp)) {
      throw new TransformEvalError(
        `dateCompare: operator "${rawOp}" not supported. Use one of: ${COMPARE_OPERATORS.join(", ")}.`,
      );
    }

    const firstStr = evalValue(attrs.firstDate, input, ctx, depth);
    const secondStr = evalValue(attrs.secondDate, input, ctx, depth);
    const first = parseDate(firstStr);
    const second = parseDate(secondStr);

    const matched = compare(rawOp, first.getTime(), second.getTime());
    return evalValue(
      matched ? attrs.positiveCondition : attrs.negativeCondition,
      input,
      ctx,
      depth,
    );
  },
};

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/date-math
 *
 * Applies a SailPoint date-math expression — base (`now` or implicit input)
 * + zero or more `[+-]N<unit>` shifts + optional `/<unit>` rounding — and
 * returns an ISO 8601 string in UTC.
 *
 * When the expression does NOT start with `now`, the base date comes from
 * `attrs.input` (a sub-transform, resolved via `resolveInput`) or the
 * contextual input piped from the parent chain. This mirrors PR #64's
 * convention for unary specs.
 *
 * The output is always ISO 8601 (`toISOString()`). Reformatting requires
 * chaining `dateFormat` after `dateMath`, which is how SailPoint itself
 * composes the two operations.
 */
export const dateMath: TransformSpec = {
  type: "dateMath",
  group: "date",
  description:
    "Applies shift and rounding operations to a date in UTC (e.g. `now+1d/d`). Output is ISO 8601 — chain `dateFormat` to reshape.",
  evaluate: (attrs, input, ctx, depth) => {
    const expression = attrs.expression;
    if (typeof expression !== "string" || !expression.trim()) {
      throw new TransformEvalError(
        "dateMath: missing or invalid `expression` attribute",
      );
    }
    const parsed = parseDateMathExpression(expression);

    let base: Date;
    if (parsed.base === "now") {
      base = new Date();
    } else {
      const baseStr = resolveInput(attrs, input, ctx, depth);
      base = parseDate(baseStr);
    }

    const roundUp = attrs.roundUp === true;
    const result = evaluateDateMath(parsed, base, roundUp);
    return formatIso(result);
  },
};

export const DATE_OPS_SPECS = [dateCompare, dateMath];
