"use client";
import { type ComponentProps, Suspense, useRef, useState } from "react";

import { useShiki } from "fumadocs-core/highlight/client";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* 以 (lang, code) 快取的 shiki highlight——DynamicCodeBlock 以 useId 為 key，
 * 模擬器換幀重掛載時會整段重新 highlight 並閃爍 placeholder */
function HighlightedCode({ code }: { code: string }) {
  return useShiki(code, {
    lang: "ts",
    defaultColor: false,
    components: {
      pre: (props: ComponentProps<"pre">) => (
        <CodeBlock {...props} className={cn("my-0", props.className)}>
          <Pre>{props.children}</Pre>
        </CodeBlock>
      ),
    },
  });
}

function CodeSnippet({ code }: { code: string }) {
  return (
    <Suspense
      fallback={
        <pre className="my-0 overflow-x-auto rounded-lg bg-[var(--color-fd-muted)] p-3">
          <code>{code}</code>
        </pre>
      }
    >
      <HighlightedCode code={code} />
    </Suspense>
  );
}

/* 共用膠囊切換鈕（模擬器情境選擇與資料契約 tabs） */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-transparent text-[var(--color-fd-muted-foreground)] hover:bg-[var(--color-fd-muted)]",
      )}
    >
      {children}
    </button>
  );
}

/*
 * sync-recording — 同步記錄功能討論用設計文件（discuss 階段，持續更新）
 *
 * 核心是 ConflictSimulator：以逐幀方式播放 happy path 與四種衝突情境，
 * 上方 FlowMap 集合所有情境的流程節點並高亮目前瀏覽位置；
 * 每條 path 經過的節點都有對應的步驟幀。
 * 範圍外段落將在 propose 階段移至 proposal。
 */

/* ---------------------------------- 流程圖 ---------------------------------- */

type NodeId =
  | "end"
  | "compose"
  | "banner"
  | "submit"
  | "check"
  | "accept"
  | "synced"
  | "conflict"
  | "resolve";

type NodeKind = "terminal" | "process" | "decision";

const MAIN_ROW: { id: NodeId; label: string; kind: NodeKind }[] = [
  { id: "end", label: "球結束", kind: "terminal" },
  { id: "compose", label: "開始輸入・釘錨", kind: "process" },
  { id: "submit", label: "送出・儲存中", kind: "process" },
  { id: "check", label: "server 檢查錨點", kind: "decision" },
  { id: "accept", label: "接受・廣播", kind: "process" },
  { id: "synced", label: "全場同步", kind: "terminal" },
];

const BRANCH_ROW: {
  id: NodeId;
  label: string;
  kind: NodeKind;
  under: NodeId;
  note: string;
}[] = [
  {
    id: "banner",
    label: "衝突面板（阻斷詢問）",
    kind: "decision",
    under: "compose",
    note: "輸入中錨點失效",
  },
  {
    id: "conflict",
    label: "409 → 衝突面板",
    kind: "decision",
    under: "check",
    note: "錨點過期",
  },
  {
    id: "resolve",
    label: "解決：捨棄／覆蓋／作為下一筆",
    kind: "process",
    under: "accept",
    note: "",
  },
];

/* 傳統 flowchart 形狀：stadium＝起訖、矩形＝動作、菱形（六角近似）＝判斷 */
const NODE_STYLE: Record<
  NodeKind,
  { shape: string; active: string; inactive: string }
> = {
  terminal: {
    shape: "rounded-full border px-3 py-1",
    active: "border-transparent bg-[var(--primary)] font-semibold text-white",
    inactive:
      "border-[var(--border)] bg-[var(--color-fd-card)] text-[var(--color-fd-muted-foreground)]",
  },
  process: {
    shape: "rounded-[3px] border px-2 py-1",
    active: "border-transparent bg-[var(--primary)] font-semibold text-white",
    inactive:
      "border-[var(--border)] bg-[var(--color-fd-card)] text-[var(--color-fd-muted-foreground)]",
  },
  decision: {
    shape:
      "border-0 px-5 py-1.5 [clip-path:polygon(12%_0,88%_0,100%_50%,88%_100%,12%_100%,0_50%)]",
    active: "bg-[var(--primary)] font-semibold text-white",
    inactive:
      "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)]",
  },
};

