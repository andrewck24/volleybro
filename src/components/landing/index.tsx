// The landing: one flat regulation court plan — coral in-bounds, teal free
// zone, white 5 cm lines — carries every section. One RallyProvider wraps
// hero → stats: the hero court and the live stats panel are its only
// consumers; the walkthrough between them is a server-passed child and never
// re-renders on a beat.
import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { RallyProvider } from "@/components/landing/rally";
import { BTN_PRIMARY, COPY, KIT, LINKS } from "@/components/landing/copy";
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

/** One icon per roster row, in KIT order. */
const KIT_ICONS: IconType[] = [
  RiGroupLine, // 建立球隊
  RiUserAddLine, // 邀請隊友
  RiShieldKeyholeLine, // 角色權限
  BsGrid3X2Gap, // 每場陣容
  RiAddBoxLine, // 安裝到主畫面
  RiLineChartLine, // 球員數據與進階圖表
  RiDeviceLine, // 多裝置同時記錄
];

const zone = (a0: number, a1: number, c0 = 0, c1 = 9) =>
  ({
    "--zone-start-from-end-line": a0,
    "--zone-end-from-end-line": a1,
    "--zone-start-from-side-line": c0,
    "--zone-end-from-side-line": c1,
  }) as CSSProperties;

const GUTTER = "px-4 md:px-8 lg:px-[clamp(2rem,5vw,6rem)]";
const H2 = "text-4xl leading-tight font-bold text-balance md:text-6xl";

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
        {/* lg: action + helper share the title's left edge */}
        <div className="mt-[calc(0.15*var(--court-meter))] hidden flex-col items-start gap-3 lg:flex">
          <CTAButton size="lg" className={cn("h-14 px-8", BTN_PRIMARY)}>
            開始記錄
          </CTAButton>
          <p className="text-base font-medium">{COPY.heroNote}</p>
        </div>
      </div>
      {/* below lg: the action sits on our attack line */}
      <div className="landing-on-attack lg:hidden">
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

/** The intro rides in the walkthrough's sticky stage (server-rendered here,
 *  placed by StepsSection), so stepping in never skips it. */
const Record = () => (
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

/** A court at every width (portrait below lg): heading on our half, the stats
 *  carousel across the net (live Points rows, the Entry list, the point-diff
 *  chart, all on the hero's rally clock), its description on the opponent half. */
const Stats = () => (
  <section
    className={cn(
      "landing-snap-point mx-auto max-w-[92rem] py-24 md:py-32",
      GUTTER,
    )}
  >
    <div className="landing-stats mx-auto max-w-(--court-max-width) lg:max-w-[80rem]">
      <Court />
      <div className="landing-stats-head flex flex-col gap-[calc(0.3*var(--court-meter))] p-[calc(0.35*var(--court-meter))] text-court-foreground max-[23.75rem]:p-2 lg:p-[calc(0.5*var(--court-meter))]">
        <h2 className="text-[max(1.5rem,calc(0.7*var(--court-meter)))] leading-tight font-bold text-balance lg:text-[calc(0.55*var(--court-meter))]">
          {COPY.statsTitle[0]}
          <br />
          {COPY.statsTitle[1]}
        </h2>
        <p className="text-base font-medium lg:text-[max(1rem,calc(0.25*var(--court-meter)))]">
          {COPY.statsLead}
        </p>
      </div>
      <StatsCarousel />
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
      <p className="max-w-lg text-lg text-(--free-zone-muted-foreground)">
        {COPY.kitLead}
      </p>
    </div>
    <ol className="flex flex-col gap-6 md:gap-8">
      {KIT.map((k, i) => {
        const Icon = KIT_ICONS[i]!;
        return (
          <li key={k.title} className="flex items-start gap-4 lg:gap-6">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-md lg:size-16 dark:text-chart-1"
            >
              <Icon className="size-6 lg:size-8" />
            </span>
            {/* the title's cap height starts level with the icon tile's top
                edge: text-box trims the line box to Saira's cap / alphabetic, and the
                CJK ideographs rise 0.17em above that cap line (measured), so a
                0.17em top margin lands their ink on the tile edge */}
            <div className="flex flex-col gap-2">
              <h3 className="mt-[0.17em] text-lg font-bold [text-box:trim-both_cap_alphabetic] md:text-2xl">
                {k.title}
                {k.dev && (
                  <>
                    {" "}
                    <DevBadge />
                  </>
                )}
              </h3>
              <p className="text-(--free-zone-muted-foreground) md:text-lg">
                {k.body}
              </p>
            </div>
          </li>
        );
      })}
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
    <div className="landing-square w-full max-w-(--court-max-width) lg:max-w-none">
      <CourtPlan span={9} portrait className="lg:hidden" />
      <CourtPlan className="hidden lg:block" />
      <div
        className="landing-zone flex flex-col p-[calc(0.5*var(--court-meter))] text-court-foreground"
        style={zone(0, 6)}
      >
        <div className="flex flex-col gap-[calc(0.3*var(--court-meter))] lg:my-auto">
          <h2 className="text-[max(1.625rem,calc(0.75*var(--court-meter)))] leading-tight font-bold text-balance lg:text-[calc(0.62*var(--court-meter))]">
            {COPY.ctaTitle[0]}
            <br />
            {COPY.ctaTitle[1]}
          </h2>
          <p className="text-base font-medium lg:text-[max(1rem,calc(0.24*var(--court-meter)))]">
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
      <div className="landing-on-attack lg:hidden">
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
  <main className="landing min-h-full w-full select-text">
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
