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
        <p className="absolute top-full left-0 mt-[calc(0.3*var(--m))] text-sm font-medium whitespace-nowrap text-(--v2-ink) lg:left-1/2 lg:-translate-x-1/2">
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

/** lg: a landscape court — heading on our back zone, the real Points across
 *  the net (home values on our side, away on theirs), the list on theirs. */
const Stats = () => (
  <section className={cn("mx-auto max-w-[92rem] py-24 md:py-32", GUTTER)}>
    <div className="v2-court-lg mx-auto lg:max-w-[80rem]">
      <CourtPlan className="hidden lg:block" />
      <div
        className="v2-zl flex flex-col gap-5 lg:p-[calc(0.5*var(--m))] lg:text-(--v2-ink)"
        style={zone(0, 6)}
      >
        <h2 className={cn(H2, "lg:text-[calc(0.55*var(--m))]")}>
          {COPY.statsTitle[0]}
          <br />
          {COPY.statsTitle[1]}
        </h2>
        <p className="max-w-lg text-lg text-(--v2-on-free-2) lg:text-[max(1rem,calc(0.25*var(--m)))] lg:font-medium lg:text-(--v2-ink)">
          {COPY.statsLead}
        </p>
      </div>
      <div
        className="v2-zl mt-12 border-(length:--v2-lw) border-(--v2-line) bg-card p-4 text-card-foreground md:p-8 lg:mt-0 lg:flex lg:items-center lg:p-4"
        style={zone(6.45, 11.55, 0.4, 8.6)}
      >
        <p className="sr-only">
          團隊數據統計：上一段記錄的這一球送出後，攻擊得分與總得分各加一。
        </p>
        <div
          id={POINTS_SLOT}
          className="v2-points-h flex w-full items-center"
        />
      </div>
      <ul
        className="v2-zl mt-12 flex flex-col gap-6 border-(length:--v2-lw) border-(--v2-line) bg-(--v2-in) p-5 text-(--v2-ink) lg:mt-0 lg:justify-center lg:gap-[calc(0.3*var(--m))] lg:border-0 lg:bg-transparent lg:p-[calc(0.5*var(--m))]"
        style={zone(12.05, 18)}
      >
        {STATS.map((s) => (
          <li key={s.title} className="flex flex-col gap-1">
            <FeatureTitle
              f={s}
              className="text-xl lg:text-[max(1rem,calc(0.3*var(--m)))]"
            />
            <p className="font-medium lg:text-[max(0.875rem,calc(0.22*var(--m)))]">
              {s.body}
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

/** Six features on the six positions of our half (lg: a true 9 × 9 half
 *  court, net on top, front row 3 m deep); below lg a list keyed by the same
 *  position numerals. */
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
      <ol className="flex flex-col gap-8 lg:contents">
        {KIT.map((k) => {
          const [row, col] = POS[k.zone]!;
          return (
            <li
              key={k.title}
              className={cn(
                "v2-hz flex gap-4 lg:flex-col",
                row === 1 && "lg:justify-center",
                "lg:gap-[calc(0.12*var(--m))] lg:p-[calc(0.3*var(--m))] lg:text-(--v2-ink)",
              )}
              style={
                row === 0
                  ? zone(0.05, 2.95, col * 3, col * 3 + 3)
                  : zone(3.0, 8.95, col * 3, col * 3 + 3)
              }
            >
              <span
                aria-label={`位置 ${k.zone}`}
                className="grid size-12 shrink-0 place-items-center border-(length:--v2-lw) border-(--v2-line) bg-(--v2-in) text-2xl leading-none font-bold text-(--v2-ink) tabular-nums lg:size-auto lg:place-items-start lg:border-0 lg:bg-transparent lg:text-[calc(0.7*var(--m))]"
              >
                {k.zone}
              </span>
              <div className="flex flex-col gap-1">
                <FeatureTitle
                  f={k}
                  className="text-xl lg:text-[max(1rem,calc(0.26*var(--m)))]"
                />
                <p className="text-(--v2-on-free-2) lg:text-[max(0.875rem,calc(0.2*var(--m)))] lg:font-medium lg:text-(--v2-ink)">
                  {k.body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </HalfCourt>
  </section>
);

/** The page closes behind the end line: the action stands in the service
 *  zone, the court it will serve into beside it. */
const Closing = () => (
  <section className="relative overflow-hidden">
    <div aria-hidden className="relative h-80 overflow-hidden lg:hidden">
      <div className="absolute inset-x-4 bottom-10 aspect-[1/2] md:inset-x-[max(2rem,calc(50%-15rem))]">
        <CourtPlan portrait />
      </div>
    </div>
    <div
      className={cn(
        "relative mx-auto grid max-w-[92rem] grid-cols-1 pt-4 pb-24 lg:min-h-[36rem] lg:grid-cols-2 lg:items-center lg:py-32",
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
        <CTAButton size="lg" className={cn("h-14 px-8", BTN_ON_FREE)}>
          開始記錄
        </CTAButton>
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
