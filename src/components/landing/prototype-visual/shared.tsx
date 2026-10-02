import { LogoType } from "@/components/brand";
import { Figures } from "@/components/custom/stats/figures";
import { DarkMode } from "@/components/landing/footer/dark-mode";
import { cn } from "@/lib/utils";
import Image from "next/image";

// PROTOTYPE: content + small pieces every visual-direction variant draws from.
// Layout is NOT shared — each variant owns its own page structure.

export const SKILL_WORDS = ["發球", "攻擊", "攔網"];

export const COPY = {
  heroTitle: ["場邊記錄，", "數據自動長出來"],
  heroLead: "比賽打到哪、你就點到哪。比分、輪轉、技術統計，記完當下就整理好。",
  heroNote: "用瀏覽器打開就能記，不必下載 App",
  recordTitle: "每球三步，送出不必等網路",
  recordLead: "點選、確認、送出。訊號不好也不會卡住下一球。",
  statsTitle: "不用另外整理，記完就是統計",
  statsLead: "每一球都已經分好類。比賽一結束，數字就在那裡。",
  kitTitle: "一支手機就夠",
  kitLead: "建隊、邀請、排陣容，全部在同一支手機上完成。",
  ctaTitle: "下一場比賽就開始用",
  ctaLead: "先建好球隊，開賽哨聲一響就能記。",
  /** hero = title + this one sentence, with the rally word in the middle */
  heroDesc: ["讓每一次", "都變成數據。"],
};

export const STEPS = [
  { title: "選球員", body: "點場上的背號，誰碰到球就點誰。" },
  { title: "我方動作", body: "攻擊、攔網、接發……得分 + 或失分 −。" },
  { title: "對方回應", body: "對方怎麼得分或失分，一鍵補上。" },
  { title: "預覽送出", body: "確認這一球，送出後立刻記下一球。" },
];

export type Feature = { title: string; body: string; dev?: boolean };

export const STATS: Feature[] = [
  {
    title: "技術類別統計",
    body: "發球、攻擊、攔網、接發、防守，各自累計得失分。",
  },
  { title: "每局比分", body: "每一局打到幾比幾，局末自動結算。" },
  { title: "逐球時間軸", body: "每一分怎麼來的，照順序一球一球排好。" },
  {
    title: "球員數據與進階圖表",
    body: "跨場次累計每位球員的各項技術數據，並畫成進階圖表。",
    dev: true,
  },
];

export const KIT: Feature[] = [
  { title: "建立球隊", body: "填隊名就建好。" },
  { title: "邀請隊友", body: "搜尋使用者，直接邀請加入球隊。" },
  { title: "排陣容", body: "背號、位置、自由球員一次排好。" },
  { title: "安裝到主畫面", body: "像 App 一樣從主畫面打開。" },
  {
    title: "多裝置同時記錄",
    body: "多支手機一起記同一場；成員以上的隊友可開唯讀即時頁面跟著看。",
    dev: true,
  },
];

export const LINKS = {
  author: "https://www.linkedin.com/in/li-wei-tseng-andrew/",
  github: "https://github.com/andrewck24/volleybro",
  feedback: "https://github.com/andrewck24/volleybro/discussions",
};

export const SKILL_FIGURES = [
  { label: "發球", values: { left: 6, right: 4 } },
  { label: "攻擊", values: { left: 14, right: 11 } },
  { label: "攔網", values: { left: 5, right: 7 } },
  { label: "接發", values: { left: 3, right: 6 } },
];

export const SET_SCORES = [
  { set: 1, home: 25, away: 21 },
  { set: 2, home: 23, away: 25 },
  { set: 3, home: 15, away: 12 },
];

/** Theme-aware app screenshot. */
export const Shot = ({
  name,
  alt,
  className,
  sizes = "(min-width: 1024px) 320px, 70vw",
}: {
  name: string;
  alt: string;
  className?: string;
  sizes?: string;
}) => (
  <div className={cn("relative aspect-[1206/2622] overflow-hidden", className)}>
    <Image
      src={`/landing/features/${name}-light.png`}
      alt={alt}
      fill
      sizes={sizes}
      className="object-cover object-top dark:hidden"
    />
    <Image
      src={`/landing/features/${name}-dark.png`}
      alt={alt}
      fill
      sizes={sizes}
      className="hidden object-cover object-top dark:block"
    />
  </div>
);

/** Real app stat rows (Figures + BarChart) with sample numbers. */
export const SkillFigures = ({ className }: { className?: string }) => (
  <div className={cn("flex w-full flex-col gap-3", className)}>
    {SKILL_FIGURES.map((f) => (
      <Figures key={f.label} label={f.label} values={f.values} />
    ))}
  </div>
);

/** Feature title; a planned feature only adds the 開發中 badge. */
export const FeatureTitle = ({
  f,
  className,
}: {
  f: Feature;
  className?: string;
}) => (
  <h3 className={cn("flex flex-wrap items-center gap-2", className)}>
    {f.title}
    {f.dev && <DevBadge />}
  </h3>
);

export const DevBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex shrink-0 items-center rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground",
      className,
    )}
  >
    開發中
  </span>
);

/** Footer shared by the round-2 variants: logo flush left, links, theme toggle. */
export const ProtoFooter = ({ year }: { year: number }) => (
  <footer className="bg-background px-4 pt-16 pb-28 md:px-8">
    <div className="mx-auto flex max-w-7xl flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col items-start gap-4">
        <LogoType className="h-7 w-auto self-start" />
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
        <p className="flex gap-6 text-sm font-bold">
          <a
            href={LINKS.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-chart-1"
          >
            GitHub
          </a>
          <a
            href={LINKS.feedback}
            target="_blank"
            rel="noreferrer"
            className="hover:text-chart-1"
          >
            意見回饋
          </a>
        </p>
      </div>
      <DarkMode />
    </div>
  </footer>
);

/** Section spacing reference: round-1 B's ending CTA. */
export const SECTION = "mx-auto max-w-7xl px-4 py-24 md:px-8 md:py-32";
