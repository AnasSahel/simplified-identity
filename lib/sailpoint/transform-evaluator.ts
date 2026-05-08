/**
 * Local evaluator for SailPoint identity transforms.
 *
 * Pure function — no I/O, no SailPoint round-trip. Covers the deterministic
 * types that don't need a real source/account/identity in scope. For types
 * that do (accountAttribute, identityAttribute, rule), throws
 * `UnsupportedTransformTypeError` so the UI can surface a clear message.
 *
 * The evaluator is recursive — `reference` resolves by name against the
 * transforms map (already loaded for the drawer), so chains work.
 *
 * Approximations vs SailPoint runtime:
 *   - e164phone: digit-stripping + region prefix. SailPoint uses
 *     libphonenumber so subtle inputs may diverge.
 *   - iso3166: passes through if it looks like a 2-letter code, otherwise
 *     uppercases. SailPoint has a country dictionary.
 *   - dateFormat: relies on `Intl.DateTimeFormat` for output and
 *     `Date.parse` for input. Edge formats may parse differently.
 */

const MAX_DEPTH = 50;

export class UnsupportedTransformTypeError extends Error {
  readonly type: string;
  constructor(type: string, message: string) {
    super(message);
    this.name = "UnsupportedTransformTypeError";
    this.type = type;
  }
}

export class TransformEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransformEvalError";
  }
}

export type EvaluableTransform = {
  id: string;
  name: string;
  type: string;
  attributes?: Record<string, unknown>;
};

export type EvalContext = {
  transformsByName: ReadonlyMap<string, EvaluableTransform>;
};

export type EvalResult =
  | { ok: true; output: string }
  | { ok: false; error: string; unsupported?: boolean; type?: string };

const COUNTRY_PREFIXES: Record<string, string> = {
  FR: "+33",
  US: "+1",
  CA: "+1",
  GB: "+44",
  UK: "+44",
  DE: "+49",
  IT: "+39",
  ES: "+34",
  BE: "+32",
  NL: "+31",
  CH: "+41",
  PT: "+351",
  IE: "+353",
  LU: "+352",
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function evalValue(
  value: unknown,
  input: string,
  ctx: EvalContext,
  depth: number,
): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => evalValue(v, input, ctx, depth)).join("");
  }
  if (isRecord(value) && typeof value.type === "string") {
    return evalNode(
      value.type,
      isRecord(value.attributes) ? value.attributes : {},
      input,
      ctx,
      depth + 1,
    );
  }
  return "";
}

