"use client";
import { diffsOf, useRally } from "@/components/landing/prototype-visual/rally";
import { cn } from "@/lib/utils";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

// PROTOTYPE: closing-CTA split-area point-diff chart, hand-written SVG.
// Pure visual (no labels/axes). Above the 0 baseline = chart-1 (primary),
// below = chart-2 (destructive), semi-transparent area down/up to the
// baseline. The split is two static clipPaths at the baseline, so it stays
// exact for the rounded curve too.
//
// X spacing: the line always spans the whole canvas. While the set has fewer
// points than `cap` (how many fit at MIN_PX spacing), spacing = W/(n-1) and
// shrinks every rally: the plot group re-mounts with the new paths and plays
// scaleX(old/new) → 1, so old points glide left and the newest enters from the
// right. Past `cap`, spacing is fixed and the group plays translateX(+step) → 0
// so the oldest points slide out left. Paths are recomputed once per rally;
// nothing runs per frame.

const W = 1000;
const H = 300;
const MAXD = 8;
const PAD = 12;
const MIN_PX = 12;
const y = (d: number) =>
  H / 2 - (Math.max(-MAXD, Math.min(MAXD, d)) / MAXD) * (H / 2 - PAD);

type Pt = [number, number];

const sharp = (p: Pt[]) =>
  p.map(([x, v], i) => `${i ? "L" : "M"}${x} ${v}`).join(" ");

/** Monotone cubic (Fritsch–Carlson): no overshoot, so the curve never
 *  crosses the baseline between two points on the same side. */
const round = (p: Pt[]) => {
  const n = p.length;
  if (n < 3) return sharp(p);
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = p[i + 1]![0] - p[i]![0];
    m[i] = (p[i + 1]![1] - p[i]![1]) / dx[i]!;
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++)
    t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  t[n - 1] = m[n - 2]!;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i]!;
      t[i + 1] = k * b * m[i]!;
    }
  }
  let d = `M${p[0]![0]} ${p[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3;
    const [x0, y0] = p[i]!;
    const [x1, y1] = p[i + 1]!;
    d += ` C${x0 + h} ${y0 + t[i]! * h} ${x1 - h} ${y1 - t[i + 1]! * h} ${x1} ${y1}`;
  }
  return d;
};

export const DiffChart = ({
  curve,
  className,
}: {
  curve: string;
  className?: string;
}) => {
  const { set, setNo, live } = useRally();
  const box = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState(40);
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    const ro = new ResizeObserver(([e]) =>
      setCap(Math.max(8, Math.floor(e!.contentRect.width / MIN_PX) + 1)),
    );
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, []);

  const all = diffsOf(set);
  const n = all.length;
  let pts: Pt[];
  let anim: { cls: string; style: CSSProperties } | null = null;
  if (n <= cap) {
    const s = W / Math.max(1, n - 1);
    pts = all.map((v, i) => [i * s, y(v)]);
    if (n > 2)
      anim = {
        cls: "proto-squeeze",
        style: { "--k": (n - 1) / (n - 2) } as CSSProperties,
      };
  } else {
    const s = W / (cap - 1);
    const first = n - cap - 1; // one extra point off-canvas left
    pts = all.slice(first).map((v, j) => [(j - 1) * s, y(v)]);
    anim = { cls: "proto-slide", style: { "--dx": s } as CSSProperties };
  }

  const line = (curve === "round" ? round : sharp)(pts);
  const area = `${line} L${pts.at(-1)![0]} ${H / 2} L${pts[0]![0]} ${H / 2} Z`;

  const plot = (side: "u" | "d") => (
    <g clipPath={`url(#${id}${side})`}>
      <g
        key={n}
        className={cn("proto-plot", live && anim?.cls)}
        style={live ? anim?.style : undefined}
      >
        <path
          d={area}
          className={side === "u" ? "fill-chart-1/20" : "fill-chart-2/20"}
        />
        <path
          d={line}
          fill="none"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className={side === "u" ? "stroke-chart-1" : "stroke-chart-2"}
        />
      </g>
    </g>
  );

  return (
    <div ref={box} data-rally aria-hidden className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="size-full overflow-hidden"
      >
        <defs>
          <clipPath id={`${id}u`}>
            <rect width={W} height={H / 2} />
          </clipPath>
          <clipPath id={`${id}d`}>
            <rect y={H / 2} width={W} height={H / 2} />
          </clipPath>
        </defs>
        <g key={setNo} className={live ? "proto-fade" : undefined}>
          {plot("u")}
          {plot("d")}
        </g>
      </svg>
    </div>
  );
};
