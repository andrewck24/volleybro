// PROTOTYPE (throwaway): landing v2 「球場平面圖」 copy and constants. Import-free
// so the hero side can read it without pulling anything else in.

export const COPY = {
  heroTitle: ["記下每一球，", "統計自己出來。"],
  heroDesc:
    "點球員、點我方動作、點對方回應，一球三下記完；送出不等網路，比賽一結束，技術統計已經算好。",
  heroNote: "用瀏覽器打開就能記，不必下載 App",
  recordTitle: ["每球三步，", "送出不必等網路"],
  recordLead:
    "就是 App 裡的那片球場。點選、確認、送出；訊號不好，也不會卡住下一球。",
  statsTitle: ["不用另外整理，", "記完就是統計"],
  statsLead: "上面送出的那一球，已經算進攻擊得分。比賽一結束，數字就在那裡。",
  kitTitle: "一支手機，整支球隊",
  kitLead: "建隊、邀請、排陣容都在同一支手機上完成，六個位置各司其職。",
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

/** Six features on the six positions of one half court (zone = position). */
export const KIT: (Feature & { zone: number })[] = [
  { zone: 1, title: "建立球隊", body: "填隊名就建好。" },
  { zone: 2, title: "邀請隊友", body: "搜尋使用者，直接邀請加入球隊。" },
  { zone: 3, title: "排陣容", body: "背號、位置、自由球員一次排好。" },
  { zone: 4, title: "安裝到主畫面", body: "像 App 一樣從主畫面打開。" },
  {
    zone: 5,
    title: "多裝置同時記錄",
    body: "多支手機一起記同一場；隊友可開唯讀即時頁面跟著看。",
    dev: true,
  },
  {
    zone: 6,
    title: "Google 帳號登入",
    body: "用 Google 帳號登入，不必另記密碼。",
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

/** id of the stats section's server-rendered slot the live Points portal into */
export const POINTS_SLOT = "v2-points";

// Every action is the other surface plus a white line. Kept here, not in a
// "use client" module, so server components import real strings.
/** On the teal free zone: a coral chip, ink label (6.67:1). */
export const BTN_ON_FREE =
  "rounded-none border-(length:--v2-lw) border-(--v2-line) bg-(--v2-in) font-bold text-(--v2-ink) hover:bg-(--v2-in) hover:text-(--v2-ink) hover:brightness-105";
/** On the coral court: a free-zone inset, ivory label (5.81:1). */
export const BTN_ON_COURT =
  "rounded-none border-(length:--v2-lw) border-(--v2-line) bg-(--v2-free) font-bold text-(--v2-on-free) hover:bg-(--v2-free) hover:text-(--v2-on-free) hover:brightness-110";
