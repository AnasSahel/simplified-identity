"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dagre from "@dagrejs/dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Database, Lock, User, Users, Workflow } from "lucide-react";

import "@xyflow/react/dist/style.css";

import { cn } from "@/lib/utils";
import {
  buildTransformGraph,
  type GraphLike,
  type GraphNode,
} from "@/lib/sailpoint/transforms/build-graph";
import type { UsageEntry } from "@simplified-identity/sailpoint-client";

import { TypePill } from "../../_components/type-pill";
import type { SelectableTransform } from "./types";

const NODE_W = 220;
const NODE_H = 64;

type NodeData = GraphNode & {
  onClick?: (n: GraphNode) => void;
};

function layoutGraph(nodes: GraphNode[], edges: { source: string; target: string }[]) {
  const g = new dagre.graphlib.Graph();
  // Top-to-bottom: upstream nodes stack above the center, downstream below.
  // Better fit for the narrow drawer (~640px wide × tall) than LR.
  g.setGraph({ rankdir: "TB", ranksep: 60, nodesep: 32, edgesep: 12 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "transformNode",
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: n,
    } satisfies Node<NodeData>;
  });
}

function NodeCard({ data }: NodeProps<Node<NodeData>>) {
  const isCurrent = data.kind === "current";
  const Icon =
    data.kind === "identity-profile"
      ? Users
      : data.kind === "source-policy"
        ? Database
        : data.kind === "context-attr"
          ? data.id.startsWith("ctx:identity")
            ? User
            : Database
          : data.kind === "unsupported"
            ? Lock
            : Workflow;

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col gap-1 rounded-md border bg-card px-3 py-2 shadow-sm transition-colors",
        isCurrent
          ? "border-foreground ring-2 ring-foreground/20"
          : "hover:border-foreground/40",
        data.kind === "context-attr" && "bg-muted/40",
        data.kind === "unsupported" && "bg-muted/30 opacity-80",
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-muted-foreground/40"
      />
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        {data.transformType ? (
          <TypePill type={data.transformType} />
        ) : (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {data.kind === "identity-profile"
              ? "Identity profile"
              : data.kind === "source-policy"
                ? "Source"
                : data.kind === "context-attr"
                  ? "Context"
                  : data.kind === "unsupported"
                    ? "Unsupported"
                    : ""}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-[11px] font-medium leading-tight">
          {data.label}
        </p>
        {data.sublabel && (
          <p className="truncate font-mono text-[10px] text-muted-foreground leading-tight">
            {data.sublabel}
          </p>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { transformNode: NodeCard };

function GraphInner({
  current,
  transformsByName,
  usages,
}: {
  current: SelectableTransform;
  transformsByName: ReadonlyMap<string, SelectableTransform>;
  usages: ReadonlyArray<UsageEntry>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { nodes, edges } = React.useMemo(() => {
    // The map and array of GraphLike share the same shape as
    // SelectableTransform — TypeScript handles structural typing.
    const result = buildTransformGraph(
      current as GraphLike,
      transformsByName as ReadonlyMap<string, GraphLike>,
      usages,
    );
    return result;
  }, [current, transformsByName, usages]);

  const flowNodes = React.useMemo(
    () => layoutGraph(nodes, edges),
    [nodes, edges],
  );

  const flowEdges = React.useMemo<Edge[]>(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color:
            e.direction === "in" ? "hsl(220 14% 64%)" : "hsl(220 14% 50%)",
        },
        style: {
          stroke:
            e.direction === "in" ? "hsl(220 14% 64%)" : "hsl(220 14% 50%)",
          strokeWidth: 1.5,
        },
      })),
    [edges],
  );

  function onNodeClick(_e: React.MouseEvent, node: Node<NodeData>) {
    const data = node.data;
    if (!data.transformId || data.kind === "current") return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("selected", data.transformId);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (nodes.length <= 1) {
    return (
      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
        Standalone transform — no incoming references and no outgoing
        composition. Nothing to graph.
      </div>
    );
  }

  return (
    <div className="h-[480px] w-full overflow-hidden rounded-md border bg-background">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.1 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls
          showInteractive={false}
          className="!shadow-none [&>button]:!border [&>button]:!bg-background"
        />
      </ReactFlow>
    </div>
  );
}

export function TransformGraph(props: {
  current: SelectableTransform;
  transformsByName: ReadonlyMap<string, SelectableTransform>;
  usages: ReadonlyArray<UsageEntry>;
}) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
