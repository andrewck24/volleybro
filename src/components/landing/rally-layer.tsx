"use client";
import { moveLabel } from "@/components/landing/copy";
import { FOLDED_RALLIES } from "@/components/landing/demo-data";
import { EntryRows } from "@/components/landing/entry-rows";
import { useRally } from "@/components/landing/rally";
import { useEffect, useRef, type CSSProperties } from "react";

// Metres on the court plan. A won rally lands on their front zone, a lost one
// on ours, clear of the action on our attack line.
const LANDING_ACROSS = [1.4, 3.9, 6.4];
const THEIR_FRONT_ZONE = 9.9;
const OUR_FRONT_ZONE = 8.1;
// portrait keeps lost rallies left of the score chip at the right net post
const OUR_FRONT_ZONE_PORTRAIT = 8.6;
const OUR_FRONT_SIDE_PORTRAIT = 1.2;
const ENTRY_ZONE_START = 11.3;

const spotOf = (rally: number) => {
  const { win } = FOLDED_RALLIES[rally - 1]!;
  if (win) {
    const across = LANDING_ACROSS[(rally * 2) % 3]!;
    return {
      distanceFromEndLine: THEIR_FRONT_ZONE,
      distanceFromEndLinePortrait: THEIR_FRONT_ZONE,
      distanceFromSideLine: across,
      distanceFromSideLinePortrait: across,
    };
  }
  return {
    distanceFromEndLine: OUR_FRONT_ZONE,
    distanceFromEndLinePortrait: OUR_FRONT_ZONE_PORTRAIT,
    distanceFromSideLine: LANDING_ACROSS[rally % 2]!,
    distanceFromSideLinePortrait: OUR_FRONT_SIDE_PORTRAIT,
  };
};

export const RallyLayer = () => {
  const { rallies, setNo, isLive, filedRallies } = useRally();
  const layer = useRef<HTMLDivElement>(null);

  // The mark files into the first row's first score badge: measure it once
  // per beat (the lazy list only has a first row after its chunk lands) and on
  // resize. Row 0 sits at the rows' top, so the offset holds while it slides in.
  useEffect(() => {
    const layerEl = layer.current!;
    const rows = layerEl.querySelector(".landing-entry-rows")!;
    const measure = () => {
      const row = rows.querySelector(".landing-entry-row");
      const badge = row?.querySelector(".size-8");
      if (!row || !badge) return;
      const layerBox = layerEl.getBoundingClientRect();
      const rowsBox = rows.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const badgeBox = badge.getBoundingClientRect();
      layerEl.style.setProperty(
        "--mark-target-x",
        `${rowsBox.left + (badgeBox.left + badgeBox.width / 2 - rowBox.left) - layerBox.left}px`,
      );
      layerEl.style.setProperty(
        "--mark-target-y",
        `${rowsBox.top + (badgeBox.top + badgeBox.height / 2 - rowBox.top) - layerBox.top}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layerEl);
    observer.observe(rows);
    return () => observer.disconnect();
  }, [rallies, setNo]);

  const last = filedRallies > 0 ? FOLDED_RALLIES[filedRallies - 1]! : null;
  const spot = rallies > 0 ? spotOf(rallies) : null;
  const rally = rallies > 0 ? FOLDED_RALLIES[rallies - 1]! : null;

  return (
    <div
      ref={layer}
      aria-hidden
      data-rally
      className="pointer-events-none absolute inset-0"
    >
      {/* running set score at the net post */}
      <div className="landing-net-post flex items-baseline rounded-lg bg-card px-3 py-1.5 text-card-foreground shadow-md">
        <span className="text-xl font-bold tabular-nums lg:text-2xl">
          {last?.homeScore ?? 0}
          <span className="px-1.5">:</span>
          {last?.awayScore ?? 0}
        </span>
      </div>

      {spot && rally && (
        <div
          key={`${setNo}-${rallies}`}
          data-live={isLive || undefined}
          data-ours={!rally.win || undefined}
          className="landing-mark text-court-foreground"
          style={
            {
              "--distance-from-end-line": spot.distanceFromEndLine,
              "--distance-from-end-line-portrait":
                spot.distanceFromEndLinePortrait,
              "--distance-from-side-line": spot.distanceFromSideLine,
              "--distance-from-side-line-portrait":
                spot.distanceFromSideLinePortrait,
            } as CSSProperties
          }
        >
          <span className="landing-mark-dot">
            <span className="landing-mark-ring" />
          </span>
          <span className="landing-mark-label font-bold">
            {moveLabel(rally.home, rally.win)}
          </span>
        </div>
      )}

      <div
        className="landing-zone landing-entries p-[calc(0.3*var(--court-meter))] lg:flex lg:flex-col lg:justify-center lg:p-[calc(0.5*var(--court-meter))]"
        style={
          {
            "--zone-start-from-end-line": ENTRY_ZONE_START,
            "--zone-end-from-end-line": 18,
          } as CSSProperties
        }
      >
        {/* card surface (rounded-xl, p-1.5) so the rows' own teal and
            coral figures never sit on the coral court; inner rows keep
            their rounded-md (12 - 6) */}
        <div className="rounded-xl bg-card p-1.5 text-card-foreground shadow-lg">
          <EntryRows />
        </div>
      </div>
    </div>
  );
};
