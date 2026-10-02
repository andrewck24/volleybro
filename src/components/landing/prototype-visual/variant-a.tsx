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
import { Noto_Serif_TC } from "next/font/google";

// PROTOTYPE variant A — 「場邊筆記」: calm editorial. Serif display, mono-like
// chapter indices, hairline rules, lots of air. Coral only as a small marker.
// Ending CTA: no decorative blobs.

const serif = Noto_Serif_TC({
  weight: ["600", "900"],
  subsets: ["latin"],
  display: "swap",
});

const PRIMARY_BTN = "bg-primary text-primary-foreground hover:bg-primary/90";

const Chapter = ({ index, label }: { index: string; label: string }) => (
  <p className="flex items-center gap-3 border-t border-foreground/15 pt-4 text-sm tracking-widest text-muted-foreground">
    <span className="font-semibold text-[#c2502f] dark:text-[#FC7A56]">
      {index}
    </span>
    <span>{label}</span>
  </p>
);

export const VariantA = ({ year }: { year: number }) => (
  <main className="min-h-full w-full bg-background text-foreground select-text">
    <header className="sticky top-0 z-50 bg-background/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <LogoType className="h-5 md:h-6" />
          <span className="rounded-full px-2 py-0.5 text-xs text-muted-foreground ring-1 ring-foreground/15">
            預覽版
          </span>
        </div>
        <CTAButton className={`h-9 ${PRIMARY_BTN}`} />
      </div>
    </header>

    {/* Hero */}
    <section className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
      <div className="flex flex-col gap-8">
        <h1
          className={`${serif.className} text-4xl leading-[1.2] font-black tracking-tight md:text-6xl`}
        >
          {COPY.heroTitle[0]}
          <br />
          {COPY.heroTitle[1]}
        </h1>
        <p className={`${serif.className} text-xl font-semibold md:text-2xl`}>
          讓每一次
          <RotatingWord className="mx-1 border-b-2 border-[#FC7A56] px-0.5" />
          都變成數據
        </p>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
          {COPY.heroLead}
        </p>
        <div className="flex flex-col items-start gap-3">
          <CTAButton size="lg" className={`h-12 px-8 text-base ${PRIMARY_BTN}`}>
            開始記錄
          </CTAButton>
          <p className="text-sm text-muted-foreground">{COPY.heroNote}</p>
        </div>
      </div>
      <div className="flex justify-center lg:justify-end">
        <HeroEntryList />
      </div>
    </section>

    {/* 記錄怎麼做 */}
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
      <Chapter index="01" label="記錄怎麼做" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_320px] lg:gap-20">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2
              className={`${serif.className} text-3xl leading-snug font-black md:text-4xl`}
            >
              {COPY.recordTitle}
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              {COPY.recordLead}
            </p>
          </div>
          <ol className="flex flex-col">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-foreground/10 py-5"
              >
                <span
                  className={`${serif.className} text-3xl leading-none font-black text-muted-foreground/60`}
                >
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <figure className="mx-auto flex w-60 flex-col gap-3 md:w-72 lg:w-full">
          <Shot
            name="game-demo-1"
            alt="記錄畫面：上方是場上陣容，下方是得失分按鈕"
            className="rounded-[2rem] ring-1 ring-foreground/10"
          />
          <figcaption className="text-center text-sm text-muted-foreground">
            記錄畫面：點背號 → 點動作 → 送出
          </figcaption>
        </figure>
      </div>
    </section>

    {/* 數據自動長出來 */}
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
      <Chapter index="02" label="數據自動長出來" />
      <div className="mt-10 grid gap-12 lg:grid-cols-[320px_1fr] lg:gap-20">
        <figure className="order-last mx-auto flex w-60 flex-col gap-3 md:w-72 lg:order-first lg:w-full">
          <Shot
            name="game-demo-2"
            alt="逐球時間軸：每一列是一球的比分與動作"
            className="rounded-[2rem] ring-1 ring-foreground/10"
          />
          <figcaption className="text-center text-sm text-muted-foreground">
            逐球時間軸
          </figcaption>
        </figure>
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2
              className={`${serif.className} text-3xl leading-snug font-black md:text-4xl`}
            >
              {COPY.statsTitle}
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              {COPY.statsLead}
            </p>
          </div>
          <dl className="flex flex-col">
            {STATS.map((s) => (
              <div
                key={s.title}
                className="flex flex-col gap-1 border-t border-foreground/10 py-5"
              >
                <dt className="text-lg font-semibold">{s.title}</dt>
                <dd className="text-muted-foreground">{s.body}</dd>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2 border-t border-foreground/10 py-5">
              <dt className="text-lg font-semibold text-muted-foreground">
                球員個人分析
              </dt>
              <DevBadge />
            </div>
          </dl>
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
            <SkillFigures />
            <table className="text-sm tabular-nums">
              <tbody>
                {SET_SCORES.map((s) => (
                  <tr key={s.set} className="border-b border-foreground/10">
                    <th className="py-1.5 pr-4 text-left font-normal text-muted-foreground">
                      第 {s.set} 局
                    </th>
                    <td className="py-1.5 font-semibold">
                      {s.home} : {s.away}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    {/* 配套 */}
    <section className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
      <Chapter index="03" label="配套" />
      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
        <div className="flex flex-col gap-4">
          <h2
            className={`${serif.className} text-3xl leading-snug font-black md:text-4xl`}
          >
            {COPY.kitTitle}
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
            {COPY.kitLead}
          </p>
        </div>
        <ul className="grid lg:grid-cols-2 lg:gap-x-10">
          {KIT.map((k) => (
            <li
              key={k.title}
              className="flex flex-col gap-1 border-t border-foreground/10 py-5"
            >
              <h3 className="font-semibold">{k.title}</h3>
              <p className="text-sm text-muted-foreground">{k.body}</p>
            </li>
          ))}
          <li className="flex flex-wrap items-center gap-2 border-t border-foreground/10 py-5">
            <h3 className="font-semibold text-muted-foreground">多裝置同步</h3>
            <DevBadge />
          </li>
        </ul>
      </div>
    </section>

    {/* 結尾 CTA — no blobs */}
    <section className="mx-auto max-w-6xl px-4 py-24 md:px-8 md:py-36">
      <div className="flex flex-col items-center gap-8 border-t border-foreground/15 pt-16 text-center">
        <h2
          className={`${serif.className} text-4xl leading-tight font-black md:text-6xl`}
        >
          {COPY.ctaTitle}
        </h2>
        <p className="max-w-md text-muted-foreground md:text-lg">
          {COPY.ctaLead}
        </p>
        <CTAButton size="lg" className={`h-12 px-8 text-base ${PRIMARY_BTN}`}>
          開始記錄
        </CTAButton>
      </div>
    </section>

    <footer className="mx-auto flex max-w-6xl flex-col gap-6 border-t border-foreground/10 px-4 pt-8 pb-28 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
      <div className="flex flex-col gap-2">
        <p>
          由{" "}
          <a
            href={LINKS.author}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Andrew Tseng
          </a>{" "}
          製作 · © {year} VolleyBro
        </p>
        <p className="flex gap-4">
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
        </p>
      </div>
      <DarkMode />
    </footer>
  </main>
);
