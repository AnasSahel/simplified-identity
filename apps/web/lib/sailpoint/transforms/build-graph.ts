/**
 * Pure builder for the transform graph view.
 *
 * Inputs:
 *   - current: the transform being inspected (drawer focus)
 *   - transformsByName: lookup for `reference` resolution
 *   - usages: rows from the usages walker that point AT `current`
 *
 * Output: a `{ nodes, edges }` shape ready for react-flow. Layout is
 * applied separately (dagre) so this stays testable and renderer-agnostic.
 */

import type { UsageEntry } from "@simplified-identity/sailpoint-client";

export type NodeKind =
  | "current"
  | "transform"
  | "identity-profile"
  | "source-policy"
  | "context-attr"
  | "unsupported";

export type GraphNode = {
  id: string;
  kind: NodeKind;
  label: string;
  sublabel?: string;
  /**
   * For `transform` nodes, the SailPoint type (e164phone, lookup, …) so the
   * rendered card can show a TypePill. Absent on other kinds.
   */
  transformType?: string;
  /**
   * For `transform` nodes, the SailPoint id used to navigate the drawer.
   */
  transformId?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  /** Direction relative to the centred node, used to color upstream vs downstream */
  direction: "in" | "out";
};

export type GraphLike = {
  id: string;
  name: string;
  type: string;
  attributes?: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function buildTransformGraph(
  current: GraphLike,
  transformsByName: ReadonlyMap<string, GraphLike>,
  usages: ReadonlyArray<UsageEntry>,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  const centerId = `t:${current.id}`;
  nodes.push({
    id: centerId,
    kind: "current",
    label: current.name,
    sublabel: current.type,
    transformType: current.type,
    transformId: current.id,
  });
  seen.add(centerId);

  // ── Upstream (incoming) — what depends on this transform ────────────
  for (const u of usages) {
    let nodeId = "";
    let kind: NodeKind = "transform";
    let label = u.containerName;
    const sublabel = u.attributePath;

    if (u.kind === "identity-profile") {
      nodeId = `ip:${u.containerId}`;
      kind = "identity-profile";
    } else if (u.kind === "source-policy") {
      nodeId = `src:${u.containerId}`;
      kind = "source-policy";
    } else {
      // Another transform that references current
      nodeId = `t:${u.containerId}`;
      kind = "transform";
      // Look up the type for the pill
      const target = lookupById(transformsByName, u.containerId);
      if (target) {
        label = target.name;
        nodes.push({
          id: nodeId,
          kind,
          label,
          sublabel,
          transformType: target.type,
          transformId: target.id,
        });
        if (!seen.has(nodeId)) seen.add(nodeId);
        edges.push({
          id: `e:${nodeId}->${centerId}:${edges.length}`,
          source: nodeId,
          target: centerId,
          direction: "in",
        });
        continue;
      }
    }

    if (!seen.has(nodeId)) {
      nodes.push({ id: nodeId, kind, label, sublabel });
      seen.add(nodeId);
    }
    edges.push({
      id: `e:${nodeId}->${centerId}:${edges.length}`,
      source: nodeId,
      target: centerId,
      direction: "in",
    });
  }

  // ── Downstream (outgoing) — what this transform composes ────────────
  walkOutgoing(
    current.attributes,
    centerId,
    transformsByName,
    nodes,
    edges,
    seen,
    /* visited transform names */ new Set([current.name]),
    /* root path label (none) */ undefined,
  );

  return { nodes, edges };
}

function lookupById(
  byName: ReadonlyMap<string, GraphLike>,
  id: string,
): GraphLike | undefined {
  for (const v of byName.values()) {
    if (v.id === id) return v;
  }
  return undefined;
}

function pushEdge(
  edges: GraphEdge[],
  source: string,
  target: string,
): void {
  edges.push({
    id: `e:${source}->${target}:${edges.length}`,
    source,
    target,
    direction: "out",
  });
}

function walkOutgoing(
  attrs: unknown,
  parentId: string,
  transformsByName: ReadonlyMap<string, GraphLike>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  seen: Set<string>,
  visited: Set<string>,
  /** edge label, e.g. "values[0]" or "input" */
  pathLabel: string | undefined,
): void {
  if (!isRecord(attrs)) return;

  // If the node IS itself a transform definition, materialize it then
  // descend into its attributes (the parent kept track of pathLabel via
  // the call site).
  if (typeof attrs.type === "string") {
    const subType = attrs.type;
    const subAttrs = isRecord(attrs.attributes) ? attrs.attributes : {};

    // `reference` → resolve to the named transform if known
    if (subType === "reference" && typeof subAttrs.id === "string") {
      const refName = subAttrs.id;
      const target = transformsByName.get(refName);
      const refNodeId = target
        ? `t:${target.id}`
        : `ref-missing:${refName}`;
      if (!seen.has(refNodeId)) {
        nodes.push({
          id: refNodeId,
          kind: target ? "transform" : "unsupported",
          label: target?.name ?? refName,
          sublabel: target ? target.type : "(missing reference)",
          transformType: target?.type,
          transformId: target?.id,
        });
        seen.add(refNodeId);
      }
      pushEdge(edges, parentId, refNodeId);
      // Don't recurse into the referenced transform's attributes — keep
      // the graph 1-hop. User can pivot the drawer to walk further.
      // Still walk an explicit `input` sub-transform if present
      // (it reshapes the input before calling the reference).
      if (isRecord(subAttrs.input)) {
        walkOutgoing(
          subAttrs.input,
          refNodeId,
          transformsByName,
          nodes,
          edges,
          seen,
          visited,
          "input",
        );
      }
      return;
    }

    // Context-reading terminals
    if (subType === "accountAttribute") {
      const sourceName =
        typeof subAttrs.sourceName === "string" ? subAttrs.sourceName : "?";
      const attrName =
        typeof subAttrs.attributeName === "string"
          ? subAttrs.attributeName
          : "?";
      const id = `ctx:account.${sourceName}.${attrName}`;
      if (!seen.has(id)) {
        nodes.push({
          id,
          kind: "context-attr",
          label: attrName,
          sublabel: `from source: ${sourceName}`,
        });
        seen.add(id);
      }
      pushEdge(edges, parentId, id);
      return;
    }
    if (subType === "identityAttribute") {
      const name =
        typeof subAttrs.name === "string" ? subAttrs.name : "?";
      const id = `ctx:identity.${name}`;
      if (!seen.has(id)) {
        nodes.push({
          id,
          kind: "context-attr",
          label: name,
          sublabel: "from identity context",
        });
        seen.add(id);
      }
      pushEdge(edges, parentId, id);
      return;
    }

    // Generic sub-transform — render as a transform node, descend into
    // its attributes for further composition.
    const subId = `sub:${parentId}:${pathLabel ?? "child"}:${nodes.length}`;
    nodes.push({
      id: subId,
      kind: "transform",
      label: subType,
      sublabel: pathLabel,
      transformType: subType,
    });
    seen.add(subId);
    pushEdge(edges, parentId, subId);

    // Recurse into the sub-transform's attributes (one level deeper).
    for (const [key, value] of Object.entries(subAttrs)) {
      walkValue(
        value,
        subId,
        transformsByName,
        nodes,
        edges,
        seen,
        visited,
        key,
      );
    }
    return;
  }

  // Plain attributes object — recurse into each key
  for (const [key, value] of Object.entries(attrs)) {
    walkValue(
      value,
      parentId,
      transformsByName,
      nodes,
      edges,
      seen,
      visited,
      key,
    );
  }
}

function walkValue(
  value: unknown,
  parentId: string,
  transformsByName: ReadonlyMap<string, GraphLike>,
  nodes: GraphNode[],
  edges: GraphEdge[],
  seen: Set<string>,
  visited: Set<string>,
  pathLabel: string | undefined,
): void {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkValue(
        value[i],
        parentId,
        transformsByName,
        nodes,
        edges,
        seen,
        visited,
        `${pathLabel ?? "list"}[${i}]`,
      );
    }
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.type === "string") {
    walkOutgoing(
      value,
      parentId,
      transformsByName,
      nodes,
      edges,
      seen,
      visited,
      pathLabel,
    );
  }
}
