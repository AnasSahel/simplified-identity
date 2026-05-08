export type SelectableTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
  /**
   * Number of times this transform is referenced across identity profiles
   * and other transforms. `undefined` means the data was unavailable
   * (e.g. identity-profiles endpoint failed) — distinct from `0`.
   */
  usages?: number;
};
