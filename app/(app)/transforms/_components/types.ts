export type SelectableTransform = {
  id: string;
  name: string;
  type: string;
  internal?: boolean;
  attributes?: Record<string, unknown>;
};
