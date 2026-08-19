"use client";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/*
 * entry-ui — sync-recording epic 中 front-loaded、零後端依賴切片的設計文件。
 *
 * 本頁僅收錄與本 change 相關的兩項決策（D8、D12）與其互動 mockup，
 * 抽取自 sync-recording 的 discuss 設計文件（D1–D15 全量決策）。
 * 編號沿用原文件，非本頁自建連號。
 */

/* 共用膠囊切換鈕（Q5 mockup 版本比較 tabs） */
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

/* ---------------------------------- 決策卡 ---------------------------------- */

type Rejected = { option: string; reason: string };

const DECISIONS: {
  id: string;
  title: string;
  body: string;
  rejected: Rejected[];
}[] = [
  {
    id: "D8",
    title: "entry 輸入 UI：三步驟延展分段進度條＋Preview 送出",
    body: "進度條涵蓋全流程（球員→我方→對方；對方失誤屬對方得失分、選定即縮為單步可送出），採延展分段樣式：輪到的段落延展、各段無文字、說明統一下方無編號並帶輪換動畫；前一步未完成不可前進；切換靠點選進度條或滑動（拖曳意圖才 capture、aria-disabled 取代 disabled、滑動後抑制誤觸 click）。Preview 仿 Entry 版式（左側比分 Figures：閒置＝上一筆、勝負未定＝目前比分皆 muted、已定＝結果比分勝方著色）承載送出：輸入中 pulse、完成時 ring＋send icon、送出＝定格（背景閃一次）。mockup 僅定顯示邏輯／動畫／位置，視覺樣式於 propose 精修。",
    rejected: [
      {
        option: "進度條樣式 1–4（分段填色／圓點連線／數字徽章／細線）",
        reason:
          "見 Q0 mockup 並排比較；樣式 5 的延展動畫同時服務「對方失誤收合為單步」",
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
        reason:
          "比分 Figures 三態＋pulse 是既有 Entry/GamePreview 語彙，標籤多餘",
      },
    ],
  },
  {
    id: "D12",
    title:
      "entry 編輯／刪除入口：Preview 上緣 drawer＋左滑動作鈕＋tap 行內展開",
    body: "Summary 從 Options dialog 獨立為以 Preview 為上緣的 bottom drawer：閒置時只露出把手＋最新 entry（即原 Preview），展開時最新 entry 隨上緣升起、原地成為清單第一筆；Summary 因此離開 panel，左滑手勢不與 panel 滑動衝突。每行左滑揭露動作鈕；整行 tap 行內展開（accordion）顯示 recordedBy／時間與完整動作——脈絡不離開清單。按鈕組成直接反映最後一筆規則（D10）：最新一筆＝編輯＋刪除（請求帶版本號，與 D9／D10 共用守衛），其餘＝編輯＋退回重記至此（替代路徑直接可見，取代 disabled 刪除鈕）。與 D8 Preview 的手勢分工：閒置時 tap＝展開 drawer；輸入中 Preview tap 僅處理送出（三步完成＝送出、未完成＝無作用），把手恆為 drawer 開關；輸入中以把手展開 drawer 時，draft 以輸入中樣式（pulse）隨上緣升起佔據清單第一列、與已提交 entries 明確區分，送出定格後原地轉為正式第一筆——D8「角色轉換」的延伸。",
    rejected: [
      {
        option: "版本 A：tap＝左滑同款動作鈕",
        reason: "最少 UI、零疊層，但揭露不了 recordedBy 等資訊",
      },
      {
        option: "版本 C：tap＝action sheet",
        reason: "行不變形，但 drawer 上再疊一層、脈絡離開清單",
      },
      {
        option: "每行常駐 kebab 鈕／長按選單",
        reason:
          "entry 行內已無水平空間、逐行按鈕是視覺噪音；長按無可見 affordance，違反「不可用 ≠ 不可見」精神",
      },
      {
        option: "非最後一筆顯示 disabled 刪除鈕＋explain-on-tap",
        reason:
          "改以「退回重記至此」按鈕原位取代——替代路徑直接可見可按，優於先點才知道不能用",
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

/* 單一決策卡：沿用 sync-recording DecisionCards 的展開互動，
 * 但改為接受單一 decision，讓 D8／D12 可各自插入對應 mockup 之間 */
function DecisionCard({
  decision: d,
}: {
  decision: (typeof DECISIONS)[number];
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="not-prose my-4 grid gap-2">
      <button
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-xl border border-[var(--border)] bg-[var(--color-fd-card)] px-4 py-3 text-left transition-colors hover:bg-[var(--color-fd-muted)]"
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="rounded bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--primary)]">
            {d.id}
          </span>
          {d.title}
          <span className="ml-auto text-xs text-[var(--color-fd-muted-foreground)]">
            {open ? "−" : "+"}
          </span>
        </div>
        {open && (
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
                    i < active ? "bg-[var(--primary)]" : "bg-[var(--border)]",
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
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
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

  /* 對方失誤屬於對方得失分：不需選球員／記錄我方表現，流程縮為兩步驟
     ——選擇對方失誤，再確認自動帶入的 outcome（可直接送出）。 */
  const steps = oppoError ? [MOCK_STEPS[0], MOCK_STEPS[2]] : MOCK_STEPS;
  const idx = Math.min(stepIdx, steps.length - 1);
  const step = steps[idx];
  const editing =
    oppoError || player !== null || ours !== null || oppo !== null;
  const complete =
    oppoError || (player !== null && ours !== null && oppo !== null);

  const captions: Record<MockStepId, string> = {
    player: "選擇球員或對方失誤",
    ours: "選擇我方得失分類型",
    oppo: oppoError
      ? "確認對方得失分（已自動帶入，可直接送出）"
      : ours === null
        ? "選擇對方得失分類型（依前一步而定）"
        : ours.win
          ? "選擇對方失分類型"
          : "選擇對方得分類型",
  };

  /* 前一步驟資訊完成前，不能切換到下一步驟 */
  function canGoTo(i: number) {
    if (oppoError) return i === 0 || i === 1;
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
    // The single outcome auto-fills; jump to the confirm (outcome) step.
    setOppo("對方失誤（自動帶入）");
    setDirection("forward");
    setStepIdx(1);
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

  const oppoOptions = oppoError
    ? ["對方失誤（自動帶入）"]
    : ours === null
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

/* -------------------- Q5 mockup：entry 動作揭露（D12 定案：版本 B） -------------------- */

type Q5Entry = {
  text: string;
  home: number;
  away: number;
  win: boolean;
  by: string;
  time: string;
};

const Q5_ENTRIES: Q5Entry[] = [
  {
    text: "#5 攻擊＋ · 接發失誤",
    home: 8,
    away: 6,
    win: true,
    by: "小明",
    time: "14:02",
  },
  { text: "#3 發球−", home: 8, away: 7, win: false, by: "小華", time: "14:03" },
  { text: "對方失誤", home: 9, away: 7, win: true, by: "小明", time: "14:04" },
  {
    text: "#2 攔網＋ · 攻擊出界",
    home: 10,
    away: 7,
    win: true,
    by: "小華",
    time: "14:05",
  },
  {
    text: "#6 防守失誤−",
    home: 10,
    away: 8,
    win: false,
    by: "小明",
    time: "14:06",
  },
];

const Q5_VARIANTS = [
  {
    id: "A",
    label: "版本 A：tap＝動作鈕",
    verdict: "rejected",
    note: "tap 與左滑同一結果（開啟行內動作鈕）——最少 UI、零疊層，但揭露不了 recordedBy 等資訊",
  },
  {
    id: "B",
    label: "版本 B：tap＝行內展開",
    verdict: "adopted",
    note: "行下方就地展開資訊與完整動作，脈絡不離開清單；代價是行高變動、清單會跳動",
  },
  {
    id: "C",
    label: "版本 C：tap＝action sheet",
    verdict: "rejected",
    note: "行不變形、資訊與動作集中於底部 sheet；代價是 drawer 上再疊一層、脈絡離開清單",
  },
] as const;

function EntryActionsMockup() {
  const [variant, setVariant] =
    useState<(typeof Q5_VARIANTS)[number]["id"]>("B");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [revealIdx, setRevealIdx] = useState<number | null>(null);
  const [expandIdx, setExpandIdx] = useState<number | null>(null);
  const [sheetIdx, setSheetIdx] = useState<number | null>(null);
  const [explain, setExplain] = useState<string | null>(null);
  const pointerX = useRef<number | null>(null);
  const swiped = useRef(false);

  const lastIdx = Q5_ENTRIES.length - 1;

  function closeAll() {
    setRevealIdx(null);
    setExpandIdx(null);
    setSheetIdx(null);
    setExplain(null);
  }

  function rowTap(i: number) {
    /* 閒置態（drawer 收合）＝Preview：tap 只負責展開 drawer */
    if (!drawerOpen) {
      setDrawerOpen(true);
      return;
    }
    setExplain(null);
    if (variant === "A") {
      setRevealIdx((r) => (r === i ? null : i));
    } else if (variant === "B") {
      setRevealIdx(null);
      setExpandIdx((x) => (x === i ? null : i));
    } else {
      setRevealIdx(null);
      setSheetIdx(i);
    }
  }

  /* 最後一筆規則（D10）：僅最新 entry 有刪除；其餘以「退回重記」取代 */
  function tapDelete() {
    setExplain("（示意）刪除最後一筆：請求帶版本號，與 D9／D10 共用守衛");
  }

  function tapEdit(i: number) {
    setExplain(
      i === lastIdx
        ? "（示意）進入 D8 輸入流程帶入既有資料；改勝負（T2）僅限最後一筆"
        : "（示意）進入編輯：非最後一筆僅能改球員／球種（T1），改勝負走退回重記",
    );
  }

  function tapTruncate(i: number) {
    setExplain(
      `（示意）退回重記至此：刪除第 ${i + 1} 筆起共 ${Q5_ENTRIES.length - i} 筆他人可能記的 entries，需 destructive 確認卡（D10）`,
    );
  }

  /* 動作組：編輯＋（最新一筆）刪除／（其餘）退回重記；full＝展開／sheet 版 */
  function renderActions(i: number, full?: boolean) {
    const isLast = i === lastIdx;
    return (
      <div className={cn("flex items-center gap-1", full && "w-full")}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            tapEdit(i);
          }}
          className={cn(
            "rounded-md border border-[var(--border)] bg-[var(--color-fd-card)] px-2 py-1 text-[10px]",
            full && "flex-1",
          )}
        >
          編輯
        </button>
        {isLast ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              tapDelete();
            }}
            className={cn(
              "rounded-md border border-[var(--destructive)] bg-[color-mix(in_oklch,var(--destructive)_10%,transparent)] px-2 py-1 text-[10px] text-[var(--destructive)]",
              full && "flex-1",
            )}
          >
            刪除
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              tapTruncate(i);
            }}
            className={cn(
              "rounded-md border border-[var(--destructive)] bg-[var(--color-fd-card)] px-2 py-1 text-[10px] text-[var(--destructive)]",
              full && "flex-1",
            )}
          >
            {full ? "退回重記至此" : "退回重記"}
          </button>
        )}
      </div>
    );
  }

  const sheetEntry = sheetIdx === null ? null : Q5_ENTRIES[sheetIdx];

  return (
    <div className="not-prose my-4 rounded-2xl border border-[var(--border)] p-4">
      <style>{`
        @keyframes mock-sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .mock-sheet-up { animation: 250ms ease mock-sheet-up; }
      `}</style>
      <div className="mb-2 flex flex-wrap gap-2">
        {Q5_VARIANTS.map((v) => (
          <Pill
            key={v.id}
            active={variant === v.id}
            onClick={() => {
              setVariant(v.id);
              closeAll();
            }}
          >
            {v.label}
          </Pill>
        ))}
      </div>
      <p className="m-0 mb-3 flex flex-wrap items-start gap-1.5 text-[12px] text-[var(--color-fd-muted-foreground)]">
        <VerdictBadge
          verdict={Q5_VARIANTS.find((v) => v.id === variant)!.verdict}
        />
        <span className="min-w-0 flex-1">
          {Q5_VARIANTS.find((v) => v.id === variant)!.note}
          。Preview 即 drawer 上緣——點把手或 Preview 展開，最新 entry
          隨上緣升起成為清單第一筆；展開後左滑任一行顯示動作鈕（所有版本通用），tap
          行為依版本而異。
        </span>
      </p>
      <div className="mx-auto flex h-96 w-60 flex-col gap-2 rounded-[20px] border-4 border-[var(--color-fd-foreground)] p-2">
        <div className="text-center font-mono text-lg font-bold">10–8</div>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {/* 記錄 panel 佔位：drawer 升起時覆蓋此區 */}
          <div className="flex h-full items-center justify-center rounded-lg border border-[var(--border)] text-[11px] text-[var(--color-fd-muted-foreground)]">
            （記錄 panel）
          </div>
          {/* Summary drawer：Preview 即 drawer 上緣——閒置時僅露出把手＋最新
              entry（＝Preview）；展開時整體上移，最新 entry 隨上緣升起、
              原地成為 summary 的第一筆 */}
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 flex h-full flex-col rounded-t-xl border border-[var(--border)] bg-[var(--color-fd-card)] p-1.5 shadow-lg transition-transform duration-300",
              drawerOpen ? "translate-y-0" : "translate-y-[calc(100%-3.5rem)]",
            )}
          >
            <button
              aria-expanded={drawerOpen}
              aria-label={drawerOpen ? "收合記錄清單" : "展開記錄清單"}
              onClick={() => {
                setDrawerOpen((o) => !o);
                closeAll();
              }}
              className="shrink-0 pb-1.5"
            >
              <span className="mx-auto block h-1 w-8 rounded-full bg-[var(--color-fd-muted)]" />
            </button>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {Q5_ENTRIES.map((en, i) => (
                <div
                  key={i}
                  className="shrink-0 overflow-hidden rounded-md border border-[var(--border)]"
                >
                  {/* 內層獨立裁切左滑動作層，避免版本 B 展開時動作層跟著長高 */}
                  <div className="relative overflow-hidden">
                    {/* 左滑揭露的動作鈕層（行內容後方） */}
                    <div className="absolute inset-y-0 right-1 flex items-center">
                      {renderActions(i)}
                    </div>
                    <div
                      className={cn(
                        "relative flex h-9 touch-pan-y items-center gap-1 bg-[var(--color-fd-card)] px-1.5 transition-transform duration-200",
                        revealIdx === i &&
                          (i === lastIdx
                            ? "-translate-x-[5.5rem]"
                            : "-translate-x-[6.75rem]"),
                      )}
                      onPointerDown={(e) => {
                        pointerX.current = e.clientX;
                      }}
                      onPointerMove={(e) => {
                        /* 拖曳意圖（>8px）才 capture，點按不受影響（同 Q1） */
                        if (pointerX.current === null) return;
                        if (e.currentTarget.hasPointerCapture(e.pointerId))
                          return;
                        if (Math.abs(e.clientX - pointerX.current) > 8) {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        }
                      }}
                      onPointerUp={(e) => {
                        if (pointerX.current === null) return;
                        const dx = e.clientX - pointerX.current;
                        pointerX.current = null;
                        if (!drawerOpen) return;
                        if (Math.abs(dx) < 40) return;
                        swiped.current = true;
                        setExplain(null);
                        setRevealIdx(dx < 0 ? i : null);
                      }}
                      onClickCapture={(e) => {
                        if (!swiped.current) return;
                        swiped.current = false;
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={() => rowTap(i)}
                    >
                      <ScoreFig
                        value={en.home}
                        tone={en.win ? "primary" : "muted"}
                      />
                      <ScoreFig
                        value={en.away}
                        tone={en.win ? "muted" : "destructive"}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate border-l-2 pl-1 text-[11px]",
                          en.win
                            ? "border-[var(--primary)]"
                            : "border-[var(--destructive)]",
                        )}
                      >
                        {en.text}
                      </span>
                      {i === lastIdx && (
                        <span className="shrink-0 text-[9px] text-[var(--color-fd-muted-foreground)]">
                          最後一筆
                        </span>
                      )}
                    </div>
                  </div>
                  {/* 版本 B：行內展開（資訊＋完整動作） */}
                  {variant === "B" && expandIdx === i && (
                    <div className="mock-preview-in flex flex-col gap-1.5 border-t border-[var(--border)] bg-[color-mix(in_oklch,var(--color-fd-muted)_40%,transparent)] p-1.5">
                      <div className="text-[10px] text-[var(--color-fd-muted-foreground)]">
                        記錄者 {en.by} · {en.time}
                      </div>
                      {renderActions(i, true)}
                    </div>
                  )}
                </div>
              )).reverse()}
              <div className="shrink-0 py-1 text-center text-[9px] text-[var(--color-fd-muted-foreground)]">
                —— 比賽開始 ——
              </div>
            </div>
            {/* explain-on-tap 回饋（版本 C 開 sheet 時改顯示於 sheet 內） */}
            {explain && (variant !== "C" || sheetIdx === null) && (
              <div
                key={explain}
                className="mock-preview-in mt-1 shrink-0 text-center text-[9px] text-[var(--destructive)]"
              >
                {explain}
              </div>
            )}
            {/* 版本 C：action sheet（drawer 上再疊一層） */}
            {variant === "C" && sheetEntry && sheetIdx !== null && (
              <div
                className="absolute inset-0 z-20 flex flex-col justify-end overflow-hidden rounded-t-xl"
                onClick={() => {
                  setSheetIdx(null);
                  setExplain(null);
                }}
              >
                <div className="absolute inset-0 bg-black/25" />
                <div
                  className="mock-sheet-up relative flex flex-col gap-1.5 rounded-t-xl border-t border-[var(--border)] bg-[var(--color-fd-card)] p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    <ScoreFig
                      value={sheetEntry.home}
                      tone={sheetEntry.win ? "primary" : "muted"}
                    />
                    <ScoreFig
                      value={sheetEntry.away}
                      tone={sheetEntry.win ? "muted" : "destructive"}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate border-l-2 pl-1 text-[11px]",
                        sheetEntry.win
                          ? "border-[var(--primary)]"
                          : "border-[var(--destructive)]",
                      )}
                    >
                      {sheetEntry.text}
                    </span>
                  </div>
                  <div className="text-[10px] text-[var(--color-fd-muted-foreground)]">
                    記錄者 {sheetEntry.by} · {sheetEntry.time}
                  </div>
                  {renderActions(sheetIdx, true)}
                  {explain && (
                    <div
                      key={explain}
                      className="mock-preview-in text-center text-[9px] text-[var(--destructive)]"
                    >
                      {explain}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- 頁面 ----------------------------------- */

export const toc = [
  { title: "D8：entry 輸入 UI", url: "#d8", depth: 2 },
  {
    title: "Q0 mockup：progress bar 樣式（已定案）",
    url: "#q0-mockup",
    depth: 2,
  },
  {
    title: "Q1 mockup：entry 進度條與 Preview 送出（已定案）",
    url: "#q1-mockup",
    depth: 2,
  },
  { title: "D12：entry 編輯／刪除入口", url: "#d12", depth: 2 },
  {
    title: "Q5 mockup：entry 動作揭露（已定案）",
    url: "#q5-mockup",
    depth: 2,
  },
];

export default function Design() {
  return (
    <div>
      <h2 id="d8">D8：entry 輸入 UI</h2>
      <p>
        entry-ui 交付 sync-recording discuss 階段定案的 D8（輸入流程）與
        D12（Summary
        編輯／刪除入口）兩項純前端決策，可獨立於後端同步先行上線。點擊卡片展開採用理由與棄用選項。
      </p>
      <DecisionCard decision={DECISIONS[0]} />

      <h2 id="q0-mockup">Q0 mockup：progress bar 樣式（已定案：樣式 5）</h2>
      <ProgressBarStyles />

      <h2 id="q1-mockup">
        Q1 mockup：entry 進度條與 Preview 送出（已定案，見 D8）
      </h2>
      <p>
        進度條涵蓋全流程三步驟（含球員選擇），每步附說明文字；切換靠點選進度條或左右滑動
        panel（沿用 tab-container 的方向性滑動動畫，此行為未來將成為 panel
        的預設功能），且前一步驟完成前不能切換到下一步。送出由底部 chat-input
        式的 Preview 承載：閒置時顯示上一筆 entry、輸入中顯示 draft，三步完成後
        highlight 並浮現 send icon（全介面唯一 highlight）；送出＝「角色轉換」——
        draft 內容原地成為上一筆（附上結果比分），ring 與 icon 淡出、比分閃爍。
      </p>
      <ProgressMockup />

      <h2 id="d12">D12：entry 編輯／刪除入口</h2>
      <DecisionCard decision={DECISIONS[1]} />

      <h2 id="q5-mockup">
        Q5 mockup：entry 動作揭露（已定案：版本 B，見 D12）
      </h2>
      <p>
        前提變動：Summary（entry 清單）從 Options dialog 獨立出來，改為以
        Preview 為上緣、自底部升起的 drawer——閒置時只露出把手與最新
        entry（即現在的 Preview），展開時最新 entry
        隨上緣升起、原地成為清單第一筆；Summary 因此離開 panel，左滑手勢不再與
        panel 滑動衝突。drawer 內每筆 entry 支援左滑顯示動作鈕；整行 tap
        亦可揭露動作與資訊，tap 的揭露形式有三個版本（Pill 切換比較，版本 B
        定案）。揭露內容：動作＝編輯＋（最新一筆）刪除／（其餘）
        退回重記至此——最後一筆規則直接反映在按鈕組成上；資訊＝recordedBy（D5）
        與時間。與 D8 送出的手勢分工：閒置時 tap Preview＝展開 drawer；輸入中
        tap 僅處理送出（未完成則無作用），把手恆為 drawer
        開關——輸入中以把手展開時，draft 以輸入中樣式（pulse）
        隨上緣升起佔據清單第一列，送出定格後原地轉為正式第一筆。
      </p>
      <EntryActionsMockup />
    </div>
  );
}
