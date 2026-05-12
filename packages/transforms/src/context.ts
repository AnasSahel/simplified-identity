import {
  UnsupportedTransformTypeError,
  type RequiredSimulationInput,
  type TransformSpec,
} from "./types";

/**
 * Read an account attribute from a specific source. SailPoint runtime
 * pulls this from the account currently being processed; locally we
 * have neither, so we route through `ctx.simulatedValues` keyed by
 * `account.<sourceName>.<attributeName>`.
 */
export const accountAttribute: TransformSpec = {
  type: "accountAttribute",
  group: "lookup",
  description:
    "Reads an attribute value from a specific source's account. Needs simulation locally.",
  directInputs: (attrs) => {
    const sourceName = stringOrEmpty(attrs.sourceName);
    const attributeName = stringOrEmpty(attrs.attributeName);
    if (!sourceName || !attributeName) return [];
    const id = `account.${sourceName}.${attributeName}`;
    return [
      {
        id,
        label: attributeName,
        hint: `from source: ${sourceName}`,
      },
    ];
  },
  evaluate: (attrs, _input, ctx) => {
    const sourceName = stringOrEmpty(attrs.sourceName);
    const attributeName = stringOrEmpty(attrs.attributeName);
    if (!sourceName || !attributeName) {
      throw new UnsupportedTransformTypeError(
        "accountAttribute",
        "Missing sourceName / attributeName — can't resolve which value to read.",
      );
    }
    const id = `account.${sourceName}.${attributeName}`;
    const value = ctx.simulatedValues[id];
    if (value === undefined) {
      throw new UnsupportedTransformTypeError(
        "accountAttribute",
        `Reads "${attributeName}" from source "${sourceName}". Provide a simulated value to test.`,
      );
    }
    return value;
  },
};

/**
 * Read an attribute on the identity itself (firstname, email, etc.).
 * Same pattern as accountAttribute — keyed `identity.<name>`.
 */
export const identityAttribute: TransformSpec = {
  type: "identityAttribute",
  group: "lookup",
  description:
    "Reads an attribute from the identity itself. Needs simulation locally.",
  directInputs: (attrs) => {
    const name = stringOrEmpty(attrs.name);
    if (!name) return [];
    return [
      {
        id: `identity.${name}`,
        label: name,
        hint: "from identity context",
      },
    ];
  },
  evaluate: (attrs, _input, ctx) => {
    const name = stringOrEmpty(attrs.name);
    if (!name) {
      throw new UnsupportedTransformTypeError(
        "identityAttribute",
        "Missing `name` attribute — can't resolve which identity attribute to read.",
      );
    }
    const id = `identity.${name}`;
    const value = ctx.simulatedValues[id];
    if (value === undefined) {
      throw new UnsupportedTransformTypeError(
        "identityAttribute",
        `Reads "${name}" from the identity context. Provide a simulated value to test.`,
      );
    }
    return value;
  },
};

function stringOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export const CONTEXT_SPECS: TransformSpec[] = [
  accountAttribute,
  identityAttribute,
];
