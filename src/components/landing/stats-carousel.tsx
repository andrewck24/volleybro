"use client";
// The opponent zone's description fades out, then the next fades in, never both.
import { DevBadge } from "@/components/landing/dev-badge";
import { SLIDES } from "@/components/landing/stats-slides";
import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";

const FADE_MS = 160;

const STEP_BUTTONS = [
  { label: "上一個", step: -1, Icon: RiArrowLeftSLine, edge: "-left-5" },
  { label: "下一個", step: 1, Icon: RiArrowRightSLine, edge: "-right-5" },
];

export const StatsCarousel = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shownIndex, setShownIndex] = useState(0);
  const slideCount = SLIDES.length;
  const isReducedMotion = useReducedMotion();

  useEffect(() => {
    if (activeIndex === shownIndex) return;
    const timer = setTimeout(
      () => setShownIndex(activeIndex),
      isReducedMotion ? 0 : FADE_MS,
    );
    return () => clearTimeout(timer);
  }, [activeIndex, shownIndex, isReducedMotion]);

  const goTo = (index: number) => {
    const track = trackRef.current!;
    track.scrollTo({
      left: ((index + slideCount) % slideCount) * track.clientWidth,
    });
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    goTo(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
  };
  const shownSlide = SLIDES[shownIndex]!;

  return (
    <>
      <div
        data-rally
        role="group"
        aria-roledescription="carousel"
        aria-label="統計功能示範（示意動畫）"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="landing-stats-points flex flex-col gap-2 rounded-2xl bg-card p-2 text-card-foreground shadow-lg lg:rounded-3xl lg:p-4"
      >
        <div
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget;
            setActiveIndex(Math.round(track.scrollLeft / track.clientWidth));
          }}
          className="landing-stats-slides flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto rounded-lg lg:h-[24.5rem] lg:flex-none"
        >
          {SLIDES.map((slide, index) => (
            <div
              key={slide.title}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slideCount}：${slide.title}`}
              className="flex w-full shrink-0 snap-start snap-always items-center"
            >
              {Math.abs(index - activeIndex) <= 1 && <slide.Component />}
            </div>
          ))}
        </div>
        {/* straddling the card's edges: 8px inside (its padding), the rest in the margin */}
        {STEP_BUTTONS.map(({ label, step, Icon, edge }) => (
          <Button
            key={label}
            variant="secondary"
            size="icon"
            aria-label={label}
            className={cn("absolute top-1/2 size-7 -translate-y-1/2", edge)}
            onClick={() => goTo(activeIndex + step)}
          >
            <Icon />
          </Button>
        ))}
        <div className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 items-center">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`${index + 1} / ${slideCount}：${slide.title}`}
              aria-current={index === activeIndex}
              onClick={() => goTo(index)}
              className="grid size-8 place-items-center rounded-md focus-visible:ring-2 focus-visible:ring-court-foreground focus-visible:outline-hidden"
            >
              <span
                className={cn(
                  "size-2.5 rounded-full bg-court-foreground/35 transition-colors",
                  index === activeIndex && "bg-court-foreground",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="landing-stats-list flex flex-col justify-start p-[calc(0.3*var(--court-meter))] pt-[calc(2.5rem+0.1*var(--court-meter))] text-court-foreground max-[23.75rem]:p-2 max-[23.75rem]:pt-10 lg:justify-center lg:p-[calc(0.5*var(--court-meter))]">
        <div
          aria-live="polite"
          data-is-fading-out={activeIndex !== shownIndex || undefined}
          className="landing-stats-description flex flex-col gap-1.5 lg:gap-3"
        >
          <h3 className="flex flex-wrap items-center gap-1.5 text-2xl leading-snug font-bold lg:gap-2 lg:text-[max(1.5rem,calc(0.4*var(--court-meter)))]">
            {shownSlide.title}
            {shownSlide.dev && <DevBadge />}
          </h3>
          <p className="text-lg leading-snug font-medium lg:text-[max(1.125rem,calc(0.27*var(--court-meter)))]">
            {shownSlide.body}
          </p>
        </div>
      </div>
    </>
  );
};
