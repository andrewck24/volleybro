// One RallyProvider wraps hero → stats; the walkthrough between them is a
// server-passed child, so it never re-renders on a beat.
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { INTERVAL, SEED_COUNT } from "@/components/landing/demo-data";
import { RallyProvider } from "@/components/landing/rally";
import {
  BTN_PRIMARY,
  COPY,
  LINKS,
  SUPPORTING_FEATURES,
} from "@/components/landing/copy";
import { Court, CourtPlan } from "@/components/landing/court";
import { DevBadge } from "@/components/landing/dev-badge";
import { Header } from "@/components/landing/header";
import { LazyRecordDemo } from "@/components/landing/lazy-demo";
import { StatsCarousel } from "@/components/landing/stats-carousel";
import { RallyLayer } from "@/components/landing/rally-layer";
import { ThemeSwitch } from "@/components/landing/theme-switch";
import "@/components/landing/landing.css";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { BsGrid3X2Gap } from "react-icons/bs";
import {
  RiAddBoxLine,
  RiDeviceLine,
  RiGroupLine,
  RiLineChartLine,
  RiShieldKeyholeLine,
  RiUserAddLine,
} from "react-icons/ri";

const FEATURE_ICONS: IconType[] = [
  RiGroupLine,
  RiUserAddLine,
  RiShieldKeyholeLine,
  BsGrid3X2Gap,
  RiAddBoxLine,
  RiLineChartLine,
  RiDeviceLine,
];

const zone = (
  startFromEndLine: number,
  endFromEndLine: number,
  startFromSideLine = 0,
  endFromSideLine = 9,
) =>
  ({
    "--zone-start-from-end-line": startFromEndLine,
    "--zone-end-from-end-line": endFromEndLine,
    "--zone-start-from-side-line": startFromSideLine,
    "--zone-end-from-side-line": endFromSideLine,
  }) as CSSProperties;

const GUTTER = "px-4 md:px-8 lg:px-[clamp(2rem,5vw,6rem)]";
const SECTION_HEADING =
  "text-4xl leading-tight font-bold text-balance md:text-6xl";

const Hero = () => (
  <section
    className={cn(
      "landing-snap-point flex justify-center overflow-x-clip pt-[calc(var(--landing-header-height)+1.5rem)] pb-12 lg:min-h-svh lg:items-center lg:pt-[calc(var(--landing-header-height)+2rem)] lg:pb-16",
      GUTTER,
    )}
  >
    <div className="landing-court landing-hero-court">
      <Court />
      <p className="sr-only">
        示範動畫：一局示範比賽逐球落在球場上，每一球記成一列記錄，比分跟著更新。
      </p>
      <div
        className="landing-zone flex flex-col gap-[calc(0.3*var(--court-meter))] p-[calc(0.5*var(--court-meter))] text-court-foreground"
        style={zone(0, 6)}
      >
        <h1 className="landing-hero-title font-bold tracking-tight">
          {COPY.heroTitle[0][0]}
          <br className="hidden lg:inline" />
          {COPY.heroTitle[0][1]}
          <br />
          {COPY.heroTitle[1][0]}
          <br className="hidden lg:inline" />
          {COPY.heroTitle[1][1]}
        </h1>
        <p className="landing-hero-desc max-w-[30ch] font-medium lg:max-w-none">
          {COPY.heroDesc}
        </p>
        <div className="mt-[calc(0.15*var(--court-meter))] hidden flex-col items-start gap-3 lg:flex">
          <CTAButton size="lg" className={cn("h-14 px-8", BTN_PRIMARY)}>
            開始記錄
          </CTAButton>
          <p className="text-base font-medium">{COPY.heroNote}</p>
        </div>
      </div>
      <div className="landing-on-attack-line lg:hidden">
        <CTAButton size="lg" className={cn("h-12 px-6", BTN_PRIMARY)}>
          開始記錄
        </CTAButton>
        <p className="absolute top-full left-0 mt-[calc(0.3*var(--court-meter))] text-base font-medium whitespace-nowrap text-court-foreground">
          {COPY.heroNote}
        </p>
      </div>
      <RallyLayer />
    </div>
  </section>
);

/** The intro is server-rendered here but placed inside the walkthrough's sticky stage. */
const WalkthroughSection = () => (
  <section id="record" className="pt-16 md:pt-24">
    <LazyRecordDemo
      intro={
        <div className="flex flex-col gap-2 lg:gap-4">
          <h2 className="text-2xl leading-tight font-bold text-balance md:text-4xl xl:text-5xl">
            {COPY.recordTitle[0]}
            <br className="hidden lg:inline" />
            {COPY.recordTitle[1]}
          </h2>
          <p className="text-base text-(--free-zone-muted-foreground) lg:text-lg">
            {COPY.recordLead}
          </p>
        </div>
      }
    />
  </section>
);