function evalNode(
  type: string,
  attrs: Record<string, unknown>,
  input: string,
  ctx: EvalContext,
  depth: number,
): string {
  if (depth > MAX_DEPTH) {
    throw new TransformEvalError(
      `Recursion depth exceeded (${MAX_DEPTH}). Likely a circular reference.`,
    );
  }

  switch (type) {
    case "upper":
      return input.toUpperCase();

    case "lower":
      return input.toLowerCase();

    case "trim":
      return input.trim();

    case "static":
      return String(attrs.value ?? "");

    case "concat": {
      const values = attrs.values;
      if (!Array.isArray(values)) return "";
      return values.map((v) => evalValue(v, input, ctx, depth)).join("");
    }

    case "split": {
      const delimiter = String(attrs.delimiter ?? " ");
      const index = Number(attrs.index ?? 0);
      const parts = input.split(delimiter);
      if (index < 0) return parts[parts.length + index] ?? "";
      return parts[index] ?? "";
    }

    case "substring": {
      const begin = Number(attrs.begin ?? 0);
      const end = attrs.end !== undefined ? Number(attrs.end) : undefined;
      return end !== undefined ? input.slice(begin, end) : input.slice(begin);
    }

    case "replace": {
      const regex = String(attrs.regex ?? "");
      const replacement = String(attrs.replacement ?? "");
      try {
        return input.replace(new RegExp(regex), replacement);
      } catch (e) {
        throw new TransformEvalError(
          `Invalid regex "${regex}": ${(e as Error).message}`,
        );
      }
    }

    case "replaceAll": {
      const table = attrs.table;
      if (!isRecord(table)) return input;
      let result = input;
      for (const [pattern, replacement] of Object.entries(table)) {
        try {
          result = result.replace(
            new RegExp(pattern, "g"),
            String(replacement ?? ""),
          );
        } catch (e) {
          throw new TransformEvalError(
            `Invalid regex "${pattern}": ${(e as Error).message}`,
          );
        }
      }
      return result;
    }

    case "normalizeNames": {
      // Trim, collapse whitespace, Title Case (matches SailPoint's typical use).
      const cleaned = input.trim().replace(/\s+/g, " ").toLowerCase();
      return cleaned.replace(
        /(?:^|[\s\-'])(\p{L})/gu,
        (m) => m.toUpperCase(),
      );
    }

    case "decomposeDiacriticalMarks":
      return input.normalize("NFD").replace(/[̀-ͯ]/g, "");

    case "firstValid": {
      const values = attrs.values;
      if (!Array.isArray(values)) return "";
      let unsupportedSeen: UnsupportedTransformTypeError | null = null;
      let testedCount = 0;
      for (const v of values) {
        testedCount++;
        try {
          const result = evalValue(v, input, ctx, depth);
          if (result !== "" && result != null) return result;
        } catch (e) {
          if (e instanceof UnsupportedTransformTypeError) {
            unsupportedSeen = e;
            continue;
          }
          continue;
        }
      }
      // Every value either threw or returned empty. If at least one was
      // unsupported, surface that — otherwise the user gets an empty string
      // and wonders why.
      if (unsupportedSeen !== null) {
        throw new UnsupportedTransformTypeError(
          unsupportedSeen.type,
          `firstValid couldn't be evaluated: every fallback either failed or relies on a type that needs SailPoint context (${unsupportedSeen.type}).`,
        );
      }
      return "";
    }

    case "e164phone": {
      const region = String(attrs.defaultRegion ?? "FR").toUpperCase();
      const prefix = COUNTRY_PREFIXES[region];
      if (!prefix) {
        throw new TransformEvalError(
          `e164phone region "${region}" not in local table. SailPoint runtime supports more.`,
        );
      }
      const digitsOnly = input.replace(/\D/g, "");
      if (!digitsOnly) return "";
      // Strip a leading "0" (common in FR/national format) before prepending prefix.
      const trimmed = digitsOnly.replace(/^0+/, "");
      // If the input already starts with the country code (e.g. 33...), preserve.
      const prefixDigits = prefix.replace(/\D/g, "");
      if (digitsOnly.startsWith(prefixDigits)) {
        return `+${digitsOnly}`;
      }
      return `${prefix}${trimmed}`;
    }

    case "iso3166": {
      const trimmed = input.trim().toUpperCase();
      // Already a 2-letter or 3-letter code → keep
      if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;
      // Otherwise return uppercase (SailPoint maps from country names to codes)
      return trimmed;
    }

    case "rfc5646":
      return input.trim().toLowerCase();

    case "displayName":
      // SailPoint's `displayName` transform reads firstname / lastname
      // from the identity-profile context being computed. Without that
      // context (we don't have a real identity in scope here) the result
      // would be a lie — surface it explicitly instead.
      throw new UnsupportedTransformTypeError(
        type,
        "displayName composes a name from the identity's firstname / lastname attributes, which only exist in identity-profile context. Not testable locally.",
      );

    case "lookup": {
      const table = attrs.table;
      if (!isRecord(table)) {
        throw new TransformEvalError(
          "lookup: missing or invalid `table` attribute",
        );
      }
      const hit = table[input];
      if (hit !== undefined) return String(hit);
      // SailPoint convention: `default` key in the table acts as a fallback.
      const fallback = table.default;
      if (fallback !== undefined) return String(fallback);
      return "";
    }

    case "base64Encode":
      try {
        return typeof btoa === "function"
          ? btoa(unescape(encodeURIComponent(input)))
          : Buffer.from(input, "utf-8").toString("base64");
      } catch (e) {
        throw new TransformEvalError(
          `base64Encode failed: ${(e as Error).message}`,
        );
      }

    case "base64Decode":
      try {
        return typeof atob === "function"
          ? decodeURIComponent(escape(atob(input)))
          : Buffer.from(input, "base64").toString("utf-8");
      } catch (e) {
        throw new TransformEvalError(
          `base64Decode failed: ${(e as Error).message}`,
        );
      }

    case "dateFormat": {
      const inputFormat = attrs.inputFormat;
      const outputFormat = attrs.outputFormat;
      // Best-effort: rely on Date parsing. Output uses Intl when format is
      // a known shorthand, otherwise return ISO.
      const date = new Date(input);
      if (Number.isNaN(date.getTime())) {
        throw new TransformEvalError(
          `dateFormat: cannot parse "${input}". Local evaluator uses Date.parse — try ISO format.`,
        );
      }
      if (typeof outputFormat === "string") {
        // Map a few common SailPoint formats to a readable equivalent.
        if (outputFormat === "ISO8601") return date.toISOString();
        if (outputFormat === "MM/dd/yyyy")
          return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}`;
        if (outputFormat === "yyyy-MM-dd")
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
      }
      return date.toISOString();
    }

    case "reference": {
      const refName = String(attrs.id ?? "");
      if (!refName) {
        throw new TransformEvalError("reference: missing transform name");
      }
      const referenced = ctx.transformsByName.get(refName);
      if (!referenced) {
        throw new TransformEvalError(
          `Referenced transform "${refName}" not found in this tenant.`,
        );
      }
      const refInput =
        attrs.input !== undefined
          ? evalValue(attrs.input, input, ctx, depth)
          : input;
      return evalNode(
        referenced.type,
        referenced.attributes ?? {},
        refInput,
        ctx,
        depth + 1,
      );
    }

    case "accountAttribute":
    case "identityAttribute":
      throw new UnsupportedTransformTypeError(
        type,
        `${type} resolves against a real SailPoint account or identity — can't be evaluated locally without that context.`,
      );

    case "rule":
      throw new UnsupportedTransformTypeError(
        type,
        "rule transforms execute Beanshell/Java code on the SailPoint engine — not portable to a local evaluator.",
      );

    case "conditional":
    case "dateCompare":
    case "dateMath":
      throw new UnsupportedTransformTypeError(
        type,
        `${type} is not supported in v1 of the local evaluator. It's implementable — file an issue if you need it.`,
      );

    default:
      throw new UnsupportedTransformTypeError(
        type,
        `Unknown transform type "${type}".`,
      );
  }
}

export function evaluateTransform(
  transform: EvaluableTransform,
  input: string,
  ctx: EvalContext,
): EvalResult {
  try {
    const output = evalNode(
      transform.type,
      transform.attributes ?? {},
      input,
      ctx,
      0,
    );
    return { ok: true, output };
  } catch (e) {
    if (e instanceof UnsupportedTransformTypeError) {
      return {
        ok: false,
        error: e.message,
        unsupported: true,
        type: e.type,
      };
    }
    if (e instanceof TransformEvalError) {
      return { ok: false, error: e.message };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
