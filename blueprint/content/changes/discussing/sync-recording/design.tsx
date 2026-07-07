"use client";
import { type ComponentProps, Suspense, useState } from "react";

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
          body: ["覆蓋 → 改寫第 19 球，級聯重算比分（見 Q2/Q3）"],
        },
        server: "update 記 updatedBy/updatedAt；下游比分 fold 重算後廣播",
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
    body: "錨點過期在語意上表示 draft 在對方那筆入庫前就開始——想記的必然是同一球，衝突是「誰記的才對」的裁決：捨棄（對方對）或覆蓋（我對，走 update 路徑級聯重算）。跨類型衝突（rally 撞上換人）不互斥，改提供「作為下一筆送出（rebase）」。",
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

/* ------------------------ Q1 mockup：entry 進度條方案 ------------------------ */

type MockStep = { id: "player" | "ours" | "oppo" | "confirm"; label: string };

const MOCK_STEPS: MockStep[] = [
  { id: "player", label: "球員" },
  { id: "ours", label: "我方" },
  { id: "oppo", label: "對方" },
  { id: "confirm", label: "確認" },
];

const COURT_ROWS = [
  [4, 3, 2],
  [5, 6, 1],
];

function ProgressMockup() {
  const [variant, setVariant] = useState<"A" | "B">("A");
  const [stepIdx, setStepIdx] = useState(0);
  const [player, setPlayer] = useState<number | null>(null);
  const [sent, setSent] = useState(false);

  const steps = variant === "A" ? MOCK_STEPS : MOCK_STEPS.slice(1);
  const step = steps[Math.min(stepIdx, steps.length - 1)];
  const last = steps.length - 1;
  const idx = Math.min(stepIdx, last);
  const waitingCourt = player === null; // 方案 B：球員未選前 panel 等待中

  function reset(v: "A" | "B") {
    setVariant(v);
    setStepIdx(0);
    setPlayer(null);
    setSent(false);
  }

  function pickPlayer(n: number) {
    setPlayer(n);
    setSent(false);
    // 方案 A：球員是第 1 步，選完進入「我方」；方案 B：選完球員才啟動 panel 流程
    setStepIdx(variant === "A" ? 1 : 0);
  }

  const courtActive = variant === "A" ? step.id === "player" : waitingCourt;

  const stepBody: Record<MockStep["id"], React.ReactNode> = {
    player: (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[12px] text-[var(--color-fd-muted-foreground)]">
        點選上方球場中的球員
        <button
          onClick={() => pickPlayer(0)}
          className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs"
        >
          對方失誤（不指定球員）
        </button>
      </div>
    ),
    ours: (
      <div className="grid flex-1 grid-cols-2 gap-1.5">
        {["攻擊 ＋", "攔網 ＋", "發球 ＋", "拋傳 −"].map((m) => (
          <button
            key={m}
            onClick={() => setStepIdx(idx + 1)}
            className="rounded-md border border-[var(--border)] bg-[var(--color-fd-card)] text-sm"
          >
            {m}
          </button>
        ))}
      </div>
    ),
    oppo: (
      <div className="grid flex-1 grid-cols-1 gap-1.5">
        {["對方接發失誤 ＋", "對方防守起球", "被攔回 −"].map((m) => (
          <button
            key={m}
            onClick={() => setStepIdx(idx + 1)}
            className="rounded-md border border-[var(--border)] bg-[var(--color-fd-card)] text-sm"
          >
            {m}
          </button>
        ))}
      </div>
    ),
    confirm: (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <span className="text-[12px]">
          {player === 0 ? "對方失誤" : `我方 #${player ?? "?"} 攻擊得分`} → 11–8
        </span>
        <button
          onClick={() => setSent(true)}
          className="rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white"
        >
          {sent ? "已送出（示意）" : "送出"}
        </button>
        <span className="text-[10px] text-[var(--color-fd-muted-foreground)]">
          確認方式（獨立步 vs 雙擊送出）為下一個問題，此處先以獨立步呈現
        </span>
      </div>
    ),
  };

  return (
    <div className="not-prose my-4 rounded-2xl border border-[var(--border)] p-4">
      <div role="tablist" className="mb-3 flex flex-wrap gap-1.5">
        <Pill active={variant === "A"} onClick={() => reset("A")}>
          方案 A：全流程（含球員選擇）
        </Pill>
        <Pill active={variant === "B"} onClick={() => reset("B")}>
          方案 B：僅 panel 內步驟
        </Pill>
      </div>
      <p className="mb-3 text-[13px] text-[var(--color-fd-muted-foreground)]">
        {variant === "A"
          ? "進度條涵蓋 球員 → 我方 → 對方 → 確認；「上一步」可回到球員選擇（改選點錯的球員）。"
          : "球員選擇是進入流程的前置動作，不在進度條上；進度條只管 我方 → 對方 → 確認，改選球員需取消整筆重來。"}
      </p>
      <div className="mx-auto flex w-60 flex-col gap-2 rounded-[20px] border-4 border-[var(--color-fd-foreground)] p-2">
        <div className="text-center font-mono text-lg font-bold">10–8</div>
        <div
          className={cn(
            "rounded-lg border p-1.5 transition-all",
            courtActive
              ? "border-[var(--primary)] ring-2 ring-[color-mix(in_oklch,var(--primary)_35%,transparent)]"
              : "border-[var(--border)] opacity-70",
          )}
        >
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
        <div className="flex h-40 flex-col rounded-lg border border-[var(--border)] p-1.5">
          <div className="mb-1.5 flex gap-1">
            {steps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => !waitingCourt && setStepIdx(i)}
                className={cn(
                  "flex-1 rounded-sm py-0.5 text-[10px] transition-colors",
                  i === idx && !waitingCourt
                    ? "bg-[var(--primary)] font-semibold text-white"
                    : i < idx
                      ? "bg-[color-mix(in_oklch,var(--primary)_30%,transparent)]"
                      : "bg-[var(--color-fd-muted)] text-[var(--color-fd-muted-foreground)]",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {variant === "B" && waitingCourt ? (
            <div className="flex flex-1 items-center justify-center text-[12px] text-[var(--color-fd-muted-foreground)]">
              （先在場上點選球員）
            </div>
          ) : (
            stepBody[step.id]
          )}
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-fd-muted-foreground)]">
            <button
              onClick={() => setStepIdx(Math.max(0, idx - 1))}
              disabled={idx === 0 || (variant === "B" && waitingCourt)}
              className="rounded border border-[var(--border)] px-2 py-0.5 disabled:opacity-40"
            >
              ← 上一步
            </button>
            <span>（可滑動切換）</span>
            <button
              onClick={() => setStepIdx(Math.min(last, idx + 1))}
              disabled={idx === last || (variant === "B" && waitingCourt)}
              className="rounded border border-[var(--border)] px-2 py-0.5 disabled:opacity-40"
            >
              下一步 →
            </button>
          </div>
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
  { title: "Q1 mockup：entry 進度條方案", url: "#q1-mockup", depth: 2 },
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

      <h2 id="q1-mockup">Q1 mockup：entry 進度條方案</h2>
      <p>
        現行隱性步驟：court 點選球員（S1）→ 我方動作（S2）→ 對方動作（S3）→
        雙擊同鈕送出（S4）。以下 mockup
        比較進度條的兩種涵蓋範圍——切換方案後實際點一筆 entry
        感受差異，特別試「點錯球員後按上一步改選」在兩案的路徑。
      </p>
      <ProgressMockup />

      <h2 id="open-questions">未決問題（下一輪討論入口）</h2>
      <ol>
        <li>
          <strong>Q1 — entry 輸入的每個 UI 步驟</strong>
          ：進度條要顯示哪些步驟？（需從頭逐步確認： 發球/接發 → 攻防過程 → 勝負
          → 確認？現行 panel 的步驟拆法是否沿用？）
        </li>
        <li>
          <strong>Q2 — 「覆蓋」的實作邊界</strong>：覆蓋＝update 已入庫
          entry（version
          檢查、級聯重算、updatedBy）。第一版就做？兩人互相覆蓋（edit
          war）如何收斂？
        </li>
        <li>
          <strong>Q3 — 賽後（中途）編輯的級聯效應</strong>：改第 N
          球勝負會改變其後的發球方、輪轉、
          站位，可能使已記錄的換人變得不合法。自動級聯重算？標記後人工修正？退回重記？
        </li>
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
