import { LogoType } from "@/components/brand";
import { DarkMode } from "@/components/landing/footer/dark-mode";
import { cn } from "@/lib/utils";

// PROTOTYPE: v1 landing copy + small shared pieces.

export const SKILL_WORDS = ["發球", "攻擊", "攔網"];

export const COPY = {
  heroTitle: ["場邊記錄，", "數據自動長出來"],
  heroNote: "用瀏覽器打開就能記，不必下載 App",
  recordTitle: "每球三步，送出不必等網路",
  recordLead: "點選、確認、送出。訊號不好也不會卡住下一球。",
  statsLead: "每一球都已經分好類。比賽一結束，數字就在那裡。",
  kitTitle: "一支手機就夠",
  kitLead: "建隊、邀請、排陣容，全部在同一支手機上完成。",
  ctaLead: "先建好球隊，開賽哨聲一響就能記。",
  /** hero = title + this one sentence, with the rally word in the middle */
  heroDesc: ["讓每一次", "都變成數據。"],
};

// DECIDE: step copy — B1 wording kept; record-demo had 「點場上的球員，決定這一球
// 是誰的。」「從動作面板挑一個：發球、攻擊、攔網……」「面板換成對方的結果，再點一次。」
// 「確認這一球的摘要，送出即記錄完成。」, which tracks the real panel more literally.
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

/** Footer: logo flush left, author, links, theme toggle. */
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

/** All CTA buttons: destructive ground + black text (8.06:1). */
export const BTN_DESTRUCTIVE =
  "bg-destructive font-bold text-black hover:bg-destructive/90";

/** id of section 4's server-rendered slot the live Points bars portal into */
export const POINTS_SLOT = "v1-points";

/** Overlay height of the fixed header (pt-2 + h-14); exported as --header-h. */
export const HEADER_H = "4rem";
