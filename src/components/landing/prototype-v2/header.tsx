"use client";
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { BTN_PRIMARY } from "@/components/landing/prototype-v2/copy";
import { cn } from "@/lib/utils";

// PROTOTYPE: the header is floating chrome, so it is an object in the app's
// own language: the app navigation bar's glass treatment
// (src/components/layout/nav/index.tsx: bg-background/94, shadow-lg,
// ring-1 ring-foreground/10, backdrop-blur-sm, rounded) on a pill that
// floats in the teal free zone above our end line. Height stays --header-h
// so the hero and the sticky walkthrough stage keep their offset. Beta is a
// quiet text label (muted-foreground), never framed.
export const Header = () => (
  <header className="fixed inset-x-0 top-0 z-50 h-(--header-h) px-2 pt-2 md:px-4">
    <div className="mx-auto flex h-12 max-w-[92rem] items-center justify-between gap-3 rounded-2xl bg-background/94 pr-2 pl-4 text-foreground shadow-lg ring-1 ring-foreground/10 backdrop-blur-sm">
      <div className="flex items-center gap-2.5">
        <LogoType className="h-5 md:h-6" />
        <span className="text-xs leading-5 font-semibold tracking-wide text-muted-foreground">
          Beta
        </span>
      </div>
      <CTAButton className={cn("h-9", BTN_PRIMARY)}>開始記錄</CTAButton>
    </div>
  </header>
);
