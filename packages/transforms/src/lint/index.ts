/**
 * Public surface of the lint sub-module. Re-exported from the package
 * barrel so consumers (the `apps/web` lint-runner shim, future CLI)
 * import everything via `@simplified-identity/transforms`.
 */
export * from "./types";
export * from "./engine";
export { rules, brokenReference } from "./rules";
