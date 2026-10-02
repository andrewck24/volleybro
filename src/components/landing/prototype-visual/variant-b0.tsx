import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { DarkMode } from "@/components/landing/footer/dark-mode";
import {
  EntryRows,
  RallyProvider,
  RallyWord,
} from "@/components/landing/prototype-visual/rally";
import {
  COPY,
  FeatureTitle,
  KIT,
  LINKS,
  SET_SCORES,
  STATS,
  STEPS,
  Shot,
  SkillFigures,
} from "@/components/landing/prototype-visual/shared";

// PROTOTYPE variant B — 「賽點」: bold & block-based. Full-bleed colour blocks
// (teal hero, coral ending), heavy CJK type, scoreboard numerals (now Saira)
// Condensed. Ending CTA keeps decorative shapes: solid (no blur), CSS-only
// drift, static under reduced motion.

// round 2: Barlow Condensed dropped — numerals use the app font (Saira)
const numerals = { className: "font-sans" };

const CORAL = "bg-[#FC7A56] text-neutral-950";

export const VariantB0 = ({ year }: { year: number; cta?: string }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="sticky top-0 z-50 bg-primary text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <LogoType variant="brand" className="h-5 md:h-6" />
          <span
            className={`rounded-sm px-1.5 py-0.5 text-xs font-black ${CORAL}`}
          >
            預覽版
          </span>
        </div>
        <CTAButton className="h-9 bg-white font-bold text-primary hover:bg-white/90" />
      </div>
    </header>

    {/* Hero — full-bleed teal block in both themes */}
    <RallyProvider className="bg-primary text-white">
      <section>
        <div className="mx-auto grid max-w-7xl gap-12 px-4 pt-12 pb-16 md:px-8 md:pt-20 md:pb-24 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="flex flex-col gap-8">
            <h1 className="text-4xl leading-[1.05] font-black tracking-tight md:text-7xl xl:text-8xl">
              {COPY.heroTitle[0]}
              <br />
              {COPY.heroTitle[1]}
            </h1>
            <p className="text-2xl font-black md:text-3xl">
              讓每一次
              <RallyWord className={`mx-2 rounded-md px-2 ${CORAL}`} />
              都變成數據
            </p>
            <p className="max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              {COPY.heroLead}
            </p>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-5">
              <CTAButton
                size="lg"
                className={`h-14 px-10 text-lg font-black hover:bg-[#FC7A56]/90 ${CORAL}`}
              >
                開始記錄
              </CTAButton>
              <p className="text-sm text-white/70">{COPY.heroNote}</p>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <EntryRows />
          </div>
        </div>
      </section>
    </RallyProvider>

    {/* 記錄怎麼做 — scoreboard step strip */}
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
      <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:items-end">
        <div className="flex flex-col gap-4">
          <h2 className="text-4xl leading-tight font-black md:text-6xl">
            每球三步
            <br />
            <span className="text-primary dark:text-[#FC7A56]">
              送出不必等網路
            </span>
          </h2>
          <p className="max-w-lg text-lg text-muted-foreground">
            {COPY.recordLead}
          </p>
        </div>
        <Shot
          name="game-demo-1"
          alt="記錄畫面：上方是場上陣容，下方是得失分按鈕"
          className="mx-auto hidden w-full rounded-[1.75rem] ring-4 ring-foreground lg:block"
        />
      </div>
      <ol className="mt-12 grid grid-cols-1 gap-3 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className={
              i === 3
                ? `flex flex-col gap-3 rounded-lg p-5 ${CORAL}`
                : "flex flex-col gap-3 rounded-lg bg-foreground p-5 text-background"
            }
          >
            <span
              className={`${numerals.className} text-7xl leading-none font-extrabold`}
            >
              {i === 3 ? "✓" : i + 1}
            </span>
            <h3 className="text-xl font-black">{s.title}</h3>
            <p className="text-sm opacity-80">{s.body}</p>
          </li>
        ))}
      </ol>
      <Shot
        name="game-demo-1"
        alt="記錄畫面：上方是場上陣容，下方是得失分按鈕"
        className="mx-auto mt-10 w-60 rounded-[1.75rem] ring-4 ring-foreground lg:hidden"
      />
    </section>

    {/* 數據自動長出來 — giant scoreboard */}
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="text-4xl leading-tight font-black md:text-6xl">
          不用另外整理，
          <br />
          記完就是統計
        </h2>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-2">
              {SET_SCORES.map((s) => (
                <div
                  key={s.set}
                  className="flex flex-col items-center rounded-lg bg-background/10 py-4"
                >
                  <span className="text-xs tracking-widest opacity-70">
                    第 {s.set} 局
                  </span>
                  <span
                    className={`${numerals.className} text-4xl font-extrabold tabular-nums md:text-6xl`}
                  >
                    {s.home}
                    <span className="opacity-40">:</span>
                    {s.away}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg bg-card p-5 text-card-foreground">
              <SkillFigures />
            </div>
          </div>
          <ul className="flex flex-col gap-6">
            {STATS.map((s) => (
              <li key={s.title} className="flex flex-col gap-1">
                <FeatureTitle f={s} className="text-2xl font-black" />
                <p className="opacity-75">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    {/* 配套 — compact chip row */}
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-24">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-black md:text-5xl">{COPY.kitTitle}</h2>
        <p className="text-lg text-muted-foreground">{COPY.kitLead}</p>
      </div>
      <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {KIT.map((k) => (
          <li
            key={k.title}
            className="flex flex-col gap-1 rounded-lg border-l-4 border-primary bg-card p-4"
          >
            <FeatureTitle f={k} className="font-black" />
            <p className="text-sm text-muted-foreground">{k.body}</p>
          </li>
        ))}
      </ul>
    </section>

    {/* 結尾 CTA — coral block with drifting solid shapes */}
    <section className={`relative overflow-hidden ${CORAL}`}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="proto-drift absolute -top-10 -left-10 size-40 rounded-full bg-primary/25" />
        <span
          className="proto-drift absolute top-1/3 -right-12 size-56 rounded-full bg-white/30"
          style={{ animationDelay: "-2s" }}
        />
        <span
          className="proto-drift absolute -bottom-8 left-1/3 size-24 rounded-md bg-neutral-950/10"
          style={{ animationDelay: "-4s" }}
        />
      </div>
      <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-8 px-4 py-24 md:px-8 md:py-32">
        <h2 className="text-4xl leading-[1.05] font-black md:text-7xl">
          下一場比賽
          <br />
          就開始用
        </h2>
        <p className="max-w-md text-lg font-medium">{COPY.ctaLead}</p>
        <CTAButton
          size="lg"
          className="h-14 bg-neutral-950 px-10 text-lg font-black text-white hover:bg-neutral-800"
        >
          開始記錄
        </CTAButton>
      </div>
    </section>

    <footer className="bg-background px-4 pt-10 pb-28 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3">
          <LogoType className="h-6" />
          <p className="text-sm text-muted-foreground">
            © {year} VolleyBro · Made by{" "}
            <a
              href={LINKS.author}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-foreground hover:underline"
            >
              Andrew Tseng
            </a>
          </p>
          <p className="flex gap-4 text-sm font-bold">
            <a
              href={LINKS.github}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              GitHub
            </a>
            <a
              href={LINKS.feedback}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              意見回饋
            </a>
          </p>
        </div>
        <DarkMode />
      </div>
    </footer>
  </main>
);
