import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type RequiredSimulationInput,
  type TransformSpec,
} from "./types";

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

export const e164phone: TransformSpec = {
  type: "e164phone",
  group: "format",
  description:
    "Strips non-digits and prefixes with the region's country code (simplified — SailPoint uses libphonenumber).",
  evaluate: (attrs, input) => {
    const region = String(attrs.defaultRegion ?? "FR").toUpperCase();
    const prefix = COUNTRY_PREFIXES[region];
    if (!prefix) {
      throw new TransformEvalError(
        `e164phone region "${region}" not in local table. SailPoint runtime supports more.`,
      );
    }
    const digitsOnly = input.replace(/\D/g, "");
    if (!digitsOnly) return "";
    const trimmed = digitsOnly.replace(/^0+/, "");
    const prefixDigits = prefix.replace(/\D/g, "");
    if (digitsOnly.startsWith(prefixDigits)) return `+${digitsOnly}`;
    return `${prefix}${trimmed}`;
  },
};

export const iso3166: TransformSpec = {
  type: "iso3166",
  group: "format",
  description: "Coerces a country value to an ISO 3166 code (uppercase).",
  evaluate: (_attrs, input) => {
    const trimmed = input.trim().toUpperCase();
    if (/^[A-Z]{2,3}$/.test(trimmed)) return trimmed;
    return trimmed;
  },
};

export const rfc5646: TransformSpec = {
  type: "rfc5646",
  group: "format",
  description: "Lower-cases a language tag to RFC 5646 canonical form.",
  evaluate: (_attrs, input) => input.trim().toLowerCase(),
};

/**
 * `displayName` reads firstname / lastname from the identity context being
 * computed. We expose those as simulated inputs and compose the result.
 */
const DISPLAY_NAME_INPUTS: RequiredSimulationInput[] = [
  {
    id: "identity.firstname",
    label: "firstname",
    hint: "from identity context",
  },
  {
    id: "identity.lastname",
    label: "lastname",
    hint: "from identity context",
  },
];

export const displayName: TransformSpec = {
  type: "displayName",
  group: "format",
  description:
    "Composes a display name from the identity's firstname and lastname.",
  directInputs: () => DISPLAY_NAME_INPUTS,
  evaluate: (_attrs, _input, ctx) => {
    const fn = ctx.simulatedValues["identity.firstname"];
    const ln = ctx.simulatedValues["identity.lastname"];
    if (fn === undefined && ln === undefined) {
      throw new UnsupportedTransformTypeError(
        "displayName",
        "Reads firstname and lastname from the identity context. Provide simulated values to test.",
      );
    }
    return [fn, ln].filter((s) => s && s.trim().length > 0).join(" ");
  },
};

export const dateFormat: TransformSpec = {
  type: "dateFormat",
  group: "date",
  description:
    "Parses a date and reformats it. Local evaluator uses `Date.parse` so non-ISO inputs may differ from SailPoint.",
  evaluate: (attrs, input) => {
    const outputFormat = attrs.outputFormat;
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) {
      throw new TransformEvalError(
        `dateFormat: cannot parse "${input}". Try ISO 8601 (YYYY-MM-DD).`,
      );
    }
    if (typeof outputFormat === "string") {
      if (outputFormat === "ISO8601") return date.toISOString();
      if (outputFormat === "MM/dd/yyyy")
        return `${String(date.getUTCMonth() + 1).padStart(2, "0")}/${String(date.getUTCDate()).padStart(2, "0")}/${date.getUTCFullYear()}`;
      if (outputFormat === "yyyy-MM-dd")
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    }
    return date.toISOString();
  },
};

export const FORMAT_SPECS = [
  e164phone,
  iso3166,
  rfc5646,
  displayName,
  dateFormat,
];
