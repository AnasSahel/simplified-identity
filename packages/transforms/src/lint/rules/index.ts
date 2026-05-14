/**
 * Rule registry. Adding a new rule = create one file in this directory
 * and append it to the `rules` array below. No DSL, no auto-discovery —
 * the explicit list keeps the build statically analysable and the
 * rule order deterministic across runs.
 */
import type { Rule } from "../types";
import { brokenReference } from "./broken-reference";

export const rules: ReadonlyArray<Rule> = [brokenReference];

export { brokenReference };
