/**
 * Compute where each transform is referenced across the tenant.
 *
 * SailPoint references a transform by **name** (not id), via the pattern:
 *   { type: "reference", attributes: { id: "<transform-name>" } }
 *
 * This pattern can appear (a) inside identity profile attribute configs,
 * (b) inside other transforms, and (c) inside source provisioning
 * policies. We walk all three sources in memory.
 *
 * Pure function — no I/O. Caller is responsible for fetching the inputs.
 */

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type UsageEntry = {
  kind: "identity-profile" | "source-policy" | "transform";
  containerId: string;
  containerName: string;
  /** Human-readable attribute path, e.g. "identity.givenName" */
  attributePath: string;
};

export type TransformLike = {
  id: string;
  name: string;
  attributes?: Record<string, unknown>;
};

type WalkContext = {
  kind: UsageEntry["kind"];
  containerId: string;
  containerName: string;
};

/** Walks an arbitrary subtree and emits a UsageEntry for every reference found. */
function walkSubtree(
  node: unknown,
  pathLabel: string,
  ctx: WalkContext,
  out: Map<string, UsageEntry[]>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) walkSubtree(item, pathLabel, ctx, out);
    return;
  }
  if (!isRecord(node)) return;

  if (
    node.type === "reference" &&
    isRecord(node.attributes) &&
    typeof node.attributes.id === "string"
  ) {
    const transformName = node.attributes.id;
    const list = out.get(transformName) ?? [];
    list.push({
      kind: ctx.kind,
      containerId: ctx.containerId,
      containerName: ctx.containerName,
      attributePath: pathLabel || "(root)",
    });
    out.set(transformName, list);
  }

  for (const value of Object.values(node)) {
    walkSubtree(value, pathLabel, ctx, out);
  }
}

/**
 * Walks an identity profile, emitting one UsageEntry per attributeTransform
 * that references a transform. The path label is `identity.<attributeName>`
 * so the drawer can render "Workday HR → identity.givenName".
 */
function collectFromIdentityProfile(
  profile: unknown,
  out: Map<string, UsageEntry[]>,
): void {
  if (!isRecord(profile)) return;
  const profileId = typeof profile.id === "string" ? profile.id : "";
  const profileName = typeof profile.name === "string" ? profile.name : "(unnamed identity profile)";
  const ctx: WalkContext = {
    kind: "identity-profile",
    containerId: profileId,
    containerName: profileName,
  };

  const cfg = profile.identityAttributeConfig;
  if (isRecord(cfg) && Array.isArray(cfg.attributeTransforms)) {
    for (const at of cfg.attributeTransforms) {
      if (!isRecord(at)) continue;
      const attrName =
        typeof at.identityAttributeName === "string"
          ? at.identityAttributeName
          : "(unknown)";
      walkSubtree(
        at.transformDefinition,
        `identity.${attrName}`,
        ctx,
        out,
      );
    }
    return;
  }

  // Fallback — schema unknown, walk everything with no specific path.
  walkSubtree(profile, "", ctx, out);
}

/**
 * Walks a source provisioning policy. Path label is `account.<fieldName>`.
 * Provisioning policies come as an array per source; we accept the parent
 * source's id/name so the entry attributes the usage to "Active Directory"
 * rather than "AD - account create".
 */
function collectFromProvisioningPolicy(
  policy: unknown,
  sourceId: string,
  sourceName: string,
  out: Map<string, UsageEntry[]>,
): void {
  if (!isRecord(policy)) return;
  const ctx: WalkContext = {
    kind: "source-policy",
    containerId: sourceId,
    containerName: sourceName,
  };

  if (Array.isArray(policy.fields)) {
    for (const field of policy.fields) {
      if (!isRecord(field)) continue;
      const fieldName =
        typeof field.name === "string" ? field.name : "(unknown)";
      walkSubtree(field.transform, `account.${fieldName}`, ctx, out);
    }
    return;
  }

  walkSubtree(policy, "", ctx, out);
}

/**
 * Walks another transform's attributes. Path label is `attributes.<keyPath>`.
 * Recursive walker that tracks the dotted path so the drawer can show
 * "id-up-displayname → attributes.input".
 */
function walkTransformAttributes(
  node: unknown,
  pathSegments: string[],
  ctx: WalkContext,
  out: Map<string, UsageEntry[]>,
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walkTransformAttributes(
        node[i],
        [...pathSegments, `[${i}]`],
        ctx,
        out,
      );
    }
    return;
  }
  if (!isRecord(node)) return;

  if (
    node.type === "reference" &&
    isRecord(node.attributes) &&
    typeof node.attributes.id === "string"
  ) {
    const transformName = node.attributes.id;
    const list = out.get(transformName) ?? [];
    const path = pathSegments.length > 0 ? pathSegments.join(".") : "(root)";
    list.push({
      kind: ctx.kind,
      containerId: ctx.containerId,
      containerName: ctx.containerName,
      attributePath: `attributes.${path}`,
    });
    out.set(transformName, list);
  }

  for (const [key, value] of Object.entries(node)) {
    walkTransformAttributes(value, [...pathSegments, key], ctx, out);
  }
}

export type SourceWithPolicies = {
  id: string;
  name: string;
  policies: ReadonlyArray<unknown>;
};

export function computeTransformUsageMap(
  transforms: ReadonlyArray<TransformLike>,
  identityProfiles: ReadonlyArray<unknown>,
  sourcesWithPolicies: ReadonlyArray<SourceWithPolicies> = [],
): Map<string, UsageEntry[]> {
  const out = new Map<string, UsageEntry[]>();

  for (const profile of identityProfiles) {
    collectFromIdentityProfile(profile, out);
  }

  for (const t of transforms) {
    if (!t.attributes) continue;
    walkTransformAttributes(
      t.attributes,
      [],
      {
        kind: "transform",
        containerId: t.id,
        containerName: t.name,
      },
      out,
    );
  }

  for (const source of sourcesWithPolicies) {
    for (const policy of source.policies) {
      collectFromProvisioningPolicy(policy, source.id, source.name, out);
    }
  }

  return out;
}

/** Backwards-compatible count-only API. */
export function computeTransformUsages(
  transforms: ReadonlyArray<TransformLike>,
  identityProfiles: ReadonlyArray<unknown>,
  provisioningPolicies: ReadonlyArray<unknown> = [],
): Map<string, number> {
  const sources: SourceWithPolicies[] =
    provisioningPolicies.length > 0
      ? [
          {
            id: "(unknown)",
            name: "(unknown source)",
            policies: provisioningPolicies,
          },
        ]
      : [];
  const map = computeTransformUsageMap(transforms, identityProfiles, sources);
  const counts = new Map<string, number>();
  for (const [name, entries] of map) counts.set(name, entries.length);
  return counts;
}
