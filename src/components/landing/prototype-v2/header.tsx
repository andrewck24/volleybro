"use client";
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_ON_FREE } from "@/components/landing/prototype-v2/copy";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

// PROTOTYPE: v1 header option 1's mechanics (fixed overlay, height
// --header-h, scroll state from a top-sentinel IntersectionObserver) re-cut
// for the court: it stands in the teal free zone above our end line. Once the
// page scrolls, an opaque free-zone ground and a white line along its bottom
// fade in (opacity only) — the header becomes the strip behind the end line.

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
      <header className="fixed inset-x-0 top-0 z-50 h-(--header-h) text-(--v2-on-free)">
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 border-b-(length:--v2-lw) border-(--v2-line) bg-(--v2-free) transition-opacity duration-300",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="relative mx-auto flex h-full max-w-[92rem] items-center justify-between gap-3 px-4 md:px-8">
          <div className="flex items-center gap-3">
            <LogoType className="h-5 md:h-6" />
            {/* low-importance status: a quiet text label, no outline
                (secondary on-free tone on teal, 4.83:1; dark 8.86:1) */}
            <span className="text-xs leading-5 font-semibold tracking-wide text-(--v2-on-free-2)">
              Beta
            </span>
          </div>
          <CTAButton className={cn("h-10", BTN_ON_FREE)}>開始記錄</CTAButton>
        </div>
      </header>
    </>
  );
};
