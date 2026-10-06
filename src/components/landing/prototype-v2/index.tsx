// PROTOTYPE (throwaway): landing v2 candidate, 「球場平面圖」 world. One flat
// regulation court plan — coral in-bounds, teal free zone, white 5 cm lines —
// carries every section. Mounted on `/?variant=v2`; lives only on branch
// prototype/landing-v2. Reuses v1's rally clock + demo fixture and its
// real-component scroll demo (每球三步), restyled into the court. One
// RallyProvider wraps hero → stats: the hero court and the live stats panel
// are its only consumers; the walkthrough between them is a server-passed
// child and never re-renders on a beat.
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { RallyProvider } from "@/components/landing/prototype-v1/rally";
import {
  BTN_PRIMARY,
  COPY,
  KIT,
  LINKS,
  STATS,
  type Feature,
} from "@/components/landing/prototype-v2/copy";
import { Court, CourtPlan } from "@/components/landing/prototype-v2/court";
import { Header } from "@/components/landing/prototype-v2/header";
import { LazyRecordDemo } from "@/components/landing/prototype-v2/lazy-demo";
import { LazyLiveStats } from "@/components/landing/prototype-v2/lazy-stats";
import { RallyLayer } from "@/components/landing/prototype-v2/rally-layer";
import { DarkMode } from "@/components/landing/footer/dark-mode";
import { Badge } from "@/components/ui/badge";
import "@/components/landing/prototype-v2/v2.css";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const zone = (a0: number, a1: number, c0 = 0, c1 = 9) =>
  ({ "--a0": a0, "--a1": a1, "--c0": c0, "--c1": c1 }) as CSSProperties;

const GUTTER = "px-4 md:px-8 lg:px-[clamp(2rem,5vw,6rem)]";
const H2 = "text-4xl leading-tight font-bold text-balance md:text-6xl";

/** Planned features: the app's Badge (secondary), same as shipped otherwise. */
export const DevBadge = () => (
  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
    開發中
  </Badge>
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
      "v2-snap-point flex justify-center overflow-x-clip pt-[calc(var(--header-h)+1.5rem)] pb-12 lg:min-h-svh lg:items-center lg:pt-[calc(var(--header-h)+2rem)] lg:pb-16",
      GUTTER,
    )}
  >
    <div className="v2-court v2-hero-court">
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
        <p className="v2-hero-desc max-w-[30ch] font-medium">{COPY.heroDesc}</p>
        {/* lg: action + helper share the title's left edge */}
        <div className="mt-[calc(0.3*var(--m))] hidden flex-col items-start gap-3 lg:flex">
          <CTAButton size="lg" className={cn("h-14 px-8", BTN_PRIMARY)}>
            開始記錄
          </CTAButton>
          <p className="text-sm font-medium">{COPY.heroNote}</p>
        </div>
      </div>
      {/* below lg: the action sits on our attack line */}
      <div className="v2-on-attack lg:hidden">
        <CTAButton size="lg" className={cn("h-12 px-6", BTN_PRIMARY)}>
          開始記錄
        </CTAButton>
        <p className="absolute top-full left-0 mt-[calc(0.3*var(--m))] text-sm font-medium whitespace-nowrap text-(--v2-ink)">
          {COPY.heroNote}
        </p>
      </div>
      <RallyLayer />
    </div>
  </section>
);

/** The intro rides in the walkthrough's sticky stage (server-rendered here,
 *  placed by StepsSection), so stepping in never skips it. */
const Record = () => (
  <section id="record" className="pt-16 md:pt-24">
    <LazyRecordDemo
      intro={
        <div className="flex flex-col gap-2 lg:gap-4">
          <h2 className="text-2xl leading-tight font-bold text-balance md:text-4xl lg:text-5xl">
            {COPY.recordTitle[0]}
            <br className="hidden lg:inline" />
            {COPY.recordTitle[1]}
          </h2>
          <p className="text-sm text-(--v2-on-free-2) md:text-base lg:text-lg">
            {COPY.recordLead}
          </p>
        </div>
      }
    />
  </section>
);

/** A court at every width (portrait below lg): heading on our half, the
 *  app's Points rows across the net (home values on our side, away on
 *  theirs, following the hero's rally clock), the list on the opponent half. */
