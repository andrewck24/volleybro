"use client";
import { Points } from "@/components/game/stats/teams-stats/points";
import { MoveType } from "@/entities/game";
import type { ITeamsStats, TeamStatsView } from "@/lib/features/game/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// PROTOTYPE: the app's real game components fed with mock data.

/* ---------- Team stats comparison ---------- */

const stat = (success: number) => ({ success, error: 0 });
const team = (atk: number, blk: number, srv: number, unf: number) =>
  ({
    [MoveType.SERVING]: stat(srv),
    [MoveType.BLOCKING]: stat(blk),
    [MoveType.ATTACK]: stat(atk),
    [MoveType.RECEPTION]: stat(0),
    [MoveType.DEFENSE]: stat(0),
    [MoveType.SETTING]: stat(0),
    [MoveType.UNFORCED]: stat(unf),
    rotation: 0,
    timeout: 0,
    substitution: 0,
    challenge: 0,
  }) as TeamStatsView;

const ZERO: ITeamsStats = { home: team(0, 0, 0, 0), away: team(0, 0, 0, 0) };
const MOCK: ITeamsStats = { home: team(14, 5, 6, 8), away: team(11, 7, 4, 6) };

/**
 * The real `Points` (what TeamsStats renders, inside TeamsStats' own wrapper
 * markup). Bars start at 0 and get real values the first time the block
 * scrolls into view, so BarChart's built-in scaleX transition plays once —
 * slowed to the page's 700ms beat. Reduced motion: values land with no transition.
 */
export const AnimatedTeamsStats = ({ className }: { className?: string }) => {
  const [stats, setStats] = useState(ZERO);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // reduced motion: same trigger, but motion-reduce:duration-0 below makes
    // the bars land without a transition
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e!.isIntersecting) return;
        setStats(MOCK);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(box.current!);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={box}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-4",
        "[&_.transition-all]:duration-700 [&_.transition-all]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:[&_.transition-all]:duration-0",
        className,
      )}
    >
      <Points stats={stats} />
    </div>
  );
};
