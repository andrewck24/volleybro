import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { ClosingCta } from "@/components/landing/prototype-visual/closing-cta";
import { ScrollSteps } from "@/components/landing/prototype-visual/scroll-steps";
import {
  AnimatedTeamsStats,
  MatchScoreboard,
} from "@/components/landing/prototype-visual/game-bits";
import {
  EntryRows,
  RallyWord,
} from "@/components/landing/prototype-visual/rally";
import {
  COPY,
  FeatureTitle,
  KIT,
  ProtoFooter,
  STATS,
} from "@/components/landing/prototype-visual/shared";

// PROTOTYPE variant B3 — 「半場」: every section is a court split in two
// full-bleed halves (teal | neutral, then alternating). The hero's neutral half
// holds the entry list on bg-muted (light) / bg-background (dark) for contrast,
// and a full-width point-diff band runs under both halves on the same rally
// clock. Ending CTA: teal | coral halves, no decorative shapes.

const CORAL = "bg-[#FC7A56] text-neutral-950";
const HALF = "px-4 py-24 md:px-12 md:py-32 lg:px-16";

export const VariantB3 = ({ year, cta }: { year: number; cta: string }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="sticky top-0 z-50 bg-background">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          <LogoType className="h-5 md:h-6" />
          <span
            className={`rounded-sm px-1.5 py-0.5 text-xs font-black ${CORAL}`}
          >
            預覽版
          </span>
        </div>
        <CTAButton className="h-9 bg-primary font-bold text-primary-foreground hover:bg-primary/90" />
      </div>
    </header>

    {/* Hero — teal half | list half */}
    <>
      <section className="grid grid-cols-1 lg:grid-cols-2">
        <div
          className={`${HALF} flex flex-col justify-center gap-8 bg-primary text-primary-foreground`}
        >
          <h1 className="text-4xl leading-[1.1] font-black tracking-tight md:text-6xl xl:text-7xl">
            {COPY.heroTitle[0]}
            <br />
            {COPY.heroTitle[1]}
          </h1>
          <p className="text-xl leading-snug font-bold md:text-3xl">
            {COPY.heroDesc[0]}
            <RallyWord className={`mx-2 rounded-md px-2 ${CORAL}`} />
            {COPY.heroDesc[1]}
          </p>
          <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
            <CTAButton
              size="lg"
              className={`h-14 px-10 text-lg font-black hover:bg-[#FC7A56]/90 ${CORAL}`}
            >
              開始記錄
            </CTAButton>
            <p className="text-sm font-medium">{COPY.heroNote}</p>
          </div>
        </div>
        <div
          className={`${HALF} flex items-center justify-center bg-muted dark:bg-background`}
        >
          <EntryRows />
        </div>
      </section>
    </>

    {/* 記錄怎麼做 — scroll-driven steps */}
    <ScrollSteps tone="b3" />

    {/* 數據自動長出來 — copy half | live-stats half */}
    <section className="grid grid-cols-1 lg:grid-cols-2">
      <div className={`${HALF} flex flex-col gap-14`}>
        <div className="flex flex-col gap-5">
          <h2 className="text-4xl leading-tight font-black md:text-5xl">
            {COPY.statsTitle}
          </h2>
          <p className="text-lg text-muted-foreground">{COPY.statsLead}</p>
        </div>
        <ul className="flex flex-col gap-8">
          {STATS.map((s) => (
            <li key={s.title} className="flex flex-col gap-2">
              <FeatureTitle f={s} className="text-xl font-black" />
              <p className="text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className={`${HALF} flex flex-col justify-center gap-10 bg-card`}>
        <MatchScoreboard />
        <AnimatedTeamsStats />
      </div>
    </section>

    {/* 配套 — two-column list with rules */}
    <section className="px-4 py-24 md:px-12 md:py-32 lg:px-16">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="flex flex-col gap-5">
          <h2 className="text-4xl font-black md:text-5xl">{COPY.kitTitle}</h2>
          <p className="text-lg text-muted-foreground">{COPY.kitLead}</p>
        </div>
        <ul className="flex flex-col">
          {KIT.map((k) => (
            <li
              key={k.title}
              className="flex flex-col gap-2 border-t border-foreground/15 py-6"
            >
              <FeatureTitle f={k} className="text-xl font-black" />
              <p className="text-muted-foreground">{k.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* 結尾 CTA — switchable via &cta= */}
    <ClosingCta option={cta} />

    <ProtoFooter year={year} />
  </main>
);
