"use client";
// PROTOTYPE (throwaway). The stats court's carousel: the centre attack zone
// is an object-layer card holding one slide at a time (native scroll-snap, so
// touch swipe is free), the opponent zone shows the active slide's
// description. Slides mount lazily (active and its neighbours). The
// description swaps with a discrete fade: out, then in, never two at once.
import { DevBadge } from "@/components/landing/prototype-v2/dev-badge";
import { SLIDES } from "@/components/landing/prototype-v2/stats-slides";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

const FADE_MS = 160;

export const StatsCarousel = () => {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const n = SLIDES.length;

  useEffect(() => {
    if (active === shown) return;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setShown(active), still ? 0 : FADE_MS);
    return () => clearTimeout(t);
  }, [active, shown]);

  const go = (i: number) => {
    const el = track.current!;
    el.scrollTo({ left: ((i + n) % n) * el.clientWidth });
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    go(active + (e.key === "ArrowRight" ? 1 : -1));
  };
  const s = SLIDES[shown]!;

  return (
    <>
      <div
        data-rally
        role="group"
        aria-roledescription="carousel"
        aria-label="統計功能示範（示意動畫）"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="v2-stats-points flex flex-col gap-2 rounded-2xl bg-card p-2 text-card-foreground shadow-lg lg:rounded-3xl lg:p-4"
      >
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            setActive(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="v2-slides flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto rounded-lg lg:h-[24.5rem] lg:flex-none"
        >
          {SLIDES.map((sl, i) => (
            <div
              key={sl.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${n}：${sl.title}`}
              className="flex w-full shrink-0 snap-start snap-always items-center"
            >
              {Math.abs(i - active) <= 1 && <sl.Component />}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            aria-label="上一個"
            onClick={() => go(active - 1)}
          >
            <RiArrowLeftSLine />
          </Button>
          <div className="flex items-center">
            {SLIDES.map((sl, i) => (
              <button
                key={sl.title}
                type="button"
                aria-label={`${i + 1} / ${n}：${sl.title}`}
                aria-current={i === active}
                onClick={() => go(i)}
                className="grid size-8 place-items-center rounded-md focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden"
              >
                <span
                  className={cn(
                    "size-2 rounded-full bg-muted-foreground/40 transition-colors",
                    i === active && "bg-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="下一個"
            onClick={() => go(active + 1)}
          >
            <RiArrowRightSLine />
          </Button>
        </div>
      </div>
      <div className="v2-stats-list flex flex-col justify-center gap-[calc(0.15*var(--m))] p-[calc(0.3*var(--m))] text-(--v2-ink) max-[23.75rem]:p-2 lg:p-[calc(0.5*var(--m))]">
        <div
          aria-live="polite"
          data-out={active !== shown || undefined}
          className="v2-desc flex flex-col gap-1 lg:gap-2"
        >
          <h3 className="flex flex-wrap items-center gap-1 text-lg leading-snug font-bold lg:gap-2 lg:text-[max(1.125rem,calc(0.3*var(--m)))]">
            {s.title}
            {s.dev && <DevBadge />}
          </h3>
          <p className="text-base leading-snug font-medium lg:text-[max(1rem,calc(0.22*var(--m)))]">
            {s.body}
          </p>
        </div>
      </div>
    </>
  );
};
