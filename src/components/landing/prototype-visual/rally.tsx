"use client";
import { Figure } from "@/components/custom/stats/figures";
import {
  isSetOver,
  newSet,
  playRally,
  type SetState,
} from "@/components/landing/prototype-visual/set-model";
import { SKILL_WORDS } from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
// reduced motion renders a fixed mid-set snapshot.

const INTERVAL = 2200;
const PAUSE_TICKS = 1;
const SEED_RALLIES = 5;
export const EASE = "cubic-bezier(0.2,0.8,0.2,1)";

const seeded = (n: number, pattern: number[]) => {
  let s = newSet();
  for (let i = 0; i < n; i++)
    s = playRally(s, () => pattern[i % pattern.length]!);
  return s;
};
// deterministic so server and client render the same first frame
const seedSet = () => seeded(SEED_RALLIES, [0, 0.9, 0, 0, 0.9]);
const STATIC_SET = seeded(22, [0, 0.9, 0, 0, 0.9, 0.9, 0, 0.9, 0, 0, 0]);

type Rally = {
  set: SetState;
  setNo: number;
  /** true once the clock has ticked — gates enter/exit motion */
  live: boolean;
};

const RallyCtx = createContext<Rally | null>(null);
const useRally = () => useContext(RallyCtx)!;

export const RallyProvider = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const [state, setState] = useState<Rally>(() => ({
    set: seedSet(),
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

  useEffect(() => {
    let onScreen = true;
    let shown = !document.hidden;
    const update = () => setActive(onScreen && shown);
    const io = new IntersectionObserver(([e]) => {
      onScreen = e!.isIntersecting;
      update();
    });
    io.observe(box.current!);
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
      if (isSetOver(cur.set)) {
        if (pause.current > 0) {
          pause.current--;
          return;
        }
        live.current = {
          set: playRally(newSet()),
          setNo: cur.setNo + 1,
          live: true,
        };
      } else {
        live.current = { ...cur, set: playRally(cur.set), live: true };
        if (isSetOver(live.current.set)) pause.current = PAUSE_TICKS;
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

/* ---------- Point-differential chart ---------- */

const MAXD = 8;
const PAD = 10;

/** `w`/`h` = viewBox size, `window` = rallies visible before it scrolls. */
export const DiffChart = ({
  className,
  w: W = 320,
  h: H = 120,
  window: WINDOW = 36,
}: {
  className?: string;
  w?: number;
  h?: number;
  window?: number;
}) => {
  const { set, setNo, live } = useRally();
  const STEP = W / WINDOW;
  const yOf = (d: number) =>
    H / 2 - (Math.max(-MAXD, Math.min(MAXD, d)) / MAXD) * (H / 2 - PAD);
  const diffs = useMemo(() => {
    const out = [0];
    for (const win of [...set.entries].reverse())
      out.push(out.at(-1)! + (win ? 1 : -1));
    return out;
  }, [set]);
  const n = diffs.length - 1;
  const shift = Math.max(0, n - WINDOW + 2) * STEP;
  const lead = set.home - set.away;
  const move = live ? `transform 500ms ${EASE}` : "none";

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div
        aria-hidden
        className="flex items-baseline justify-between text-sm font-semibold tabular-nums"
      >
        <span className="text-chart-1">我方 {set.home}</span>
        <span className="text-xs font-medium text-muted-foreground">
          {lead === 0
            ? "平手"
            : lead > 0
              ? `我方領先 ${lead}`
              : `對手領先 ${-lead}`}
        </span>
        <span className="text-chart-2">{set.away} 對手</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="逐球分差走勢：線往上代表我方得分，往下代表對手得分"
        className="h-auto w-full overflow-hidden"
      >
        <line
          x1={0}
          x2={W}
          y1={H / 2}
          y2={H / 2}
          strokeDasharray="4 4"
          className="stroke-muted-foreground/50"
        />
        <g key={setNo} className={live ? "proto-fade" : undefined}>
          <g style={{ transform: `translateX(${-shift}px)`, transition: move }}>
            {diffs.slice(1).map((d, i) => (
              <line
                key={i}
                x1={i * STEP + 4}
                y1={yOf(diffs[i]!)}
                x2={(i + 1) * STEP + 4}
                y2={yOf(d)}
                pathLength={1}
                strokeWidth={3}
                strokeLinecap="round"
                className={cn(
                  d > diffs[i]! ? "stroke-chart-1" : "stroke-chart-2",
                  live && i === n - 1 && "proto-draw",
                )}
              />
            ))}
            <circle
              r={5}
              cx={0}
              cy={0}
              className="fill-foreground"
              style={{
                transform: `translate(${n * STEP + 4}px, ${yOf(diffs[n]!)}px)`,
                transition: move,
              }}
            />
          </g>
        </g>
      </svg>
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

/** B0 compatibility: provider + list in one. */
export const HeroEntryList = ({ className }: { className?: string }) => (
  <RallyProvider className="w-full max-w-md">
    <EntryRows className={className} />
  </RallyProvider>
);
