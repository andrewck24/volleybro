"use client";
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_PRIMARY } from "@/components/landing/prototype-v2/copy";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// PROTOTYPE: floating chrome (LAYERS L2) in the app's own language. At rest
// it is transparent over the teal free zone; once the page scrolls (top
// sentinel IntersectionObserver, as v1) the app navigation bar's glass fades
// in (src/components/layout/nav/index.tsx: bg-background/94, shadow-lg,
// ring-1 ring-foreground/10, backdrop-blur-sm). Concentric radius: the pill
// is rounded-2xl (16) with p-1.5 (6), so the CTA inside is rounded-[10px].
// The theme switch uses the same pill in the footer (theme-switch.tsx).
// Height stays --header-h for the hero and the walkthrough offset.

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
      <header className="fixed inset-x-0 top-0 z-50 h-(--header-h) px-2 pt-2 md:px-4">
        <div
          className={cn(
            "mx-auto flex h-12 max-w-[92rem] items-center justify-between gap-2 rounded-2xl p-1.5 pl-3 ring-1 transition-[background-color,box-shadow,color] duration-300 md:pl-4",
            scrolled
              ? "bg-background/94 text-foreground shadow-lg ring-foreground/10 backdrop-blur-sm"
              : "text-(--v2-on-free) ring-transparent",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <LogoType className="h-5 shrink-0 md:h-6" />
            <span
              className={cn(
                "text-xs leading-5 font-semibold tracking-wide",
                scrolled ? "text-muted-foreground" : "text-(--v2-on-free-2)",
              )}
            >
              Beta
            </span>
          </div>
          <CTAButton
            className={cn("h-9 rounded-[10px] px-3 md:px-3.5", BTN_PRIMARY)}
          >
            開始記錄
          </CTAButton>
        </div>
      </header>
    </>
  );
};
