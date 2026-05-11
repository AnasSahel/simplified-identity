import { TransformEvalError, type TransformSpec } from "./types";
import { resolveInput } from "./_shared";

export const base64Encode: TransformSpec = {
  type: "base64Encode",
  group: "encoding",
  description: "Encodes the input string to Base64 (UTF-8 first).",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    try {
      return typeof btoa === "function"
        ? btoa(unescape(encodeURIComponent(resolved)))
        : Buffer.from(resolved, "utf-8").toString("base64");
    } catch (e) {
      throw new TransformEvalError(
        `base64Encode failed: ${(e as Error).message}`,
      );
    }
  },
};

export const base64Decode: TransformSpec = {
  type: "base64Decode",
  group: "encoding",
  description: "Decodes a Base64 string back to UTF-8 text.",
  evaluate: (attrs, input, ctx, depth) => {
    const resolved = resolveInput(attrs, input, ctx, depth);
    try {
      return typeof atob === "function"
        ? decodeURIComponent(escape(atob(resolved)))
        : Buffer.from(resolved, "base64").toString("utf-8");
    } catch (e) {
      throw new TransformEvalError(
        `base64Decode failed: ${(e as Error).message}`,
      );
    }
  },
};

export const ENCODING_SPECS = [base64Encode, base64Decode];
