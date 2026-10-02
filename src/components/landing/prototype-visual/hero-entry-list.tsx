"use client";
import { Figure } from "@/components/custom/stats/figures";
import {
  isSetOver,
  newSet,
  playRally,
  type SetState,
} from "@/components/landing/prototype-visual/set-model";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

// PROTOTYPE: hero Entry list, variant C choreography from
// prototype/hero-entry-motion at a 2.2s cadence. CSS transitions only
// (transform/opacity); moving rows carry no shadow or blur.

const INTERVAL = 2200;
const PAUSE_TICKS = 1;
const SLIDE_FROM = 1;
const STAGGER = 35;

const ROW_H = 40;
const PITCH = ROW_H + 8;
const VISIBLE = 6;
const RENDERED = VISIBLE + 2;
const SEED_RALLIES = 5;

// pill widths cycle per entry id so neighbouring rows never line up
const PILL_W = [40, 24, 52, 32, 46, 28, 56, 36];

type Item = { id: number; win: boolean };

const seedSet = () => {
  let s = newSet();
  // deterministic seed so server and client render the same first frame
  for (let i = 0; i < SEED_RALLIES; i++) s = playRally(s, () => (i % 3) / 3);
  return s;
};

const toItems = (s: SetState): Item[] =>
  s.entries.slice(0, RENDERED).map((win, i) => ({ id: s.rallies - i, win }));

const STATIC_ITEMS: Item[] = [true, false, true, true, false, true].map(
  (win, i) => ({ id: 100 - i, win }),
);

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
    <span className="size-5 shrink-0 rounded-full bg-muted-foreground/25" />
    <span
      className="h-2.5 min-w-2 shrink rounded-full bg-muted-foreground/25"
      style={{ width: PILL_W[(id * (home ? 3 : 5)) % PILL_W.length] }}
    />
    {home === win ? (
      <FiPlus className="ml-auto size-5 shrink-0 text-primary" />
    ) : (
      <FiMinus className="ml-auto size-5 shrink-0 text-destructive" />
    )}
  </div>
);

const Row = ({
  item,
  index,
  animate,
  rowClassName,
}: {
  item: Item;
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
  const y = (index - (mounted ? 0 : SLIDE_FROM)) * PITCH;

  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        height: ROW_H,
        transform: `translateY(${y}px)`,
        opacity,
        transition: animate
          ? `transform 500ms cubic-bezier(0.2,0.8,0.2,1) ${index * STAGGER}ms, opacity 450ms ease-out`
          : "none",
      }}
    >
      <div
        className={cn(
          "flex size-full flex-row items-center gap-1 rounded-lg bg-card p-1",
          rowClassName,
        )}
      >
        <Figure size="sm" variant={item.win ? "primary" : "secondary"} />
        <Figure size="sm" variant={item.win ? "secondary" : "destructive"} />
        <Bar home win={item.win} id={item.id} />
        <Bar home={false} win={item.win} id={item.id} />
      </div>
    </div>
  );
};

export const HeroEntryList = ({
  className,
  rowClassName,
}: {
  className?: string;
  rowClassName?: string;
}) => {
  const [set, setSet] = useState<SetState>(seedSet);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const pause = useRef(0);
  const live = useRef(set);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // clock runs only while the list is on-screen and the tab is visible
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
      const s = live.current;
      if (isSetOver(s)) {
        if (pause.current > 0) {
          pause.current--;
          return;
        }
        live.current = playRally(newSet());
      } else {
        live.current = playRally(s);
        if (isSetOver(live.current)) pause.current = PAUSE_TICKS;
      }
      setSet(live.current);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [reduced, active]);

  const items = reduced ? STATIC_ITEMS : toItems(set);

  return (
    <div
      ref={box}
      aria-hidden
      className={cn(
        "relative w-full max-w-md [mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
        className,
      )}
      style={{ height: VISIBLE * PITCH }}
    >
      {items.map((it, i) => (
        <Row
          key={it.id}
          item={it}
          index={i}
          animate={!reduced && set.rallies > 0}
          rowClassName={rowClassName}
        />
      ))}
    </div>
  );
};
