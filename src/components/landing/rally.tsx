"use client";
import { INTERVAL, SET_RALLIES } from "@/components/landing/demo-data";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const PAUSE_TICKS = 1;
const SEED_RALLIES = 5;
const STATIC_RALLIES = 22;
const SET_LENGTH = SET_RALLIES.length;

type Rally = {
  /** rallies played so far in the current set */
  rallies: number;
  /** which replay of the set this is */
  setNo: number;
  /** true once the clock has ticked, which gates enter/exit motion */
  isLive: boolean;
  /** rallies already filed into the list: the newest is still in the air while live */
  filedRallies: number;
};

const toRally = (rallies: number, setNo: number, isLive: boolean): Rally => ({
  rallies,
  setNo,
  isLive,
  filedRallies: isLive ? rallies - 1 : rallies,
});

const STATIC_RALLY = toRally(STATIC_RALLIES, -1, false);

const RallyContext = createContext<Rally | null>(null);
export const useRally = () => useContext(RallyContext)!;

/**
 * One clock for everything animated by the demo set. It runs only while a
 * `[data-rally]` consumer is on screen and the tab is visible; reduced motion
 * shows a fixed mid-set snapshot instead.
 */
export const RallyProvider = ({
  children,
  seed = SEED_RALLIES,
  replayFrom = 1,
}: {
  children: ReactNode;
  /** rallies already played at load, so the Entry card is full on the first frame */
  seed?: number;
  /** rally a replayed set restarts from */
  replayFrom?: number;
}) => {
  const [state, setState] = useState(() => toRally(seed, 0, false));
  const [isActive, setIsActive] = useState(true);
  const isReducedMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const pauseTicks = useRef(0);
  const clock = useRef(state);

  useEffect(() => {
    const targets = [...box.current!.querySelectorAll("[data-rally]")];
    const visible = new Set<Element>();
    let isTabVisible = !document.hidden;
    const update = () => setIsActive(visible.size > 0 && isTabVisible);
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      update();
    });
    targets.forEach((target) => observer.observe(target));
    const onVisibilityChange = () => {
      isTabVisible = !document.hidden;
      update();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (isReducedMotion || !isActive) return;
    const id = setInterval(() => {
      const current = clock.current;
      if (current.rallies >= SET_LENGTH) {
        if (pauseTicks.current > 0) {
          pauseTicks.current--;
          return;
        }
        clock.current = toRally(replayFrom, current.setNo + 1, true);
      } else {
        clock.current = toRally(current.rallies + 1, current.setNo, true);
        if (current.rallies + 1 >= SET_LENGTH) pauseTicks.current = PAUSE_TICKS;
      }
      setState(clock.current);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [isReducedMotion, isActive, replayFrom]);

  return (
    <RallyContext.Provider value={isReducedMotion ? STATIC_RALLY : state}>
      <div ref={box}>{children}</div>
    </RallyContext.Provider>
  );
};
