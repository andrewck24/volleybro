// PROTOTYPE (throwaway): landing v2 candidate, 「球場平面圖」 world. One flat
// regulation court plan — coral in-bounds, teal free zone, white 5 cm lines —
// carries every section. Mounted on `/?variant=v2`; lives only on branch
// prototype/landing-v2. Reuses v1's rally clock + demo fixture (hero) and its
// real-component scroll demo (每球三步 + Points +1), restyled into the court.
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { RallyProvider } from "@/components/landing/prototype-v1/rally";
import {
  BTN_ON_COURT,
  BTN_ON_FREE,
  COPY,
  KIT,
  LINKS,
  POINTS_SLOT,
  STATS,
  type Feature,
} from "@/components/landing/prototype-v2/copy";
import { Court, CourtPlan } from "@/components/landing/prototype-v2/court";
import { Header } from "@/components/landing/prototype-v2/header";
import { HalfCourt } from "@/components/landing/prototype-v2/half-court";
import { LazyRecordDemo } from "@/components/landing/prototype-v2/lazy-demo";
import { RallyLayer } from "@/components/landing/prototype-v2/rally-layer";
import { ThemeToggle } from "@/components/landing/prototype-v2/theme-toggle";
import "@/components/landing/prototype-v2/v2.css";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const zone = (a0: number, a1: number, c0 = 0, c1 = 9) =>
  ({ "--a0": a0, "--a1": a1, "--c0": c0, "--c1": c1 }) as CSSProperties;

const GUTTER = "px-4 md:px-8 lg:px-[clamp(2rem,5vw,6rem)]";
const H2 = "text-4xl leading-tight font-bold text-balance md:text-6xl";

export const DevBadge = () => (
  <span className="inline-flex shrink-0 items-center border-(length:--v2-lw) border-current px-1.5 text-xs leading-5 font-bold">
    開發中
  </span>
);

const FeatureTitle = ({ f, className }: { f: Feature; className?: string }) => (
  <h3 className={cn("flex flex-wrap items-center gap-2 font-bold", className)}>
    {f.title}
    {f.dev && <DevBadge />}
  </h3>
);

const Hero = () => (
  <section
    className={cn(
      "flex justify-center pt-[calc(var(--header-h)+1.5rem)] pb-12 lg:min-h-svh lg:items-center lg:pt-[calc(var(--header-h)+2rem)] lg:pb-16",
      GUTTER,
    )}
  >
    <RallyProvider className="v2-court v2-hero-court">
      <Court />
      <p className="sr-only">
        示範動畫：一局示範比賽逐球落在球場上，每一球記成一列記錄，比分跟著更新。
      </p>
      <div
        className="v2-z flex flex-col gap-[calc(0.3*var(--m))] p-[calc(0.5*var(--m))] text-(--v2-ink)"
        style={zone(0, 6)}
      >
        <h1 className="v2-hero-title font-bold tracking-tight">
          {COPY.heroTitle[0]}
          <br />
          {COPY.heroTitle[1]}
        </h1>
        <p className="v2-hero-desc max-w-[34ch] font-medium">{COPY.heroDesc}</p>
      </div>
      <div className="v2-on-attack">
        <CTAButton
          size="lg"
          className={cn("h-12 px-6 lg:h-14 lg:px-8", BTN_ON_COURT)}
        >
          開始記錄
        </CTAButton>
        <p className="absolute top-full left-0 mt-[calc(0.3*var(--m))] text-sm font-medium whitespace-nowrap text-(--v2-ink) lg:right-[calc(50%+0.3*var(--m))] lg:left-auto">
          {COPY.heroNote}
        </p>
      </div>
      <RallyLayer />
    </RallyProvider>
  </section>
);

const Record = () => (
  <section id="record">
    <div
      className={cn(
        "mx-auto flex max-w-[92rem] flex-col gap-4 pt-24 pb-8 md:pt-32",
        GUTTER,
      )}
    >
      <h2 className={H2}>
        {COPY.recordTitle[0]}
        <br className="md:hidden" />
        {COPY.recordTitle[1]}
      </h2>
      <p className="max-w-xl text-lg text-(--v2-on-free-2)">
        {COPY.recordLead}
      </p>
    </div>
    <LazyRecordDemo />
  </section>
);

