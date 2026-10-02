import { LogoType } from "@/components/brand";
import { CTAButton } from "@/components/landing/cta-button";
import { DarkMode } from "@/components/landing/footer/dark-mode";
import { HeroEntryList } from "@/components/landing/prototype-visual/hero-entry-list";
import {
  COPY,
  DevBadge,
  KIT,
  LINKS,
  RotatingWord,
  SET_SCORES,
  STATS,
  STEPS,
  Shot,
  SkillFigures,
} from "@/components/landing/prototype-visual/shared";
import { cn } from "@/lib/utils";
import {
  RiAddBoxLine,
  RiGroupLine,
  RiLayoutGridLine,
  RiTeamLine,
} from "react-icons/ri";

// PROTOTYPE variant C — 「戰情板」: product-forward bento. The page is built
// from the app's own surfaces (--card tiles + shadow, Saira, Figures), dense
// rhythm, small type. Ending CTA keeps blurred blobs but they never move.

const PRIMARY_BTN = "bg-primary text-primary-foreground hover:bg-primary/90";

const Tile = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("rounded-xl bg-card p-4 shadow-sm md:p-5", className)}>
    {children}
  </div>
);

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold tracking-widest text-primary uppercase dark:text-[#7ccbdc]">
    {children}
  </p>
);

const KIT_ICONS = [RiTeamLine, RiGroupLine, RiLayoutGridLine, RiAddBoxLine];

