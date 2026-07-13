"use client";
import React, { useState } from "react";

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  sublabel?: string;
  w?: number;
  h?: number;
  shape?: "box" | "diamond";
}

interface Edge {
  from: string;
  to: string;
  label?: string;
  dashed?: boolean;
}

interface Detail {
  title: string;
  body: string;
}

interface InteractiveFlowchartProps {
  nodes: Node[];
  edges?: Edge[];
  details: Record<string, Detail>;
}

const DEFAULT_W = 120;
const DEFAULT_H = 48;

// ponytail: assumes axis-ish layouts — treats every node as its bounding rect
// (diamonds included), so anchors are approximate for steep diagonal edges.
function rectEdgePoint(node: Node, towardX: number, towardY: number) {
  const hw = (node.w ?? DEFAULT_W) / 2;
  const hh = (node.h ?? DEFAULT_H) / 2;
  const dx = towardX - node.x;
  const dy = towardY - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };
  const tx = dx === 0 ? Infinity : hw / Math.abs(dx);
  const ty = dy === 0 ? Infinity : hh / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: node.x + dx * t, y: node.y + dy * t };
}

export function InteractiveFlowchart({
  nodes,
  edges = [],
  details,
}: InteractiveFlowchartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  function toggle(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  const activeDetail = activeId ? details[activeId] : null;
  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  // Fit viewBox to all node rects with padding.
  const pad = 24;
  const xs = nodes.flatMap((n) => {
    const hw = (n.w ?? DEFAULT_W) / 2;
    return [n.x - hw, n.x + hw];
  });
  const ys = nodes.flatMap((n) => {
    const hh = (n.h ?? DEFAULT_H) / 2;
    return [n.y - hh, n.y + hh];
  });
  const minX = Math.min(0, ...xs) - pad;
  const minY = Math.min(0, ...ys) - pad;
  const maxX = Math.max(0, ...xs) + pad;
  const maxY = Math.max(0, ...ys) + pad;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <svg
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          role="img"
          style={{ aspectRatio: `${vbW} / ${vbH}`, width: "100%", height: "auto" }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="flow-arrow-solid"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--muted-foreground)" />
            </marker>
            <marker
              id="flow-arrow-dashed"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--warning)" />
            </marker>
          </defs>

          {/* Edges first, behind nodes */}
          {edges.map((edge, i) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            const start = rectEdgePoint(from, to.x, to.y);
            const end = rectEdgePoint(to, from.x, from.y);
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            const stroke = edge.dashed
              ? "var(--warning)"
              : "var(--muted-foreground)";
            const labelWidth = edge.label ? edge.label.length * 6.8 + 8 : 0;

            return (
              <g key={i}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeOpacity={edge.dashed ? 1 : 0.7}
                  strokeDasharray={edge.dashed ? "6 5" : undefined}
                  markerEnd={
                    edge.dashed
                      ? "url(#flow-arrow-dashed)"
                      : "url(#flow-arrow-solid)"
                  }
                />
                {edge.label && (
                  <g>
                    <rect
                      x={midX - labelWidth / 2}
                      y={midY - 10}
                      width={labelWidth}
                      height={18}
                      rx={3}
                      fill="var(--background)"
                    />
                    <text
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={11}
                      fontFamily="ui-monospace, monospace"
                      fill={
                        edge.dashed
                          ? "var(--warning)"
                          : "var(--muted-foreground)"
                      }
                    >
                      {edge.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const w = node.w ?? DEFAULT_W;
            const h = node.h ?? DEFAULT_H;
            const shape = node.shape ?? "box";
            const isActive = node.id === activeId;
            const left = node.x - w / 2;
            const top = node.y - h / 2;
            const diamondPoints = [
              `${node.x},${top}`,
              `${node.x + w / 2},${node.y}`,
              `${node.x},${top + h}`,
              `${left},${node.y}`,
            ].join(" ");

            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => toggle(node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(node.id);
                  }
                }}
                className="cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {shape === "diamond" ? (
                  <polygon
                    points={diamondPoints}
                    fill="var(--card)"
                    stroke={isActive ? "var(--warning)" : "var(--border)"}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                ) : (
                  <rect
                    x={left}
                    y={top}
                    width={w}
                    height={h}
                    rx={10}
                    fill="var(--card)"
                    stroke={isActive ? "var(--warning)" : "var(--border)"}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                )}
                {isActive &&
                  (shape === "diamond" ? (
                    <polygon
                      points={diamondPoints}
                      fill="var(--warning)"
                      fillOpacity={0.08}
                      pointerEvents="none"
                    />
                  ) : (
                    <rect
                      x={left}
                      y={top}
                      width={w}
                      height={h}
                      rx={10}
                      fill="var(--warning)"
                      fillOpacity={0.08}
                      pointerEvents="none"
                    />
                  ))}
                <text
                  x={node.x}
                  y={node.sublabel ? node.y - 6 : node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={500}
                  fill="var(--foreground)"
                >
                  {node.label}
                </text>
                {node.sublabel && (
                  <text
                    x={node.x}
                    y={node.y + 13}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10}
                    fontFamily="ui-monospace, monospace"
                    fill="var(--muted-foreground)"
                  >
                    {node.sublabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="shrink-0 self-start rounded-lg border bg-card p-4 md:w-64 w-full">
        {activeDetail ? (
          <>
            <strong>{activeDetail.title}</strong>
            <p className="text-sm text-muted-foreground">{activeDetail.body}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a step to see what it does.
          </p>
        )}
      </div>
    </div>
  );
}
