"use client";
import {
  SET_RALLIES,
  foldRallies,
} from "@/components/landing/prototype-v1/demo-data";
import { useRally } from "@/components/landing/prototype-v1/rally";
import { moveLabel } from "@/components/landing/prototype-v2/copy";
import dynamic from "next/dynamic";
import type { CSSProperties } from "react";

// the app's real EntryRow list, lazy so entry/game modules stay out of the
// first load; it reads the same clock
const HeroEntries = dynamic(
  () =>
    import("@/components/landing/prototype-v2/hero-entries").then(
      (m) => m.HeroEntries,
    ),
  { ssr: false },
);

// PROTOTYPE: the hero's moving layer, driven by v1's rally clock (one beat =
// 2.2s, paused off-screen / hidden tab, a fixed mid-set snapshot under reduced
// motion) and v1's demo fixture. Each beat, rally n lands as a mark where the
// play ended — our points on their front zone, their points on ours — then
// files into the Entry list in the opponent back zone; the row it becomes
// slides in on the next beat, and the score at the net post moves with it.
// Layers: the mark is court (a ball's landing spot); the score and the Entry
// list are app objects (card surfaces, rounded, shadow) the court positions.

const RALLIES = foldRallies(SET_RALLIES);
const ACROSS = [1.4, 3.9, 6.4];

const spotOf = (n: number) => {
  const r = RALLIES[n - 1]!;
  return r.win
    ? { a: 10.3, c: ACROSS[(n * 2) % 3]! }
    : // our front zone, clear of the action on the attack line
      { a: 8.1, c: ACROSS[n % 2]! };
};

export const RallyLayer = () => {
  const { set, setNo, live } = useRally();
  const n = set.rallies;
  // while live, the list trails the mark by one beat: rally n is still in the
  // air and becomes a row on the next tick
  const shown = live ? n - 1 : n;
  const last = shown > 0 ? RALLIES[shown - 1]! : null;
  const spot = n > 0 ? spotOf(n) : null;
  const r = n > 0 ? RALLIES[n - 1]! : null;

  return (
    <div aria-hidden data-rally className="absolute inset-0">
      {/* running set score at the net post */}
      <div className="v2-post flex items-baseline gap-3 rounded-lg bg-card px-3 py-1.5 text-card-foreground shadow-md">
        <span className="text-xs font-semibold text-muted-foreground">
          示範比分
        </span>
        <span className="text-xl font-bold tabular-nums lg:text-2xl">
          {last?.homeScore ?? 0}
          <span className="px-1.5">:</span>
          {last?.awayScore ?? 0}
        </span>
      </div>

      {spot && r && (
        <div
          key={`${setNo}-${n}`}
          data-live={live || undefined}
          data-ours={!r.win || undefined}
          className="v2-mark text-(--v2-ink)"
          style={{ "--a": spot.a, "--c": spot.c } as CSSProperties}
        >
          <span className="v2-dot">
            <span className="v2-ring" />
          </span>
          <span className="v2-mark-label font-bold">
            {moveLabel(r.home, r.win)}
          </span>
        </div>
      )}

      <div
        className="v2-z p-[calc(0.5*var(--m))]"
        style={{ "--a0": 12.05, "--a1": 18 } as CSSProperties}
      >
        {/* card surface (rounded-xl, p-1.5) so the rows' own teal and
            coral figures never sit on the coral court; inner rows keep
            their rounded-md (12 - 6) */}
        <div className="rounded-xl bg-card p-1.5 text-card-foreground shadow-lg">
          <div className="v2-rows">
            <HeroEntries />
          </div>
        </div>
      </div>
    </div>
  );
};
