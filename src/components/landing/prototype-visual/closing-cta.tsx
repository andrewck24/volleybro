"use client";
import { CTAButton } from "@/components/landing/cta-button";
import { DiffChart } from "@/components/landing/prototype-visual/cta-diff";
import {
  BTN_DESTRUCTIVE,
  COPY,
} from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";

// PROTOTYPE: B1 closing CTA with the hand-SVG split-area diff chart.
// lg+: text left, chart right (like the hero) with a left-edge fade mask.
// Below lg, `&ctaLayout=`:
//   1 — stacked: copy, then a full-bleed chart band under the button
//   2 — backdrop: chart fills the lower part of the section behind the copy,
//       fading out upward so text never sits on the line
//   3 — inline band: chart between the description and the button

const FADE_LEFT =
  "[mask-image:linear-gradient(to_right,transparent,black_30%)]";

export const ClosingCta = ({
  layout,
  curve,
}: {
  layout: string;
  curve: string;
}) => {
  const button = (
    <CTAButton
      size="lg"
      className={cn("h-14 px-10 text-lg font-black", BTN_DESTRUCTIVE)}
    >
      開始記錄
    </CTAButton>
  );

  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      {layout === "2" && (
        <DiffChart
          curve={curve}
          className="absolute inset-x-0 bottom-0 h-3/5 [mask-image:linear-gradient(to_top,black_45%,transparent)] lg:hidden"
        />
      )}
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-24 md:px-8 md:py-32 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div
          className={cn(
            "flex flex-col items-start gap-8",
            layout === "2" && "max-lg:pb-48",
          )}
        >
          <h2 className="text-4xl leading-[1.05] font-black md:text-7xl">
            下一場比賽
            <br />
            就開始用
          </h2>
          <p className="max-w-md text-lg">{COPY.ctaLead}</p>
          {layout === "3" && (
            <DiffChart
              curve={curve}
              className="-mx-4 h-40 w-[calc(100%+2rem)] md:-mx-8 md:w-[calc(100%+4rem)] lg:hidden"
            />
          )}
          {button}
        </div>
        {layout === "1" && (
          <DiffChart
            curve={curve}
            className="-mx-4 h-56 md:-mx-8 md:h-72 lg:hidden"
          />
        )}
        <DiffChart
          curve={curve}
          className={cn("hidden h-80 lg:block", FADE_LEFT)}
        />
      </div>
    </section>
  );
};
