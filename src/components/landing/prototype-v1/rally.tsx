"use client";
import { Figure } from "@/components/custom/stats/figures";
import {
  SET_RALLIES,
  setAt,
  type SetState,
} from "@/components/landing/prototype-v1/demo-data";
import { SKILL_WORDS } from "@/components/landing/prototype-v1/shared";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

// PROTOTYPE: one rally clock for the whole hero. Entry list, point-diff chart
// and the rotating skill word all advance on the same beat (variant C
// choreography from prototype/hero-entry-motion, 2.2s cadence). CSS
// transitions/keyframes only (transform, opacity, stroke-dashoffset); moving
// layers carry no shadow or blur. Clock pauses off-screen / hidden tab;
// reduced motion renders a fixed mid-set snapshot. The set is the shared demo
// fixture (demo-data.ts), replayed from rally 1 after a pause once it ends;
// this clock never touches the sections 3-4 store.

// DECIDE: the clock replays the same fixture set (25:21) every loop instead of
// B1's fresh random set, and the skill word still rotates by rally index
// rather than naming the fixture rally's own skill.
const INTERVAL = 2200;
const PAUSE_TICKS = 1;
const SEED_RALLIES = 5;
const STATIC_RALLIES = 22;
export const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const STATIC_SET = setAt(STATIC_RALLIES);
const SET_LEN = SET_RALLIES.length;

type Rally = {
  set: SetState;
  setNo: number;
  /** true once the clock has ticked — gates enter/exit motion */
  live: boolean;
};

const RallyCtx = createContext<Rally | null>(null);
export const useRally = () => useContext(RallyCtx)!;

/** Running point differential (home − away), oldest rally first, from 0. */
export const diffsOf = (set: SetState) => {
  const out = [0];
  for (const win of [...set.entries].reverse())
    out.push(out.at(-1)! + (win ? 1 : -1));
  return out;
};

export const RallyProvider = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [state, setState] = useState<Rally>(() => ({
    set: setAt(SEED_RALLIES),
    setNo: 0,
    live: false,
  }));
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const pause = useRef(0);
  const live = useRef(state);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // clock runs while any [data-rally] consumer (hero list, CTA visual) is on
  // screen and the tab is visible
  useEffect(() => {
    const targets = [...box.current!.querySelectorAll("[data-rally]")];
    if (!targets.length) targets.push(box.current!);
    const seen = new Set<Element>();
    let shown = !document.hidden;
    const update = () => setActive(seen.size > 0 && shown);
    const io = new IntersectionObserver((es) => {
      for (const e of es) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      update();
    });
    targets.forEach((t) => io.observe(t));
    const onVis = () => {
      shown = !document.hidden;
      update();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (reduced || !active) return;
    const id = setInterval(() => {
      const cur = live.current;
      if (cur.set.rallies >= SET_LEN) {
        if (pause.current > 0) {
          pause.current--;
          return;
        }
        live.current = { set: setAt(1), setNo: cur.setNo + 1, live: true };
      } else {
        live.current = { ...cur, set: setAt(cur.set.rallies + 1), live: true };
        if (cur.set.rallies + 1 >= SET_LEN) pause.current = PAUSE_TICKS;
      }
      setState(live.current);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [reduced, active]);

  const value = reduced ? { set: STATIC_SET, setNo: -1, live: false } : state;

  return (
    <RallyCtx.Provider value={value}>
      <div ref={box} className={className}>
        {children}
      </div>
    </RallyCtx.Provider>
  );
};

/* ---------- Entry list ---------- */

const ROW_H = 40;
const PITCH = ROW_H + 8;
const VISIBLE = 6;
const RENDERED = VISIBLE + 2;
const PILL_W = [40, 24, 52, 32, 46, 28, 56, 36];

const Bar = ({
  home,
  win,
  id,
}: {
  home: boolean;
  win: boolean;
  id: number;
}) => (
  <div
    className={cn(
      "flex h-6 min-w-0 flex-1 items-center gap-1 border-l-2 px-1",
      home ? "border-primary" : "border-destructive",
    )}
  >
    <span className="size-5 shrink-0 rounded-full bg-muted-foreground/30" />
    <span
      className="h-2.5 min-w-2 shrink rounded-full bg-muted-foreground/30"
      style={{ width: PILL_W[(id * (home ? 3 : 5)) % PILL_W.length] }}
    />
    {home === win ? (
      <FiPlus className="ml-auto size-5 shrink-0 text-chart-1" />
    ) : (
      <FiMinus className="ml-auto size-5 shrink-0 text-destructive" />
    )}
  </div>
);

const Row = ({
  win,
  id,
  index,
  animate,
  rowClassName,
}: {
  win: boolean;
  id: number;
  index: number;
  animate: boolean;
  rowClassName?: string;
}) => {
  const [mounted, setMounted] = useState(!animate);
  useEffect(() => {
    if (mounted) return;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true)),
    );
    return () => cancelAnimationFrame(r);
  }, [mounted]);

  const opacity = !mounted ? 0 : index >= RENDERED - 1 ? 0 : 1;
  const y = (index - (mounted ? 0 : 1)) * PITCH;

  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        height: ROW_H,
        transform: `translateY(${y}px)`,
        opacity,
        transition: animate
          ? `transform 500ms ${EASE} ${index * 35}ms, opacity 450ms ease-out`
          : "none",
      }}
    >
      <div
        className={cn(
          "flex size-full flex-row items-center gap-1 rounded-lg bg-card p-1",
          rowClassName,
        )}
      >
        <Figure size="sm" variant={win ? "primary" : "secondary"} />
        <Figure size="sm" variant={win ? "secondary" : "destructive"} />
        <Bar home win={win} id={id} />
        <Bar home={false} win={win} id={id} />
      </div>
    </div>
  );
};

export const EntryRows = ({
  className,
  rowClassName,
}: {
  className?: string;
  rowClassName?: string;
}) => {
  const { set, setNo, live } = useRally();
  const items = set.entries
    .slice(0, RENDERED)
    .map((win, i) => ({ win, id: set.rallies - i }));

  return (
    <div
      aria-hidden
      data-rally
      className={cn(
        "relative w-full max-w-md [mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
        className,
      )}
      style={{ height: VISIBLE * PITCH }}
    >
      {items.map((it, i) => (
        <Row
          key={`${setNo}-${it.id}`}
          win={it.win}
          id={it.id}
          index={i}
          animate={live}
          rowClassName={rowClassName}
        />
      ))}
    </div>
  );
};

/* ---------- Rotating skill word (on the rally beat) ---------- */

/** Word changes with each rally; the chip clips both enter and exit. */
export const RallyWord = ({
  words = SKILL_WORDS,
  className,
}: {
  words?: string[];
  className?: string;
}) => {
  const { set, live } = useRally();
  const r = set.rallies;
  const cur = words[r % words.length]!;
  const prev = words[(r - 1 + words.length) % words.length]!;

  return (
    <span
      className={cn(
        "relative inline-grid overflow-hidden align-bottom",
        className,
      )}
    >
      <span className="sr-only">{words.join("、")}</span>
      {live && (
        <span key={`out-${r}`} aria-hidden className="proto-word-out">
          {prev}
        </span>
      )}
      <span
        key={`in-${r}`}
        aria-hidden
        className={cn("[grid-area:1/1]", live && "proto-word-in")}
      >
        {cur}
      </span>
    </span>
  );
};
