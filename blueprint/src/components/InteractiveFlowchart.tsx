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

export function InteractiveFlowchart({ nodes, details }: InteractiveFlowchartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function handleNodeClick(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  const activeDetail = activeId ? details[activeId] : null;

  return (
    <div>
      <svg width="400" height="200">
        {nodes.map((node) => (
          <g key={node.id} onClick={() => handleNodeClick(node.id)} style={{ cursor: "pointer" }}>
            <circle cx={node.x} cy={node.y} r={20} fill="#6366f1" />
            <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12}>
              {node.label}
            </text>
          </g>
        ))}
      </svg>
      {activeDetail && (
        <div>
          <strong>{activeDetail.title}</strong>
          <p>{activeDetail.body}</p>
        </div>
      )}
    </div>
  );
}
