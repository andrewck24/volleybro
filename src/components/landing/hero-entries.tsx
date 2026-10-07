"use client";
import { EntryRow } from "@/components/game/entry";
import { HOME_PLAYERS } from "@/components/landing/demo-data";
import { entriesOf } from "@/components/landing/demo-entries";
import { useRally } from "@/components/landing/rally";
import type { GamePlayerView } from "@/lib/features/game/types";
import { useEffect, useState, type CSSProperties } from "react";

const RENDERED = 11;
const PLAYERS = HOME_PLAYERS as GamePlayerView[];
const ENTRIES = entriesOf("hero");

const Row = ({
  rally,
  index,
  isAnimated,
}: {
  rally: number;
  index: number;
  isAnimated: boolean;
}) => {
  const [isMounted, setIsMounted] = useState(!isAnimated);
  useEffect(() => {
    if (isMounted) return;
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setIsMounted(true)),
    );
    return () => cancelAnimationFrame(id);
  }, [isMounted]);

  return (
    <div
      data-animate={isAnimated || undefined}
      className="landing-entry-row"
      style={
        {
          "--row-index": isMounted ? index : index - 1,
          opacity: isMounted ? 1 : 0,
        } as CSSProperties
      }
    >
      <EntryRow
        entry={ENTRIES[rally - 1]!}
        players={PLAYERS}
        isLatest={false}
      />
    </div>
  );
};

/** The app's real EntryRow list, newest rally first, watch-only. */
export const HeroEntries = () => {
  const { setNo, isLive, filedRallies } = useRally();
  const rallies = Array.from(
    { length: Math.min(RENDERED, Math.max(0, filedRallies)) },
    (_, i) => filedRallies - i,
  );
  return (
    <div inert className="contents">
      {rallies.map((rally, index) => (
        <Row
          key={`${setNo}-${rally}`}
          rally={rally}
          index={index}
          isAnimated={isLive}
        />
      ))}
    </div>
  );
};
