// PROTOTYPE (throwaway): landing v2 「球場平面圖」 copy and constants. Import-free
// so the hero side can read it without pulling anything else in.

export const COPY = {
  // two sentences; each breaks after its first word from lg
  heroTitle: [
    ["記下", "每一球，"],
    ["統計", "自己出來。"],
  ] as const,
  heroDesc: "每一球點三下就記完，送出不必等網路；比賽一結束，統計已經算好。",
  heroNote: "用瀏覽器打開就能記，不必下載 App",
  recordTitle: ["每球三步，", "送出不必等網路"],
  recordLead:
    "就是 App 裡的那片球場。點選、確認、送出；訊號不好，也不會卡住下一球。",
  statsTitle: ["不用另外整理，", "記完就是統計"],
  statsLead: "上面每記一球，這裡的數字就跟著動；比賽一結束，統計已經在那裡。",
  kitTitle: "一支手機，整支球隊",
  kitLead: "建隊、邀請、分權限、排陣容，都在同一支手機上完成。",
  ctaTitle: ["下一場比賽，", "從發球就開始記"],
  ctaLead: "先建好球隊，哨聲一響就能記。",
};

export const STEPS = [
  { title: "選球員", body: "點場上的背號，誰碰到球就點誰。" },
  { title: "我方動作", body: "攻擊、攔網、接發……得分或失分，點一下。" },
  { title: "對方回應", body: "對方怎麼得分或失分，一鍵補上。" },
  { title: "預覽送出", body: "確認這一球，送出後立刻記下一球。" },
];

export type Feature = { title: string; body: string; dev?: boolean };

/** Supporting features, one roster row each (PRODUCT.md capabilities only;
 *  planned ones carry 開發中 and are otherwise styled the same). */
export const KIT: Feature[] = [
  { title: "建立球隊", body: "填隊名就建好。" },
  { title: "邀請隊友", body: "搜尋使用者，直接邀請加入球隊。" },
  { title: "角色權限", body: "擁有者、管理員、成員，各自能做的事分開管。" },
  { title: "每場陣容", body: "每一場各排一份先發、位置與自由球員。" },
  {
    title: "安裝到主畫面",
    body: "像 App 一樣從主畫面打開；訊號不好照樣記，連線後在背景送出。",
  },
  {
    title: "球員數據與進階圖表",
    body: "跨場次累計每位球員的各項技術數據，並畫成進階圖表。",
    dev: true,
  },
  {
    title: "多裝置同時記錄",
    body: "多支手機一起記同一場；隊友可開唯讀即時頁面跟著看。",
    dev: true,
  },
];

export const LINKS = {
  author: "https://www.linkedin.com/in/li-wei-tseng-andrew/",
  github: "https://github.com/andrewck24/volleybro",
  feedback: "https://github.com/andrewck24/volleybro/discussions",
};

/** scoringMoves[num].text, copied so the hero stays import-free. */
const MOVE_TEXT = [
  "發球",
  "發球",
  "攔網",
  "攔網",
  "攻擊",
  "攻擊",
  "接發",
  "防守",
  "二傳",
];
/** Mark label for a home move: 9+ are the opponent's unforced errors. */
export const moveLabel = (num: number, win: boolean) =>
  num >= MOVE_TEXT.length
    ? "對方失誤"
    : `${MOVE_TEXT[num]}${win ? "得分" : "失分"}`;

// Actions are app objects: the app Button's own variants (rounded-md, shadow,
// no outline), passed as classes over CTAButton's built-in outline look. Kept
// here, not in a "use client" module, so server components import strings.
/** Button `default` variant: teal fill, ivory label (5.81:1). On coral and in the header. */
export const BTN_PRIMARY =
  "bg-primary font-semibold text-primary-foreground shadow-md ring-transparent hover:bg-primary/90 dark:ring-transparent";
/** The header CTA at rest, over the teal free zone: inverted ink, black on
 *  near-white in dark, near-white on black in light (foreground / background). */
export const BTN_CARD =
  "bg-foreground font-semibold text-background shadow-md ring-transparent hover:bg-foreground/90 dark:ring-transparent";
/** Button `secondary` variant: on the teal free zone (label 16:1 light, 9:1 dark). */
export const BTN_SECONDARY =
  "bg-secondary font-semibold text-secondary-foreground shadow-md ring-transparent hover:bg-secondary/80 dark:ring-transparent";
