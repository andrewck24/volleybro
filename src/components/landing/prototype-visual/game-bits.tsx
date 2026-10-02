"use client";
import { Figure } from "@/components/custom/stats/figures";
import { Scores } from "@/components/game/banner/scores";
import { Points } from "@/components/game/stats/teams-stats/points";
import { EntryType, MoveType } from "@/entities/game";
import type {
  ITeamsStats,
  SetView,
  TeamStatsView,
} from "@/lib/features/game/types";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { RiGroupLine } from "react-icons/ri";

// PROTOTYPE: the app's real game components fed with mock data.

/* ---------- Per-set scores ---------- */

// Scores only reads the last rally's running score, so one entry per set is enough.
const mockSet = (home: number, away: number) =>
  ({
    entries: [
      {
        type: EntryType.RALLY,
        win: home > away,
        home: { score: home, type: MoveType.ATTACK },
        away: { score: away, type: MoveType.ATTACK },
      },
    ],
  }) as unknown as SetView;

const MOCK_SETS = [mockSet(25, 21), mockSet(23, 25), mockSet(15, 12)];

/**
 * Match scoreboard as the game overview Banner draws it. `Teams` is coupled to
 * useGame, so its markup (src/components/game/banner/teams.tsx:16-66) is copied
 * verbatim here with mock values (only change: the icon hides below sm so it
 * fits 320px); the per-set row is the real `Scores`.
 */
export const MatchScoreboard = ({ className }: { className?: string }) => (
  <div className={cn("flex w-full flex-col items-center", className)}>
    <div className="flex w-full flex-row items-center justify-center gap-2 py-2">
      <TeamAvatar name="我方" />
      <div className="flex flex-1 flex-row items-center justify-center gap-2">
        <Figure value={2} size="lg" variant="primaryText" />
        <div className="font-medium text-muted-foreground">:</div>
        <Figure value={1} size="lg" variant="secondary" />
      </div>
      <TeamAvatar name="對手" />
    </div>
    <Scores sets={MOCK_SETS} />
  </div>
);

const TeamAvatar = ({ name }: { name: string }) => (
  <div className="flex w-20 flex-col items-center justify-center gap-2">
    <RiGroupLine className="size-15 max-sm:hidden" />
    <p className="h-12 w-full text-center">{name}</p>
  </div>
);

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
