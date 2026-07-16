"use client";

// elevation-depth-system — interactive design page.
//
// The centerpiece is the overlay lab: a realistic mock of the game recording
// screen (header / court / panel / drawer peek) with each overlay component
// (Dialog / AlertDialog / Drawer) rendered over it, switchable between the
// candidate surface tokens and ring on/off, side by side in light and dark.
// All colors come from the shared src/styles/tokens.css via the .light/.dark
// scopes — the mock shows the real design system, not an illustration of it.

import { useState } from "react";

type OverlayKind = "dialog" | "alert" | "drawer";
type Surface = "background" | "card";

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

const decisions = [
  {
    id: "D1",
    title: "以表面角色決定圖層；modal 類一律用 bg-card",
    body: "已定案（2026-07-16）：Layer 0（--background）＝頁面本體。Layer 0.5（--popover）＝無 overlay 的浮動面（Popover、Select）。Layer 1（--card）＝ Card / Item ＋所有 modal 類（Dialog、AlertDialog、Drawer）— modal 與頁面的分離由 scrim 表達（D5），共用 card 色讓 drawer peek 與頁面 card 系統（panel/header）全生命週期連續，且全系統只有一種 modal 色。modal 內的 card 類靠 shadow 補償識別。",
  },
  {
    id: "D2",
    title: "亮度即高度（elevation = lighter）",
    body: "light 模式三層由暗到亮：background 95.6% → popover ~97% → card 98.45%；dark 模式反轉：4.9% → ~10% → 14.5%。具體 HSL 是調校旋鈕，順序是契約。",
  },
  {
    id: "D3",
    title: "Content 不帶 padding；Body 是唯一捲動容器",
    body: "三段式結構：Header / Body / Footer 各自持有 padding；Content 本身 overflow-hidden、無 padding，桌面上捲軸貼齊視窗邊緣。",
  },
  {
    id: "D4",
    title: "統一 close/expand 控制群 + srOnly",
    body: "DialogContent 內建 absolute top-3 right-3 的 size-8 控制群；Title/Description 增加 srOnly prop，取代散落的 sr-only className 與 aria-describedby={undefined}。",
  },
  {
    id: "D5",
    title: "容器一律不帶 ring（深度由 scrim、背景階差與陰影表達）",
    body: "已定案（2026-07-16，Lab B）：modal/popover/card 都是容器，ring 策略統一為全無。overlay 面靠 scrim、popover 靠背景階差 + shadow-md、card 靠背景階差 + 陰影；--ring 只保留給 focus-visible。card 類落在同色表面時的補償是 shadow、不是 ring。範圍因此擴大到 popover/select/card/item 的裝飾性 ring 移除。",
  },
  {
    id: "D6",
    title:
      "AlertDialog / Drawer 收斂到共用 shell；AlertDialog 保留 dismiss 語意",
    body: "兩者皆為 overlay-backed，採用 bg-card 表面（D1）、no-ring、三段式結構與 srOnly。AlertDialogContent 由 bg-background 遷移至 bg-card；Drawer 維持 bg-card 不需改動。AlertDialog 不採用 close/expand 控制群，也不開放 outside-click / Esc 關閉 — 仍要求明確的取消/確認選擇。",
  },
  {
    id: "D7",
    title: "design-system 頁面是本 change 的成品",
    body: "blueprint 的 design-system section（brand / color / typography / spacing / radius / elevation-depth）直接渲染共用 tokens，取代 docs/design-system.md 的過時文字成為 source of truth。",
  },
];

// ---------------------------------------------------------------------------
// Phone mock — the game recording screen, built from real tokens
// ---------------------------------------------------------------------------

