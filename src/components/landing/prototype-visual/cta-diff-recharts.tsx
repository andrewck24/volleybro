"use client";
import { ChartContainer } from "@/components/ui/chart";
import {
  Curtain,
  MAXD,
  WINDOW,
  useDiffWindow,
} from "@/components/landing/prototype-visual/cta-diff";
import { useId } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

// PROTOTYPE: the same split-area chart through shadcn's ChartContainer +
// Recharts. Recharts' own JS animation is off (isAnimationActive={false});
// motion is the per-rally data append plus the shared CSS curtain. Loaded via
// next/dynamic so Recharts stays out of the landing's first-load JS.
// Split colour: gradient with two stops at the same offset (hard stop at the
// baseline), offset = max / (max - min) of the area's bounding box.

export default function DiffAreaRecharts() {
  const { d, n, setNo, live } = useDiffWindow();
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const max = Math.max(...d, 0);
  const min = Math.min(...d, 0);
  const off = max === min ? 0.5 : max / (max - min);
  const data = d.map((v, i) => ({ i, d: v }));

  const stops = (opacity: number) => (
    <>
      <stop offset={0} stopColor="var(--chart-1)" stopOpacity={opacity} />
      <stop offset={off} stopColor="var(--chart-1)" stopOpacity={opacity} />
      <stop offset={off} stopColor="var(--chart-2)" stopOpacity={opacity} />
      <stop offset={1} stopColor="var(--chart-2)" stopOpacity={opacity} />
    </>
  );

  return (
    <>
      <ChartContainer config={{}} className="aspect-auto size-full" key={setNo}>
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1">
              {stops(0.2)}
            </linearGradient>
            <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
              {stops(1)}
            </linearGradient>
          </defs>
          <XAxis dataKey="i" type="number" domain={[0, WINDOW]} hide />
          <YAxis domain={[-MAXD, MAXD]} hide />
          <Area
            dataKey="d"
            type="linear"
            baseValue={0}
            stroke={`url(#${id}s)`}
            strokeWidth={3}
            fill={`url(#${id}f)`}
            isAnimationActive={false}
            dot={false}
            activeDot={false}
          />
        </AreaChart>
      </ChartContainer>
      <Curtain n={n} live={live} />
    </>
  );
}
