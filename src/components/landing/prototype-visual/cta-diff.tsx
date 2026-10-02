"use client";
import { diffsOf, useRally } from "@/components/landing/prototype-visual/rally";
import { useId } from "react";

// PROTOTYPE: shared bits of the split-area point-diff CTA backgrounds.
// Pure visual: no labels, legend or axis text. Above the 0 baseline = primary
// (chart-1), below = destructive (chart-2), area between line and baseline
// filled semi-transparent. New rallies are revealed by a "curtain" that
// shrinks with scaleX (transform only).

export const WINDOW = 50;
export const MAXD = 8;
const clamp = (d: number) => Math.max(-MAXD, Math.min(MAXD, d));

/** Visible slice of the running differential, clamped to the y domain. */
export const useDiffWindow = () => {
  const { set, setNo, live } = useRally();
  const all = diffsOf(set);
  const start = Math.max(0, all.length - 1 - WINDOW);
  const d = all.slice(start).map(clamp);
  return { d, n: d.length - 1, setNo, live };
};

/** Covers x > previous point, then shrinks to x > newest point. */
export const Curtain = ({ n, live }: { n: number; live: boolean }) => {
  if (!live || n < 1 || n > WINDOW) return null;
  const from = (n - 1) / WINDOW;
  const to = n / WINDOW;
  return (
    <div
      key={n}
      aria-hidden
      className="proto-curtain absolute inset-y-0 right-0 bg-background"
      style={
        {
          left: `${from * 100}%`,
          "--s": (1 - to) / (1 - from),
        } as React.CSSProperties
      }
    />
  );
};

/** Hand-written SVG split-area chart. */
export const DiffAreaSvg = () => {
  const { d, n, setNo, live } = useDiffWindow();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const W = 1000;
  const H = 300;
  const x = (i: number) => (i / WINDOW) * W;
  const y = (v: number) => H / 2 - (v / MAXD) * (H / 2);
  const line = d.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const area = `${line} L${x(n)} ${H / 2} L0 ${H / 2} Z`;

  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="size-full"
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
          <path
            d={area}
            clipPath={`url(#${id}u)`}
            className="fill-chart-1/20"
          />
          <path
            d={area}
            clipPath={`url(#${id}d)`}
            className="fill-chart-2/20"
          />
          {(["u", "d"] as const).map((k) => (
            <path
              key={k}
              d={line}
              fill="none"
              strokeWidth={3}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath={`url(#${id}${k})`}
              className={k === "u" ? "stroke-chart-1" : "stroke-chart-2"}
            />
          ))}
        </g>
      </svg>
      <Curtain n={n} live={live} />
    </>
  );
};
