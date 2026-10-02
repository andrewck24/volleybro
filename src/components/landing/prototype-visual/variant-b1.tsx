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

// PROTOTYPE variant B1 — 「記分板」: the hero is a scoreboard that is dark in
// both themes (`dark` token scope), so the entry rows (bg-card) read clearly.
// Running point-diff chart + entry list + skill word share one rally clock.
// Ending CTA keeps solid coral-block shapes, fully static (no drift).

const CORAL = "bg-[#FC7A56] text-neutral-950";
const CORAL_BTN = `${CORAL} hover:bg-[#FC7A56]/90`;

export const VariantB1 = ({ year, cta }: { year: number; cta: string }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="dark sticky top-0 z-50 bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <LogoType className="h-5 md:h-6" />
          <span
            className={`rounded-sm px-1.5 py-0.5 text-xs font-black ${CORAL}`}
          >
            預覽版
          </span>
        </div>
        <CTAButton className={`h-9 font-bold ${CORAL_BTN}`} />
      </div>
    </header>

    {/* Hero — scoreboard, dark in both themes */}
    <div className="dark bg-background text-foreground">
      <section
        className={cn(
          SECTION,
          "grid grid-cols-1 gap-16 pt-16 md:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-20",
        )}
      >
        <div className="flex flex-col gap-8">
          <h1 className="text-4xl leading-[1.1] font-black tracking-tight md:text-7xl">
            {COPY.heroTitle[0]}
            <br />
            {COPY.heroTitle[1]}
          </h1>
          <p className="text-xl leading-snug font-bold text-muted-foreground md:text-3xl">
            {COPY.heroDesc[0]}
            <RallyWord className={`mx-2 rounded-md px-2 ${CORAL}`} />
            {COPY.heroDesc[1]}
          </p>
          <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center lg:gap-5">
            <CTAButton
              size="lg"
              className={`h-14 px-10 text-lg font-black ${CORAL_BTN}`}
            >
              開始記錄
            </CTAButton>
            <p className="text-sm text-muted-foreground">{COPY.heroNote}</p>
          </div>
        </div>
        <EntryRows className="mx-auto lg:mr-0" />
      </section>
    </div>

    {/* 記錄怎麼做 — scroll-driven steps */}
    <ScrollSteps tone="b1" />

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
          <MatchScoreboard />
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

    {/* 結尾 CTA — switchable via &cta= */}
    <ClosingCta option={cta} />

    <ProtoFooter year={year} />
  </main>
);
