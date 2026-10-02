"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { DiffAreaSvg } from "@/components/landing/prototype-visual/cta-diff";
import {
  EntryRows,
  useRally,
} from "@/components/landing/prototype-visual/rally";
import { COPY } from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// PROTOTYPE: closing-CTA options, switchable with `&cta=1..5` independently of
// the page variant. Every animated option rides the page's one rally clock
// (pauses when off-screen / tab hidden, static snapshot under reduced motion).
// Contrast: foreground on background, white on primary (5.81:1), dark text on
// coral — never near-white on coral.

const DiffAreaRecharts = dynamic(
  () => import("@/components/landing/prototype-visual/cta-diff-recharts"),
  { ssr: false },
);

const PRIMARY_BTN =
  "h-14 bg-primary px-10 text-lg font-black text-primary-foreground hover:bg-primary/90";

const Copy = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-col items-start gap-8", className)}>
    <h2 className="text-4xl leading-[1.05] font-black md:text-7xl">
      下一場比賽
      <br />
      就開始用
    </h2>
    <p className="max-w-md text-lg">{COPY.ctaLead}</p>
    <CTAButton size="lg" className={PRIMARY_BTN}>
      開始記錄
    </CTAButton>
  </div>
);

/** Score digit that rolls through its clipped tile when it changes. */
const Roll = ({ value }: { value: number }) => {
  const { live } = useRally();
  return (
    <span className="relative inline-grid overflow-hidden tabular-nums">
      {live && value > 0 && (
        <span key={`o${value}`} aria-hidden className="proto-word-out">
          {value - 1}
        </span>
      )}
      <span
        key={`i${value}`}
        className={cn("[grid-area:1/1]", live && "proto-word-in")}
      >
        {value}
      </span>
    </span>
  );
};

const ScoreFlip = () => {
  const { set } = useRally();
  return (
    <div
      data-rally
      aria-hidden
      className="flex items-center justify-center gap-4 text-7xl font-black md:gap-6 md:text-8xl"
    >
      <span className="flex h-36 w-32 items-center justify-center rounded-2xl bg-primary text-primary-foreground md:h-44 md:w-44">
        <Roll value={set.home} />
      </span>
      <span className="text-muted-foreground">:</span>
      <span className="flex h-36 w-32 items-center justify-center rounded-2xl bg-[#FC7A56] text-neutral-950 md:h-44 md:w-44">
        <Roll value={set.away} />
      </span>
    </div>
  );
};

export const ClosingCta = ({ option }: { option: string }) => {
  if (option === "5")
    return (
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32">
          <Copy />
        </div>
      </section>
    );

  if (option === "3" || option === "4")
    return (
      <section className="bg-background text-foreground">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-2">
          <Copy />
          {option === "3" ? <ScoreFlip /> : <EntryRows className="mx-auto" />}
        </div>
      </section>
    );

  // 1 / 2: split-area diff chart full-bleed along the bottom of the section
  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-24 pb-64 md:px-8 md:pt-32 md:pb-80">
        <Copy />
      </div>
      <div
        data-rally
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-56 md:h-72"
      >
        {option === "1" ? <DiffAreaRecharts /> : <DiffAreaSvg />}
      </div>
    </section>
  );
};