const Stats = () => (
  <section
    className={cn(
      "landing-snap-point mx-auto max-w-[92rem] py-24 md:py-32",
      GUTTER,
    )}
  >
    <div className="landing-court landing-stats mx-auto max-w-(--court-max-width) lg:max-w-[80rem]">
      <Court />
      <div className="landing-stats-head flex flex-col gap-[calc(0.3*var(--court-meter))] p-[calc(0.35*var(--court-meter))] text-court-foreground max-[23.75rem]:p-2 lg:p-[calc(0.5*var(--court-meter))]">
        <h2 className="landing-stats-heading leading-tight font-bold text-balance">
          {COPY.statsTitle[0]}
          <br />
          {COPY.statsTitle[1]}
        </h2>
        <p className="landing-stats-lead font-medium">{COPY.statsLead}</p>
      </div>
      <StatsCarousel />
    </div>
  </section>
);

const SupportingFeatures = () => (
  <section
    className={cn(
      "mx-auto grid max-w-[92rem] grid-cols-1 gap-12 py-24 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16",
      GUTTER,
    )}
  >
    <div className="flex flex-col gap-5">
      <h2 className={SECTION_HEADING}>{COPY.supportTitle}</h2>
      <p className="max-w-lg text-lg text-(--free-zone-muted-foreground)">
        {COPY.supportLead}
      </p>
    </div>
    <ol className="flex flex-col gap-6 md:gap-8">
      {SUPPORTING_FEATURES.map((feature, index) => {
        const Icon = FEATURE_ICONS[index]!;
        return (
          <li key={feature.title} className="flex items-start gap-4 lg:gap-6">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-md lg:size-16 dark:text-chart-1"
            >
              <Icon className="size-6 lg:size-8" />
            </span>
            {/* CJK ideographs rise 0.17em above the cap line text-box trims to
                (measured); the margin lands their ink on the tile's top edge */}
            <div className="flex flex-col gap-2">
              <h3 className="mt-[0.17em] text-lg font-bold [text-box:trim-both_cap_alphabetic] md:text-2xl">
                {feature.title}
                {feature.dev && (
                  <>
                    {" "}
                    <DevBadge />
                  </>
                )}
              </h3>
              <p className="text-(--free-zone-muted-foreground) md:text-lg">
                {feature.body}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  </section>
);

const Closing = () => (
  <section
    className={cn(
      // lg: the attack-line extensions reach 1.95 m (10.7vw at 5.5vw a metre)
      // past the side lines, so the padding is 13vw to end them in here
      "flex justify-center overflow-x-clip py-24 md:py-32 lg:justify-start lg:py-[13vw]",
      GUTTER,
    )}
  >
    <div className="landing-square w-full max-w-(--court-max-width) lg:max-w-none">
      <CourtPlan span={9} portrait className="lg:hidden" />
      <CourtPlan className="hidden lg:block" />
      <div
        className="landing-zone flex flex-col p-[calc(0.5*var(--court-meter))] text-court-foreground"
        style={zone(0, 6)}
      >
        <div className="flex flex-col gap-[calc(0.3*var(--court-meter))] lg:my-auto">
          <h2 className="landing-closing-heading leading-tight font-bold text-balance">
            {COPY.ctaTitle[0]}
            <br />
            {COPY.ctaTitle[1]}
          </h2>
          <p className="landing-closing-lead font-medium">{COPY.ctaLead}</p>
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
      <div className="landing-on-attack-line lg:hidden">
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
      "border-t-(length:--court-line-width) border-(--court-line) pt-12 pb-16",
      GUTTER,
    )}
  >
    <div className="mx-auto flex max-w-[92rem] flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col items-start gap-4">
        <LogoType className="h-7 w-auto" />
        <p className="text-base text-(--free-zone-muted-foreground)">
          © {new Date().getFullYear()} VolleyBro · Made by{" "}
          <a
            href={LINKS.author}
            target="_blank"
            rel="noreferrer"
            className="font-bold text-(--free-zone-foreground) underline-offset-4 hover:underline"
          >
            Andrew Tseng
          </a>
        </p>
        <p className="flex gap-6 text-base font-bold">
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
      <ThemeSwitch />
    </div>
  </footer>
);

export const Landing = () => (
  <main
    className="landing min-h-full w-full select-text"
    style={{ "--rally-beat": `${INTERVAL}ms` } as CSSProperties}
  >
    <Header />
    <RallyProvider seed={SEED_COUNT} replayFrom={SEED_COUNT}>
      <Hero />
      <WalkthroughSection />
      <Stats />
    </RallyProvider>
    <SupportingFeatures />
    <Closing />
    <Footer />
  </main>
);
