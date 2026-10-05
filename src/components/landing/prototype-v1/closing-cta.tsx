import { CTAButton } from "@/components/landing/cta-button";
import { DiffChart } from "@/components/landing/prototype-v1/cta-diff";
import {
  BTN_DESTRUCTIVE,
  COPY,
} from "@/components/landing/prototype-v1/shared";
import { cn } from "@/lib/utils";

// PROTOTYPE: closing CTA with the hand-SVG split-area diff chart.
// lg+: text left, chart right (like the hero) with a left-edge fade mask.
// <lg: the chart fills the whole section behind heading, copy and button.
// Wide left fade, capped at 50% opacity: the worst case (copy in foreground
// over a full-strength line pixel at the cap) still measures 7.9:1 light /
// 5.8:1 dark, so AA holds anywhere the line passes. The button has its own
// opaque ground. Copy must stay `foreground` — muted-foreground would drop
// under 4.5:1 over the line.

const FADE_LEFT =
  "[mask-image:linear-gradient(to_right,transparent,black_30%)]";

export const ClosingCta = () => (
  <section className="relative overflow-hidden bg-background text-foreground">
    <DiffChart className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent_25%,rgb(0_0_0/0.5))] lg:hidden" />
    <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      <div className="flex flex-col items-start gap-8">
        <h2 className="text-4xl leading-[1.05] font-black md:text-7xl">
          下一場比賽
          <br />
          就開始用
        </h2>
        <p className="max-w-md text-lg">{COPY.ctaLead}</p>
        <CTAButton
          size="lg"
          className={cn("h-14 px-10 text-lg font-black", BTN_DESTRUCTIVE)}
        >
          開始記錄
        </CTAButton>
      </div>
      <DiffChart className={cn("hidden h-80 lg:block", FADE_LEFT)} />
    </div>
  </section>
);