export const VariantC = ({ year }: { year: number }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="sticky top-0 z-50 px-2 pt-2 md:px-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-xl bg-card px-3 py-2 shadow-sm">
        <div className="flex items-center gap-2">
          <LogoType className="h-5" />
          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">
            預覽版
          </span>
        </div>
        <CTAButton className={`h-9 ${PRIMARY_BTN}`} />
      </div>
    </header>

    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-2 pt-3 pb-28 md:gap-4 md:px-4 md:pt-4">
      {/* Hero: one big tile, list sits in an app-like frame */}
      <Tile className="grid gap-8 p-6 md:p-10 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col gap-5">
          <Eyebrow>場邊記錄 App</Eyebrow>
          <h1 className="text-4xl leading-tight font-bold md:text-5xl">
            {COPY.heroTitle[0]}
            <br />
            {COPY.heroTitle[1]}
          </h1>
          <p className="text-lg font-semibold">
            讓每一次
            <RotatingWord className="mx-1 rounded-md bg-primary px-1.5 text-primary-foreground" />
            都變成數據
          </p>
          <p className="max-w-md text-muted-foreground">{COPY.heroLead}</p>
          <div className="flex flex-wrap items-center gap-3">
            <CTAButton size="lg" className={`h-11 px-6 ${PRIMARY_BTN}`}>
              開始記錄
            </CTAButton>
            <span className="text-sm text-muted-foreground">
              {COPY.heroNote}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-lg bg-background p-3 md:p-4">
          <div className="flex w-full max-w-md items-center justify-between px-1 text-sm">
            <span className="font-semibold">第 1 局</span>
            <span className="rounded-md bg-card px-2 py-0.5 text-xs text-muted-foreground">
              逐球記錄
            </span>
          </div>
          <HeroEntryList />
        </div>
      </Tile>

      {/* 記錄怎麼做 */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-[1fr_1fr_280px]">
        <Tile className="flex flex-col gap-2 lg:col-span-2">
          <Eyebrow>記錄怎麼做</Eyebrow>
          <h2 className="text-2xl font-bold md:text-3xl">{COPY.recordTitle}</h2>
          <p className="text-muted-foreground">{COPY.recordLead}</p>
          <ol className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-3 rounded-lg bg-background p-3"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-bold",
                    i === 3
                      ? "bg-[#FC7A56] text-neutral-950"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col">
                  <h3 className="font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Tile>
        <Tile className="flex justify-center p-3 lg:row-span-1">
          <Shot
            name="game-demo-1"
            alt="記錄畫面：上方是場上陣容，下方是得失分按鈕"
            className="w-56 rounded-lg lg:w-full"
          />
        </Tile>
      </div>

      {/* 數據自動長出來 — bento */}
      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
        <Tile className="flex flex-col gap-2 lg:col-span-3">
          <Eyebrow>數據自動長出來</Eyebrow>
          <h2 className="text-2xl font-bold md:text-3xl">{COPY.statsTitle}</h2>
          <p className="text-muted-foreground">{COPY.statsLead}</p>
        </Tile>
        <Tile className="flex flex-col gap-4">
          <h3 className="font-semibold">{STATS[0]!.title}</h3>
          <SkillFigures />
          <p className="text-sm text-muted-foreground">{STATS[0]!.body}</p>
        </Tile>
        <div className="flex flex-col gap-3 md:gap-4">
          <Tile className="flex flex-col gap-3">
            <h3 className="font-semibold">{STATS[1]!.title}</h3>
            <div className="grid grid-cols-3 gap-2">
              {SET_SCORES.map((s) => (
                <div
                  key={s.set}
                  className="flex flex-col items-center rounded-lg bg-background py-2"
                >
                  <span className="text-xs text-muted-foreground">
                    第 {s.set} 局
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    <span
                      className={
                        s.home > s.away
                          ? "text-primary dark:text-[#7ccbdc]"
                          : ""
                      }
                    >
                      {s.home}
                    </span>
                    <span className="text-muted-foreground">:</span>
                    <span className={s.away > s.home ? "text-destructive" : ""}>
                      {s.away}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{STATS[1]!.body}</p>
          </Tile>
          <Tile className="flex flex-1 flex-col justify-between gap-3 bg-card/60">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-muted-foreground">
                球員個人分析
              </h3>
              <DevBadge />
            </div>
            <div aria-hidden className="flex items-end gap-1.5 opacity-40">
              {[40, 64, 28, 52, 72, 36].map((h, i) => (
                <span
                  key={i}
                  className="w-full rounded-sm bg-muted-foreground/40"
                  style={{ height: h }}
                />
              ))}
            </div>
          </Tile>
        </div>
        <Tile className="flex flex-col gap-3">
          <h3 className="font-semibold">{STATS[2]!.title}</h3>
          <Shot
            name="game-demo-2"
            alt="逐球時間軸：每一列是一球的比分與動作"
            className="aspect-[1206/1600] rounded-lg"
          />
          <p className="text-sm text-muted-foreground">{STATS[2]!.body}</p>
        </Tile>
      </div>

      {/* 配套 — compact cards, no motion */}
      <Tile className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>配套</Eyebrow>
          <h2 className="text-2xl font-bold md:text-3xl">
            {COPY.kitTitle}：建隊、邀請、陣容，安裝到主畫面
          </h2>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {KIT.map((k, i) => {
            const Icon = KIT_ICONS[i]!;
            return (
              <li
                key={k.title}
                className="flex flex-col gap-2 rounded-lg bg-background p-3"
              >
                <Icon className="size-5 text-primary dark:text-[#7ccbdc]" />
                <h3 className="text-sm font-semibold">{k.title}</h3>
                <p className="text-xs text-muted-foreground">{k.body}</p>
              </li>
            );
          })}
          <li className="col-span-2 flex flex-col items-start gap-2 rounded-lg bg-background p-3 lg:col-span-1">
            <h3 className="text-sm font-semibold text-muted-foreground">
              多裝置同步
            </h3>
            <DevBadge />
          </li>
        </ul>
      </Tile>

      {/* 結尾 CTA — static blurred blobs (never animated) */}
      <Tile className="relative overflow-hidden px-6 py-16 text-center md:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-16 -left-10 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -right-10 -bottom-16 size-56 rounded-full bg-[#FC7A56]/25 blur-3xl" />
        </div>
        <div className="relative flex flex-col items-center gap-5">
          <h2 className="text-3xl font-bold md:text-5xl">{COPY.ctaTitle}</h2>
          <p className="max-w-md text-muted-foreground">{COPY.ctaLead}</p>
          <CTAButton size="lg" className={`h-11 px-6 ${PRIMARY_BTN}`}>
            開始記錄
          </CTAButton>
        </div>
      </Tile>

      <footer className="flex flex-col gap-4 px-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>© {year} VolleyBro</span>
          <a
            href={LINKS.author}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            Andrew Tseng
          </a>
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={LINKS.feedback}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            意見回饋
          </a>
        </div>
        <DarkMode />
      </footer>
    </div>
  </main>
);
