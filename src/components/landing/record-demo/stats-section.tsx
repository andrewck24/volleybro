"use client";
// PROTOTYPE (throwaway). Section 4: the team stats comparison only (Points),
// from a GameView (live from SWR in variant a, from props in variant b).
// Entering the section first reveals the stats (Points' own scaleX transition
// from zero), then fires the send once, so the rally lands as a single +1 on the
// matching count and bar; after that it is static.
import { Points } from "@/components/game/stats/teams-stats/points";
import styles from "@/components/landing/record-demo/record-demo.module.css";
import { getTeamsStats } from "@/lib/features/game/helpers";
import type { GameView } from "@/lib/features/game/types";
import { useEffect, useMemo, useRef, useState } from "react";

const REVEAL_MS = 700;

export const StatsSection = ({
  game,
  onEnter,
}: {
  game: GameView;
  onEnter: () => void;
}) => {
  const box = useRef<HTMLElement>(null);
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
          // scrolled back up past the section: replay the reveal on re-entry
          setRevealed(false);
        }
      },
      { rootMargin: "0px 0px -35% 0px" },
    );
    io.observe(box.current!);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  const stats = useMemo(
    () => getTeamsStats({ sets: game.sets }, 0),
    [game.sets],
  );
  // same shape as the real stats with every count at zero, so Points can run
  // its own first-view scaleX transition from nothing
  const empty = useMemo(
    () => getTeamsStats({ sets: [{ ...game.sets[0]!, entries: [] }] }, 0),
    [game.sets],
  );

  return (
    <section ref={box} className={styles.stats}>
      <p className="sr-only">
        團隊數據統計：這一球記錄完成後，對應的得分項目與總得分各加一。
      </p>
      <div inert className="w-full max-w-sm">
        <Points stats={revealed ? stats : empty} />
      </div>
    </section>
  );
};
