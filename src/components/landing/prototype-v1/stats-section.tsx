"use client";
// PROTOTYPE (throwaway). Section 4's visual: the real `Points` bars only (no
// Scores, no team names, no rally timeline), live from the demo SWR cache.
// Rendered through a portal into the server-rendered slot in section 4, so it
// shares the section 3 store/cache while the section copy stays in the HTML.
// Entering the slot first reveals the stats (Points' own scaleX transition
// from zero, slowed to the page's 700ms beat), then fires the send once, so
// the rally from section 3 lands as a single +1 on the ATTACK and TOTAL rows.
// Scrolling back up past it replays the reveal on re-entry.
import { Points } from "@/components/game/stats/teams-stats/points";
import { getTeamsStats } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const REVEAL_MS = 700;

export const StatsPoints = ({
  game,
  slot,
  onEnter,
}: {
  game: GameView;
  slot: HTMLElement;
  onEnter: () => void;
}) => {
  const [revealed, setRevealed] = useState(false);
  const onEnterRef = useRef(onEnter);
  useEffect(() => {
    onEnterRef.current = onEnter;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        clearTimeout(timer);
        if (e!.isIntersecting) {
          setRevealed(true);
          timer = setTimeout(() => onEnterRef.current(), REVEAL_MS);
        } else if (e!.boundingClientRect.top > 0) {
          setRevealed(false);
        }
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(slot);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [slot]);

  const stats = useMemo(
    () => getTeamsStats({ sets: game.sets }, 0),
    [game.sets],
  );
  // same shape with every count at zero, so Points runs its own first-view
  // scaleX transition from nothing
  const empty = useMemo(
    () => getTeamsStats({ sets: [{ ...game.sets[0]!, entries: [] }] }, 0),
    [game.sets],
  );

  return createPortal(
    <div
      inert
      className="w-full [&_.transition-all]:duration-700 [&_.transition-all]:ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:[&_.transition-all]:duration-0"
    >
      <Points stats={revealed ? stats : empty} />
    </div>,
    slot,
  );
};