const Stats = () => (
  <section
    className={cn("v2-snap-point mx-auto max-w-[92rem] py-24 md:py-32", GUTTER)}
  >
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
      <div
        data-rally
        className="v2-stats-points flex items-center rounded-2xl bg-card p-2 text-card-foreground shadow-lg lg:rounded-3xl lg:p-4"
      >
        <p className="sr-only">
          團隊數據統計（示意動畫）：跟著上方的示範比賽逐球更新。
        </p>
        <div className="v2-points-h flex w-full items-center">
          <LazyLiveStats />
        </div>
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

/** Supporting features in the walkthrough steps' layout: a number figure
 *  (the same object as the step chips, numbered like a jersey) beside the
 *  title and description, one column, on the teal free zone. */
const Kit = () => (
  <section
    className={cn(
      "mx-auto grid max-w-[92rem] grid-cols-1 gap-12 py-24 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16",
      GUTTER,
    )}
  >
    <div className="flex flex-col gap-5">
      <h2 className={H2}>{COPY.kitTitle}</h2>
      <p className="max-w-lg text-lg text-(--v2-on-free-2)">{COPY.kitLead}</p>
    </div>
    <ol className="flex flex-col gap-6 md:gap-8">
      {KIT.map((k, i) => (
        <li key={k.title} className="flex items-start gap-4 lg:gap-6">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-card text-xl leading-none font-bold text-primary tabular-nums shadow-md lg:size-16 lg:text-2xl dark:text-chart-1"
          >
            {i + 1}
          </span>
          <div className="flex flex-col gap-1 pt-0.5 lg:pt-1.5">
            <FeatureTitle f={k} className="text-lg md:text-2xl" />
            <p className="text-(--v2-on-free-2) md:text-lg">{k.body}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
);

/** The page closes on the court in the hero's grammar. Below lg our 9 × 9
 *  half (net at the bottom), heading in the back zone, the action on our
 *  attack line. From lg the whole court runs from the gutter out past the
 *  viewport's right edge (full bleed; 1 m = 5.5vw, so the 18 m court always
 *  reaches it): heading and lead centred in our back zone, the action at its
 *  foot on the copy's left edge. */
const Closing = () => (
  <section
    className={cn(
      // lg: the attack-line extensions reach 1.95 m (10.7vw at 5.5vw a metre)
      // past the side lines, so the padding is 13vw to end them in here
      "flex justify-center overflow-x-clip py-24 md:py-32 lg:justify-start lg:py-[13vw]",
      GUTTER,
    )}
  >
    <div className="v2-square w-full max-w-[30rem] lg:max-w-none">
      <CourtPlan span={9} portrait className="lg:hidden" />
      <CourtPlan className="hidden lg:block" />
      <div
        className="v2-z flex flex-col p-[calc(0.5*var(--m))] text-(--v2-ink)"
        style={zone(0, 6)}
      >
        <div className="flex flex-col gap-[calc(0.3*var(--m))] lg:my-auto">
          <h2 className="text-[max(1.625rem,calc(0.75*var(--m)))] leading-tight font-bold text-balance lg:text-[calc(0.62*var(--m))]">
            {COPY.ctaTitle[0]}
            <br />
            {COPY.ctaTitle[1]}
          </h2>
          <p className="text-sm font-medium lg:text-[max(1rem,calc(0.24*var(--m)))]">
            {COPY.ctaLead}
          </p>
        </div>
        <CTAButton
          size="lg"
          className={cn(
            "hidden h-14 self-start px-8 lg:inline-flex",
            BTN_PRIMARY,
          )}
        >
          開始記錄
        </CTAButton>
      </div>
      <div className="v2-on-attack lg:hidden">
        <CTAButton size="lg" className={cn("h-12 px-6", BTN_PRIMARY)}>
          開始記錄
        </CTAButton>
      </div>
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
      {/* the theme switch lives in the header from 360px; below that it
          stays here */}
      <div className="min-[22.5rem]:hidden">
        <DarkMode />
      </div>
    </div>
  </footer>
);

export const LandingV2 = () => (
  <main className="v2 min-h-full w-full select-text">
    <Header />
    {/* seed 12: the Entry card is full on the first frame; a replayed set
        restarts there too */}
    <RallyProvider seed={12} replayFrom={12}>
      <Hero />
      <Record />
      <Stats />
    </RallyProvider>
    <Kit />
    <Closing />
    <Footer />
  </main>
);
