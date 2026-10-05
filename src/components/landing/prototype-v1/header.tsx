"use client";
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_DESTRUCTIVE } from "@/components/landing/prototype-v1/shared";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// PROTOTYPE: B1 header option 1 (the chosen one). Overlays the page
// (position: fixed) so the dark hero runs under it; its height is --header-h
// (set on <main>), which the hero pads by and the sticky demo stage sits under.

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
export const Header = () => {
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
