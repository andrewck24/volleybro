import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
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
  SECTION,
  STATS,
} from "@/components/landing/prototype-visual/shared";
import { ClosingCta } from "@/components/landing/prototype-visual/closing-cta";
import { ScrollSteps } from "@/components/landing/prototype-visual/scroll-steps";
import { cn } from "@/lib/utils";

// PROTOTYPE variant B2 — 「發球線」: coral hero in both themes; a full-width
// headline sits on top, description + CTA and the entry list share the row
// below. Entry rows (bg-card) contrast with coral in light and dark. Steps
// orbit a centred phone; stats sit on a teal band. Ending CTA: inverted
// block, no decorative shapes.

const CORAL = "bg-[#FC7A56] text-neutral-950";

export const VariantB2 = ({ year, cta }: { year: number; cta: string }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="sticky top-0 z-50 bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <LogoType className="h-5 md:h-6" />
          <span className="rounded-sm bg-foreground px-1.5 py-0.5 text-xs font-black text-background">
            預覽版
          </span>
        </div>
        <CTAButton className="h-9 bg-primary font-bold text-primary-foreground hover:bg-primary/90" />
      </div>
    </header>

    {/* Hero — coral serve line */}
    <div className={CORAL}>
      <section className={cn(SECTION, "flex flex-col gap-16 pt-16 md:pt-24")}>
        <h1 className="text-4xl leading-[1.05] font-black tracking-tight md:text-7xl xl:text-8xl">
          {COPY.heroTitle[0]}
          <br />
          {COPY.heroTitle[1]}
        </h1>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-start lg:gap-24">
          <div className="flex flex-col gap-10">
            <p className="text-xl leading-snug font-bold md:text-3xl">
              {COPY.heroDesc[0]}
              <RallyWord className="mx-2 rounded-md bg-neutral-950 px-2 text-white" />
              {COPY.heroDesc[1]}
            </p>
            <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
              <CTAButton
                size="lg"
                className="h-14 bg-neutral-950 px-10 text-lg font-black text-white hover:bg-neutral-800"
              >
                開始記錄
              </CTAButton>
              <p className="text-sm font-medium">{COPY.heroNote}</p>
            </div>
          </div>
          <EntryRows className="mx-auto lg:mr-0" />
        </div>
      </section>
    </div>

    {/* 記錄怎麼做 — scroll-driven steps */}
    <ScrollSteps tone="b2" />

    {/* 數據自動長出來 — teal band */}
    <section className="bg-primary text-primary-foreground">
      <div className={SECTION}>
        <div className="flex flex-col gap-5">
          <h2 className="text-4xl leading-tight font-black md:text-6xl">
            {COPY.statsTitle}
          </h2>
          <p className="max-w-lg text-lg opacity-80">{COPY.statsLead}</p>
        </div>
        <div className="mt-16 grid grid-cols-1 gap-8 rounded-xl bg-card p-6 text-card-foreground md:p-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <MatchScoreboard />
          <AnimatedTeamsStats />
        </div>
        <ul className="mt-16 grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-2">
          {STATS.map((s) => (
            <li key={s.title} className="flex flex-col gap-2">
              <FeatureTitle f={s} className="text-2xl font-black" />
              <p className="opacity-80">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* 配套 — compact cards */}
    <section className={SECTION}>
      <div className="flex flex-col gap-5">
        <h2 className="text-4xl font-black md:text-6xl">{COPY.kitTitle}</h2>
        <p className="max-w-lg text-lg text-muted-foreground">{COPY.kitLead}</p>
      </div>
      <ul className="mt-16 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {KIT.map((k) => (
          <li
            key={k.title}
            className="flex flex-col gap-2 rounded-xl bg-card p-6 shadow-sm"
          >
            <FeatureTitle f={k} className="text-xl font-black" />
            <p className="text-muted-foreground">{k.body}</p>
          </li>
        ))}
      </ul>
    </section>

    {/* 結尾 CTA — switchable via &cta= */}
    <ClosingCta option={cta} />

    <ProtoFooter year={year} />
  </main>
);