/** A court at every width (portrait below lg): heading on our half, the real
 *  Points across the net (home values on our side, away on theirs, tagged as
 *  demo data like the hero's score), the list on the opponent half. */
const Stats = () => (
  <section className={cn("mx-auto max-w-[92rem] py-24 md:py-32", GUTTER)}>
    <div className="v2-stats mx-auto max-w-[30rem] lg:max-w-[80rem]">
      <Court />
      <div className="v2-stats-head flex flex-col gap-[calc(0.3*var(--m))] p-[calc(0.35*var(--m))] text-(--v2-ink) lg:p-[calc(0.5*var(--m))]">
        <h2 className="text-[max(1.5rem,calc(0.7*var(--m)))] leading-tight font-bold text-balance lg:text-[calc(0.55*var(--m))]">
          {COPY.statsTitle[0]}
          <br />
          {COPY.statsTitle[1]}
        </h2>
        <p className="text-sm font-medium lg:text-[max(1rem,calc(0.25*var(--m)))]">
          {COPY.statsLead}
        </p>
      </div>
      <div className="v2-stats-points flex items-center border-(length:--v2-lw) border-(--v2-line) bg-card px-2 pt-4 pb-2 text-card-foreground lg:p-4">
        <span className="absolute top-0 left-1/2 -translate-1/2 border-(length:--v2-lw) border-(--v2-line) bg-(--v2-free) px-2.5 py-1 text-xs font-bold whitespace-nowrap text-(--v2-on-free-2)">
          示範數據
        </span>
        <p className="sr-only">
          團隊數據統計（示範數據）：上一段記錄的這一球送出後，攻擊得分與總得分各加一。
        </p>
        <div
          id={POINTS_SLOT}
          className="v2-points-h flex w-full items-center"
        />
      </div>
      <ul className="v2-stats-list grid grid-cols-2 content-center gap-x-[calc(0.3*var(--m))] gap-y-[calc(0.15*var(--m))] p-[calc(0.3*var(--m))] text-(--v2-ink) max-[23.75rem]:p-2 lg:grid-cols-1 lg:gap-[calc(0.3*var(--m))] lg:p-[calc(0.5*var(--m))]">
        {STATS.map((s) => (
          <li key={s.title} className="flex flex-col gap-0.5 lg:gap-1">
            <FeatureTitle
              f={s}
              className="gap-1 text-[0.9375rem] leading-snug max-[23.75rem]:text-sm lg:gap-2 lg:text-[max(1rem,calc(0.3*var(--m)))]"
            />
            <p className="text-xs leading-snug font-medium lg:text-[max(0.875rem,calc(0.22*var(--m)))]">
              {s.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

/** Six features on the six positions of our half: a true 9 × 9 half court
 *  at every width, net on top, front row (4-3-2) 3 m deep, back row (5-6-1)
 *  behind the attack line. Both rows top-aligned. */
const POS: Record<number, [row: number, col: number]> = {
  4: [0, 0],
  3: [0, 1],
  2: [0, 2],
  5: [1, 0],
  6: [1, 1],
  1: [1, 2],
};

const Kit = () => (
  <section
    className={cn(
      "mx-auto grid max-w-[92rem] grid-cols-1 gap-12 py-24 md:py-32 lg:grid-cols-[1fr_minmax(0,44rem)] lg:items-center lg:gap-16",
      GUTTER,
    )}
  >
    <div className="flex flex-col gap-5">
      <h2 className={H2}>{COPY.kitTitle}</h2>
      <p className="max-w-lg text-lg text-(--v2-on-free-2)">{COPY.kitLead}</p>
    </div>
    <HalfCourt>
      <ol className="absolute inset-0">
        {KIT.map((k) => {
          const [row, col] = POS[k.zone]!;
          return (
            <li
              key={k.title}
              className="v2-hz flex flex-col gap-[calc(0.1*var(--m))] p-[max(0.5rem,calc(0.3*var(--m)))] text-(--v2-ink)"
              style={
                row === 0
                  ? zone(0.05, 2.95, col * 3, col * 3 + 3)
                  : zone(3.0, 8.95, col * 3, col * 3 + 3)
              }
            >
              {/* numeral beside the title below lg (a 3 m front zone is
                  short on a phone), above it from lg */}
              <div className="flex items-baseline gap-1.5 lg:flex-col lg:items-start lg:gap-[calc(0.1*var(--m))]">
                <span
                  aria-label={`位置 ${k.zone}`}
                  className="text-[calc(0.6*var(--m))] leading-none font-bold tabular-nums lg:text-[calc(0.7*var(--m))]"
                >
                  {k.zone}
                </span>
                <FeatureTitle
                  f={k}
                  className="gap-1 text-[max(0.875rem,calc(0.26*var(--m)))] leading-snug"
                />
              </div>
              <p className="text-[max(0.75rem,calc(0.2*var(--m)))] leading-snug font-medium">
                {k.body}
              </p>
            </li>
          );
        })}
      </ol>
    </HalfCourt>
  </section>
);

/** The page closes behind the end line: the action stands in the service
 *  zone, the court it will serve into beside it (lg) or above it. */
const Closing = () => (
  <section className="relative overflow-hidden">
    <div
      className={cn(
        "relative mx-auto grid max-w-[92rem] grid-cols-1 pt-24 pb-10 lg:min-h-[36rem] lg:grid-cols-2 lg:items-center lg:py-32",
        GUTTER,
      )}
    >
      <div className="flex flex-col items-start gap-8">
        <h2 className={cn(H2, "md:text-7xl")}>
          {COPY.ctaTitle[0]}
          <br />
          {COPY.ctaTitle[1]}
        </h2>
        <p className="max-w-md text-lg text-(--v2-on-free-2)">{COPY.ctaLead}</p>
        <CTAButton
          size="lg"
          className={cn("hidden h-14 px-8 lg:inline-flex", BTN_ON_FREE)}
        >
          開始記錄
        </CTAButton>
      </div>
    </div>
    <div className={cn("pb-24 lg:hidden", GUTTER)}>
      <div className="[container-type:inline-size] mx-auto max-w-[30rem]">
        {/* the last 3 m of the court down to the end line, then the service
            zone with its two marks; the action is the server */}
        <div aria-hidden className="relative h-[calc(100cqw/9*3.5)]">
          <div className="absolute inset-x-0 bottom-[calc(100cqw/9*0.5)] h-[calc(100cqw/9*3)] overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 aspect-[1/2]">
              <CourtPlan portrait />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-[calc(100cqw/9*0.15)] h-[calc(100cqw/9*0.15)] border-x-(length:--v2-lw) border-(--v2-line)" />
        </div>
        <div className="flex justify-end pt-2">
          <CTAButton size="lg" className={cn("h-14 px-8", BTN_ON_FREE)}>
            開始記錄
          </CTAButton>
        </div>
      </div>
    </div>
    <div
      aria-hidden
      className="absolute top-1/2 left-1/2 hidden aspect-[2/1] h-[70%] -translate-y-1/2 lg:block"
    >
      <CourtPlan />
    </div>
  </section>
);

const Footer = () => (
  <footer
    className={cn(
      "border-t-(length:--v2-lw) border-(--v2-line) pt-12 pb-16",
      GUTTER,
    )}
  >
    <div className="mx-auto flex max-w-[92rem] flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col items-start gap-4">
        <LogoType className="h-7 w-auto" />
        <p className="text-sm text-(--v2-on-free-2)">
          © {new Date().getFullYear()} VolleyBro · Made by{" "}
          <a
            href={LINKS.author}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-(--v2-on-free) underline-offset-4 hover:underline"
          >
            Andrew Tseng
          </a>
        </p>
        <p className="flex gap-6 text-sm font-bold">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            GitHub
          </a>
          <a
            href={LINKS.feedback}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:underline"
          >
            意見回饋
          </a>
        </p>
      </div>
      <ThemeToggle />
    </div>
  </footer>
);

export const LandingV2 = () => (
  <main className="v2 min-h-full w-full select-text">
    <Header />
    <Hero />
    <Record />
    <Stats />
    <Kit />
    <Closing />
    <Footer />
  </main>
);
