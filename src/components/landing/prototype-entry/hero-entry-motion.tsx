"use client";
import { Figure } from "@/components/custom/stats/figures";
import { PrototypeSwitcher } from "@/components/landing/prototype-entry/prototype-switcher";
import {
  isSetOver,
  newSet,
  playRally,
  type SetState,
} from "@/components/landing/prototype-entry/set-model";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";

// PROTOTYPE: choreography of the landing Hero Entry list.
// Question: how should new entries arrive? Replaces HeroImage when
// `/?variant=A|B|C` is present; otherwise children (HeroImage) render.

type Config = {
  key: string;
  name: string;
  interval: number; // ms between rallies
  pauseTicks: number; // extra ticks held at set end before reset
  fadeDelay: number; // ms before the new row starts fading in
  slideFrom: number; // rows above its slot the new row starts at
  stagger: number; // ms per index on transform of existing rows
  emphasis: boolean;
};

const CONFIGS: Config[] = [
  {
    key: "A",
    name: "Zeabur 式",
    interval: 3500,
    pauseTicks: 0,
    fadeDelay: 250,
    slideFrom: 0,
    stagger: 0,
    emphasis: false,
  },
  {
    key: "B",
    name: "焦點強調",
    interval: 3500,
    pauseTicks: 0,
    fadeDelay: 250,
    slideFrom: 0,
    stagger: 0,
    emphasis: true,
  },
  {
    key: "C",
    name: "快節奏堆疊",
    interval: 1800,
    pauseTicks: 1,
    fadeDelay: 0,
    slideFrom: 1,
    stagger: 35,
    emphasis: false,
  },
];

const ROW_H = 40;
const PITCH = ROW_H + 8;
const VISIBLE = 6;
const RENDERED = VISIBLE + 2;
const SEED_RALLIES = 5;

type Item = { id: number; win: boolean };

const seedSet = () => {
  let s = newSet();
  for (let i = 0; i < SEED_RALLIES; i++) s = playRally(s);
  return s;
};

const toItems = (s: SetState): Item[] =>
  s.entries.slice(0, RENDERED).map((win, i) => ({ id: s.rallies - i, win }));

// fixed list for prefers-reduced-motion
const STATIC_ITEMS: Item[] = [true, false, true, true, false, true].map(
  (win, i) => ({ id: 100 - i, win }),
);

const Bar = ({ home, win }: { home: boolean; win: boolean }) => (
  <div
    className={cn(
      "flex h-6 flex-1 items-center gap-1 border-l-2 px-1",
      home ? "border-primary" : "border-destructive",
    )}
  >
    <span className="size-5 shrink-0 rounded-full bg-muted-foreground/25" />
    <span className="h-2.5 w-10 rounded-full bg-muted-foreground/25" />
    {home === win ? (
      <FiPlus className="ml-auto size-6 text-primary" />
    ) : (
      <FiMinus className="ml-auto size-6 text-destructive" />
    )}
  </div>
);

const Row = ({
  item,
  index,
  cfg,
  animate,
}: {
  item: Item;
  index: number;
  cfg: Config;
  animate: boolean;
}) => {
  const [mounted, setMounted] = useState(!animate);
  useEffect(() => {
    if (mounted) return;
    const r = requestAnimationFrame(() =>
      requestAnimationFrame(() => setMounted(true)),
    );
    return () => cancelAnimationFrame(r);
  }, [mounted]);

  const lead = cfg.emphasis && index === 0;
  const opacity = !mounted
    ? 0
    : index >= RENDERED - 1
      ? 0
      : cfg.emphasis && index > 0
        ? 0.55
        : 1;
  const y = (index - (mounted ? 0 : cfg.slideFrom)) * PITCH;
  const delay = index === 0 ? cfg.fadeDelay : 0;

  return (
    <div
      className="absolute inset-x-0 top-0"
      style={{
        height: ROW_H,
        transform: `translateY(${y}px)`,
        opacity,
        transition: animate
          ? `transform 500ms cubic-bezier(0.2,0.8,0.2,1) ${index * cfg.stagger}ms, opacity 450ms ease-out ${delay}ms`
          : "none",
      }}
    >
      <div
        className={cn(
          "flex size-full flex-row items-center gap-1 rounded-md bg-card p-1 transition-[transform,box-shadow] duration-500",
          lead ? "scale-[1.04] shadow-md" : "shadow-sm",
        )}
      >
        <Figure size="sm" variant={item.win ? "primary" : "secondary"} />
        <Figure size="sm" variant={item.win ? "secondary" : "destructive"} />
        <Bar home win={item.win} />
        <Bar home={false} win={item.win} />
      </div>
    </div>
  );
};

const EntryList = ({ cfg }: { cfg: Config }) => {
  const [set, setSet] = useState<SetState>(seedSet);
  const [reduced, setReduced] = useState(false);
  const [active, setActive] = useState(true);
  const box = useRef<HTMLDivElement>(null);
  const readout = useRef<HTMLDivElement>(null);
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
        if (isSetOver(live.current)) pause.current = cfg.pauseTicks;
      }
      setSet(live.current);
    }, cfg.interval);
    return () => clearInterval(id);
  }, [cfg, reduced, active]);

  useEffect(() => {
    if (readout.current)
      readout.current.textContent = `${set.home}:${set.away}  rally ${set.rallies}${isSetOver(set) ? "  SET END" : ""}`;
  }, [set]);

  const items = reduced ? STATIC_ITEMS : toItems(set);

  return (
    <div className="relative w-full max-w-md">
      <div
        ref={readout}
        className="absolute -top-6 left-0 font-mono text-xs text-muted-foreground"
      />
      <div
        ref={box}
        className="relative w-full [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"
        style={{ height: VISIBLE * PITCH }}
      >
        {items.map((it, i) => (
          <Row
            key={it.id}
            item={it}
            index={i}
            cfg={cfg}
            animate={!reduced && set.rallies > 0}
          />
        ))}
      </div>
    </div>
  );
};

const Inner = ({ children }: { children: ReactNode }) => {
  const variant = useSearchParams()?.get("variant");
  const cfg = CONFIGS.find((c) => c.key === variant);
  if (!cfg) return <>{children}</>;

  return (
    <div className="relative z-10 flex w-full items-center justify-center py-8 md:w-1/2 md:flex-1">
      <EntryList key={cfg.key} cfg={cfg} />
      <PrototypeSwitcher variants={CONFIGS} />
    </div>
  );
};

export const HeroEntryMotion = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={children}>
    <Inner>{children}</Inner>
  </Suspense>
);
