"use client";
import React, { useState } from "react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface Detail {
  title: string;
  body: string;
}

interface InteractiveFlowchartProps {
  nodes: Node[];
  details: Record<string, Detail>;
}

export function InteractiveFlowchart({
  nodes,
  details,
}: InteractiveFlowchartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleNodeClick(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  const activeDetail = activeId ? details[activeId] : null;

  return (
    <div>
      <svg
        viewBox="0 0 400 200"
        role="img"
        className="h-auto w-full max-w-lg"
        preserveAspectRatio="xMidYMid meet"
      >
        {nodes.map((node) => (
          <g
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={20}
              fill={node.id === activeId ? "var(--warning)" : "var(--primary)"}
            />
            <text
              x={node.x}
              y={node.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--primary-foreground)"
              fontSize={12}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      {activeDetail && (
        <div className="mt-3 rounded-md border bg-muted p-3">
          <strong>{activeDetail.title}</strong>
          <p className="text-sm text-muted-foreground">{activeDetail.body}</p>
        </div>
      )}
    </div>
  );
}
