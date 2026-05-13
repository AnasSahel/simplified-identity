/**
 * Neutral (non-"use client") module so server components can import
 * `STATUS_OPTIONS` and the literal-union type without Next serializing
 * them as client references. Required because re-exporting non-component
 * values from a "use client" file turns them into proxies on the server.
 * See feedback_next_rsc_client_exports.
 */

export const STATUS_OPTIONS = [
  { value: "connected", label: "Connected" },
  { value: "disconnected", label: "Disconnected" },
  { value: "error", label: "Error" },
] as const;

export type StatusFilterValue = (typeof STATUS_OPTIONS)[number]["value"];
