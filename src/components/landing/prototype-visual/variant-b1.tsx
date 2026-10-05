import { CTAButton } from "@/components/landing/cta-button";
import { ClosingCta } from "@/components/landing/prototype-visual/closing-cta";
import { AnimatedTeamsStats } from "@/components/landing/prototype-visual/game-bits";
import { ProtoHeader } from "@/components/landing/prototype-visual/headers";
import {
  EntryRows,
  RallyWord,
} from "@/components/landing/prototype-visual/rally";
import { ScrollSteps } from "@/components/landing/prototype-visual/scroll-steps";
import {
  BTN_DESTRUCTIVE,
  COPY,
  FeatureTitle,
  HEADER_OPTIONS,
  KIT,
  ProtoFooter,
  SECTION,
  STATS,
} from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

// PROTOTYPE variant B1 — 「記分板」 (picked in round 3). The hero is a
// scoreboard that is dark in both themes (`dark` token scope) so the entry
// rows (bg-card) read clearly. Header (&header=), closing-CTA arrangement
// below lg (&ctaLayout=) and diff-line shape (&curve=) are switchable.
// Every header overlays the page; --header-h is its height.

export const VariantB1 = ({
  year,
  header,
  ctaLayout,
  curve,
}: {
  year: number;
  header: string;
  ctaLayout: string;
  curve: string;
}) => (
  <main
    className="min-h-full w-full bg-background text-foreground select-text"
    style={
      {
        "--header-h": HEADER_OPTIONS.find((h) => h.key === header)!.h,
      } as CSSProperties
    }
  >
    <ProtoHeader option={header} />

    {/* Hero — scoreboard, dark in both themes. Below lg it is exactly one
        screen (proto-hero, 100svh incl. the overlaid header); the list takes
        the space left and is clipped by a fade. */}
    <div className="dark bg-background text-foreground">
      <section className="proto-hero mx-auto flex max-w-7xl flex-col px-4 pt-[calc(var(--header-h)+2rem)] pb-6 md:px-8 md:pt-[calc(var(--header-h)+4rem)] lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20 lg:pt-[calc(var(--header-h)+6rem)] lg:pb-32">
        <div className="flex flex-col gap-6 md:gap-8">
          <h1 className="text-4xl leading-[1.1] font-black tracking-tight md:text-7xl">
            {COPY.heroTitle[0]}
            <br />
            {COPY.heroTitle[1]}
          </h1>
          <p className="text-xl leading-snug font-bold text-muted-foreground md:text-3xl">
            {COPY.heroDesc[0]}
            <RallyWord className="mx-2 rounded-md bg-destructive px-2 text-black" />
            {COPY.heroDesc[1]}
          </p>
          <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
            <CTAButton
              size="lg"
              className={cn("h-14 px-10 text-lg font-black", BTN_DESTRUCTIVE)}
            >
              開始記錄
            </CTAButton>
            <p className="text-sm text-muted-foreground">{COPY.heroNote}</p>
          </div>
        </div>
        <div className="mt-8 min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)] lg:mt-0 lg:flex-none lg:overflow-visible lg:[mask-image:none]">
          <EntryRows className="mx-auto lg:mr-0" />
        </div>
      </section>
    </div>

    {/* 記錄怎麼做 — scroll-driven steps */}
    <ScrollSteps />

    {/* 數據自動長出來 */}
    <section className={SECTION}>
      <div className="flex flex-col gap-5">
        <h2 className="text-4xl leading-tight font-black md:text-6xl">
          不用另外整理，
          <br />
          記完就是統計
        </h2>
        <p className="max-w-lg text-lg text-muted-foreground">
          {COPY.statsLead}
        </p>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-24">
        <div className="flex flex-col gap-8 rounded-xl bg-card p-6 shadow-sm md:p-10">
          <AnimatedTeamsStats />
        </div>
        <ul className="flex flex-col gap-10">
          {STATS.map((s) => (
            <li key={s.title} className="flex flex-col gap-2">
              <FeatureTitle f={s} className="text-2xl font-black" />
              <p className="text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* 配套 */}
    <section className={SECTION}>
      <div className="flex flex-col gap-5">
        <h2 className="text-4xl font-black md:text-6xl">{COPY.kitTitle}</h2>
        <p className="max-w-lg text-lg text-muted-foreground">{COPY.kitLead}</p>
      </div>
      <ul className="mt-16 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-2">
        {KIT.map((k) => (
          <li
            key={k.title}
            className="flex flex-col gap-2 border-l-4 border-chart-1 pl-5"
          >
            <FeatureTitle f={k} className="text-xl font-black" />
            <p className="text-muted-foreground">{k.body}</p>
          </li>
        ))}
      </ul>
    </section>

    {/* 結尾 CTA — hand-SVG diff chart; &ctaLayout= / &curve= */}
    <ClosingCta layout={ctaLayout} curve={curve} />

    <ProtoFooter year={year} />
  </main>
);
