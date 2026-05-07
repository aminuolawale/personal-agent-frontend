"use client";

import "@xyflow/react/dist/style.css";
import {
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { AgentGraph as AgentGraphType, GraphEdge, GraphNode } from "../lib/types";

type PlannerNodeData = {
  label: string;
  description: string;
  isRoot: boolean;
  isEnabled: boolean;
  model: string;
};

function PlannerNode({ data }: NodeProps<Node<PlannerNodeData>>) {
  return (
    <div className={`planner-node ${data.isEnabled ? "" : "is-disabled"}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-title">
        {data.label}
        {data.isRoot ? <span className="node-badge">root</span> : null}
      </div>
      <div className="node-description">{data.description || "No description"}</div>
      <div className="node-meta">{data.model}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { planner: PlannerNode };

type AgentGraphProps = {
  graph: AgentGraphType;
  selectedAgentId: string | null;
  selectedConnectionId: string | null;
  onSelectAgent: (agentId: string) => void;
  onSelectConnection: (connectionId: string) => void;
};

export function AgentGraph({
  graph,
  selectedAgentId,
  selectedConnectionId,
  onSelectAgent,
  onSelectConnection,
}: AgentGraphProps) {
  const levels = computeLevels(graph.nodes, graph.edges);

  const nodes: Node<PlannerNodeData>[] = graph.nodes.map((agent, index) => {
    const level = levels.get(agent.id) ?? 0;
    const siblingIndex = graph.nodes
      .filter((node) => (levels.get(node.id) ?? 0) === level)
      .findIndex((node) => node.id === agent.id);

    return {
      id: agent.id,
      type: "planner",
      position: {
        x: 60 + level * 320,
        y: 60 + (siblingIndex >= 0 ? siblingIndex : index) * 170,
      },
      data: {
        label: agent.label,
        description: agent.description,
        isRoot: agent.is_root,
        isEnabled: agent.is_enabled,
        model: `${agent.model_provider}:${agent.model_name}`,
      },
      selected: selectedAgentId === agent.id,
    };
  });

  const edges: Edge[] = graph.edges.map((connection) => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    label: connection.alias,
    selected: selectedConnectionId === connection.id,
    animated: connection.is_enabled,
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: connection.is_enabled ? "#fc9e4f" : "rgba(237, 211, 130, 0.25)" },
    labelStyle: { fill: "#fc9e4f", fontSize: 12, fontFamily: "var(--font-mono)" },
  }));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.35}
      onNodeClick={(_, node) => onSelectAgent(node.id)}
      onEdgeClick={(_, edge) => onSelectConnection(edge.id)}
    />
  );
}

function computeLevels(nodes: GraphNode[], edges: GraphEdge[]) {
  const levels = new Map<string, number>();
  const roots = nodes.filter((node) => node.is_root);
  const queue = roots.length > 0 ? roots.map((node) => node.id) : nodes.slice(0, 1).map((node) => node.id);

  for (const rootId of queue) {
    levels.set(rootId, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const currentLevel = levels.get(current) ?? 0;
    for (const edge of edges.filter((item) => item.source === current)) {
      if (!levels.has(edge.target)) {
        levels.set(edge.target, currentLevel + 1);
        queue.push(edge.target);
      }
    }
  }

  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  }

  return levels;
}
