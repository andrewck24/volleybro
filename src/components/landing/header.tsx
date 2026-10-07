"use client";
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_CARD, BTN_PRIMARY, GLASS_PILL } from "@/components/landing/copy";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export const Header = () => {
  const sentinel = useRef<HTMLDivElement>(null);
  const isAtTop = useInView(sentinel, { initial: true });
  const isScrolled = !isAtTop;

  return (
    <>
      <div
        ref={sentinel}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
      />
      <header className="fixed inset-x-0 top-0 z-50 h-(--landing-header-height) px-2 pt-2 md:px-4">
        <div
          className={cn(
            "mx-auto flex h-12 max-w-[92rem] items-center justify-between gap-2 rounded-2xl p-1.5 pl-3 ring-1 transition-[background-color,box-shadow,color] duration-300 md:pl-4",
            isScrolled
              ? GLASS_PILL
              : "text-(--free-zone-foreground) ring-transparent",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <LogoType className="h-5 shrink-0 md:h-6" />
            <span
              className={cn(
                "text-xs leading-5 font-semibold tracking-wide",
                isScrolled
                  ? "text-muted-foreground"
                  : "text-(--free-zone-muted-foreground)",
              )}
            >
              Beta
            </span>
          </div>
          <CTAButton
            className={cn(
              "h-9 rounded-[10px] px-3 transition-[background-color,box-shadow,color] duration-300 md:px-3.5",
              // inner radius = the pill's 16px - its 6px padding
              isScrolled ? BTN_PRIMARY : BTN_CARD,
            )}
          >
            開始記錄
          </CTAButton>
        </div>
      </header>
    </>
  );
};
