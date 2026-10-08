"use client";
import React, { useState } from "react";

import { renderInline } from "@/lib/render-inline";

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
  route?: "curve";
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
const CURVE_GAP = 12;
const NODE_LABEL_FONT_SIZE = 13;
const NODE_LABEL_LINE_HEIGHT = 16;
const NODE_SUBLABEL_FONT_SIZE = 10;
const NODE_SUBLABEL_LINE_HEIGHT = 12;
const NODE_CONTENT_GAP = 4;
const NODE_COLLISION_GAP = 12;
const NODE_VERTICAL_PADDING = 12;
const NODE_HORIZONTAL_PADDING = 16;
const EDGE_ROUTE_GAP = 2;

function characterWidth(character: string, fontSize: number) {
  if (
    /[\u2e80-\u9fff\uf900-\ufaff\u3040-\u30ff\uac00-\ud7af]/u.test(character) ||
    (character.codePointAt(0) ?? 0) > 0xffff
  ) {
    return fontSize;
  }
  if (/\s/u.test(character)) return fontSize * 0.35;
  if (/[MW@#%&]/u.test(character)) return fontSize * 0.9;
  if (/[ilI1|.,'`]/u.test(character)) return fontSize * 0.38;
  return fontSize * 0.68;
}

function measureText(text: string, fontSize: number) {
  return Array.from(text).reduce(
    (width, character) => width + characterWidth(character, fontSize),
    0,
  );
}

function splitLongWord(word: string, maxWidth: number, fontSize: number) {
  const chunks: string[] = [];
  let chunk = "";
  let width = 0;

  for (const character of Array.from(word)) {
    const nextWidth = characterWidth(character, fontSize);
    if (chunk && width + nextWidth > maxWidth) {
      chunks.push(chunk);
      chunk = character;
      width = nextWidth;
    } else {
      chunk += character;
      width += nextWidth;
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks;
}

function wrapText(text: string, maxWidth: number, fontSize: number) {
  const lines: string[] = [];
  let line = "";
  let lineWidth = 0;

  for (const word of text.trim().split(/\s+/u).filter(Boolean)) {
    const chunks = splitLongWord(word, maxWidth, fontSize);
    if (chunks.length > 1) {
      if (line) lines.push(line);
      lines.push(...chunks.slice(0, -1));
      line = chunks.at(-1) ?? "";
      lineWidth = measureText(line, fontSize);
      continue;
    }

    const wordWidth = measureText(word, fontSize);
    const nextWidth = line
      ? lineWidth + fontSize * 0.35 + wordWidth
      : wordWidth;
    if (line && nextWidth > maxWidth) {
      lines.push(line);
      line = word;
      lineWidth = wordWidth;
    } else {
      line = line ? `${line} ${word}` : word;
      lineWidth = nextWidth;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

function layoutNode(node: Node) {
  const w = node.w ?? DEFAULT_W;
  const shape = node.shape ?? "box";
  const maxTextWidth =
    shape === "diamond"
      ? Math.max(1, w * 0.65 - NODE_HORIZONTAL_PADDING)
      : w - NODE_HORIZONTAL_PADDING;
  const labelLines = wrapText(node.label, maxTextWidth, NODE_LABEL_FONT_SIZE);
  const sublabelLines = node.sublabel
    ? wrapText(node.sublabel, maxTextWidth, NODE_SUBLABEL_FONT_SIZE)
    : [];
  const textHeight =
    labelLines.length * NODE_LABEL_LINE_HEIGHT +
    (sublabelLines.length
      ? NODE_CONTENT_GAP + sublabelLines.length * NODE_SUBLABEL_LINE_HEIGHT
      : 0);
  const widestLine = Math.max(
    ...labelLines.map((line) => measureText(line, NODE_LABEL_FONT_SIZE)),
    ...sublabelLines.map((line) => measureText(line, NODE_SUBLABEL_FONT_SIZE)),
  );
  const diamondHeight =
    shape === "diamond"
      ? textHeight / (1 - (widestLine + NODE_HORIZONTAL_PADDING) / w)
      : 0;

  return {
    ...node,
    w,
    h: Math.max(
      node.h ?? DEFAULT_H,
      textHeight + NODE_VERTICAL_PADDING,
      diamondHeight,
    ),
    textHeight,
    labelLines,
    sublabelLines,
  };
}

function preventNodeOverlap(nodes: ReturnType<typeof layoutNode>[]) {
  const placed = [] as typeof nodes;

  for (const node of [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let y = node.y;

    for (;;) {
      const overlappingNodes = placed.filter(
        (other) =>
          Math.abs(node.x - other.x) < (node.w + other.w) / 2 &&
          Math.abs(y - other.y) < (node.h + other.h) / 2,
      );
      if (overlappingNodes.length === 0) break;

      y =
        Math.max(...overlappingNodes.map((other) => other.y + other.h / 2)) +
        NODE_COLLISION_GAP +
        node.h / 2;
    }

    placed.push({ ...node, y });
  }

  const placedById = new Map(placed.map((node) => [node.id, node]));
  return nodes.map((node) => placedById.get(node.id) ?? node);
}

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

interface Point {
  x: number;
  y: number;
}

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function nodeRect(node: Node, gap = 0): Rect {
  const hw = ((node.w ?? DEFAULT_W) + gap * 2) / 2;
  const hh = ((node.h ?? DEFAULT_H) + gap * 2) / 2;
  return {
    left: node.x - hw,
    right: node.x + hw,
    top: node.y - hh,
    bottom: node.y + hh,
  };
}

function segmentIntersectsRect(start: Point, end: Point, rect: Rect) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let tMin = 0;
  let tMax = 1;

  const intervals: [number, number, number, number][] = [
    [start.x, dx, rect.left, rect.right],
    [start.y, dy, rect.top, rect.bottom],
  ];

  for (const [origin, delta, min, max] of intervals) {
    if (delta === 0) {
      if (origin <= min || origin >= max) return false;
      continue;
    }

    const first = (min - origin) / delta;
    const second = (max - origin) / delta;
    tMin = Math.max(tMin, Math.min(first, second));
    tMax = Math.min(tMax, Math.max(first, second));
    if (tMin >= tMax) return false;
  }

  return tMax > 0 && tMin < 1 && tMin < tMax;
}

function pathIntersectsRects(points: Point[], rects: Rect[]) {
  return points.some((point, index) => {
    const next = points[index + 1];
    return (
      next !== undefined &&
      rects.some((rect) => segmentIntersectsRect(point, next, rect))
    );
  });
}

function bezierPoints(
  start: Point,
  control1: Point,
  control2: Point,
  end: Point,
) {
  const points = [start];
  const steps = 32;

  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    const inverseT = 1 - t;
    points.push({
      x:
        inverseT ** 3 * start.x +
        3 * inverseT ** 2 * t * control1.x +
        3 * inverseT * t ** 2 * control2.x +
        t ** 3 * end.x,
      y:
        inverseT ** 3 * start.y +
        3 * inverseT ** 2 * t * control1.y +
        3 * inverseT * t ** 2 * control2.y +
        t ** 3 * end.y,
    });
  }

  return points;
}

function portPoints(node: Node, gap: number) {
  const bounds = nodeRect(node);
  const ports = [
    { anchor: { x: bounds.left, y: node.y }, side: "left" },
    { anchor: { x: bounds.right, y: node.y }, side: "right" },
    { anchor: { x: node.x, y: bounds.top }, side: "top" },
    { anchor: { x: node.x, y: bounds.bottom }, side: "bottom" },
  ] as const;

  return ports.map(({ anchor, side }) => {
    const escape = { ...anchor };
    if (side === "left") escape.x -= gap;
    if (side === "right") escape.x += gap;
    if (side === "top") escape.y -= gap;
    if (side === "bottom") escape.y += gap;
    return { anchor, escape };
  });
}

function shortestOrthogonalPath(start: Point, end: Point, obstacles: Rect[]) {
  const xs = [
    ...new Set([
      start.x,
      end.x,
      ...obstacles.flatMap((r) => [r.left, r.right]),
    ]),
  ].sort((a, b) => a - b);
  const ys = [
    ...new Set([
      start.y,
      end.y,
      ...obstacles.flatMap((r) => [r.top, r.bottom]),
    ]),
  ].sort((a, b) => a - b);
  const points: (Point & { xIndex: number; yIndex: number })[] = [];
  const pointIds = new Map<string, number>();
  const pointKey = (x: number, y: number) => `${x},${y}`;

  for (const [yIndex, y] of ys.entries()) {
    for (const [xIndex, x] of xs.entries()) {
      if (
        obstacles.some(
          (rect) =>
            x > rect.left && x < rect.right && y > rect.top && y < rect.bottom,
        )
      ) {
        continue;
      }
      pointIds.set(pointKey(x, y), points.length);
      points.push({ x, y, xIndex, yIndex });
    }
  }

  const startId = pointIds.get(pointKey(start.x, start.y));
  const endId = pointIds.get(pointKey(end.x, end.y));
  if (startId === undefined || endId === undefined) return null;

  const previous = Array(points.length).fill(-1) as number[];
  const queue = [startId];
  previous[startId] = startId;

  for (
    let cursor = 0;
    cursor < queue.length && previous[endId] === -1;
    cursor += 1
  ) {
    const currentId = queue[cursor]!;
    const current = points[currentId]!;
    const candidates = [
      [current.xIndex - 1, current.yIndex],
      [current.xIndex + 1, current.yIndex],
      [current.xIndex, current.yIndex - 1],
      [current.xIndex, current.yIndex + 1],
    ];

    for (const [xIndex, yIndex] of candidates) {
      const nextId = pointIds.get(pointKey(xs[xIndex]!, ys[yIndex]!));
      if (nextId === undefined || previous[nextId] !== -1) continue;
      if (pathIntersectsRects([current, points[nextId]!], obstacles)) continue;
      previous[nextId] = currentId;
      queue.push(nextId);
    }
  }

  if (previous[endId] === -1) return null;
  const route: Point[] = [];
  for (let pointId = endId; pointId !== startId; pointId = previous[pointId]!) {
    route.push(points[pointId]!);
  }
  route.push(points[startId]!);
  route.reverse();

  return route.filter(
    (point, index) =>
      index === 0 ||
      index === route.length - 1 ||
      !(
        (route[index - 1]!.x === point.x && point.x === route[index + 1]!.x) ||
        (route[index - 1]!.y === point.y && point.y === route[index + 1]!.y)
      ),
  );
}

function routeAroundNodes(from: Node, to: Node, nodes: Node[], gap: number) {
  const obstacles = nodes.map((node) => nodeRect(node, gap));
  const fromPorts = portPoints(from, gap);
  const toPorts = portPoints(to, gap);
  let bestRoute: Point[] | null = null;
  let bestCost = Infinity;

  for (const fromPort of fromPorts) {
    const isFromBlocked = nodes.some(
      (node) =>
        node.id !== from.id &&
        node.id !== to.id &&
        segmentIntersectsRect(
          fromPort.anchor,
          fromPort.escape,
          nodeRect(node, gap),
        ),
    );
    if (isFromBlocked) continue;

    for (const toPort of toPorts) {
      const isToBlocked = nodes.some(
        (node) =>
          node.id !== from.id &&
          node.id !== to.id &&
          segmentIntersectsRect(
            toPort.anchor,
            toPort.escape,
            nodeRect(node, gap),
          ),
      );
      if (isToBlocked) continue;

      const middle = shortestOrthogonalPath(
        fromPort.escape,
        toPort.escape,
        obstacles,
      );
      if (!middle) continue;

      const route = [fromPort.anchor, ...middle, toPort.anchor];
      const distance = route.reduce((total, point, index) => {
        const next = route[index + 1];
        return next
          ? total + Math.abs(next.x - point.x) + Math.abs(next.y - point.y)
          : total;
      }, 0);
      if (distance >= bestCost) continue;
      bestRoute = route;
      bestCost = distance;
    }
  }

  return bestRoute;
}

function midPointOnPath(points: Point[]) {
  const lengths = points.slice(1).map((point, index) => {
    const previous = points[index]!;
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const halfLength = lengths.reduce((sum, length) => sum + length, 0) / 2;
  let traveled = 0;

  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index]!;
    if (traveled + length >= halfLength) {
      const start = points[index]!;
      const end = points[index + 1]!;
      const ratio = length ? (halfLength - traveled) / length : 0;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    traveled += length;
  }

  return points[0] ?? { x: 0, y: 0 };
}

export function InteractiveFlowchart({
  nodes,
  edges = [],
  details,
}: InteractiveFlowchartProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const layoutNodes = preventNodeOverlap(nodes.map(layoutNode));

  function toggle(id: string) {
    setActiveId((prev) => (prev === id ? null : id));
  }

  const activeDetail = activeId ? details[activeId] : null;
  const nodeById = new Map(layoutNodes.map((n) => [n.id, n]));
  const rightmostNode = Math.max(
    0,
    ...layoutNodes.map((node) => node.x + node.w / 2),
  );
  const curveRailX = rightmostNode + CURVE_GAP;
  const edgeLayouts = edges.map((edge) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) return null;

    const obstacles = layoutNodes
      .filter((node) => node.id !== from.id && node.id !== to.id)
      .map((node) => nodeRect(node, EDGE_ROUTE_GAP));
    const curveStart = {
      x: from.x + from.w / 2,
      y: from.y,
    };
    const curveEnd = {
      x: to.x + to.w / 2,
      y: to.y,
    };
    const curveControl1 = { x: curveRailX, y: curveStart.y };
    const curveControl2 = { x: curveRailX, y: curveEnd.y };

    if (edge.route === "curve") {
      const points = bezierPoints(
        curveStart,
        curveControl1,
        curveControl2,
        curveEnd,
      );
      if (!pathIntersectsRects(points, obstacles)) {
        return {
          mode: "curve" as const,
          start: curveStart,
          end: curveEnd,
          points: [curveStart, curveControl1, curveControl2, curveEnd],
          path: `M ${curveStart.x} ${curveStart.y} C ${curveRailX} ${curveStart.y}, ${curveRailX} ${curveEnd.y}, ${curveEnd.x} ${curveEnd.y}`,
          labelPoint: { x: curveRailX, y: (curveStart.y + curveEnd.y) / 2 },
        };
      }
    } else {
      const start = rectEdgePoint(from, to.x, to.y);
      const end = rectEdgePoint(to, from.x, from.y);
      if (!pathIntersectsRects([start, end], obstacles)) {
        return {
          mode: "straight" as const,
          start,
          end,
          points: [start, end],
          path: null,
          labelPoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        };
      }
    }

    const points =
      routeAroundNodes(from, to, layoutNodes, EDGE_ROUTE_GAP) ??
      routeAroundNodes(from, to, layoutNodes, 0);
    if (!points) {
      throw new Error(
        "Flowchart edge cannot be routed around the current nodes",
      );
    }
    return {
      mode: "routed" as const,
      start: points[0]!,
      end: points.at(-1)!,
      points,
      path: points
        .map(
          (point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
        )
        .join(" "),
      labelPoint: midPointOnPath(points),
    };
  });

  // Fit the viewBox to node and edge geometry with padding.
  const pad = 24;
  const xs = layoutNodes.flatMap((n) => {
    const hw = n.w / 2;
    return [n.x - hw, n.x + hw];
  });
  const ys = layoutNodes.flatMap((n) => {
    const hh = n.h / 2;
    return [n.y - hh, n.y + hh];
  });
  const edgeXs = edgeLayouts.flatMap((layout, index) => {
    if (!layout) return [];
    const labelWidth = edges[index]?.label
      ? edges[index]!.label!.length * 6.8 + 8
      : 0;
    return [
      ...layout.points.map((point) => point.x),
      layout.labelPoint.x - labelWidth / 2,
      layout.labelPoint.x + labelWidth / 2,
    ];
  });
  const edgeYs = edgeLayouts.flatMap((layout) =>
    layout ? layout.points.map((point) => point.y) : [],
  );
  const minX = Math.min(0, ...xs, ...edgeXs) - pad;
  const minY = Math.min(0, ...ys, ...edgeYs) - pad;
  const maxX = Math.max(0, ...xs, ...edgeXs) + pad;
  const maxY = Math.max(0, ...ys, ...edgeYs) + pad;
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">
        <svg
          viewBox={`${minX} ${minY} ${vbW} ${vbH}`}
          role="img"
          style={{
            aspectRatio: `${vbW} / ${vbH}`,
            width: "100%",
            height: "auto",
          }}
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
            const layout = edgeLayouts[i];
            if (!layout) return null;
            const stroke = edge.dashed
              ? "var(--warning)"
              : "var(--muted-foreground)";
            const labelWidth = edge.label ? edge.label.length * 6.8 + 8 : 0;

            return (
              <g key={i}>
                {layout.mode === "straight" ? (
                  <line
                    role="presentation"
                    x1={layout.start.x}
                    y1={layout.start.y}
                    x2={layout.end.x}
                    y2={layout.end.y}
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
                ) : (
                  <path
                    role="presentation"
                    d={layout.path ?? undefined}
                    fill="none"
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
                )}
                {edge.label && (
                  <g>
                    <rect
                      x={layout.labelPoint.x - labelWidth / 2}
                      y={layout.labelPoint.y - 10}
                      width={labelWidth}
                      height={18}
                      rx={3}
                      fill="var(--background)"
                    />
                    <text
                      x={layout.labelPoint.x}
                      y={layout.labelPoint.y}
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
          {layoutNodes.map((node) => {
            const { w, h } = node;
            const shape = node.shape ?? "box";
            const isActive = node.id === activeId;
            const left = node.x - w / 2;
            const top = node.y - h / 2;
            const contentTop = node.y - node.textHeight / 2;
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
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={NODE_LABEL_FONT_SIZE}
                  fontWeight={500}
                  fill="var(--foreground)"
                >
                  {node.labelLines.map((line, index) => (
                    <tspan
                      key={`${node.id}-label-${index}`}
                      x={node.x}
                      y={
                        contentTop +
                        NODE_LABEL_LINE_HEIGHT / 2 +
                        index * NODE_LABEL_LINE_HEIGHT
                      }
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
                {node.sublabelLines.length > 0 && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={NODE_SUBLABEL_FONT_SIZE}
                    fontFamily="ui-monospace, monospace"
                    fill="var(--muted-foreground)"
                  >
                    {node.sublabelLines.map((line, index) => (
                      <tspan
                        key={`${node.id}-sublabel-${index}`}
                        x={node.x}
                        y={
                          contentTop +
                          node.labelLines.length * NODE_LABEL_LINE_HEIGHT +
                          NODE_CONTENT_GAP +
                          NODE_SUBLABEL_LINE_HEIGHT / 2 +
                          index * NODE_SUBLABEL_LINE_HEIGHT
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="w-full shrink-0 self-start rounded-lg border bg-card p-4 [overflow-wrap:anywhere] md:w-64">
        {activeDetail ? (
          <>
            <strong>{renderInline(activeDetail.title)}</strong>
            <p className="text-sm text-muted-foreground">
              {renderInline(activeDetail.body)}
            </p>
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