function GameScreen({ cardRing = false }: { cardRing?: boolean }) {
  const ringClass = cardRing ? "border-border border" : "";
  return (
    <div className="flex h-full flex-col gap-1 bg-background p-1.5 pt-2 text-foreground">
      {/* header: set score */}
      <div className="flex items-center justify-between px-1.5 pb-1">
        <span className="text-[0.5rem] opacity-70">我方</span>
        <span className="text-sm leading-none font-bold tabular-nums">
          9 – 8
        </span>
        <span className="text-[0.5rem] opacity-70">對方</span>
      </div>
      {/* court */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-muted">
        <div className="absolute inset-1.5 rounded-sm border border-foreground/25" />
        <div className="absolute top-1.5 bottom-1.5 left-1/2 w-px bg-foreground/25" />
      </div>
      {/* panel: progress + caption + moves grid */}
      <div
        className={`flex min-h-0 flex-1 flex-col gap-1 rounded-md bg-card p-1.5 ${ringClass}`}
      >
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 rounded-full bg-primary" />
        </div>
        <span className="text-center text-[0.45rem] opacity-70">
          選擇球員或對方失誤
        </span>
        <div className="grid flex-1 grid-cols-2 gap-1">
          {["攻擊", "攔網", "發球", "接發", "防守", "舉球"].map((m) => (
            <div
              key={m}
              className="flex items-center justify-center rounded-sm bg-secondary text-[0.5rem] text-secondary-foreground"
            >
              {m}
            </div>
          ))}
        </div>
      </div>
      {/* drawer idle peek */}
      <div className="-mx-1.5 -mb-1.5 rounded-t-[6px] bg-card px-1.5 pt-1 pb-1.5">
        <div className="mx-auto mb-1 h-0.5 w-6 rounded-full bg-muted-foreground/40" />
        <div className="h-4 w-full rounded-sm bg-secondary" />
      </div>
    </div>
  );
}

function surfaceClass(surface: Surface) {
  return surface === "background" ? "bg-background" : "bg-card";
}

function OverlayMock({
  kind,
  surface,
  ring,
}: {
  kind: OverlayKind;
  surface: Surface;
  ring: boolean;
}) {
  const ringClass = ring ? "border-border border" : "";
  const surf = `${surfaceClass(surface)} text-foreground ${ringClass}`;

  if (kind === "drawer") {
    return (
      <div
        className={`absolute inset-x-0 bottom-0 flex h-[62%] flex-col rounded-t-[6px] ${surf}`}
      >
        <div className="mx-auto mt-1 h-0.5 w-6 rounded-full bg-muted-foreground/40" />
        <div className="flex min-h-0 flex-1 flex-col gap-1 p-1.5">
          {["15 攻擊 得分", "3 攔網 失誤", "9 發球 得分"].map((row, i) => (
            <div
              key={i}
              className="flex items-center rounded-sm border border-border/60 bg-card px-1.5 py-1 text-[0.5rem]"
            >
              {row}
            </div>
          ))}
        </div>
        <div className="p-1.5 pt-0">
          <div className="flex h-4 items-center justify-center rounded-sm bg-primary text-[0.5rem] text-primary-foreground">
            送出
          </div>
        </div>
      </div>
    );
  }

  if (kind === "alert") {
    return (
      <div
        className={`absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-md ${surf}`}
      >
        <div className="p-2 pb-1">
          <div className="text-[0.55rem] font-semibold">確定要離開？</div>
          <div className="mt-0.5 text-[0.45rem] opacity-70">
            尚未儲存的變更將會遺失。
          </div>
        </div>
        <div className="flex justify-end gap-1 p-2 pt-1">
          <div className="rounded-sm bg-secondary px-1.5 py-0.5 text-[0.5rem] text-secondary-foreground">
            取消
          </div>
          <div className="rounded-sm bg-destructive px-1.5 py-0.5 text-[0.5rem] text-destructive-foreground">
            捨棄
          </div>
        </div>
      </div>
    );
  }

  // dialog
  return (
    <div
      className={`absolute inset-x-2 top-[12%] flex h-[70%] flex-col overflow-hidden rounded-md ${surf}`}
    >
      <div className="flex items-start justify-between p-2 pb-1">
        <span className="text-[0.55rem] font-semibold">比賽設定</span>
        <span className="text-[0.55rem] leading-none opacity-60">✕</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-2 pb-2">
        {["陣容設定", "位置調整", "自由球員"].map((row) => (
          <div
            key={row}
            className="rounded-sm border border-border/60 bg-card px-1.5 py-1.5 text-[0.5rem]"
          >
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function PhoneFrame({
  scope,
  label,
  kind,
  surface,
  ring,
}: {
  scope: "light" | "dark";
  label: string;
  kind: OverlayKind;
  surface: Surface;
  ring: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${scope} relative aspect-[9/17] w-full max-w-56 overflow-hidden rounded-xl border border-border`}
      >
        <GameScreen />
        {/* scrim + overlay surface */}
        <div className="absolute inset-0 bg-black/80" />
        <OverlayMock kind={kind} surface={surface} ring={ring} />
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// Non-overlay containers on the live page (no scrim): a popover-style float
// and the panel's card, both with the ring toggled, for the unified-ring
// open question.
function NonOverlayFrame({
  scope,
  label,
  ring,
}: {
  scope: "light" | "dark";
  label: string;
  ring: boolean;
}) {
  const ringClass = ring ? "border-border border" : "";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`${scope} relative aspect-[9/17] w-full max-w-56 overflow-hidden rounded-xl border border-border`}
      >
        <GameScreen cardRing={ring} />
        {/* popover-style float over live content — no scrim */}
        <div
          className={`absolute top-[18%] right-2 flex w-24 flex-col gap-0.5 rounded-md bg-popover p-1 text-foreground shadow-md ${ringClass}`}
        >
          {["編輯", "複製", "刪除"].map((row) => (
            <div key={row} className="rounded-sm px-1.5 py-1 text-[0.5rem]">
              {row}
            </div>
          ))}
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <div className="flex overflow-hidden rounded-md border border-border">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-2.5 py-1 text-xs transition-colors ${
              o.value === value
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground hover:bg-accent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ElevationDepthSystemDesign() {
  const [kind, setKind] = useState<OverlayKind>("drawer");
  const [surface, setSurface] = useState<Surface>("card");
  const [ring, setRing] = useState(false);
  const [nonOverlayRing, setNonOverlayRing] = useState(true);

  return (
    <div>
      <h2 id="decisions">已定案決策</h2>
      <div className="my-4 flex flex-col gap-3">
        {decisions.map((d) => (
          <div key={d.id} className="rounded-lg border border-border p-3">
            <div className="text-sm font-semibold">
              <span className="mr-2 text-primary">{d.id}</span>
              {d.title}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
          </div>
        ))}
      </div>

      <h2 id="overlay-lab">Overlay lab：真實畫面上的變體比較</h2>
      <p>
        以紀錄畫面（header / court / panel / drawer peek）為底，將三種 overlay
        元件疊在 scrim 上，切換表面 token 與 ring。所有顏色都來自 app tokens 的凍結副本（{" "}
        <code>src/styles/tokens.css</code>，定案後複製），左右兩框分別鎖定 light / dark。
      </p>
      <div className="my-4 flex flex-col gap-2">
        <Segmented
          label="元件"
          value={kind}
          onChange={setKind}
          options={[
            { value: "drawer", label: "Drawer" },
            { value: "dialog", label: "Dialog" },
            { value: "alert", label: "AlertDialog" },
          ]}
        />
        <Segmented
          label="表面"
          value={surface}
          onChange={setSurface}
          options={[
            { value: "background", label: "bg-background" },
            { value: "card", label: "bg-card" },
          ]}
        />
        <Segmented
          label="ring"
          value={ring ? "on" : "off"}
          onChange={(v) => setRing(v === "on")}
          options={[
            { value: "off", label: "無 ring" },
            { value: "on", label: "有 ring" },
          ]}
        />
      </div>
      <div className="my-4 grid grid-cols-2 gap-4">
        <PhoneFrame
          scope="light"
          label="Light"
          kind={kind}
          surface={surface}
          ring={ring}
        />
        <PhoneFrame
          scope="dark"
          label="Dark"
          kind={kind}
          surface={surface}
          ring={ring}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        依 D5，有 scrim 的面不該有 ring —「有 ring」選項放在這裡是為了對照：
        切過去可以看到雙重邊框感，切回來即是規則要的樣子。
      </p>

      <h2 id="ring-lab">Lab B：非 overlay 容器的 ring（Popover / Card）</h2>
      <p>
        modal、popover、card 都是乘載內容的容器，ring 策略應該統一（全有或全
        無）。這裡把無 scrim 的兩類容器放回真實頁面：右上是 popover 式浮動選單
        （bg-popover + shadow-md），中段 panel 是 card（bg-card）。切換 ring 觀
        察：拿掉 ring 之後，popover 是否僅靠背景階差 + 陰影就能與底下內容分離。
      </p>
      <div className="my-4 flex flex-col gap-2">
        <Segmented
          label="ring"
          value={nonOverlayRing ? "on" : "off"}
          onChange={(v) => setNonOverlayRing(v === "on")}
          options={[
            { value: "off", label: "無 ring" },
            { value: "on", label: "有 ring" },
          ]}
        />
      </div>
      <div className="my-4 grid grid-cols-2 gap-4">
        <NonOverlayFrame scope="light" label="Light" ring={nonOverlayRing} />
        <NonOverlayFrame scope="dark" label="Dark" ring={nonOverlayRing} />
      </div>
      <p className="text-sm text-muted-foreground">
        已定案（D5）：全無 ring。範圍擴大到 popover.tsx / select.tsx /
        card.tsx / item.tsx 的裝飾性 ring 移除；--ring 只保留給
        focus-visible。上方切到「有 ring」即是被否決的樣子，留作對照。
      </p>

      <h2 id="drawer-question">已定案：modal 類一律 bg-card</h2>
      <p>
        原 open question：Drawer 落在 <code>bg-card</code>，但舊 D1 規則說
        overlay-backed 屬於 layer 0（<code>bg-background</code>）。定案
        （2026-07-16）：<strong>所有 modal 類（Dialog / AlertDialog / Drawer）
        都用 bg-card</strong>，關鍵理由是 Drawer peek 的生命週期連續性。上方
        lab 切換兩個表面即是當時的並排比較（bg-card 為定案預設）：
      </p>
      <ul>
        <li>
          <strong>bg-background（規則派）</strong>：與 Dialog / AlertDialog
          同層，sheet 內的 entry
          row（bg-card）自然浮起，與全頁時的層級關係一致。
        </li>
        <li>
          <strong>bg-card（現狀派）</strong>：sheet 本身較亮、較「抽屜感」，但
          內部的 card 元素與表面同色，需要額外的 border/shadow 補償 — 正是這個
          change 要移除的 per-component hack。
        </li>
      </ul>
      <p>
        取捨：card 內元素同色的識別問題由 D5 的 shadow 補償規則統一解決
        （globals.css 的 shadow-suppression 反轉為恢復 shadow）；
        AlertDialogContent 由 bg-background 遷移至 bg-card。已回填{" "}
        <code>design.md</code> D1/D6、兩份 spec 與 <code>tasks.md</code>。
      </p>
    </div>
  );
}

export const toc = [
  { title: "已定案決策", url: "#decisions", depth: 2 },
  { title: "Overlay lab：真實畫面上的變體比較", url: "#overlay-lab", depth: 2 },
  {
    title: "Lab B：非 overlay 容器的 ring（Popover / Card）",
    url: "#ring-lab",
    depth: 2,
  },
  { title: "已定案：modal 類一律 bg-card", url: "#drawer-question", depth: 2 },
];