function FlowMap({ active }: { active: NodeId }) {
  const box = (id: NodeId, label: string, kind: NodeKind) => {
    const style = NODE_STYLE[kind];
    return (
      <span
        className={cn(
          "inline-block text-[11px] leading-tight whitespace-nowrap transition-colors",
          style.shape,
          id === active ? style.active : style.inactive,
        )}
      >
        {label}
      </span>
    );
  };
  return (
    <div className="mb-3 overflow-x-auto rounded-xl border border-dashed border-[var(--border)] p-3">
      <div className="grid w-max grid-cols-[repeat(6,auto)] gap-x-1 gap-y-1.5">
        {MAIN_ROW.map((n, i) => (
          <div key={n.id} className="flex items-center gap-1">
            {box(n.id, n.label, n.kind)}
            {i < MAIN_ROW.length - 1 && (
              <span className="text-[var(--color-fd-muted-foreground)]">→</span>
            )}
          </div>
        ))}
        {MAIN_ROW.map((n) => {
          const branch = BRANCH_ROW.find((b) => b.under === n.id);
          return (
            <div key={`b-${n.id}`} className="min-h-6">
              {branch && (
                <div className="flex flex-col items-start gap-0.5">
                  <span className="pl-3 text-[10px] text-[var(--color-fd-muted-foreground)]">
                    ↓ {branch.note}
                  </span>
                  {box(branch.id, branch.label, branch.kind)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-fd-muted-foreground)]">
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-full border border-[var(--border)] px-1.5 py-px" />
          起訖
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block rounded-[2px] border border-[var(--border)] px-1.5 py-px" />
          動作
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block bg-[var(--color-fd-muted)] px-2 py-px [clip-path:polygon(20%_0,80%_0,100%_50%,80%_100%,20%_100%,0_50%)]" />
          判斷
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------- 模擬器 ---------------------------------- */

type Chip = {
  label: string;
  tone: "muted" | "saving" | "saved" | "conflict" | "banner";
};

type DeviceState = {
  score: string;
  chip?: Chip;
  body: string[];
  code?: string;
  flash?: boolean;
};

type Frame = {
  title: string;
  node: NodeId;
  a: DeviceState;
  b: DeviceState;
  server: string;
};

type Scenario = {
  id: string;
  label: string;
  intro: string;
  frames: Frame[];
};

const CHIP_TONE: Record<Chip["tone"], string> = {
  muted: "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)]",
  saving:
    "bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] text-[var(--warning)]",
  saved:
    "bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] text-[var(--primary)]",
  conflict:
    "bg-[color-mix(in_oklch,var(--destructive)_15%,transparent)] text-[var(--destructive)]",
  banner:
    "bg-[color-mix(in_oklch,var(--warning)_15%,transparent)] text-[var(--warning)]",
};

const idle: Chip = { label: "待機", tone: "muted" };
const composing: Chip = { label: "輸入中", tone: "muted" };
const saving: Chip = { label: "儲存中", tone: "saving" };
const saved: Chip = { label: "已儲存", tone: "saved" };
const conflict: Chip = { label: "衝突", tone: "conflict" };
const blocked: Chip = { label: "衝突面板", tone: "banner" };

const ANCHOR_19 = `draft.basedOn = {
  entryIndex: 19,
  score: { home: 10, away: 8 },
}`;

const SCENARIOS: Scenario[] = [
  {
    id: "happy",
    label: "Happy path",
    intro:
      "SSE 正確觸發、畫面資訊最新，記錄者在正確的比分與站位資訊環境下記錄下一球。",
    frames: [
      {
        title: "球結束：我方 #7 攻擊得分",
        node: "end",
        a: { score: "10–8", chip: idle, body: ["場上：我方 #7 攻擊得分"] },
        b: { score: "10–8", chip: idle, body: ["（同場觀看/待機）"] },
        server: "entries.length = 19（第 19 球尚未記錄）",
      },
      {
        title: "開始輸入・釘錨：draft 建立瞬間釘住 basedOn",
        node: "compose",
        a: {
          score: "10–8",
          chip: composing,
          body: ["開始輸入瞬間釘住："],
          code: ANCHOR_19,
        },
        b: { score: "10–8", chip: idle, body: [] },
        server: "—",
      },
      {
        title: "送出・儲存中：樂觀更新，POST 只帶事實與錨點",
        node: "submit",
        a: {
          score: "11–8",
          chip: saving,
          body: ["畫面先以本地推導比分顯示"],
          code: `POST entries
{ basedOn: { entryIndex: 19, ... },
  entry: { type: "Rally", win: true, ... } }`,
          flash: true,
        },
        b: { score: "10–8", chip: idle, body: [] },
        server: "收到 POST，進入錨點檢查",
      },
      {
        title: "server 檢查錨點：basedOn 與序列一致 → 通過",
        node: "check",
        a: { score: "11–8", chip: saving, body: ["等待回應"] },
        b: { score: "10–8", chip: idle, body: [] },
        server:
          "basedOn.entryIndex(19) === entries.length(19) ✓ → 寫入、推導權威比分、蓋 recordedBy",
      },
      {
        title: "接受・廣播：SSE 推播給同場所有連線者",
        node: "accept",
        a: { score: "11–8", chip: saved, body: ["201／SSE echo → 已儲存"] },
        b: {
          score: "11–8",
          chip: idle,
          body: ["比分閃爍提示（SSE 帶來的更新）"],
          flash: true,
        },
        server:
          "廣播 { entryIndex: 19, entry(含權威比分), recordedBy }；event id = 19",
      },
      {
        title: "全場同步：下一球在最新狀態上開始",
        node: "synced",
        a: { score: "11–8", chip: idle, body: ["輪轉、站位已更新"] },
        b: { score: "11–8", chip: idle, body: ["輪轉、站位已更新"] },
        server: "entries.length = 20",
      },
    ],
  },
  {
    id: "case1",
    label: "狀況一：同時送出",
    intro:
      "雙方按下送出時，客戶端資訊都還沒更新——兩個 draft 錨在同一個 entryIndex，想記的是同一球。這是唯一會真正走到 409 的競態。",
    frames: [
      {
        title: "開始輸入・釘錨：兩台裝置錨在同一位置",
        node: "compose",
        a: {
          score: "10–8",
          chip: composing,
          body: ["輸入：我方 #7 攻擊得分"],
          code: ANCHOR_19,
        },
        b: {
          score: "10–8",
          chip: composing,
          body: ["輸入：對方發球失誤"],
          code: ANCHOR_19,
        },
        server: "entries.length = 19",
      },
      {
        title: "送出・儲存中：幾乎同時送出",
        node: "submit",
        a: { score: "11–8", chip: saving, body: ["樂觀顯示"], flash: true },
        b: { score: "11–8", chip: saving, body: ["樂觀顯示"], flash: true },
        server: "兩個 POST 都帶 basedOn.entryIndex = 19，先到先贏",
      },
      {
        title: "server 檢查錨點：甲通過、乙過期",
        node: "check",
        a: { score: "11–8", chip: saved, body: ["甲的 POST 先到 → 通過"] },
        b: { score: "11–8", chip: saving, body: ["乙的 POST 後到"] },
        server:
          "甲：19 === 19 ✓ 寫入。乙：basedOn.entryIndex(19) ≠ entries.length(20) ✗",
      },
      {
        title: "409 → 衝突面板：乙的記錄 panel 切換為比較卡（阻斷）",
        node: "conflict",
        a: { score: "11–8", chip: saved, body: [] },
        b: {
          score: "11–8",
          chip: conflict,
          body: [
            "panel 整面切換為衝突比較卡，無法繼續輸入：",
            "已入庫｜第 19 球 我方 #7 攻擊得分（甲）",
            "我的輸入｜對方發球失誤",
            "［捨棄（甲對）］［覆蓋（我對）］",
          ],
        },
        server: "409 + committedSince（乙據此渲染比較卡）",
      },
      {
        title: "解決：同一球，誰記的才對？",
        node: "resolve",
        a: { score: "11–8", chip: idle, body: [] },
        b: {
          score: "11–8",
          chip: idle,
          body: [
            "捨棄 → draft 清空，panel 切回記錄模式，錨點移到 20",
            "覆蓋 → 走 update 路徑改寫第 19 球（級聯重算比分，記 updatedBy）",
          ],
        },
        server:
          "錨點語意：draft 在甲那筆入庫前開始 ⇒ 必然是同一球，不提供「作為下一球」",
      },
    ],
  },
  {
    id: "case2",
    label: "狀況二：輸入中錨點失效",
    intro:
      "甲的同一球先入庫、乙還在輸入——SSE 使乙的 draft 錨點失效。衝突面板立即阻斷輸入，讓記錄者明確裁決，不留「不小心送出成下一球」的縫隙。",
    frames: [
      {
        title: "開始輸入・釘錨：乙正在輸入第 19 球",
        node: "compose",
        a: { score: "10–8", chip: composing, body: ["也在輸入第 19 球"] },
        b: {
          score: "10–8",
          chip: composing,
          body: ["半完成的輸入："],
          code: ANCHOR_19,
        },
        server: "entries.length = 19",
      },
      {
        title: "衝突面板（阻斷詢問）：甲入庫 → SSE 使乙的錨點失效",
        node: "banner",
        a: { score: "11–8", chip: saved, body: ["甲的第 19 球已入庫"] },
        b: {
          score: "11–8",
          chip: blocked,
          body: [
            "比分閃爍，panel 整面切換為衝突面板（阻斷輸入）：",
            "「甲剛記錄了第 19 球（我方 #7 攻擊得分），你正在輸入的是同一球嗎？」",
            "［是，捨棄我的輸入］［不是，我在記下一球 → 錨點 rebase 到 20，保留輸入］",
          ],
          flash: true,
        },
        server: "entries.length = 20；SSE event id = 19",
      },
      {
        title: "解決：乙裁決後 panel 切回記錄模式",
        node: "resolve",
        a: { score: "11–8", chip: idle, body: [] },
        b: {
          score: "11–8",
          chip: idle,
          body: [
            "同一球 → 捨棄，錨點移到 20",
            "真的在記下一球 → rebase 保留輸入，繼續完成後送出",
            "（若在面板切換前的瞬間已按下送出 → 真競態，走狀況一的 409 路徑）",
          ],
        },
        server: "阻斷式詢問消除了「忽略提示誤送成下一球」的縫隙",
      },
      {
        title: "全場同步：裁決完成，記錄繼續",
        node: "synced",
        a: { score: "11–8", chip: idle, body: ["輪轉、站位已更新"] },
        b: { score: "11–8", chip: idle, body: ["輪轉、站位已更新"] },
        server: "entries.length = 20（捨棄）或 21（rebase 送出後）",
      },
    ],
  },
  {
    id: "edge-win",
    label: "Edge：勝負方相反",
    intro: "兩名記錄者對同一球記下相反的勝負——內容差異需要人來裁決。",
    frames: [
      {
        title: "開始輸入・釘錨：同一球、相反的勝負",
        node: "compose",
        a: {
          score: "10–8",
          chip: composing,
          body: ["輸入：我方得分"],
          code: ANCHOR_19,
        },
        b: {
          score: "10–8",
          chip: composing,
          body: ["輸入：對方得分"],
          code: ANCHOR_19,
        },
        server: "entries.length = 19",
      },
      {
        title: "送出・儲存中：兩筆同時送出",
        node: "submit",
        a: {
          score: "11–8",
          chip: saving,
          body: ["樂觀顯示 11–8"],
          flash: true,
        },
        b: {
          score: "10–9",
          chip: saving,
          body: ["樂觀顯示 10–9"],
          flash: true,
        },
        server: "先到先贏",
      },
      {
        title: "server 檢查錨點：甲通過、乙過期",
        node: "check",
        a: { score: "11–8", chip: saved, body: ["第 19 球：我方得分 已入庫"] },
        b: { score: "10–9", chip: saving, body: [] },
        server: "乙：basedOn.entryIndex(19) ≠ entries.length(20) ✗ → 409",
      },
      {
        title: "409 → 衝突面板：勝負差異高亮",
        node: "conflict",
        a: { score: "11–8", chip: idle, body: [] },
        b: {
          score: "11–8",
          chip: conflict,
          body: [
            "已入庫｜我方得分（甲）",
            "我的輸入｜對方得分 ⚠ 勝負相反",
            "［捨棄（甲對）］［覆蓋（我對）］",
          ],
        },
        server: "內容差異需要人裁決，不做 last-write-wins",
      },
      {
        title: "解決：覆蓋走 update 路徑",
        node: "resolve",
        a: {
          score: "11–8",
          chip: idle,
          body: ["若被覆蓋：比分更新為 10–9 並閃爍"],
        },
        b: {
          score: "11–8",
          chip: idle,
          body: ["覆蓋 → 改寫第 19 球，連鎖效果見 Q3"],
        },
        server: "update 記 updatedBy/updatedAt；下游比分 fold 重算後廣播（連鎖效果）",
      },
    ],
  },
  {
    id: "edge-type",
    label: "Edge：entry 性質不同",
    intro:
      "一邊記得失分、一邊記人員更換——兩者不互斥（換人發生在兩球之間），覆蓋會誤刪對方的換人，這裡是唯一保留 rebase 的 409 情境。",
    frames: [
      {
        title: "開始輸入・釘錨：rally 與換人錨在同一位置",
        node: "compose",
        a: {
          score: "10–8",
          chip: composing,
          body: ["輸入：換人（#12 ⇄ #5）"],
          code: ANCHOR_19,
        },
        b: {
          score: "10–8",
          chip: composing,
          body: ["輸入：rally（我方 #7 攻擊得分）"],
          code: ANCHOR_19,
        },
        server: "entries.length = 19",
      },
      {
        title: "送出・儲存中：兩筆同時送出",
        node: "submit",
        a: { score: "10–8", chip: saving, body: ["換人不影響比分"] },
        b: { score: "11–8", chip: saving, body: ["樂觀顯示"], flash: true },
        server: "先到先贏",
      },
      {
        title: "server 檢查錨點：甲通過、乙過期",
        node: "check",
        a: { score: "10–8", chip: saved, body: ["entry 19：換人 已入庫"] },
        b: { score: "11–8", chip: saving, body: [] },
        server: "乙：basedOn.entryIndex(19) ≠ entries.length(20) ✗ → 409",
      },
      {
        title: "409 → 衝突面板：依類型調整文案與選項",
        node: "conflict",
        a: { score: "10–8", chip: idle, body: [] },
        b: {
          score: "10–8",
          chip: conflict,
          body: [
            "已入庫｜換人（甲）——與你的 rally 不互斥",
            "［捨棄］［作為下一筆送出（rebase 到 20）］",
            "注意：換人可能改變站位，rebase 前需重新驗證 draft 的球員/zone 選擇",
          ],
        },
        server: "跨類型不提供「覆蓋」——覆蓋會誤刪甲的換人",
      },
      {
        title: "解決：rebase 後 rally 成為 entry 20",
        node: "resolve",
        a: { score: "10–8", chip: idle, body: [] },
        b: {
          score: "11–8",
          chip: saved,
          body: ["rebase 送出成功，比分由 server 推導"],
          flash: true,
        },
        server: "entries.length = 21",
      },
    ],
  },
  {
    id: "edit-race",
    label: "Edge：編輯中失去最後一筆",
    intro:
      "乙點 Preview 編輯剛記的第 19 球（最後一筆，T1/T2 全開放）；甲隨即記了第 20 球——編輯不被阻斷，但勝負修改（T2）降級鎖定，所有鎖定操作點擊時都說明原因與替代路徑（aria-disabled + explain-on-tap，不用原生 disabled）。",
    frames: [
      {
        title: "點 Preview 進入編輯模式（仍是最後一筆）",
        node: "compose",
        a: { score: "11–8", chip: idle, body: [] },
        b: {
          score: "11–8",
          chip: composing,
          body: [
            "說明文字列：「編輯第 19 球（最後一筆）」",
            "T1（球員/球種）與 T2（勝負）都可修改",
          ],
        },
        server: "update 目標 entry 19，version 1；「仍為最後一筆」→ T2 允許",
      },
      {
        title: "甲記錄第 20 球 → 乙的編輯目標失去最後一筆身分",
        node: "banner",
        a: { score: "12–8", chip: saved, body: ["記錄第 20 球"] },
        b: {
          score: "12–8",
          chip: composing,
          body: [
            "不阻斷（不同球、不互斥），降級通知：",
            "說明文字列輪換：「甲已記錄下一球 —",
            "此球僅能修改球員/球種（勝負已鎖定）」＋ Preview 閃爍",
          ],
          flash: true,
        },
        server: "entry 19 不再是最後一筆 → T2 降級鎖定，T1 照常",
      },
      {
        title: "乙點擊被鎖定的勝負選項 → explain-on-tap",
        node: "check",
        a: { score: "12–8", chip: idle, body: [] },
        b: {
          score: "12–8",
          chip: composing,
          body: [
            "不執行變更，說明文字列閃現（destructive）：",
            "「更改勝負將影響後續 1 筆記錄，需退回重記」",
            "＋浮現［退回重記］入口",
          ],
        },
        server: "「不可用 ≠ 不可見」：鎖定操作保留可點，點擊得到原因與替代路徑",
      },
      {
        title: "若選退回重記（B1）→ panel 切換為破壞性確認卡",
        node: "conflict",
        a: { score: "12–8", chip: idle, body: [] },
        b: {
          score: "12–8",
          chip: conflict,
          body: [
            "「將刪除第 19 球之後的 1 筆（甲記的第 20 球），",
            "所有人畫面將回到第 19 球」",
            "［確認退回］［取消］",
          ],
        },
        server: "確認後 truncate + 廣播失效範圍；他人輸入中的 draft 錨點失效 → D7 衝突面板",
      },
      {
        title: "T1 修改則照常送出（版本檢查）",
        node: "resolve",
        a: { score: "12–8", chip: idle, body: ["SSE 更新：第 19 球球員改為 #7", ], flash: true },
        b: { score: "12–8", chip: saved, body: ["僅改球員/球種：零連鎖，version 1→2"] },
        server: "T2 送出瞬間才被搶先的競態：server「仍為最後一筆」檢查失敗 → 衝突面板（改回原勝負/退回重記/放棄）",
      },
    ],
  },
];

function Device({ name, state }: { name: string; state: DeviceState }) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--color-fd-card)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--color-fd-muted-foreground)]">
          記錄者 {name}
        </span>
        {state.chip && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CHIP_TONE[state.chip.tone]}`}
          >
            {state.chip.label}
          </span>
        )}
      </div>
      <div
        key={state.score + String(state.flash)}
        className={`mb-2 text-center font-mono text-2xl font-bold ${
          state.flash ? "score-flash" : ""
        }`}
      >
        {state.score}
      </div>
      <div className="space-y-1 text-[12px] leading-snug text-[var(--color-fd-muted-foreground)]">
        {state.body.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      {state.code && (
        <div className="mt-2 text-[11px] [&_pre]:my-0">
          <CodeSnippet code={state.code} />
        </div>
      )}
    </div>
  );
}

function ConflictSimulator() {
  const [scenarioId, setScenarioId] = useState("happy");
  const [frameIdx, setFrameIdx] = useState(0);
  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const last = scenario.frames.length - 1;
  const idx = Math.min(frameIdx, last);
  const frame = scenario.frames[idx];

  function pick(id: string) {
    setScenarioId(id);
    setFrameIdx(0);
  }

  return (
    <div className="not-prose my-4 rounded-2xl border border-[var(--border)] p-4">
      <style>{`
        @keyframes score-flash {
          0% { background: color-mix(in oklch, var(--warning) 45%, transparent); }
          100% { background: transparent; }
        }
        .score-flash { animation: score-flash 1.2s ease-out; border-radius: 8px; }
      `}</style>
      <FlowMap active={frame.node} />
      <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
        {SCENARIOS.map((s) => (
          <Pill
            key={s.id}
            active={s.id === scenarioId}
            onClick={() => pick(s.id)}
          >
            {s.label}
          </Pill>
        ))}
      </div>
      <p className="mb-3 text-[13px] text-[var(--color-fd-muted-foreground)]">
        {scenario.intro}
      </p>
      <div className="mb-3 rounded-lg bg-[var(--color-fd-muted)] px-3 py-2 text-[13px] font-medium">
        {idx + 1}/{scenario.frames.length}　{frame.title}
      </div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <Device name="甲" state={frame.a} />
        <Device name="乙" state={frame.b} />
      </div>
      <div className="mb-3 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 font-mono text-[12px] leading-snug text-[var(--color-fd-muted-foreground)]">
        <span className="mr-2 font-sans font-semibold">server</span>
        {frame.server}
      </div>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setFrameIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-40"
        >
          ← 上一步
        </button>
        <div className="flex gap-1.5">
          {scenario.frames.map((_, i) => (
            <button
              key={i}
              onClick={() => setFrameIdx(i)}
              aria-label={`第 ${i + 1} 步`}
              className={`size-2 rounded-full ${
                i === idx ? "bg-[var(--primary)]" : "bg-[var(--border)]"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setFrameIdx((i) => Math.min(last, i + 1))}
          disabled={idx === last}
          className="rounded-md border border-[var(--border)] px-3 py-1 text-xs disabled:opacity-40"
        >
          下一步 →
        </button>
      </div>
    </div>
  );
}

/* --------------------------------- 資料契約 --------------------------------- */

const CONTRACTS = [
  {
    id: "request",
    label: "送出（client → server）",
    note: "只有事實與意圖錨點，沒有計算後比分。",
    code: `POST /api/games/{gameId}/sets/{setIndex}/entries
{
  basedOn: { entryIndex: 19, score: { home: 10, away: 8 } },
  entry: {
    type: "Rally",
    win: true,
    home: { type: "attack", num: 7, player: { id, zone } },
    away: { type: "defense-error", num: 3 }
  }
}`,
  },
  {
    id: "success",
    label: "201 ＋ SSE 廣播",
    note: "比分為 server 推導的權威值；entryIndex 同時是 SSE event id（Last-Event-ID 補漏游標）。",
    code: `{
  entryIndex: 19,
  entry: {
    ...事實,
    home: { score: 11, ... },
    away: { score: 8, ... }
  },
  recordedBy: { userId, name },
  recordedAt: "2026-07-07T12:34:56Z"
}`,
  },
  {
    id: "conflict",
    label: "409 衝突",
    note: "附上 basedOn.entryIndex 之後所有已入庫 entries，client 據此渲染衝突面板。",
    code: `{
  conflict: {
    committedSince: [
      { entryIndex: 19, entry: {...甲的內容}, recordedBy: {...甲} }
    ],
    currentScore: { home: 11, away: 8 }
  }
}`,
  },
];

function DataContract() {
  const [tab, setTab] = useState("request");
  const active = CONTRACTS.find((c) => c.id === tab)!;
  return (
    <div className="not-prose my-4 rounded-2xl border border-[var(--border)] p-4">
      <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
        {CONTRACTS.map((c) => (
          <Pill key={c.id} active={c.id === tab} onClick={() => setTab(c.id)}>
            {c.label}
          </Pill>
        ))}
      </div>
      <p className="mb-2 text-[13px] text-[var(--color-fd-muted-foreground)]">
        {active.note}
      </p>
      <CodeSnippet code={active.code} />
    </div>
  );
}

/* ---------------------------------- 決策卡 ---------------------------------- */

type Rejected = { option: string; reason: string };

const DECISIONS: {
  id: string;
  title: string;
  body: string;
  rejected: Rejected[];
}[] = [
  {
    id: "D1",
    title: "對等記錄（Google Docs 式共編）",
    body: "多名記錄者皆可記錄任何 entry，不做分工限制；觀眾唯讀即時觀看。衝突靠即時可見性＋提交時檢查處理——entry 是離散事件的有序序列，不是自由文字。",
    rejected: [
      {
        option: "分工互補（一人記我方、一人記對方）",
        reason: "現行記錄模式不支援此分工；且限制使用彈性",
      },
      {
        option: "主備交接（同時間僅一人持記錄權）",
        reason: "不符使用者熟悉的 Google Docs 共編心智模型",
      },
      {
        option: "OT／CRDT 合併",
        reason: "entry 是離散有序事件，非自由文字，複雜度不成比例",
      },
    ],
  },
  {
    id: "D2",
    title: "傳輸層：Vercel SSE（路徑一）",
    body: "寫入走 HTTP POST，推播走 SSE route handler + Atlas change stream。Hobby maxDuration 300s → EventSource 自動重連 + Last-Event-ID 補漏。client 以 Last-Event-ID 語意實作，傳輸層可替換。",
    rejected: [
      {
        option: "自架 WebSocket",
        reason: "Vercel 無原生長連線支援，等於另架一個服務；本場景只需單向推播",
      },
      {
        option: "Cloudflare Durable Objects",
        reason:
          "架構最適配但多一個部署目標＋跨域 auth；留作規模成長時的替換路徑，非起點",
      },
      {
        option: "第三方 realtime（Ably/Pusher/Supabase）",
        reason: "新增供應商依賴；免費層額度反而比自有 SSE 更早見頂",
      },
      {
        option: "純 polling",
        reason: "延遲與流量浪費；降級為 SSE 失效時的 fallback",
      },
    ],
  },
  {
    id: "D3",
    title: "比分由 server 端推導",
    body: "client 只送事實（勝負、球種、球員），權威比分由 server 依 entry 序列 fold 計算後回傳＋廣播。賽後編輯改變下游比分時 server 重算；client 端 optimistic helpers 保留，只負責樂觀顯示。",
    rejected: [
      {
        option: "client 計算比分、server 信任（現況）",
        reason: "併發下必然過期；同一球記兩次時比分直接錯亂",
      },
      {
        option: "client 計算、server 驗證",
        reason:
          "賽後編輯改第 N 球時，client 需重送其後所有球的比分；server 推導則是一次 fold 重算",
      },
    ],
  },
  {
    id: "D4",
    title: "比分作為意圖錨點進入送出資料",
    body: "basedOn: { entryIndex, score }＝「這一球開始輸入時我看到的狀態」，在 draft 建立瞬間釘住。entryIndex 是儲存錨點（樂觀鎖檢查鍵、SSE 補漏游標）；score 是人可讀的球次識別，用於衝突面板與 defense-in-depth 驗證。",
    rejected: [
      {
        option: "送出當下的 expectedIndex（純樂觀鎖）",
        reason:
          "被狀況二穿透：SSE 已更新畫面時，後送出者會被誤收為下一球，同一球記兩次",
      },
      {
        option: "只送比分、不送 entryIndex",
        reason:
          "比分無法定位非 rally entry（換人/暫停不改比分），不能作儲存錨點",
      },
    ],
  },
  {
    id: "D5",
    title: "recordedBy / recordedAt 永久保存",
    body: "server 從 session 蓋章；賽後編輯另記 updatedBy / updatedAt。存 userId，顯示時 resolve 名字。",
    rejected: [
      {
        option: "不保存記錄者",
        reason: "衝突面板（「已由甲記錄」）與事後爭議追溯都需要",
      },
      {
        option: "client 自報記錄者欄位",
        reason: "trust boundary：身分必須由 server 從 session 取得",
      },
    ],
  },
  {
    id: "D6",
    title: "409 衝突選項：捨棄／覆蓋（同類型 entry）",
    body: "錨點過期在語意上表示 draft 在對方那筆入庫前就開始——想記的必然是同一球，衝突是「誰記的才對」的裁決：捨棄（對方對）或覆蓋（我對，走 update 路徑）。跨類型衝突（rally 撞上換人）不互斥，改提供「作為下一筆送出（rebase）」。",
    rejected: [
      {
        option: "捨棄／作為下一球送出",
        reason:
          "「作為下一球」與錨點語意矛盾：真心想記下一球的人會在衝突面板回應、取得新錨點後才送出",
      },
      {
        option: "自動以後到者覆蓋（last-write-wins）",
        reason: "內容差異（如勝負相反）需要人裁決，靜默覆蓋會吃掉正確記錄",
      },
    ],
  },
  {
    id: "D7",
    title: "衝突詢問以 Panel 切換阻斷記錄者",
    body: "任何錨點失效（輸入中收到 SSE、或送出後 409）都把記錄 panel 整面切換為衝突面板，阻斷後續輸入直到裁決完成——記錄者必然明確認知到衝突。比分與場上狀態保持可見，裁決所需的比較資訊就在原本的互動面上。",
    rejected: [
      {
        option: "非阻斷 banner（原方案）",
        reason:
          "可能被專注場上的記錄者忽略，忽略後仍要靠 409 二次攔截，多一條錯誤路徑",
      },
      {
        option: "Modal dialog",
        reason:
          "遮蔽比分與場上狀態；行動端 PWA 疊層互動差，且與既有 panel 操作模式不一致",
      },
    ],
  },
  {
    id: "D8",
    title: "entry 輸入 UI：三步驟延展分段進度條＋Preview 送出",
    body: "進度條涵蓋全流程（球員→我方→對方；對方失誤屬對方得失分、選定即縮為單步可送出），採延展分段樣式：輪到的段落延展、各段無文字、說明統一下方無編號並帶輪換動畫；前一步未完成不可前進；切換靠點選進度條或滑動（拖曳意圖才 capture、aria-disabled 取代 disabled、滑動後抑制誤觸 click）。Preview 仿 Entry 版式（左側比分 Figures：閒置＝上一筆、勝負未定＝目前比分皆 muted、已定＝結果比分勝方著色）承載送出：輸入中 pulse、完成時 ring＋send icon、送出＝定格（背景閃一次）。mockup 僅定顯示邏輯／動畫／位置，視覺樣式於 propose 精修。",
    rejected: [
      {
        option: "進度條樣式 1–4（分段填色／圓點連線／數字徽章／細線）",
        reason: "見 Q0 mockup 並排比較；樣式 5 的延展動畫同時服務「對方失誤收合為單步」",
      },
      {
        option: "上一步／下一步按鈕",
        reason: "滑動＋點選進度條已覆蓋導航，按鈕佔用 panel 空間",
      },
      {
        option: "第三步雙擊同鈕送出（現行）",
        reason: "隱性確認不可發現；送出集中到 Preview，全介面唯一 highlight",
      },
      {
        option: "文字標籤（輸入中／上一筆）表達 Preview 狀態",
        reason: "比分 Figures 三態＋pulse 是既有 Entry/GamePreview 語彙，標籤多餘",
      },
    ],
  },
  {
    id: "D9",
    title: "覆蓋機制（v1）：衝突面板限定＋版本檢查",
    body: "覆蓋第一版就做，但僅限衝突面板情境——衝突覆蓋的本質是覆蓋最後一筆（committedSince 通常僅一筆、無下游 entry），連鎖效果為零。每筆 entry 帶版本號，覆蓋請求帶預期版本，防「乙的衝突面板開著時甲搶先自行修正」的競態與離線重播的靜默遺失；版本過期走同一套衝突面板。",
    rejected: [
      {
        option: "v1 支援任意 entry 的覆蓋",
        reason: "改早期 entry 觸發連鎖效果（下游比分 fold 重算、輪轉變動、換人合法性）——歸賽後編輯（Q3）",
      },
      {
        option: "無限覆蓋（互相覆蓋）的強制收斂機制",
        reason: "驗證後確認：互相覆蓋是合法循序編輯（每步都通過版本檢查），非系統衝突；updatedBy＋閃爍可見性即收斂，場邊社交解決",
      },
    ],
  },
  {
    id: "D10",
    title: "賽後編輯（v1）：最後一筆規則＋退回重記",
    body: "T1（改球員/球種，勝負不變）零連鎖、隨時可改；T2（改勝負）僅在該球仍是最後一筆時允許（零下游，等同 D9 覆蓋）；更早的勝負錯誤走退回重記——共編下 truncate 會刪除他人 entries，需 panel 確認卡（destructive 色）明示刪除範圍與影響對象，確認後廣播失效範圍。通用 UI 原則：「不可用 ≠ 不可見」——鎖定操作以 aria-disabled 保留可點，點擊時說明原因並給替代路徑（explain-on-tap）。",
    rejected: [
      {
        option: "全自動連鎖重算＋標記不合法項",
        reason: "比分可機械重算，但輪轉變動使既有換人不合法時機械無解；標記待修狀態讓比賽記錄長時間處於半失效，複雜度不成比例",
      },
      {
        option: "v1 不提供退回重記",
        reason: "「三球前記反了」在真實比賽不罕見，無解過於苛刻；truncate 機制與既有失效廣播共用，成本主要在確認 UI",
      },
      {
        option: "原生 disabled 鎖定不可用操作",
        reason: "disabled 元素不發 pointer 事件，無法 explain-on-tap；記錄者不知道為什麼不能按、也得不到替代路徑",
      },
    ],
  },
];

function VerdictBadge({ verdict }: { verdict: "adopted" | "rejected" }) {
  return (
    <Badge
      variant="outline"
      data-verdict={verdict}
      className={cn(
        "shrink-0 tracking-wide",
        verdict === "adopted"
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : "bg-destructive/10 text-destructive dark:bg-destructive/20",
      )}
    >
      {verdict === "adopted" ? "採用" : "棄用"}
    </Badge>
  );
}

function DecisionCards() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="not-prose my-4 grid gap-2">
      {DECISIONS.map((d) => (
        <button
          key={d.id}
          aria-expanded={open === d.id}
          onClick={() => setOpen((o) => (o === d.id ? null : d.id))}
          className="rounded-xl border border-[var(--border)] bg-[var(--color-fd-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-fd-muted)]"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="rounded bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--primary)]">
              {d.id}
            </span>
            {d.title}
            <span className="ml-auto text-xs text-[var(--color-fd-muted-foreground)]">
              {open === d.id ? "−" : "+"}
            </span>
          </div>
          {open === d.id && (
            <div className="mt-2 text-[13px] leading-relaxed text-[var(--color-fd-muted-foreground)]">
              <div className="mb-2 flex items-start gap-2">
                <VerdictBadge verdict="adopted" />
                <p className="m-0 font-medium text-foreground">{d.body}</p>
              </div>
              <ul className="m-0 list-none space-y-1.5 p-0">
                {d.rejected.map((r) => (
                  <li key={r.option} className="flex items-start gap-2">
                    <VerdictBadge verdict="rejected" />
                    <span>
                      <span className="font-medium text-[var(--color-fd-foreground,inherit)]">
                        {r.option}
                      </span>
                      <span className="mx-1">—</span>
                      {r.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------------------- Q0 mockup：progress bar 樣式 ---------------------- */

const Q0_STEPS = ["球員", "我方", "對方"];
const Q0_CAPTION = "1. 選擇球員或對方失誤";

function BarStyleFrame({
  title,
  note,
  verdict,
  children,
}: {
  title: string;
  note: string;
  verdict: "adopted" | "rejected";
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
        {title}
        <VerdictBadge verdict={verdict} />
      </div>
      <div className="mb-2 text-[11px] text-[var(--color-fd-muted-foreground)]">
        {note}
      </div>
      <div className="mx-auto w-56">{children}</div>
    </div>
  );
}

function ProgressBarStyles() {
  const [active, setActive] = useState(0);

  return (
    <div className="not-prose my-4 grid gap-3">
      <p className="m-0 text-[13px] text-[var(--color-fd-muted-foreground)]">
        點任一樣式的步驟切換，四種樣式同步顯示同一狀態（目前：第 {active + 1}{" "}
        步）。每款下方都附步驟說明文字，一併評估整合效果。
      </p>
      <BarStyleFrame
        title="樣式 1：分段填色"
        verdict="rejected"
        note="等寬分段、整段可點；觸控面積最大，但「完成 vs 目前」靠深淺區分"
      >
        <div className="flex gap-1">
          {Q0_STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setActive(i)}
              className={cn(
                "flex-1 rounded-sm py-0.5 text-[10px] transition-colors",
                i === active
                  ? "bg-[var(--primary)] font-semibold text-white"
                  : i < active
                    ? "bg-[color-mix(in_oklch,var(--primary)_30%,transparent)]"
                    : "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)]",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-1 text-center text-[10px] text-[var(--color-fd-muted-foreground)]">
          {Q0_CAPTION}
        </div>
      </BarStyleFrame>
      <BarStyleFrame
        title="樣式 2：圓點連線（onboarding 經典）"
        verdict="rejected"
        note="步驟語意最明確、完成打勾；佔位較高，點擊目標是小圓點"
      >
        <div className="flex items-center">
          {Q0_STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center last:flex-none">
              <button
                onClick={() => setActive(i)}
                className="flex flex-col items-center gap-0.5"
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                    i === active
                      ? "border-transparent bg-[var(--primary)] text-white"
                      : i < active
                        ? "border-[var(--primary)] text-[var(--primary)]"
                        : "border-[var(--border)] text-[var(--color-fd-muted-foreground)]",
                  )}
                >
                  {i < active ? "✓" : i + 1}
                </span>
                <span
                  className={cn(
                    "text-[9px]",
                    i === active
                      ? "font-semibold"
                      : "text-[var(--color-fd-muted-foreground)]",
                  )}
                >
                  {s}
                </span>
              </button>
              {i < Q0_STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-1 mb-3 h-px flex-1 transition-colors",
                    i < active
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--border)]",
                  )}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 text-center text-[10px] text-[var(--color-fd-muted-foreground)]">
          {Q0_CAPTION}
        </div>
      </BarStyleFrame>
      <BarStyleFrame
        title="樣式 3：數字徽章＋標籤列"
        verdict="rejected"
        note="徽章與標籤同列、水平緊湊；步驟多時會擠"
      >
        <div className="flex justify-center gap-2">
          {Q0_STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => setActive(i)}
              className={cn(
                "flex items-center gap-1 rounded-full border py-0.5 pr-2 pl-0.5 text-[10px] transition-colors",
                i === active
                  ? "border-transparent bg-[var(--primary)] text-white"
                  : "border-[var(--border)] text-[var(--color-fd-muted-foreground)]",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[9px] font-semibold",
                  i === active
                    ? "bg-white/25"
                    : i < active
                      ? "bg-[color-mix(in_oklch,var(--primary)_25%,transparent)] text-[var(--primary)]"
                      : "bg-[var(--color-fd-muted)]",
                )}
              >
                {i < active ? "✓" : i + 1}
              </span>
              {s}
            </button>
          ))}
        </div>
        <div className="mt-1 text-center text-[10px] text-[var(--color-fd-muted-foreground)]">
          {Q0_CAPTION}
        </div>
      </BarStyleFrame>
      <BarStyleFrame
        title="樣式 4：細線進度＋置中說明"
        verdict="rejected"
        note="最省空間、說明文字即主角；但步驟不可個別點選，只能滑動切換"
      >
        <div className="h-1 overflow-hidden rounded-full bg-[var(--color-fd-muted)]">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
            style={{ width: `${((active + 1) / Q0_STEPS.length) * 100}%` }}
          />
        </div>
        <button
          onClick={() => setActive((active + 1) % Q0_STEPS.length)}
          className="mt-1 w-full text-center text-[10px] text-[var(--color-fd-muted-foreground)]"
        >
          {active + 1}/{Q0_STEPS.length}　{Q0_CAPTION}（點此模擬切換）
        </button>
      </BarStyleFrame>
      <BarStyleFrame
        title="樣式 5：延展分段"
        verdict="adopted"
        note="輪到的階段動畫延展變長；各段不放文字，說明統一在下方；軌道上下的透明 padding 擴大觸控面積"
      >
        <div className="flex items-center">
          {Q0_STEPS.map((s, i) => (
            <button
              key={s}
              aria-label={s}
              onClick={() => setActive(i)}
              className={cn(
                "-my-2 px-0.5 py-2 transition-all duration-300",
                i === active ? "flex-[2.5]" : "flex-1",
              )}
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-colors",
                  i <= active
                    ? "bg-[var(--primary)]"
                    : "bg-[var(--color-fd-muted)]",
                )}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 text-center text-[10px] text-[var(--color-fd-muted-foreground)]">
          {Q0_CAPTION}
        </div>
      </BarStyleFrame>
    </div>
  );
}

/* ------------------------ Q1 mockup：entry 進度條方案 ------------------------ */

type MockStepId = "player" | "ours" | "oppo";

const MOCK_STEPS: { id: MockStepId; label: string }[] = [
  { id: "player", label: "球員" },
  { id: "ours", label: "我方" },
  { id: "oppo", label: "對方" },
];

const COURT_ROWS = [
  [4, 3, 2],
  [5, 6, 1],
];

const OURS_MOVES = [
  { label: "攻擊", win: true },
  { label: "攔網", win: true },
  { label: "發球", win: true },
  { label: "拋傳失誤", win: false },
];

type LastEntry = {
  text: string;
  home: number;
  away: number;
  win: boolean;
};

/* 仿 src/components/game/entry 的比分 Figure：勝方著色、敗方 muted */
function ScoreFig({
  value,
  tone,
}: {
  value: number;
  tone: "primary" | "destructive" | "muted";
}) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-sm font-mono text-[11px] font-bold",
        tone === "primary" &&
          "bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] text-[var(--primary)]",
        tone === "destructive" &&
          "bg-[color-mix(in_oklch,var(--destructive)_15%,transparent)] text-[var(--destructive)]",
        tone === "muted" &&
          "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)]",
      )}
    >
      {value}
    </span>
  );
}

function ProgressMockup() {
  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const [player, setPlayer] = useState<number | null>(null);
  const [oppoError, setOppoError] = useState(false);
  const [ours, setOurs] = useState<(typeof OURS_MOVES)[number] | null>(null);
  const [oppo, setOppo] = useState<string | null>(null);
  const [score, setScore] = useState({ home: 10, away: 8 });
  const [scoreFlash, setScoreFlash] = useState(false);
  const [previewFlash, setPreviewFlash] = useState(false);
  const [lastEntry, setLastEntry] = useState<LastEntry>({
    text: "#5 攻擊＋ · 接發失誤",
    home: 10,
    away: 8,
    win: true,
  });
  const pointerX = useRef<number | null>(null);
  const swiped = useRef(false);

  /* 對方失誤屬於對方得失分：不需記錄我方表現，流程縮為單一步驟 */
  const steps = oppoError ? MOCK_STEPS.slice(0, 1) : MOCK_STEPS;
  const idx = Math.min(stepIdx, steps.length - 1);
  const step = steps[idx];
  const editing =
    oppoError || player !== null || ours !== null || oppo !== null;
  const complete =
    oppoError || (player !== null && ours !== null && oppo !== null);

  const captions: Record<MockStepId, string> = {
    player: oppoError
      ? "已選擇對方失誤 — 不需記錄我方表現，可直接送出"
      : "選擇球員或對方失誤",
    ours: "選擇我方得失分類型",
    oppo:
      ours === null
        ? "選擇對方得失分類型（依前一步而定）"
        : ours.win
          ? "選擇對方失分類型"
          : "選擇對方得分類型",
  };

  /* 前一步驟資訊完成前，不能切換到下一步驟 */
  function canGoTo(i: number) {
    if (oppoError) return i === 0;
    if (i <= 0) return true;
    if (i === 1) return player !== null;
    return player !== null && ours !== null;
  }

  function goTo(next: number) {
    if (next === idx || next < 0 || next >= steps.length) return;
    if (!canGoTo(next)) return;
    setDirection(next > idx ? "forward" : "backward");
    setStepIdx(next);
  }

  function pickPlayer(n: number) {
    setOppoError(false);
    setPlayer(n);
    setDirection("forward");
    setStepIdx(1);
  }

  function pickOppoError() {
    setOppoError(true);
    setPlayer(null);
    setOurs(null);
    setOppo(null);
    setStepIdx(0);
  }

  /* 送出＝定格：比分與內容早已就位，pulse 停止、ring/icon 淡出、背景閃一次 */
  function submit() {
    if (!complete) return;
    const win = oppoError ? true : ours!.win;
    const nextScore = win
      ? { home: score.home + 1, away: score.away }
      : { home: score.home, away: score.away + 1 };
    setLastEntry({
      text: oppoError
        ? "對方失誤"
        : `#${player} ${ours!.label}${ours!.win ? "＋" : "−"} · ${oppo}`,
      home: nextScore.home,
      away: nextScore.away,
      win,
    });
    setScore(nextScore);
    setScoreFlash(true);
    setPreviewFlash(true);
    setOppoError(false);
    setPlayer(null);
    setOurs(null);
    setOppo(null);
    setDirection("backward");
    setStepIdx(0);
    setTimeout(() => {
      setScoreFlash(false);
      setPreviewFlash(false);
    }, 1200);
  }

  const oppoOptions =
    ours === null
      ? []
      : ours.win
        ? ["接發失誤", "防守失誤", "攔網出界"]
        : ["對方攻擊得分", "對方攔網得分", "對方發球得分"];

  /* Preview 左側比分：閒置＝上一筆比分；輸入中＝勝負未定前為目前比分、
     勝負確定後為記錄中（結果）比分 */
  const draftWin = oppoError ? true : (ours?.win ?? null);
  const previewScore = !editing
    ? { home: lastEntry.home, away: lastEntry.away, win: lastEntry.win }
    : draftWin === null
      ? { home: score.home, away: score.away, win: null }
      : draftWin
        ? { home: score.home + 1, away: score.away, win: true }
        : { home: score.home, away: score.away + 1, win: false };

  const draftText = oppoError
    ? "對方失誤"
    : [
        player === null ? null : `#${player}`,
        ours ? `${ours.label}${ours.win ? "＋" : "−"}` : null,
        oppo,
      ]
        .filter(Boolean)
        .join(" · ");
  const previewText = editing ? draftText : lastEntry.text;

  const stepBody: Record<MockStepId, React.ReactNode> = {
    player: (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[12px] text-[var(--color-fd-muted-foreground)]">
        點選上方球場中的球員
        <button
          onClick={pickOppoError}
          className={cn(
            "rounded-md border px-3 py-1.5 text-xs",
            oppoError
              ? "border-transparent bg-[var(--primary)] text-white"
              : "border-[var(--border)]",
          )}
        >
          對方失誤（不需記錄我方表現）
        </button>
      </div>
    ),
    ours: (
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        {OURS_MOVES.map((m) => (
          <button
            key={m.label}
            onClick={() => {
              setOurs(m);
              setOppo(null);
              setDirection("forward");
              setStepIdx(2);
            }}
            className={cn(
              "rounded-md border text-sm",
              ours?.label === m.label
                ? "border-transparent bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--color-fd-card)]",
            )}
          >
            {m.label} {m.win ? "＋" : "−"}
          </button>
        ))}
      </div>
    ),
    oppo: (
      <div className="grid flex-1 grid-cols-1 gap-1.5">
        {oppoOptions.map((m) => (
          <button
            key={m}
            onClick={() => setOppo(m)}
            className={cn(
              "rounded-md border text-sm",
              oppo === m
                ? "border-transparent bg-[var(--primary)] text-white"
                : "border-[var(--border)] bg-[var(--color-fd-card)]",
            )}
          >
            {m}
          </button>
        ))}
      </div>
    ),
  };

  return (
    <div className="not-prose my-4 rounded-2xl border border-[var(--border)] p-4">
      <style>{`
        @keyframes mock-slide-from-right {
          from { transform: translateX(24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes mock-slide-from-left {
          from { transform: translateX(-24px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .mock-forward { animation: 300ms ease mock-slide-from-right; }
        .mock-backward { animation: 300ms ease mock-slide-from-left; }
        @keyframes mock-preview-in {
          from { transform: translateY(4px); opacity: 0.3; }
          to { transform: translateY(0); opacity: 1; }
        }
        .mock-preview-in { animation: 250ms ease mock-preview-in; }
      `}</style>
      <div className="mx-auto flex w-60 flex-col gap-2 rounded-[20px] border-4 border-[var(--color-fd-foreground)] p-2">
        <div
          key={`${score.home}-${score.away}`}
          className={cn(
            "text-center font-mono text-lg font-bold",
            scoreFlash && "score-flash",
          )}
        >
          {score.home}–{score.away}
        </div>
        <div className="rounded-lg border border-[var(--border)] p-1.5">
          {COURT_ROWS.map((row, i) => (
            <div key={i} className="mb-1 grid grid-cols-3 gap-1 last:mb-0">
              {row.map((n) => (
                <button
                  key={n}
                  onClick={() => pickPlayer(n)}
                  className={cn(
                    "rounded-md border py-1.5 text-xs font-semibold",
                    player === n
                      ? "border-transparent bg-[var(--primary)] text-white"
                      : "border-[var(--border)] bg-[var(--color-fd-card)]",
                  )}
                >
                  #{n}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div
          className="flex h-44 touch-pan-y flex-col rounded-lg border border-[var(--border)] p-1.5"
          onPointerDown={(e) => {
            pointerX.current = e.clientX;
          }}
          onPointerMove={(e) => {
            /* 移動超過 8px 才 capture：拖曳可從任何子元素（含按鈕）起手，
               點按則不受影響（pointerdown 就 capture 會讓 click 派發到容器） */
            if (pointerX.current === null) return;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) return;
            if (Math.abs(e.clientX - pointerX.current) > 8) {
              e.currentTarget.setPointerCapture(e.pointerId);
            }
          }}
          onPointerUp={(e) => {
            if (pointerX.current === null) return;
            const dx = e.clientX - pointerX.current;
            pointerX.current = null;
            if (Math.abs(dx) < 40) return;
            swiped.current = true;
            goTo(idx + (dx < 0 ? 1 : -1));
          }}
          onClickCapture={(e) => {
            /* 滑動手勢結束時抑制落點按鈕的誤觸 click */
            if (!swiped.current) return;
            swiped.current = false;
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* 進度條：Q0 定案樣式 5（延展分段），透明 padding 擴大觸控面積 */}
          <div role="tablist" className="flex items-center px-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === idx}
                aria-label={s.label}
                aria-disabled={!canGoTo(i)}
                onClick={() => goTo(i)}
                className={cn(
                  "-my-2 px-0.5 py-2 transition-all duration-300",
                  i === idx ? "flex-[2.5]" : "flex-1",
                )}
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-colors",
                    i <= idx
                      ? "bg-[var(--primary)]"
                      : "bg-[var(--color-fd-muted)]",
                    !canGoTo(i) && "opacity-50",
                  )}
                />
              </button>
            ))}
          </div>
          {/* 說明文字：無編號，輪換帶動畫 */}
          <div className="mt-1 mb-1.5 text-center text-[10px] text-[var(--color-fd-muted-foreground)]">
            <span key={captions[step.id]} className="mock-preview-in block">
              {captions[step.id]}
            </span>
          </div>
          <div
            key={`${step.id}-${String(oppoError)}`}
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              direction === "forward" ? "mock-forward" : "mock-backward",
            )}
          >
            {stepBody[step.id]}
          </div>
        </div>
        {/* Preview：仿 Entry 版式（左側比分 Figures + 左框線內容）。
            輸入中＝animate-pulse（沿用現行 GamePreview 語彙）；
            完成＝pulse 停止 + ring + send icon；送出＝定格（背景閃一次） */}
        <div
          className={cn(
            "flex items-center gap-1 rounded-lg border px-2 py-1.5 transition-all duration-300",
            complete
              ? "border-[var(--primary)] ring-2 ring-[color-mix(in_oklch,var(--primary)_35%,transparent)]"
              : "border-[var(--border)]",
            previewFlash && "score-flash",
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-1",
              editing && !complete && "animate-pulse duration-1000",
            )}
          >
            <ScoreFig
              value={previewScore.home}
              tone={
                previewScore.win === null
                  ? "muted"
                  : previewScore.win
                    ? "primary"
                    : "muted"
              }
            />
            <ScoreFig
              value={previewScore.away}
              tone={
                previewScore.win === null
                  ? "muted"
                  : previewScore.win
                    ? "muted"
                    : "destructive"
              }
            />
            <span
              key={previewText}
              className={cn(
                "mock-preview-in min-w-0 flex-1 truncate border-l-2 pl-1 text-[11px]",
                previewScore.win === false
                  ? "border-[var(--destructive)]"
                  : "border-[var(--primary)]",
                !editing && "text-[var(--color-fd-muted-foreground)]",
              )}
            >
              {previewText || "…"}
            </span>
          </div>
          <button
            onClick={submit}
            aria-label="送出"
            className={cn(
              "shrink-0 text-sm text-[var(--primary)] transition-opacity duration-300",
              complete ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- 頁面 ----------------------------------- */

export const toc = [
  { title: "已定案決策", url: "#decisions", depth: 2 },
  { title: "流程走查：happy path 與衝突情境", url: "#simulator", depth: 2 },
  { title: "衝突模型：意圖錨點", url: "#intent-anchor", depth: 2 },
  { title: "資料契約", url: "#data-contract", depth: 2 },
  { title: "同步狀態與視覺回饋", url: "#feedback", depth: 2 },
  { title: "Q0 mockup：progress bar 樣式（已定案）", url: "#q0-mockup", depth: 2 },
  { title: "Q1 mockup：entry 進度條與 Preview 送出（已定案）", url: "#q1-mockup", depth: 2 },
  { title: "未決問題", url: "#open-questions", depth: 2 },
  { title: "範圍外（backlog）", url: "#out-of-scope", depth: 2 },
];

export default function Design() {
  return (
    <div>
      <h2 id="decisions">已定案決策</h2>
      <p>點擊卡片展開採用理由與棄用選項。</p>
      <DecisionCards />

      <h2 id="simulator">流程走查：happy path 與衝突情境</h2>
      <p>
        選擇情境後以「上一步／下一步」逐幀走查；每條 path
        經過的節點都有對應步驟幀。上方流程圖集合所有情境的節點並高亮目前位置；
        每一幀顯示甲、乙兩台裝置的畫面狀態（比分、同步狀態、衝突面板、draft
        資料）與 server 側的判斷。
      </p>
      <ConflictSimulator />

      <h2 id="intent-anchor">衝突模型：意圖錨點（basedOn）</h2>
      <p>
        衝突的根本問題是「後送出的人想記的是<strong>哪一球</strong>
        」。純樂觀鎖（送出當下的 expectedIndex）會被狀況二穿透：乙的畫面已被 SSE
        更新，送出時 index 看起來像「下一球」，server
        會誤收、同一球被記兩次。因此：
      </p>
      <ul>
        <li>
          錨點在<strong>開始輸入的瞬間</strong>釘住（draft
          建立時），不是送出的瞬間。
        </li>
        <li>
          輸入過程中錨點失效（SSE 帶來同位置的 entry）：panel
          整面切換為衝突面板，<strong>阻斷輸入</strong>
          直到記錄者裁決（D7）——「我在記下一球」在此回應並取得新錨點，是 rebase
          唯一的正規入口（同類型情境下）。
        </li>
        <li>
          真競態（雙方都在 SSE 到達前送出）：後到者 409 →
          同一個衝突面板。錨點過期 ⇒ draft 在對方那筆入庫前開始 ⇒
          想記的必然是同一球——選項只有「捨棄／覆蓋」二擇（D6）。
        </li>
        <li>
          唯一例外：跨類型衝突（rally
          撞上換人）不互斥，提供「作為下一筆送出（rebase）」， 且 rebase
          前需重新驗證 draft 的球員/zone 選擇（換人可能改變站位）。
        </li>
      </ul>

      <h2 id="data-contract">資料契約</h2>
      <DataContract />

      <h2 id="feedback">同步狀態與視覺回饋</h2>
      <ul>
        <li>
          <strong>entry 同步狀態指示</strong>：儲存中（POST 進行中，樂觀顯示）→
          已儲存（201 或 SSE
          echo)；離線（佇列中）；衝突（待解決）。「輸入中」presence
          指示暫緩——先靠已提交事件即時出現達成可見性。
        </li>
        <li>
          <strong>比分更新視覺提示</strong>：任何已提交的比分變化（自己或 SSE
          帶來）觸發閃爍動畫——模擬器中比分變動的幀即為此效果的示意。
        </li>
        <li>
          <strong>衝突面板（D7）</strong>：錨點失效時記錄 panel
          整面切換為比較卡並阻斷輸入；比分與場上狀態保持可見。
        </li>
        <li>
          <strong>entry 輸入進度條</strong>：onboarding 式進度條（暫定 panel
          上緣），顯示目前在多步驟輸入的哪一步，支援滑動或上一步／下一步切換。
          <em>每個 UI 步驟的定義需逐步確認——見 Q1。</em>
        </li>
        <li>
          <strong>連線狀態</strong>：SSE 斷線（heartbeat
          逾時）顯示「離線」；斷線期間送出的 entry 因錨點過期會被 409
          攔下，不會污染序列。
        </li>
      </ul>

      <h2 id="q0-mockup">Q0 mockup：progress bar 樣式（已定案：樣式 5）</h2>
      <ProgressBarStyles />

      <h2 id="q1-mockup">Q1 mockup：entry 進度條與 Preview 送出（已定案，見 D8）</h2>
      <p>
        進度條涵蓋全流程三步驟（含球員選擇），每步附說明文字；切換靠點選進度條或左右滑動
        panel（沿用 tab-container 的方向性滑動動畫，此行為未來將成為 panel
        的預設功能），且前一步驟完成前不能切換到下一步。送出由底部 chat-input
        式的 Preview 承載：閒置時顯示上一筆 entry、輸入中顯示 draft，三步完成後
        highlight 並浮現 send icon（全介面唯一 highlight）；送出＝「角色轉換」——
        draft 內容原地成為上一筆（附上結果比分），ring 與 icon 淡出、比分閃爍。
      </p>
      <ProgressMockup />

      <h2 id="open-questions">未決問題（下一輪討論入口）</h2>
      <ol>
        <li>
          <strong>Q4 — 離線佇列重播</strong>：離線期間排隊的多筆 entries
          重連後逐筆重播， 第一筆衝突時暫停佇列等人工解決？還是整批比對？
        </li>
        <li>
          <strong>Q5 — undo／刪除最後一球</strong>：與新 entry
          併發時的行為（刪除也是序列變異， 需要 version 檢查）。
        </li>
        <li>
          <strong>Q6 — set 結束邊界</strong>：一球達 25 分（第五局 15 分）且領先
          2 分即結束該局；另一人同時記了「下一球」→ server 需驗證 set
          未結束並拒收。跨 set 的錨點如何表示？
        </li>
        <li>
          <strong>Q7 — 觀眾視圖範圍</strong>
          ：唯讀觀看包含哪些資訊（比分／輪轉／統計）？ 與記錄者共用同一 SSE
          stream？
        </li>
        <li>
          <strong>Q8 — 記錄權限</strong>：誰可以成為記錄者（team role
          對應）？觀眾連結是否公開？
        </li>
      </ol>

      <h2 id="out-of-scope">範圍外（backlog，propose 階段移至 proposal）</h2>
      <ul>
        <li>創建比賽、創建新局、瀏覽比賽資料的使用者流程與介面重設計</li>
        <li>
          資料層決策：MongoDB vs
          PostgreSQL（唯一驅動因素剩統計查詢需求；同步記錄本身 Mongo
          可完全支撐）
        </li>
        <li>
          狀態管理收斂：SWR → RTK Query（providesTags 解 N+1；onCacheEntryAdded
          接 SSE）
        </li>
        <li>
          E2E 工具選型（Playwright 傾向：multi-context 可測雙記錄者併發）＋
          Bruno API 測試定位
        </li>
        <li>
          blueprint 關鍵功能說明區塊 ＋ README 以 html/richtext
          呈現關鍵功能流程/架構
        </li>
        <li>
          過大元件重構（membership-section.tsx 478 行、info-form.tsx 346
          行、custom/court TODO）
        </li>
      </ul>
    </div>
  );
}
