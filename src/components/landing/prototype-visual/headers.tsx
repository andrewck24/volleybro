"use client";
import { LogoSymbol, LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_DESTRUCTIVE } from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// PROTOTYPE: B1 header options (`&header=1..3`). All three overlay the page
// (position: fixed) so the dark hero runs under them; each exports its height
// as --header-h, which the hero and the sticky steps stage pad by.

const Beta = () => (
  <span className="rounded-sm bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
    Beta
  </span>
);

/**
 * 1 — the current landing header (src/components/landing/header.tsx) re-cut
 * for the design system: transparent at the top, and once the page scrolls a
 * --popover glass layer + shadow-md fades in (non-overlay float = popover step
 * + shadow; no border/ring, per docs/design-system.md). Scroll state comes
 * from an IntersectionObserver on a top sentinel instead of a scroll listener,
 * and only the glass layer's opacity transitions.
 */
const GlassHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) =>
      setScrolled(!e!.isIntersecting),
    );
    io.observe(sentinel.current!);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinel}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
      />
      <header className="dark fixed inset-x-0 top-0 z-50 px-2 pt-2 text-foreground md:px-4">
        <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 md:px-4">
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 rounded-2xl bg-popover/80 shadow-md backdrop-blur-md transition-opacity duration-300",
              scrolled ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="relative flex items-center gap-3">
            <LogoType className="h-5 md:h-6" />
            <Beta />
          </div>
          <CTAButton className={cn("relative h-9", BTN_DESTRUCTIVE)} />
        </div>
      </header>
    </>
  );
};

/** 2 — round-2 B1 bar: solid, flat, dark in both themes. */
const SolidHeader = () => (
  <header className="dark fixed inset-x-0 top-0 z-50 bg-background text-foreground">
    <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:px-8">
      <div className="flex items-center gap-3">
        <LogoType className="h-5 md:h-6" />
        <Beta />
      </div>
      <CTAButton className={cn("h-9", BTN_DESTRUCTIVE)} />
    </div>
  </header>
);

/** 3 — centred floating pill on --popover + shadow-md, follows the theme. */
const PillHeader = () => (
  <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-3">
    <div className="pointer-events-auto flex h-12 items-center gap-3 rounded-full bg-popover pr-1.5 pl-4 text-popover-foreground shadow-md">
      <LogoSymbol className="h-6" />
      <Beta />
      <CTAButton className={cn("h-9 rounded-full", BTN_DESTRUCTIVE)} />
    </div>
  </header>
);

export const ProtoHeader = ({ option }: { option: string }) =>
  option === "2" ? (
    <SolidHeader />
  ) : option === "3" ? (
    <PillHeader />
  ) : (
    <GlassHeader />
  );
