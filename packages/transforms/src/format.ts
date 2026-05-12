import {
  TransformEvalError,
  UnsupportedTransformTypeError,
  type RequiredSimulationInput,
  type TransformSpec,
} from "./types";
import { resolveInput } from "./_shared";

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

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/e164-phone
 *
 * SailPoint uses libphonenumber under the hood — the local impl is a
 * simplified strip-and-prefix that handles common French/US/UK shapes.
 * Subtle inputs (international format pre-applied, extensions) may differ.
 */
export const e164phone: TransformSpec = {
  type: "e164phone",
  group: "format",
  description:
    "Converts a phone number to E.164. Local approximation — SailPoint uses libphonenumber for full coverage.",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    const region = String(attrs.defaultRegion ?? "FR").toUpperCase();
    const prefix = COUNTRY_PREFIXES[region];
    if (!prefix) {
      throw new TransformEvalError(
        `e164phone region "${region}" not in local table. SailPoint runtime supports more.`,
      );
    }
    const digitsOnly = resolved.replace(/\D/g, "");
    if (!digitsOnly) return "";
    const trimmed = digitsOnly.replace(/^0+/, "");
    const prefixDigits = prefix.replace(/\D/g, "");
    if (digitsOnly.startsWith(prefixDigits)) return `+${digitsOnly}`;
    return `${prefix}${trimmed}`;
  },
};

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/iso-3166
 *
 * SailPoint's iso3166 ships a full country dictionary (alpha2/alpha3/numeric/
 * English/native names). Embedding all of that locally would bloat the bundle.
 * For now we cover the common European + North-American codes; everything
 * else surfaces as `Unsupported` with a hint.
 */
type IsoCountry = { alpha2: string; alpha3: string; numeric: string; names: string[] };
const ISO3166: IsoCountry[] = [
  { alpha2: "FR", alpha3: "FRA", numeric: "250", names: ["france"] },
  { alpha2: "US", alpha3: "USA", numeric: "840", names: ["united states", "united states of america", "usa"] },
  { alpha2: "GB", alpha3: "GBR", numeric: "826", names: ["united kingdom", "uk", "great britain"] },
  { alpha2: "DE", alpha3: "DEU", numeric: "276", names: ["germany", "deutschland"] },
  { alpha2: "ES", alpha3: "ESP", numeric: "724", names: ["spain", "españa", "espana"] },
  { alpha2: "IT", alpha3: "ITA", numeric: "380", names: ["italy", "italia"] },
  { alpha2: "BE", alpha3: "BEL", numeric: "056", names: ["belgium"] },
  { alpha2: "NL", alpha3: "NLD", numeric: "528", names: ["netherlands", "holland"] },
  { alpha2: "CH", alpha3: "CHE", numeric: "756", names: ["switzerland"] },
  { alpha2: "PT", alpha3: "PRT", numeric: "620", names: ["portugal"] },
  { alpha2: "IE", alpha3: "IRL", numeric: "372", names: ["ireland"] },
  { alpha2: "LU", alpha3: "LUX", numeric: "442", names: ["luxembourg"] },
  { alpha2: "CA", alpha3: "CAN", numeric: "124", names: ["canada"] },
  { alpha2: "AU", alpha3: "AUS", numeric: "036", names: ["australia"] },
];

function findCountry(input: string): IsoCountry | undefined {
  const t = input.trim();
  if (!t) return undefined;
  const upper = t.toUpperCase();
  const lower = t.toLowerCase();
  return ISO3166.find(
    (c) =>
      c.alpha2 === upper || c.alpha3 === upper || c.numeric === t || c.names.includes(lower),
  );
}

export const iso3166: TransformSpec = {
  type: "iso3166",
  group: "format",
  description:
    "Looks up a country and emits its ISO-3166 code in the requested format (alpha2 / alpha3 / numeric).",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    const format = String(attrs.format ?? "alpha2");
    const country = findCountry(resolved);
    if (!country) {
      throw new TransformEvalError(
        `iso3166: "${resolved}" not in the local lookup table. The full SailPoint dictionary covers all ~250 countries; the local evaluator only ships the most common ones.`,
      );
    }
    if (format === "alpha3") return country.alpha3;
    if (format === "numeric") return country.numeric;
    return country.alpha2;
  },
};

/**
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/rfc-5646
 *
 * SailPoint ships a language dictionary (3-letter ISO 639-2 → RFC 5646
 * tag). Embedding all of it locally would be heavy; we cover the common
 * European tags. Everything else surfaces a clear error.
 */
const RFC5646_LOOKUP: Record<string, string> = {
  french: "fr",
  fra: "fr",
  fre: "fr",
  english: "en",
  eng: "en",
  spanish: "es",
  spa: "es",
  german: "de",
  deu: "de",
  ger: "de",
  italian: "it",
  ita: "it",
  portuguese: "pt",
  por: "pt",
  dutch: "nl",
  nld: "nl",
  dut: "nl",
};

export const rfc5646: TransformSpec = {
  type: "rfc5646",
  group: "format",
  description:
    "Looks up a language name or ISO 639-2 code and returns the RFC 5646 tag.",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    const key = resolved.trim().toLowerCase();
    const hit = RFC5646_LOOKUP[key];
    if (hit) return hit;
    // Pass through canonical 2-letter codes (already RFC 5646 base form).
    if (/^[a-z]{2}(-[A-Z]{2})?$/.test(resolved.trim())) return resolved.trim();
    throw new TransformEvalError(
      `rfc5646: "${resolved}" not in the local lookup table. SailPoint covers the full ISO 639 set.`,
    );
  },
};

/**
 * `displayName` per SailPoint docs: `(preferredName ?? givenName) + " " + familyName`.
 * No casing change — input is expected to already be properly cased.
 *
 * Doc: https://developer.sailpoint.com/docs/extensibility/transforms/operations/display-name
 */
const DISPLAY_NAME_INPUTS: RequiredSimulationInput[] = [
  {
    id: "identity.preferredName",
    label: "preferredName",
    hint: "optional — wins over givenName when set",
  },
  {
    id: "identity.givenName",
    label: "givenName",
    hint: "fallback when preferredName is empty",
  },
  {
    id: "identity.familyName",
    label: "familyName",
    hint: "always appended",
  },
];

export const displayName: TransformSpec = {
  type: "displayName",
  group: "format",
  description:
    "Composes (preferredName ?? givenName) + ' ' + familyName from the identity context. Does not change case.",
  directInputs: () => DISPLAY_NAME_INPUTS,
  evaluate: (_attrs, _input, ctx) => {
    const preferred = ctx.simulatedValues["identity.preferredName"]?.trim();
    const given = ctx.simulatedValues["identity.givenName"]?.trim();
    const family = ctx.simulatedValues["identity.familyName"]?.trim();
    if (!preferred && !given && !family) {
      throw new UnsupportedTransformTypeError(
        "displayName",
        "Reads preferredName / givenName / familyName from the identity context. Provide simulated values to test.",
      );
    }
    const first = preferred || given || "";
    return [first, family].filter((s) => s && s.length > 0).join(" ");
  },
};

export const dateFormat: TransformSpec = {
  type: "dateFormat",
  group: "date",
  description:
    "Parses a date and reformats it. Local evaluator uses `Date.parse` so non-ISO inputs may differ from SailPoint.",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    const outputFormat = attrs.outputFormat;
    const date = new Date(resolved);
    if (Number.isNaN(date.getTime())) {
      throw new TransformEvalError(
        `dateFormat: cannot parse "${resolved}". Try ISO 8601 (YYYY-MM-DD).`,
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
