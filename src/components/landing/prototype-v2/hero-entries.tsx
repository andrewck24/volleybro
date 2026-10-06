"use client";
// PROTOTYPE (throwaway). The hero's Entry list: the app's real `EntryRow`
// (as the summary drawer renders it), unstyled by the landing, fed the shared
// demo fixture and driven by the rally clock. Rows file in one per beat with
// v1's row mechanics (absolute rows, translateY pitch, new row from -1). The
// list is watch-only (inert). Loaded lazily from rally-layer.tsx so the app's
// entry/game modules stay out of the first-load JS.
import { EntryRow } from "@/components/game/entry";
import {
  HOME_PLAYERS,
  SET_RALLIES,
  foldRallies,
} from "@/components/landing/prototype-v1/demo-data";
import { useRally } from "@/components/landing/prototype-v1/rally";
import { EntryType } from "@/entities/game";
import type { EntryView, GamePlayerView } from "@/lib/features/game/types";
import { scoringMoves } from "@/lib/scoring-moves";
import { useEffect, useState, type CSSProperties } from "react";

const RENDERED = 11;

const PLAYERS = HOME_PLAYERS as GamePlayerView[];

const ENTRIES: EntryView[] = foldRallies(SET_RALLIES).map((r, seq) => ({
  type: EntryType.RALLY,
  id: `hero-${seq}`,
  seq,
  win: r.win,
  home: {
    score: r.homeScore,
    type: scoringMoves[r.home]!.type,
    num: r.home,
    player: { id: r.player, zone: 4 },
  },
  away: {
    score: r.awayScore,
    type: scoringMoves[r.away]!.type,
    num: r.away,
  },
}));

const Row = ({
  n,
  index,
  animate,
}: {
  n: number;
  index: number;
  animate: boolean;
}) => {
  const [mounted, setMounted] = useState(!animate);
  useEffect(() => {
    if (mounted) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  return (
    <div
      data-animate={animate || undefined}
      className="v2-row"
      style={
        {
          "--i": mounted ? index : index - 1,
          opacity: mounted ? 1 : 0,
        } as CSSProperties
      }
    >
      <EntryRow entry={ENTRIES[n - 1]!} players={PLAYERS} isLatest={false} />
    </div>
  );
};

export const HeroEntries = () => {
  const { set, setNo, live } = useRally();
  // while live the list trails the landing mark by one beat
  const shown = live ? set.rallies - 1 : set.rallies;
  const ids = Array.from(
    { length: Math.min(RENDERED, Math.max(0, shown)) },
    (_, i) => shown - i,
  );
  return (
    <div inert className="contents">
      {ids.map((id, i) => (
        <Row key={`${setNo}-${id}`} n={id} index={i} animate={live} />
      ))}
    </div>
  );
};
