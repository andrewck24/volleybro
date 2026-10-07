"use client";
import {
  SET_RALLIES,
  setAt,
  type SetState,
} from "@/components/landing/demo-data";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// One rally clock for the landing. The hero's moving layer, the stats panel
// and the point-diff chart all advance on the same beat. The clock pauses
// while no consumer is on screen or the tab is hidden; reduced motion renders
// a fixed mid-set snapshot. The set is the shared demo fixture (demo-data.ts),
// replayed from `replayFrom` after a pause once it ends.

// keep equal to --rally-beat in landing.css
const INTERVAL = 2200;
const PAUSE_TICKS = 1;
const SEED_RALLIES = 5;
const STATIC_RALLIES = 22;

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
  seed = SEED_RALLIES,
  replayFrom = 1,
}: {
  children: ReactNode;
  className?: string;
  /** rallies already played at load, so the Entry card is full on the first frame */
  seed?: number;
  /** rally a replayed set restarts from */
  replayFrom?: number;
}) => {
  const [state, setState] = useState<Rally>(() => ({
    set: setAt(seed),
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
        live.current = {
          set: setAt(replayFrom),
          setNo: cur.setNo + 1,
          live: true,
        };
      } else {
        live.current = { ...cur, set: setAt(cur.set.rallies + 1), live: true };
        if (cur.set.rallies + 1 >= SET_LEN) pause.current = PAUSE_TICKS;
      }
      setState(live.current);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [reduced, active, replayFrom]);

  const value = reduced ? { set: STATIC_SET, setNo: -1, live: false } : state;

  return (
    <RallyCtx.Provider value={value}>
      <div ref={box} className={className}>
        {children}
      </div>
    </RallyCtx.Provider>
  );
};
