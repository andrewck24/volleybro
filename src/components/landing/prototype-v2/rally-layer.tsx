"use client";
import {
  SET_RALLIES,
  foldRallies,
} from "@/components/landing/prototype-v1/demo-data";
import { useRally } from "@/components/landing/prototype-v1/rally";
import { moveLabel } from "@/components/landing/prototype-v2/copy";
import { useEffect, useState, type CSSProperties } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

// PROTOTYPE: the hero's moving layer, driven by v1's rally clock (one beat =
// 2.2s, paused off-screen / hidden tab, a fixed mid-set snapshot under reduced
// motion) and v1's demo fixture. Each beat, rally n lands as a mark where the
// play ended — our points on their front zone, their points on ours — then
// files into the Entry list in the opponent back zone; the row it becomes
// slides in on the next beat, and the score at the net post moves with it.

const RALLIES = foldRallies(SET_RALLIES);
const ACROSS = [1.4, 3.9, 6.4];
const RENDERED = 12;

const spotOf = (n: number) => {
  const r = RALLIES[n - 1]!;
  return r.win
    ? { a: 10.3, c: ACROSS[(n * 2) % 3]! }
    : // our front zone, clear of the action on the attack line
      { a: 8.1, c: ACROSS[n % 2]! };
};

const Row = ({
  n,
  index,
  animate,
}: {
  n: number;
  index: number;
  animate: boolean;
}) => {
  const r = RALLIES[n - 1]!;
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
      className="v2-row flex items-center gap-[0.6em] px-[0.5em] text-(--v2-ink)"
      style={
        {
          "--i": mounted ? index : index - 1,
          opacity: mounted ? 1 : 0,
        } as CSSProperties
      }
    >
      <span className="w-[3.2em] font-semibold tabular-nums">
        {r.homeScore}
        <span className="px-[0.15em]">:</span>
        {r.awayScore}
      </span>
      <span className="flex-1 truncate font-bold">
        {moveLabel(r.home, r.win)}
      </span>
      <span
        className={
          r.win
            ? "grid aspect-square h-[70%] place-items-center bg-(--v2-free) text-(--v2-on-free)"
            : "grid aspect-square h-[70%] place-items-center bg-(--v2-ink) text-(--v2-in)"
        }
      >
        {r.win ? (
          <FiPlus className="size-[80%]" />
        ) : (
          <FiMinus className="size-[80%]" />
        )}
      </span>
    </div>
  );
};

export const RallyLayer = () => {
  const { set, setNo, live } = useRally();
  const n = set.rallies;
  // while live, the list trails the mark by one beat: rally n is still in the
  // air and becomes a row on the next tick
  const shown = live ? n - 1 : n;
  const ids = Array.from(
    { length: Math.min(RENDERED, shown) },
    (_, i) => shown - i,
  );
  const last = shown > 0 ? RALLIES[shown - 1]! : null;
  const spot = n > 0 ? spotOf(n) : null;
  const r = n > 0 ? RALLIES[n - 1]! : null;

  return (
    <div aria-hidden data-rally className="absolute inset-0">
      {/* running set score at the net post */}
      <div className="v2-post flex items-baseline gap-3 border-(length:--v2-lw) border-(--v2-line) bg-(--v2-free) px-3 py-1.5 text-(--v2-on-free)">
        <span className="text-xs font-bold text-(--v2-on-free-2)">
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
        <div className="v2-rows">
          {ids.map((id, i) => (
            <Row key={`${setNo}-${id}`} n={id} index={i} animate={live} />
          ))}
        </div>
      </div>
    </div>
  );
};
