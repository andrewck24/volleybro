"use client";
import { diffsAt } from "@/components/landing/demo-data";
import { useRally } from "@/components/landing/rally";
import { cn } from "@/lib/utils";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 300;
const MAX_DIFF = 8;
const PADDING = 12;
// the fewest pixels between points; past that many the oldest scroll off left
const MIN_POINT_SPACING = 12;
// the cardinal spline's tension: 0.7 keeps 30% of the Catmull-Rom tangent,
// so vertices are visibly rounded but stay tight
const TENSION = 0.7;

type Point = [number, number];

const yOf = (diff: number) =>
  VIEW_HEIGHT / 2 -
  (Math.max(-MAX_DIFF, Math.min(MAX_DIFF, diff)) / MAX_DIFF) *
    (VIEW_HEIGHT / 2 - PADDING);

const splinePath = (points: Point[]) => {
  const count = points.length;
  const handle = (1 - TENSION) / 6;
  const at = (i: number) => points[Math.max(0, Math.min(count - 1, i))]!;
  let path = `M${points[0]![0]} ${points[0]![1]}`;
  for (let i = 0; i < count - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const [xBefore, yBefore] = at(i - 1);
    const [xAfter, yAfter] = at(i + 2);
    path += ` C${x0 + (x1 - xBefore) * handle} ${y0 + (y1 - yBefore) * handle} ${x1 - (xAfter - x0) * handle} ${y1 - (yAfter - y0) * handle} ${x1} ${y1}`;
  }
  return path;
};

// Two clip paths split the colours at the baseline, so they stay exact along
// the curve.
export const DiffChart = ({ className }: { className?: string }) => {
  const { rallies } = useRally();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  const clipId = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry!.contentRect.width),
    );
    observer.observe(boxRef.current!);
    return () => observer.disconnect();
  }, []);

  const { line, area } = useMemo(() => {
    const capacity = Math.max(8, Math.floor(width / MIN_POINT_SPACING) + 1);
    const diffs = diffsAt(rallies);
    const count = diffs.length;
    let points: Point[];
    if (count <= capacity) {
      const spacing = VIEW_WIDTH / Math.max(1, count - 1);
      points = diffs.map((diff, i) => [i * spacing, yOf(diff)]);
    } else {
      const spacing = VIEW_WIDTH / (capacity - 1);
      // one extra point sits off-canvas on the left
      points = diffs
        .slice(count - capacity - 1)
        .map((diff, j) => [(j - 1) * spacing, yOf(diff)]);
    }
    const line = splinePath(points);
    return {
      line,
      area: `${line} L${points.at(-1)![0]} ${VIEW_HEIGHT / 2} L${points[0]![0]} ${VIEW_HEIGHT / 2} Z`,
    };
  }, [rallies, width]);

  const plot = (side: "up" | "down") => (
    <g clipPath={`url(#${clipId}${side})`}>
      <path
        d={area}
        className={side === "up" ? "fill-chart-1/20" : "fill-chart-2/20"}
      />
      <path
        d={line}
        fill="none"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={side === "up" ? "stroke-chart-1" : "stroke-chart-2"}
      />
    </g>
  );

  return (
    <div
      ref={boxRef}
      data-rally
      aria-hidden
      className={cn("relative", className)}
    >
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        className="size-full overflow-hidden"
      >
        <defs>
          <clipPath id={`${clipId}up`}>
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT / 2} />
          </clipPath>
          <clipPath id={`${clipId}down`}>
            <rect
              y={VIEW_HEIGHT / 2}
              width={VIEW_WIDTH}
              height={VIEW_HEIGHT / 2}
            />
          </clipPath>
        </defs>
        {plot("up")}
        {plot("down")}
      </svg>
    </div>
  );
};
