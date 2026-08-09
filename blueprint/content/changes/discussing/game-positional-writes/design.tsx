"use client";

import { useState } from "react";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";

import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import { FileTour } from "@/components/FileTour";
import { InteractiveFlowchart } from "@/components/InteractiveFlowchart";
import { RiskTable } from "@/components/RiskTable";
import { Scenario } from "@/components/Scenario";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const toc = [
  { title: "現況：一顆球走過的路", url: "#context", depth: 2 },
  { title: "名詞說明", url: "#concepts", depth: 2 },
  { title: "問題落在哪條路徑上", url: "#pressure-matrix", depth: 2 },
  { title: "D0 — 與資料庫選型的相依", url: "#d0", depth: 2 },
  { title: "以陣列位置定址安全嗎", url: "#addressing", depth: 2 },
  { title: "D1 — 統計該儲存還是該推導", url: "#d1", depth: 2 },
  { title: "repository 該開幾個入口", url: "#granularity", depth: 2 },
  { title: "若改用關聯式資料庫會怎樣", url: "#relational", depth: 2 },
  { title: "其他 domain 為何不納入", url: "#other-domains", depth: 2 },
  { title: "D2 — 範圍邊界", url: "#d2", depth: 2 },
  { title: "D3 — 既有 update() 的去留", url: "#d3", depth: 2 },
  { title: "D4 — 共用規則落在哪一層", url: "#d4", depth: 2 },
  { title: "D5 — 既有 stats 欄位的處置", url: "#d5", depth: 2 },
  { title: "D6 — 前後端是否共用 entities", url: "#d6", depth: 2 },
  { title: "D7 — set.win / game.win 由誰寫入", url: "#d7", depth: 2 },
  { title: "介面與 usecase 的實際改動", url: "#diffs", depth: 2 },
  { title: "核心流程走查", url: "#walkthrough", depth: 2 },
  { title: "分層稽核", url: "#layer-audit", depth: 2 },
  { title: "三條可驗證的約束", url: "#constraints", depth: 2 },
  { title: "錯誤模型的變化", url: "#error-model", depth: 2 },
  { title: "風險", url: "#risks", depth: 2 },
];

/* ---------------------------------------------------------------- 共用元件 */

/** `lang` opts into shiki highlighting; omit it for the arrow-notation blocks
 * that are prose rather than code. */
function Code({ children, lang }: { children: string; lang?: string }) {
  if (lang) return <DynamicCodeBlock lang={lang} code={children} />;
  return (
    <pre className="my-0 overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-4 border-l-warning bg-warning/5 py-2 pl-4">
      <p className="m-0 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

type Level = "high" | "medium" | "low" | "none";

const LEVEL_LABEL: Record<Level, string> = {
  high: "高",
  medium: "中",
  low: "低",
  none: "不適用",
};

const LEVEL_CLASS: Record<Level, string> = {
  high: "border-destructive/40 bg-destructive/10 text-destructive",
  medium: "border-warning/40 bg-warning/10 text-warning",
  low: "border-border bg-muted/40 text-muted-foreground",
  none: "border-border bg-transparent text-muted-foreground",
};

function LevelBadge({ level }: { level: Level }) {
  return (
    <Badge variant="outline" className={cn("font-mono", LEVEL_CLASS[level])}>
      {LEVEL_LABEL[level]}
    </Badge>
  );
}

/* --------------------------------------------------------- 現況寫入流程圖 */

const FLOW_NODES = [
  { id: "route", label: "POST /sets/rallies", x: 130, y: 50, w: 200 },
  { id: "find", label: "findById(gameId)", x: 130, y: 150, w: 200 },
  { id: "helper", label: "createRallyHelper", x: 130, y: 250, w: 200 },
  { id: "update", label: "update(id, game)", x: 130, y: 350, w: 200 },
  { id: "mongo", label: "$set 整份文件", x: 430, y: 350, w: 180 },
  { id: "window", label: "lost update 窗口", x: 430, y: 150, w: 190, h: 44 },
  { id: "reject", label: "整個 sets 路徑被拒", x: 430, y: 460, w: 200, h: 44 },
];

const FLOW_EDGES = [
  { from: "route", to: "find" },
  { from: "find", to: "helper", label: "整份 Game" },
  { from: "helper", to: "update", label: "改好的整份 Game" },
  { from: "update", to: "mongo" },
  { from: "find", to: "window", dashed: true },
  { from: "mongo", to: "reject", dashed: true, label: "任一 leaf cast 失敗" },
];

const FLOW_DETAILS = {
  route: {
    title: "POST /api/games/[gameId]/sets/rallies",
    body: "controller 解出 si / ei 與 rally body，交給 CreateRallyUseCase。這一層在本 Change 不變。",
  },
  find: {
    title: "findById(gameId)",
    body: "讀出整份 game 文件並映射成 domain 物件——所有局、所有 entry、兩隊名單與統計。一場三局的比賽在第 25 分時，這裡讀出的是含 70 餘顆球的完整文件。",
  },
  helper: {
    title: "createRallyHelper",
    body: "就地修改整個 game 物件：累加該球員與該隊的統計、必要時 +1 rotation、把 entry 放進 set.entries[entryIndex]。它同時被前端 Redux 樂觀更新使用，這是 D4 的來源。",
  },
  update: {
    title: "IGameRepository.update(id, Partial<Game>)",
    body: "唯一的寫入入口。五個 game usecase 全部呼叫它，語意是「這是改好的文件，請覆寫」——沒有表達出呼叫端實際做了什麼領域操作。",
  },
  mongo: {
    title: "findByIdAndUpdate(id, { $set: toGameDoc(data) })",
    body: "toGameDoc 把整份 domain 物件轉成持久化形狀，Mongoose 對整份文件做 cast，然後整份覆寫。寫入量與已記錄的球數成正比。",
  },
  window: {
    title: "read-modify-write 的窗口",
    body: "findById 與 update 之間，另一個寫入者可能已經寫入。兩個寫入者各自帶著自己讀到的快照整份覆寫，後寫的無聲蓋掉先寫的。目前流程大多循序所以沒出事，但這是結構性的，不是被防住的。",
  },
  reject: {
    title: "爆炸半徑",
    body: "sets 是 subdocument array，任一 leaf cast 失敗時 Mongoose 把整個元素包成 Cast to embedded failed，拒絕整個 sets 路徑的寫入。已知的實例：對手側一個空字串，讓那一局已記錄的所有 entry 一起存不進去。",
  },
};

/* ------------------------------------------------ 一顆球實際寫進去什麼 */

const PAYLOAD_TODAY = `// 第 25 分那一球，實際送往資料庫的 update payload
{
  $set: {
    info: { /* 賽事資訊，本次沒改 */ },
    teams: {
      home: { name, players: [ /* 14 名球員 × 每人 stats[] */ ], lineup, staffs },
      away: { name, players: [ /* … */ ], lineup, staffs },
    },
    sets: [
      { win, lineups, options, entries: [ /* 已記錄的 24 顆球 */ , 第25顆 ] },
      { /* 第二局 */ },
      { /* 第三局 */ },
    ],
  },
}
// 實際改變的只有：sets[0].entries 多一個元素、
// teams.home.players[3].stats[0][3].success 從 4 變 5、
// teams.home.stats[0].rotation 從 2 變 3。`;

const PAYLOAD_STORED_STATS = `// 定位寫入，統計仍然儲存（D1-A）
{
  $push: { "sets.0.entries": entry },
  $inc: {
    "teams.home.players.$[p].stats.0.3.success": 1,  // MoveType.ATTACK
    "teams.home.stats.0.rotation": 1,
  },
}
arrayFilters: [{ "p.playerId": ObjectId("…") }]
// cast 只作用在 entry 本身；$inc 原子累加。
// 代價：多一組必須與 entries 保持一致的寫入路徑。`;

const PAYLOAD_DERIVED = `// 定位寫入，統計由 entries 推導（D1-B）
{
  $push: { "sets.0.entries": entry },
}
// 就這樣。沒有 $inc、沒有欄位路徑、沒有 arrayFilters。
// 統計是 entries 的投影，不是另一份要維護的狀態。`;

/* ------------------------------------------------------------------ 名詞說明 */

const CONCEPTS = [
  {
    path: "定位寫入（positional write）",
    summary:
      "不把整份文件送回去覆寫，而是告訴資料庫「在這個位置做這件事」。$push 是往指定陣列尾端加一個元素，$inc 是把指定欄位加上一個數，$set 搭配路徑是只改那一個欄位。資料庫在自己內部完成這些操作，中間沒有任何空隙讓別人插進來，所以它是原子的；而「讀出來、改一改、整份寫回去」中間那段時間，別人可以插進來。",
    code: `// 讀改寫：兩個寫入者各自讀到 score = 10，各自 +1，最後是 11 而不是 12
const game = await find(id);
game.score += 1;
await overwrite(id, game);

// 定位寫入：資料庫自己加，兩次都算到，結果是 12
await update(id, { $inc: { score: 1 } });`,
    lang: "ts",
  },
  {
    path: "arrayFilters",
    summary:
      "當要改的東西在陣列裡，而你不知道（或不該依賴）它的位置時，用 arrayFilters 描述「符合這個條件的那一個元素」。$[p] 是佔位符，arrayFilters 說明 p 是誰。這是 MongoDB 官方建議的做法，用來避免以陣列索引硬編位置。",
    code: `// 用位置：第 3 個球員——但陣列一重排就是別人了
{ $inc: { "players.3.stats.0.3.success": 1 } }

// 用識別：playerId 等於這個人的那一個元素
{ $inc: { "players.$[p].stats.0.3.success": 1 } }
arrayFilters: [{ "p.playerId": ObjectId("…") }]`,
    lang: "js",
  },
  {
    path: "MongoDB change stream",
    summary:
      "MongoDB 提供的訂閱介面：應用程式對資料庫說「這個 collection 有任何變動就通知我」，資料庫便持續推送變更事件（哪份文件、什麼操作、改了什麼）。它讀的是 MongoDB 內部的複製記錄（oplog），所以拿到的是已經確定寫入的變更，不會漏掉也不需要輪詢。同步記錄要把「另一台裝置剛記了一顆球」推給其他人時，這是資料層的來源。**目前的 codebase 完全沒有使用它**——沒有 watch()、沒有 SSE route、沒有任何即時傳輸相依套件；它是 v0.20.0 同步記錄規劃中的方案，尚未落地。",
    code: `// 應用程式端大致長這樣
const stream = Game.watch([{ $match: { "documentKey._id": gameId } }]);
for await (const change of stream) {
  sse.send(change);   // 轉發給正在觀看這場比賽的連線
}`,
    lang: "ts",
  },
  {
    path: "PostgreSQL logical replication",
    summary:
      "PostgreSQL 原本用來把一個資料庫的變更複製到另一個資料庫的機制，但它的變更串流可以被應用程式直接訂閱。概念上與 change stream 對等：都是「從資料庫的寫入記錄讀出已確定的變更」。差別在 PostgreSQL 這條路需要多一點設定（replication slot、輸出外掛、通常再搭一個像 Debezium 的工具），不像 change stream 是一行 watch() 就有。",
    code: `-- 建立一個 publication（要發布哪些表的變更）
CREATE PUBLICATION game_changes FOR TABLE entries;
-- 應用程式透過 replication slot 讀取這條串流，
-- 實務上多半交給 Debezium / wal2json 之類的工具處理格式。`,
    lang: "sql",
  },
  {
    path: "PostgreSQL LISTEN / NOTIFY",
    summary:
      "PostgreSQL 內建的輕量廣播：某個連線 NOTIFY 一個頻道，所有 LISTEN 該頻道的連線就收到訊息。通常搭配 trigger，在寫入時自動發出通知。它比 logical replication 簡單得多，但有兩個限制：訊息有大小上限（8000 bytes），而且沒有訂閱者時訊息就消失了——斷線期間的變更收不到，需要另外設計補漏機制。",
    code: `-- 寫入 entries 時自動廣播
CREATE TRIGGER entry_inserted AFTER INSERT ON entries
  FOR EACH ROW EXECUTE FUNCTION pg_notify('game_' || NEW.game_id, NEW.id::text);

-- 應用程式端
LISTEN game_123;`,
    lang: "sql",
  },
  {
    path: "Persistence Ignorance",
    summary:
      "領域與應用層對「資料怎麼被儲存」一無所知的性質，換掉資料庫也不必重寫。repository 介面（appendEntry 說的是「這一局多了一顆球」）、entries 是不是唯一真實來源、錯誤語意——這些是領域層面的決定，在文件資料庫與關聯式資料庫下都成立。反之，$push / $inc / arrayFilters 是特定資料庫的語法，換了就作廢。Clean Architecture 用另一組詞說同一件事：前者是 policy，後者是 detail，而「資料庫是一個 detail」。D0 的建議就是把這兩類拆成不同的 slice，讓資料庫選型的結果只影響後者。",
    code: `// Policy：說的是領域操作，任何資料庫都能實作
appendEntry({ gameId, setIndex }, entry): Promise<Entry[]>

// Detail：說的是 MongoDB 語法
{ $push: { "sets.0.entries": entry } }`,
    lang: "ts",
  },
];

/* -------------------------------------------------- 寫入路徑 × 問題壓力矩陣 */

type WritePath = {
  id: string;
  usecase: string;
  frequency: string;
  blastRadius: Level;
  lostUpdate: Level;
  writeVolume: Level;
  today: string;
  proposed: string;
  verdict: string;
  slice: "core" | "deferred";
};

const WRITE_PATHS: WritePath[] = [
  {
    id: "create-rally",
    usecase: "create-rally.usecase.ts",
    frequency: "每記一顆球，一局 25–40 次",
    blastRadius: "high",
    lostUpdate: "high",
    writeVolume: "high",
    today:
      "findById → createRallyHelper 就地改整個 game →\nupdate(id, game) → $set 整份文件",
    proposed:
      '{ $push: { "sets.0.entries": entry } }\n// D1-A 另需 $inc + arrayFilters',
    verdict:
      "三個問題全部成立且最嚴重。這是整個 Change 存在的理由，沒有它就沒有這個 Change。",
    slice: "core",
  },
  {
    id: "update-rally",
    usecase: "update-rally.usecase.ts",
    frequency: "修正誤記，偶發但集中在賽後",
    blastRadius: "high",
    lostUpdate: "high",
    writeVolume: "high",
    today:
      "discardOriginalStats(舊球) → updateStats(新球) →\n整份寫回；兩步之間的中繼狀態只存在記憶體",
    proposed:
      '{ $set: { "sets.0.entries.12": entry } }\n// D1-A 另需舊球與新球的淨差量 $inc',
    verdict:
      "與 create-rally 寫同一個陣列。若統計改為推導，這條路徑就只是取代一個元素，discardOriginalStats / updateStats 那組對稱操作整組消失。",
    slice: "core",
  },
  {
    id: "create-substitution",
    usecase: "create-substitution.usecase.ts",
    frequency: "每局數次",
    blastRadius: "high",
    lostUpdate: "high",
    writeVolume: "high",
    today: "與 rally 同形狀：helper 改整個 game → 整份寫回",
    proposed:
      '{\n  $push: { "sets.0.entries": entry },\n  $set: { "sets.0.lineups.home": lineup },\n}',
    verdict:
      "同樣寫 sets.N.entries。它額外改動當局 lineup，所以是驗證「定位寫入能同時處理 append 與 field set」的最好案例。",
    slice: "core",
  },
  {
    id: "create-set",
    usecase: "create-set.usecase.ts",
    frequency: "每場最多 5 次",
    blastRadius: "high",
    lostUpdate: "low",
    writeVolume: "low",
    today:
      "驗證 lineup → 初始化該局的 player/team stats →\nsets[n] = { … } → 整份寫回",
    proposed: '{ $set: { "sets.2": newSet } }',
    verdict:
      "三個問題只剩爆炸半徑成立。它帶著真正的 domain 驗證，轉換成本不低而收益有限。若 D1 選推導，它連統計初始化都不必做。",
    slice: "deferred",
  },
  {
    id: "update-set",
    usecase: "update-set.usecase.ts",
    frequency: "每場數次",
    blastRadius: "high",
    lostUpdate: "low",
    writeVolume: "low",
    today: "改 set.options 與 set.lineups.home → 整份寫回",
    proposed:
      '{\n  $set: {\n    "sets.2.options": options,\n    "sets.2.lineups.home": lineup,\n  },\n}',
    verdict:
      "轉換最單純，但同樣沒有 lost update 壓力。若 D2 選了核心切片，這條留在既有的 update() 上。",
    slice: "deferred",
  },
];

function PressureMatrix() {
  const [activeId, setActiveId] = useState<string>("create-rally");
  const active = WRITE_PATHS.find((p) => p.id === activeId) ?? WRITE_PATHS[0];
  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="my-0 w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">寫入路徑</th>
              <th className="text-left">頻率</th>
              <th>爆炸半徑</th>
              <th>Lost update</th>
              <th>寫入量成長</th>
            </tr>
          </thead>
          <tbody>
            {WRITE_PATHS.map((p) => (
              <tr
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={cn(
                  "cursor-pointer transition-colors",
                  p.id === activeId ? "bg-primary/10" : "hover:bg-muted/50",
                )}
              >
                <td>
                  <span className="flex items-center gap-2">
                    <code className="text-xs">{p.id}</code>
                    {p.slice === "core" && (
                      <Badge
                        variant="outline"
                        className="border-primary/40 bg-primary/10 text-[10px] text-primary"
                      >
                        核心
                      </Badge>
                    )}
                  </span>
                </td>
                <td className="text-muted-foreground">{p.frequency}</td>
                <td className="text-center">
                  <LevelBadge level={p.blastRadius} />
                </td>
                <td className="text-center">
                  <LevelBadge level={p.lostUpdate} />
                </td>
                <td className="text-center">
                  <LevelBadge level={p.writeVolume} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-sm font-semibold">{active.usecase}</code>
            <Badge
              variant="outline"
              className={
                active.slice === "core"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }
            >
              {active.slice === "core" ? "核心切片" : "建議延後"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                現況
              </p>
              <Code>{active.today}</Code>
            </div>
            <div className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-primary uppercase">
                定位寫入後
              </p>
              <Code lang="js">{active.proposed}</Code>
            </div>
          </div>

          <p className="m-0 text-sm leading-relaxed">{active.verdict}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------ 決策選項面板 */

type Option = {
  id: string;
  label: string;
  recommended?: boolean;
  pros: string[];
  cons: string[];
  consequence: string;
};

function DecisionPanel({
  options,
  initial,
  decided,
}: {
  options: Option[];
  initial: string;
  /** Id of the option the developer has settled on, if any. */
  decided?: string;
}) {
  const [activeId, setActiveId] = useState(initial);
  const active = options.find((o) => o.id === activeId) ?? options[0];
  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const tag =
            o.id === decided ? "已定案" : o.recommended ? "建議" : null;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setActiveId(o.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                o.id === activeId
                  ? "border-primary bg-primary text-primary-foreground"
                  : o.id === decided
                    ? "border-primary bg-primary/10 hover:bg-primary/20"
                    : "border-border bg-transparent hover:bg-muted/50",
              )}
            >
              {o.label}
              {tag && (
                <span
                  className={cn(
                    "ml-2 text-[10px] tracking-wide uppercase",
                    o.id === activeId
                      ? "text-primary-foreground/80"
                      : "text-primary",
                  )}
                >
                  {tag}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="m-0 mb-2 font-mono text-xs tracking-wide text-success uppercase">
                支持
              </p>
              <ul className="my-0 space-y-1 text-sm">
                {active.pros.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="m-0 mb-2 font-mono text-xs tracking-wide text-warning uppercase">
                代價
              </p>
              <ul className="my-0 space-y-1 text-sm">
                {active.cons.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-l-4 border-l-primary pl-4">
            <p className="m-0 mb-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
              選了會怎樣
            </p>
            <p className="m-0 text-sm leading-relaxed">{active.consequence}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const D0_OPTIONS: Option[] = [
  {
    id: "mongo-now",
    label: "B — 介面與實作一起做完",
    pros: [
      "三個問題真的被解決，而不是只被介面表達出來",
      "D1-B 之後，資料庫綁定的程式碼只剩 $push、以路徑取代 entry、以及 matchedCount / modifiedCount 的錯誤對應，全部關在 GameRepositoryImpl 的兩個方法裡",
      "選型評估拿到的是可量測的真實實作，而不是假設——這是比共同介面更好的輸入",
      "v0.15.0 的出場條件（資料完全持久化、多裝置不互相覆蓋）因此才寫得出可驗證的樣子",
    ],
    cons: [
      "若選型決定遷移，那兩個方法體要重寫（介面、usecase、helper、推導函式、錯誤語意都不受影響）",
      "需要一條可驗證的約束確保資料庫語法不外洩，否則 persistence ignorance 只是口號",
    ],
    consequence:
      "本 Change 一次交付介面粒度、entries 為唯一真實來源、錯誤語意，以及文件資料庫的定位寫入實作。附帶約束：資料庫專屬語法必須全部關在 GameRepositoryImpl 內，usecase 測試不得 mock 任何資料庫概念——這一條寫進驗收條件，讓分層是可驗證的事實而非期許。",
  },
  {
    id: "interface-first",
    label: "A — 只先做 persistence-ignorant 的那一層",
    pros: [
      "若選型決定遷移，完全沒有需要重寫的實作",
      "介面以領域操作表達後，兩種資料庫的適配比較有共同基準",
    ],
    cons: [
      "第一個 slice 觀察不到任何差別：appendEntry 的實作仍是 findById 加整份 $set，爆炸半徑沒變、lost update 窗口沒關、寫入量沒降",
      "因此它對 v0.15.0 的出場條件貢獻為零",
      "分兩次動同一批 usecase，總工時比一次做完高",
      "D1-B 之後要迴避的作廢風險只剩兩個方法體，而代價是一整個交付不了東西的 slice",
    ],
    consequence:
      "在 D1 定案前這是合理的選擇——當時要迴避的是 $inc 欄位路徑、arrayFilters 比對、淨差量運算與 helper 雙用契約。D1-B 讓那四項全部消失，這個選項的理由也隨之消失。",
  },
  {
    id: "wait",
    label: "C — 整個 Change 等選型定案",
    pros: ["不會做白工", "資料庫決策回到它該在的地方"],
    cons: [
      "選型評估沒有排定開始時間，只有 milestone",
      "三個問題在等待期間持續存在，而記錄是這個產品的核心路徑",
      "選型評估時缺少一個真實實作可以量測",
    ],
    consequence:
      "最保守。代價是把一個已知的資料完整性風險擱置一整個里程碑，而且讓選型評估在沒有實測基準的情況下比較兩個資料庫。",
  },
];

const D1_OPTIONS: Option[] = [
  {
    id: "derive",
    label: "B — entries 是唯一真實來源，統計用推導",
    recommended: true,
    pros: [
      "陣列位置定址的問題不是被解決，是消失——沒有 $inc 就沒有欄位路徑",
      "寫入退化成單純的 $push 一個 entry，這是定位寫入最單純也最安全的形式",
      "update-rally 的 discardOriginalStats / updateStats 對稱操作整組消失，只剩取代一個元素",
      "統計與 entries 不可能不一致，因為統計不是另一份狀態",
      "codebase 已有先例：findGameSummaries 就是從 entries 推導比分，而非讀取儲存的分數",
      "前端本來就在 helper 裡自行計算統計以做樂觀顯示，這條路徑不必新增",
    ],
    cons: [
      "需要統計的讀取路徑必須計算，或改讀物化的結果",
      "推導規則若變更，歷史比賽的數字會回溯改變——必須設下凍結點",
      "既有比賽已儲存的統計要決定：當作物化值保留，還是重算",
    ],
    consequence:
      "每局結束時把該局統計物化一次並存下來，作為凍結點；局進行中的顯示由前端自行計算。跨場次聚合直接讀物化值，這與選型評估規劃中的「物化 rolling aggregates」方向一致。本 Change 的核心切片因此縮小成「entries 的定位寫入」一件事。",
  },
  {
    id: "keep-stored",
    label: "A — 維持儲存，改以 arrayFilters 原子累加",
    pros: [
      "讀取路徑完全不動，統計仍是直接讀欄位",
      "不需要決定凍結點，也沒有回溯改變歷史數字的問題",
      "改動範圍侷限在寫入端",
    ],
    cons: [
      "多一組必須與 entries 永遠保持一致的寫入路徑——這正是不一致的來源",
      "arrayFilters 的條件、統計欄位路徑、局索引都要逐一設計並測試",
      "update-rally 仍需計算舊球與新球的淨差量，那是本 Change 最容易寫錯的一段",
      "helper 必須產出差量給後端（D4 因此必須解決）",
    ],
    consequence:
      "正確且可行，是保守的選擇。但它保留了「同一件事實有兩份記載」的結構，而本 Change 要處理的資料完整性問題正是從這種結構長出來的。",
  },
  {
    id: "hybrid",
    label: "C — 局內推導，局末物化並改為儲存",
    pros: [
      "局進行中沒有統計寫入，避開所有原子性問題",
      "局結束後統計是穩定的儲存值，讀取路徑與聚合都單純",
    ],
    cons: [
      "同一個欄位在不同時間有兩種語意（未物化 / 已物化），讀取端必須知道差別",
      "局末物化失敗時的補償流程要另外設計",
    ],
    consequence:
      "實際上這就是 B 的落地形式，差別只在措辭。若選 B，物化時機與失敗補償就是 slice 內必須明確定義的部分。",
  },
];

const D2_OPTIONS: Option[] = [
  {
    id: "rally-only",
    label: "A — 只改 create-rally",
    pros: ["最小的一次改動"],
    cons: [
      "update-rally 與 substitution 仍用整份 $set 寫同一個 sets.N.entries 陣列",
      "兩套不相容的寫入模型並存於同一路徑",
    ],
    consequence:
      "比現況更危險。同一個陣列被兩種模型寫入，一次整份 $set 就會抹掉之前的定位寫入結果。不要選這個。",
  },
  {
    id: "entries-bundle",
    label: "B — 寫 entries 的三條路徑一包",
    recommended: true,
    pros: [
      "create-rally / update-rally / create-substitution 寫同一個陣列，本來就不可分割",
      "三個問題最嚴重的地方全部涵蓋",
      "set 層級寫入維持現狀，不必同時重寫 domain 驗證邏輯",
      "驗收條件清楚：壞 leaf 只毀掉自己、已存在的 entry 不受影響",
    ],
    cons: ["update() 與新的定位寫入方法會並存一段時間"],
    consequence:
      "IGameRepository 新增 entry 層級的方法（appendEntry / replaceEntry），三個 usecase 改用它；create-set 與 update-set 維持 update()。若 D1 選推導，這個切片就只有 entries 一件事。",
  },
  {
    id: "all-game",
    label: "C — game 全部五條",
    pros: ["game 的寫入模型一次收斂", "update() 可以直接從介面移除"],
    cons: [
      "create-set 的 validateLineupPlayers 要一起重新設計",
      "切片變大，驗收拉長，而後兩條路徑沒有 lost update 壓力",
    ],
    consequence:
      "解得比較乾淨，但第一個切片的驗收時間會明顯拉長。若接受這個代價，D3 自動變成「移除」。",
  },
  {
    id: "all-domains",
    label: "D — 併其他 domain",
    pros: ["全 repository 層一致"],
    cons: [
      "team / player / profile 文件小而有界、寫入頻率低、單一使用者操作",
      "三個問題沒有一個在那些 domain 成立",
    ],
    consequence:
      "純粹的 churn。沒有任何一個 domain 的問題被解決，但每一個 domain 的測試都要重寫。",
  },
];

const D3_OPTIONS: Option[] = [
  {
    id: "keep-scoped",
    label: "A — 留著，但寫死存續條件",
    recommended: true,
    pros: [
      "create-set / update-set 不必在本切片重寫",
      "存續條件寫進 Change：只服務 set 層級寫入，新增路徑不得使用",
      "並存期是明示的，不是預設的",
    ],
    cons: ["兩套寫入模型並存，需要 review 時人工把關"],
    consequence:
      "與 D2-B 相配。Change 內必須明確記載這個約束與它的解除條件，否則逃生門會被當成正常入口。",
  },
  {
    id: "remove-now",
    label: "B — 立刻移除",
    pros: ["沒有逃生門，強制所有路徑遷移"],
    cons: ["等於強制選擇 D2-C", "第一個切片被低風險工作拖長"],
    consequence: "只有在 D2 選 C 時才成立。單獨選它會自相矛盾。",
  },
  {
    id: "keep-loose",
    label: "C — 留著但不設條件",
    pros: ["最省事"],
    cons: [
      "沒有存續條件就沒有解除條件，並存期會無限延長",
      "下一個新增的寫入路徑會直接走整份 $set，問題原地復發",
    ],
    consequence:
      "這是「之後再說」的實際樣貌。已知的結構問題會一直沒有人被迫回頭處理。",
  },
];

const D4_OPTIONS: Option[] = [
  {
    id: "frontend-only",
    label: "A — 規則移入 domain 層成為純函式，逐球累加刪除",
    recommended: true,
    pros: [
      "一局 ≤60 個 entry，重算成本可忽略（建 Map 後約 O(N + P)），前端不需要逐球累加",
      "updateStats / discardOriginalStats / updateRotation 整組刪除，不是搬移",
      "規則只剩一份實作，因此沒有等價性要驗證——原本列為 critical 的前後端不一致風險消失",
      "codebase 已有同形狀的先例：helpers/queries/ 底下五個函式都是從 entries 推導的純函式",
    ],
    cons: [
      "推導必須在 reducer 裡 append 後算一次，不能在 render 期間算——否則成本會隨 render 次數而非隨球數成長",
      "函式該落在哪一層是另一個決定（見 D6）",
    ],
    consequence:
      "helper 不是「回歸純前端」——累加規則後端同樣需要，因為推導就是用這套規則從 entries 算出數字。真正回歸前端的只有「就地變更整個 game 物件」這件機械操作。規則本身移入 domain 層，成為 deriveSetStats(entries, roster) 純函式，前後端共用。",
  },
  {
    id: "game-plus-delta",
    label: "B — helper 回傳 { game, delta }（D1-A 下）",
    pros: [
      "前端拿 game 直接渲染樂觀更新，行為不變",
      "後端拿 delta 組 $inc，統計才真正原子",
      "delta 是資料庫無關的描述",
    ],
    cons: [
      "helper 的回傳型別擴張，src/lib/features/game/ 也在改動範圍內",
      "delta 的形狀要能表達「欄位路徑 → 增減值」，需要一個明確的型別",
    ],
    consequence:
      "若 D1 選 A，這是唯一能同時滿足兩個消費者的解法。delta 的型別設計會是該切片最需要先想清楚的東西。",
  },
  {
    id: "split-helpers",
    label: "C — 前後端各一份",
    pros: ["兩邊各自最佳化"],
    cons: [
      "排球計分規則會有兩份實作",
      "不一致只會在使用者看到錯誤比分時才被發現",
    ],
    consequence: "短期最快，長期最貴。無論 D1 選什麼都不建議。",
  },
];

const D5_OPTIONS: Option[] = [
  {
    id: "keep-schema-drop-type",
    label: "D — 保留持久化欄位，從 domain type 移除",
    pros: [
      "不讀不寫的持久化欄位是未使用欄位，不是謊言；會說謊的是 domain type 宣稱它是權威值",
      "既有文件的舊值原樣留著，不需要 backfill",
      "v0.18.0 若決定在同一個位置放 per-game rollup，門是開的",
      "與移除 schema 欄位的成本幾乎相同（都只是改型別與讀取端）",
    ],
    cons: [
      "持久化 schema 留著一個目前沒有寫入者的欄位，需要註記說明為何存在",
      "v0.18.0 的 materialization 未必落在同一個形狀——它規劃的是跨場 rollup，可能是另一個 collection",
    ],
    consequence:
      "Mongoose schema 的 stats 欄位保留但不讀不寫，Game type 拿掉，所有讀取端改用推導。若 v0.18.0 決定 materialize per-game rollup，欄位已經在了。",
  },
  {
    id: "remove",
    label: "B — 從 schema 與 type 一併移除",
    pros: ["沒有孤兒欄位", "型別與持久化形狀完全一致"],
    cons: [
      "v0.18.0 若要在同一位置 materialize，要再加回來",
      "既有文件的舊值變成 schema 外的殘留資料",
    ],
    consequence:
      "最乾淨，成本也不高（Mongoose 移除欄位是一行，既有文件不需 backfill）。但它關掉了 v0.18.0 的一個選項，而關掉的理由只是「看起來乾淨」。",
  },
  {
    id: "keep-both",
    label: "A — 欄位與型別都保留，只是不再寫",
    pros: ["改動最小"],
    cons: [
      "既有比賽讀到舊值、新比賽讀到空值，兩種行為並存且無從分辨",
      "teams-stats 的 length === 0 fallback 會安靜地回傳一組零，畫面看起來完全正常",
    ],
    consequence: "靜默錯誤，最糟的失敗模式。明確排除。",
  },
  {
    id: "materialize-now",
    label: "C — 局末 materialize 寫回同一組欄位",
    pros: ["讀取端完全不動"],
    cons: [
      "記錄中的即時顯示無論如何都得推導（局還沒結束，materialized 值不存在），所以救不了顯示元件",
      "把 analytics 的 materialization 決策提前綁死在 set 粒度，而 v0.18.0 規劃的是 game 粒度",
    ],
    consequence:
      "看似保守，實際上兩頭落空：既沒省下推導，又預先決定了不屬於本 Change 的事。",
  },
];

const D6_OPTIONS: Option[] = [
  {
    id: "entities-shared",
    label: "A — entities 共用，移入本 Change 真正用到的四個",
    recommended: true,
    pros: [
      "修掉既有的分層倒置：create-rally / update-rally usecase 目前 import @/lib/features/game/helpers——這是 type-decoupling 沒有處理到的反方向",
      "與 type-decoupling 的既有原則一致：該 Change 的 design 明訂「enums 是值而非資料形狀，因此不造成耦合」，純函式同樣是值",
      "發球權規則只有一份實作。rotation 的推導需要它，若不一起移入就會在 fold 內部再寫一次",
      "伺服器判定一局結束需要 getSetPhase 的規則（見 D7），不一起移入就無法在後端寫入 set.win",
      "只搬本 Change 真正需要的，其餘留給專責票，範圍不會失控",
    ],
    cons: [
      "queries/ 會分成兩處：四個移入 entities、兩個留在前端——但那條界線是領域規則 vs UI 關切，不是任意切的",
      "需要兩條可檢查的約束才成立（見下方約束說明），兩條都失守才會退化成違規",
    ],
    consequence:
      "把 deriveSetStats（新）、getServingStatus、getPreviousRally、getSetPhase 移入 entities/game.ts，全部採最小結構化簽章。移入時一併改名以區分查找與推導：deriveServingStatus、deriveSetPhase，而 getPreviousRally 是真正的查找故保留 get 前綴。getSetLineup（表單 seeding）與 getPreviousScores（顯示便利）是 UI 關切，留在前端且不改名。entities/game.ts 維持單檔，內部依「型別 → 規則 → 推導」分段，與其餘 entities 檔案的形式一致。",
  },
  {
    id: "derive-only",
    label: "B — entities 共用，但只移入 deriveSetStats",
    pros: [
      "本 Change 動到的檔案最少",
      "queries/ 完全不動，沒有簽章重設計的風險",
    ],
    cons: [
      "發球權規則會有兩份：前端的 getServingStatus，以及 deriveSetStats 在 fold 內部自己追蹤的發球方",
      "那正是本 Change 花了整個 D1 在消除的「同一件事實兩份記載」，只是換到規則層面",
      "伺服器沒有局末判定規則，D7 無法成立",
    ],
    consequence:
      "最小改動，但把剛消除的重複以另一種形式帶回來。除非簽章重設計被證實比預期困難，否則不建議。",
  },
  {
    id: "move-all",
    label: "C — queries/ 五個一次全部移入",
    pros: ["終局最乾淨，推導函式只有一個家", "不留兩處並存的過渡期"],
    cons: [
      "五個的參數型別全是 EntryView / SetView / GameView，也就是 z.infer 出來的 API response schema——搬移等於五次簽章重設計，不是搬檔案",
      "getSetLineup 解析的是「表單該用哪份陣容」，getPreviousScores 是顯示便利包裝，兩者都是 UI policy；硬搬會讓 entities 承接前端關切",
      "把一個獨立的重構綁進寫入模型的 Change，兩件事的驗收混在一起",
    ],
    consequence:
      "與 A 的差別只剩那兩個 UI 關切的函式。搬它們不會帶來好處，只會讓 entities 開始承接前端政策——界線劃錯的成本比多留兩個檔案高。",
  },
  {
    id: "keep-in-features",
    label: "D — 留在 lib/features，後端繼續 import",
    pros: ["不動既有結構"],
    cons: [
      "固化 application → 前端 feature 模組的倒置",
      "推導函式會與 Redux 的 GameView 型別綁在一起，而後端拿到的是 domain Game",
    ],
    consequence:
      "把一個已知的分層倒置再蓋一層。D1-B 正好是它被修掉或被固化的分岔點。",
  },
];

const D7_OPTIONS: Option[] = [
  {
    id: "complete-set-op",
    label: "A — 新增 completeSet 領域操作，局末寫一次",
    recommended: true,
    pros: [
      "一局最多寫一次，不是每球寫一次——與 D1-B 反對的「逐球累加」不同類",
      "findGameSummaries 的 aggregation 讀 $$set.win 不必改，game history 行為不變",
      "局的結束變成明確的領域操作，而不是記錄一顆球的副作用",
      "set.win 是在明確時點寫下的快取，符合本 Change 對 materialization 的定義",
    ],
    cons: [
      "伺服器必須自行判定一局是否結束，因此 getSetPhase 的規則必須一併移入 entities（見 D6-A）",
      "appendEntry 之後多一次條件寫入，需要定義兩者失敗時的行為",
    ],
    consequence:
      'usecase 在 appendEntry 之後以推導判定該局是否結束；結束則呼叫 completeSet(ref, win) 做一次 $set: { "sets.N.win": … }，並在整場勝負確定時一併寫 game.win。伺服器成為勝負的權威來源，這也是 v0.20.0 伺服器權威計分的第一步。',
  },
  {
    id: "derive-everywhere",
    label: "B — win 也不存，全面推導",
    pros: [
      "最徹底：entries 是唯一真實來源，沒有任何衍生狀態被寫下",
      "沒有寫入時點要定義，也沒有補償流程",
    ],
    cons: [
      "findGameSummaries 的 aggregation pipeline 目前直接讀 $$set.win 來數勝局，必須改寫成在 pipeline 內比對最後一顆 rally 的比分並套用計分規則",
      "把排球規則寫進 aggregation pipeline，等於讓規則有第二份實作，而且是最難測的那種",
      "跨場查詢每次都要重算，而勝負是最常被查詢的欄位",
    ],
    consequence:
      "理論上最一致，實務上把規則推進 aggregation pipeline。除非資料庫選型改變讓推導變便宜，否則不建議。",
  },
  {
    id: "client-flag",
    label: "C — 由前端在請求中告知該局已結束",
    pros: ["伺服器不需要局末判定規則", "改動最小"],
    cons: [
      "勝負由客戶端決定，任何人都能宣稱自己贏了一局",
      "與 v0.20.0 伺服器權威計分的方向相反",
      "多裝置同步時兩個客戶端可能給出不一致的判定",
    ],
    consequence: "把信任邊界放在錯的一側。明確排除。",
  },
];

/* ---------------------------------------------------------------- 實際 diff */

const INTERFACE_DIFF = `export interface IGameRepository {
  findById(id: string): Promise<Game | null>;
  create(data: Omit<Game, "id">): Promise<Game>;
  update(id: string, data: Partial<Game>): Promise<Game>; // [!code --]
  // 只服務 set 層級寫入；新增路徑不得使用（D3-A 的存續條件）
  update(id: string, data: Partial<Game>): Promise<Game>; // [!code ++]
  // [!code ++]
  // 領域操作，而非「請覆寫這份文件」 // [!code ++]
  appendEntry( // [!code ++]
    ref: { gameId: string; setIndex: number }, // [!code ++]
    entry: Entry, // [!code ++]
  ): Promise<Entry[]>; // [!code ++]
  // [!code ++]
  replaceEntry( // [!code ++]
    ref: { gameId: string; setIndex: number; entryIndex: number }, // [!code ++]
    entry: Entry, // [!code ++]
  ): Promise<Entry[]>; // [!code ++]
  delete(id: string): Promise<boolean>;
  findGameSummaries(/* … */): Promise<GameSummaries>;
}`;

const USECASE_DIFF = `const game = await this.gameRepository.findById(gameId);
if (!game) throw new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
if (!game.sets[setIndex]) // [!code --]
  throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found"); // [!code --]

await this.authorizationService.verifyTeamRole(/* … */);

const { game: updatedGame } = createRallyHelper(params, rally, game); // [!code --]
const persistedGame = await this.gameRepository.update(gameId, updatedGame); // [!code --]
const persistedSet = persistedGame.sets[setIndex]; // [!code --]
if (!persistedSet) // [!code --]
  throw new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found"); // [!code --]
return persistedSet.entries; // [!code --]
// 統計由 entries 推導，後端不再需要 helper 的產出（D1-B + D4-A） // [!code ++]
// set 是否存在由寫入條件本身判定，不再靠先讀出來檢查 // [!code ++]
return this.gameRepository.appendEntry( // [!code ++]
  { gameId, setIndex }, // [!code ++]
  { type: EntryType.RALLY, ...rally }, // [!code ++]
); // [!code ++]`;

/* ------------------------------------------------------------- 核心流程走查 */

type StepStatus = "unchanged" | "resolved" | "open";

type FlowStep = {
  id: string;
  label: string;
  route: string;
  todayWrites: string[];
  afterWrites: string[];
  derived: string[];
  reads: string[];
  status: StepStatus;
  note: string;
};

const STEP_STATUS_LABEL: Record<StepStatus, string> = {
  unchanged: "不受影響",
  resolved: "已有決策涵蓋",
  open: "尚待決策",
};

const STEP_STATUS_CLASS: Record<StepStatus, string> = {
  unchanged: "border-border bg-muted/40 text-muted-foreground",
  resolved: "border-success/40 bg-success/10 text-success",
  open: "border-warning/40 bg-warning/10 text-warning",
};

const FLOW_STEPS: FlowStep[] = [
  {
    id: "create-game",
    label: "1. 建立比賽",
    route: "POST /api/games",
    todayWrites: ["整份 game 文件（insert）", "win: false 作為初始值"],
    afterWrites: ["不變——走 repository.create()，不是 update()"],
    derived: [],
    reads: [],
    status: "unchanged",
    note: "不在本 Change 範圍。唯一相關的是它把 win 初始化為 false 而非 null——若 D7 沒有處理，這個 false 會是比賽列表永遠顯示的值。",
  },
  {
    id: "create-set",
    label: "2. 建立一局",
    route: "POST /api/games/[id]/sets",
    todayWrites: [
      "sets[n] = { win: null, lineups.home, options, entries: [] }",
      "所有在場球員的 players[].stats[n] 初始化",
      "teams.home.stats[n] 與 teams.away.stats[n] 初始化",
      "setIndex === 0 時 delete teams.home.lineup",
      "以上透過 update() 整份覆寫",
    ],
    afterWrites: [
      "sets[n] 與 delete lineup 維持走 update()（D2-B / D3-A）",
      "三組 stats 初始化全部刪除（D1-B）",
    ],
    derived: [],
    reads: ["validateLineupPlayers 讀 teams.home.players 驗證陣容"],
    status: "resolved",
    note: "這是唯一仍然整份覆寫的寫入路徑，而那是刻意的：它沒有 lost update 壓力，且帶著 domain 驗證與 delete 語意。D3-A 的存續條件正是為它而寫。",
  },
  {
    id: "create-rally",
    label: "3. 記一顆球",
    route: "POST /api/games/[id]/sets/rallies",
    todayWrites: [
      "sets[n].entries[i] = rally entry",
      "players[].stats[n][moveType].success/error",
      "teams[side].stats[n][moveType].success/error",
      "teams.home.stats[n].rotation",
      "set.win / game.win（processGamePhase 的副作用）",
      "以上透過 update() 整份覆寫",
    ],
    afterWrites: [
      'appendEntry → $push: { "sets.n.entries": entry }',
      "set.win / game.win 改由 completeSet 操作寫入（D7-A）",
    ],
    derived: ["所有 stats 欄位", "rotation", "isSetInProgress / isSetPoint"],
    reads: [
      "記錄頁的 Redux initialize 以 getSetPhase / getServingStatus 從 entries 推導",
    ],
    status: "resolved",
    note: "本 Change 的核心。寫入從 O(文件大小) 降為 O(1)，cast 只作用於新增的 entry。",
  },
  {
    id: "substitution",
    label: "4. 換人",
    route: "POST /api/games/[id]/sets/substitutions",
    todayWrites: [
      "sets[n].entries[i] = substitution entry",
      "sets[n].lineups[side].starting[x] 與 .substitutes[y] 互換並記錄 sub.entryIndex",
      "換上球員的 players[].stats[n] 重置",
      "teams[side].stats[n].substitution++",
      "以上透過 update() 整份覆寫",
    ],
    afterWrites: [
      '$push: { "sets.n.entries": entry }',
      '$set: { "sets.n.lineups.side": lineup }',
      "stats 重置與 substitution 計數刪除（D1-B）",
    ],
    derived: [
      "換人次數",
      "換上球員的當局統計（從該球員上場後的 entries 起算）",
    ],
    reads: ["記錄球場讀 sets[n].lineups.home 顯示場上球員"],
    status: "open",
    note: "陣容仍然儲存而統計改為推導，界線在於：統計是逐球累加的running total（lost update 的來源），陣容是在明確領域事件當下發生的離散狀態變更。這條界線需要在 Design 寫死，否則會被質疑不一致。",
  },
  {
    id: "update-rally",
    label: "5. 修正誤記",
    route: "PUT /api/games/[id]/sets/rallies",
    todayWrites: [
      "sets[n].entries[i] 覆寫",
      "discardOriginalStats 扣掉舊球、updateStats 加上新球",
      "win 改變時 updateRotation 重算整局 rotation",
      "set.win / game.win",
    ],
    afterWrites: [
      '$set: { "sets.n.entries.i": entry }',
      "set.win / game.win 見 D7",
    ],
    derived: ["stats 與 rotation 整局重算，不需要淨差量"],
    reads: [],
    status: "resolved",
    note: "推導讓這條路徑簡化最多：discardOriginalStats / updateStats 的對稱操作整組消失，只剩取代一個元素。",
  },
  {
    id: "set-end",
    label: "6. 一局結束",
    route: "（無專屬 route，目前是記球的副作用）",
    todayWrites: [
      "set.win = home.score > away.score，寫在 processGamePhase 內",
    ],
    afterWrites: [
      'D7-A：completeSet 操作，$set: { "sets.n.win": … }，一局一次',
    ],
    derived: ["isSetInProgress 由前端從 entries 推導，決定切換 Interval view"],
    reads: [
      "components/game/index.tsx 讀 Redux 的 general.status.isSetInProgress",
    ],
    status: "open",
    note: "記錄頁不會壞——view 切換讀的是前端推導值。壞的是比賽列表：findGameSummaries 讀 $$set.win 數勝局。這是本 Change 審查中發現的漏洞。",
  },
  {
    id: "next-set",
    label: "7. 下一局",
    route: "Interval view → POST /sets",
    todayWrites: ["同步驟 2"],
    afterWrites: ["同步驟 2"],
    derived: [],
    reads: ["getSetLineup 決定表單 seed 哪份陣容（留在前端）"],
    status: "unchanged",
    note: "getSetLineup 是 UI policy，D6-A 明確不移入 entities。",
  },
  {
    id: "game-end",
    label: "8. 整場結束",
    route: "（無專屬 route，同樣是記球的副作用）",
    todayWrites: ["game.win = homeSetsWonCount > awaySetsWonCount"],
    afterWrites: ["D7-A：與 completeSet 同一次操作寫入"],
    derived: ["勝局數可由各 set.win 推導"],
    reads: ["比賽列表投影 game.win"],
    status: "open",
    note: "與步驟 6 同一個決策。注意 create-game 把 win 初始化為 false，所以未寫入時不是 null 而是「顯示為敗」。",
  },
  {
    id: "game-list",
    label: "9. 比賽列表",
    route: "GET /api/games?ti=",
    todayWrites: [],
    afterWrites: [],
    derived: [
      "比分已經是推導的：aggregation 取每局最後一顆 rally 的 home/away score",
    ],
    reads: [
      "$$set.win 計算雙方勝局數",
      "game.win 投影為比賽勝負",
      "每局最後一顆 rally 的比分",
    ],
    status: "open",
    note: "這一頁是 D7 的受害者，也是它的驗收現場。這裡也證明推導模式本來就存在——比分從來不是儲存的，一直都是從 entries 算出來的。",
  },
];

function Walkthrough() {
  const [activeId, setActiveId] = useState<string>("create-rally");
  const active = FLOW_STEPS.find((s) => s.id === activeId) ?? FLOW_STEPS[0];
  if (!active) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FLOW_STEPS.map((step) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveId(step.id)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-left text-sm transition-colors",
              step.id === activeId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted/50",
            )}
          >
            {step.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{active.label}</span>
            <code className="text-xs text-muted-foreground">
              {active.route}
            </code>
            <Badge
              variant="outline"
              className={cn("ml-auto", STEP_STATUS_CLASS[active.status])}
            >
              {STEP_STATUS_LABEL[active.status]}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="m-0 mb-2 font-mono text-xs tracking-wide text-destructive uppercase">
                現況寫入
              </p>
              <ul className="my-0 space-y-1 text-sm">
                {active.todayWrites.length ? (
                  active.todayWrites.map((w) => <li key={w}>{w}</li>)
                ) : (
                  <li className="text-muted-foreground">（唯讀）</li>
                )}
              </ul>
            </div>
            <div>
              <p className="m-0 mb-2 font-mono text-xs tracking-wide text-primary uppercase">
                變動後寫入
              </p>
              <ul className="my-0 space-y-1 text-sm">
                {active.afterWrites.length ? (
                  active.afterWrites.map((w) => <li key={w}>{w}</li>)
                ) : (
                  <li className="text-muted-foreground">（唯讀）</li>
                )}
              </ul>
            </div>
          </div>

          {(active.derived.length > 0 || active.reads.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="m-0 mb-2 font-mono text-xs tracking-wide text-success uppercase">
                  改為推導
                </p>
                <ul className="my-0 space-y-1 text-sm">
                  {active.derived.length ? (
                    active.derived.map((d) => <li key={d}>{d}</li>)
                  ) : (
                    <li className="text-muted-foreground">（無）</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="m-0 mb-2 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                  誰在讀
                </p>
                <ul className="my-0 space-y-1 text-sm">
                  {active.reads.length ? (
                    active.reads.map((r) => <li key={r}>{r}</li>)
                  ) : (
                    <li className="text-muted-foreground">（無）</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="border-l-4 border-l-primary pl-4">
            <p className="m-0 text-sm leading-relaxed">{active.note}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ 主元件 */

export default function Design() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 id="context">現況：一顆球走過的路</h2>
        <p>
          <code>IGameRepository</code> 只有一個寫入方法{" "}
          <code>update(id, Partial&lt;Game&gt;)</code>，五個 usecase
          全部呼叫它。點選任一節點看該步驟做了什麼；虛線是兩個結構性問題發生的位置。
        </p>
        <InteractiveFlowchart
          nodes={FLOW_NODES}
          edges={FLOW_EDGES}
          details={FLOW_DETAILS}
        />
        <p className="text-sm text-muted-foreground">
          附帶事實：「更新 game info」目前不存在對應的 usecase，game
          層級欄位在建立後沒有寫入路徑。它不在本次範圍，因為它還沒長出來。
        </p>
      </section>

      <section className="space-y-4">
        <h2 id="concepts">名詞說明</h2>
        <p>
          以下是本頁反覆出現、但不假設讀者已經熟悉的名詞。展開看定義與最小範例。
        </p>
        <FileTour files={CONCEPTS} />
      </section>

      <section className="space-y-4">
        <h2 id="pressure-matrix">問題落在哪條路徑上</h2>
        <p>
          三個問題在五條路徑上的權重差很多。點選任一列看該路徑的現況、定位寫入後的樣子，以及是否該納入第一個切片。
        </p>
        <PressureMatrix />
      </section>

      <section className="space-y-4">
        <h2 id="d0">D0 — 與資料庫選型的相依</h2>
        <p>
          <code>v0.18.0 資料庫選型評估</code> 把{" "}
          <strong>同步記錄資料層適配</strong>{" "}
          列為它兩個評估面向之一，並明確要評估關聯式資料庫的 logical replication
          / LISTEN-NOTIFY 是否比文件資料庫的 change stream
          更適合即時協作。那正是本 Change 所在的地帶。
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">工作</th>
                <th className="text-left">Milestone</th>
                <th className="text-left">關係</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-primary/5">
                <td>
                  <code>game-positional-writes</code>（本 Change）
                </td>
                <td className="text-warning">v0.15.0</td>
                <td>決定 game 資料以什麼方式被寫入</td>
              </tr>
              <tr>
                <td>資料庫選型評估</td>
                <td>v0.18.0</td>
                <td>決定 game 資料以什麼形狀持久化</td>
              </tr>
              <tr>
                <td>同步記錄與即時觀看</td>
                <td>v0.20.0</td>
                <td>兩者都是它的前置條件</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          本 Change
          排在選型之前，所以它不能依賴選型的結果。問題是它該因此縮到多小——只交付介面，還是連實作一起做完。
        </p>
        <Note>
          這個決策的答案在 D1 定案後翻轉了。原本 A（只做介面）的理由是迴避{" "}
          <code>$inc</code> 欄位路徑、<code>arrayFilters</code>{" "}
          比對、淨差量運算與 helper 雙用契約的作廢風險——D1-B
          讓這四項全部消失，剩下的資料庫綁定程式碼只有兩個方法體。而 A 的第一個
          slice 觀察不到任何差別（<code>appendEntry</code> 內部仍是{" "}
          <code>findById</code> 加整份 <code>$set</code>），對 v0.15.0
          的出場條件貢獻為零。
        </Note>
        <DecisionPanel
          options={D0_OPTIONS}
          initial="mongo-now"
          decided="mongo-now"
        />
      </section>

      <section className="space-y-4">
        <h2 id="addressing">以陣列位置定址安全嗎</h2>
        <p>
          直接回答：<strong>用陣列位置指到球員不安全，也不是最佳實踐。</strong>
        </p>
        <Code lang="js">{`teams.home.players.3.stats.0.3.success
//               ↑ 陣列位置        ↑ 局索引  ↑ MoveType.ATTACK`}</Code>
        <p>
          第一個 <code>3</code> 是 <code>players</code>{" "}
          陣列的第幾個元素。球員名單新增、移除或重新排序後，同一個路徑就指向另一個人，而且不會有任何錯誤——統計會安靜地累加到別人身上。MongoDB
          官方對這種情況的建議就是 <code>arrayFilters</code>：以{" "}
          <code>playerId</code> 這種穩定識別比對，而不是位置。
        </p>
        <p>三個索引的安全性其實不同，值得分開看：</p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">索引</th>
                <th className="text-left">是否穩定</th>
                <th className="text-left">理由</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>players.N</code>
                </td>
                <td className="text-destructive">不穩定</td>
                <td>名單可增刪重排，位置與人的對應會變</td>
              </tr>
              <tr>
                <td>
                  <code>sets.N</code>
                </td>
                <td className="text-success">可接受</td>
                <td>局只會往後追加，不會刪除或重排；N 是領域上的序數</td>
              </tr>
              <tr>
                <td>
                  <code>entries.N</code>
                </td>
                <td className="text-warning">單寫入者可接受</td>
                <td>
                  同樣是追加序數，但並行寫入時「第 N
                  顆球」不是穩定目標——這正是同步協作要用意圖錨點解決的問題
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          注意這裡的分野：<code>$push</code>{" "}
          不需要知道位置，所以新增一顆球在任何情況下都安全；需要位置的是「取代第
          N 顆球」與「累加某個球員的統計」。而後者——如果 D1
          選擇推導——根本不會發生。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="d1">D1 — 統計該儲存還是該推導</h2>
        <p>
          目前統計以兩份形式存在：<code>entries</code>{" "}
          裡完整記載了每一顆球發生了什麼，而{" "}
          <code>teams.home.players[].stats[]</code>{" "}
          又另外儲存了由這些球累加出來的數字。同一件事實有兩份記載，而本 Change
          要處理的問題正是從維持這兩份一致的過程中長出來的。
        </p>
        <p>
          codebase 裡已經有一個推導的先例：<code>findGameSummaries</code> 的
          aggregation pipeline 是從 <code>$$set.entries</code> 取最後一顆 rally
          來算比分的，並沒有去讀任何儲存的分數欄位。
        </p>

        <h3 id="d1-payloads">一顆球實際寫進去什麼</h3>
        <p>
          抽象地說「重寫整份文件」不容易感覺到規模。以一場三局比賽的第一局第 25
          分為例，三個選項送往資料庫的 payload 差異如下。
        </p>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="m-0 font-mono text-xs tracking-wide text-destructive uppercase">
              現況：整份覆寫
            </p>
            <Code lang="js">{PAYLOAD_TODAY}</Code>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-warning uppercase">
                D1-A：定位寫入，統計仍儲存
              </p>
              <Code lang="js">{PAYLOAD_STORED_STATS}</Code>
            </div>
            <div className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-primary uppercase">
                D1-B：定位寫入，統計推導
              </p>
              <Code lang="js">{PAYLOAD_DERIVED}</Code>
            </div>
          </div>
        </div>

        <h3 id="d1-options">選項</h3>
        <DecisionPanel options={D1_OPTIONS} initial="derive" decided="derive" />
      </section>

      <section className="space-y-4">
        <h2 id="granularity">repository 該開幾個入口</h2>
        <p>
          「多開幾個方法是不是違反 Clean
          Architecture」這個疑慮，方向其實是反的。
        </p>
        <p>
          目前的 <code>update(id, Partial&lt;Game&gt;)</code>{" "}
          是一個以持久化形狀表達的 CRUD 方法：它說的是「這是改好的文件，請覆寫」
          ，沒有表達呼叫端做了什麼領域操作。五個 usecase
          做著五件語意完全不同的事，卻共用同一個沒有語意的入口——這正是 Clean
          Architecture 要避免的<strong>貧血 data mapper</strong>
          ，也是為什麼「記一顆球」的失敗會以「整份文件寫入被拒」的形式出現。
        </p>
        <p>
          repository 介面應該以<strong>領域操作</strong>
          表達，就像一個集合：<code>appendEntry</code>{" "}
          說的是「這一局多了一顆球」，這句話在文件資料庫、關聯式資料庫、記憶體假實作下都成立，而{" "}
          <code>update(整份文件)</code> 只在文件型資料庫下才自然。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">
                入口數量的真正上限
              </p>
              <p className="m-0 text-sm leading-relaxed">
                方法數對應的是<strong>領域操作</strong>
                的數量，不是欄位組合的數量。game
                目前只有五個領域寫入操作，其中三個共用
                entries。所以介面成長是有界的：新增一個方法必須對應一個新的領域動作，不能因為「想改另一組欄位」而新增。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="m-0 font-mono text-xs tracking-wide text-destructive uppercase">
                什麼才是真的違反
              </p>
              <p className="m-0 text-sm leading-relaxed">
                如果新增的方法叫 <code>updateSetOptionsAndLineup</code> 或{" "}
                <code>pushEntryWithInc</code>
                ——前者以欄位組合命名、後者以資料庫運算子命名——那才是把持久化細節洩漏進
                application 層。命名必須說出領域意圖。
              </p>
            </CardContent>
          </Card>
        </div>
        <Note>
          介面粒度的改動是 <strong>資料庫無關</strong>{" "}
          的，它在任何選型下都是對的；只有實作是綁定的。D0-B
          選擇兩者一起交付，因此這條界線必須是可驗證的事實而不是期許：資料庫專屬語法全部關在{" "}
          <code>GameRepositoryImpl</code> 內，
          <strong>usecase 測試不得 mock 任何資料庫概念</strong>
          ——這一條寫進本 Change 的驗收條件。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="relational">若改用關聯式資料庫會怎樣</h2>
        <p>
          誠實地說：正規化的關聯式 schema 會讓三個問題
          <strong>結構性消失</strong>
          ，而不是被緩解。定位運算子在某種程度上正是在文件模型裡模擬關聯模型本來就有的東西。
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">問題</th>
                <th className="text-left">文件資料庫 + 定位寫入</th>
                <th className="text-left">正規化關聯 schema</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>爆炸半徑</td>
                <td>
                  需要刻意設計：cast 範圍縮到子文件，但整份文件仍是一個寫入單位
                </td>
                <td>
                  天生就有：<code>INSERT INTO entries</code> 失敗只影響那一列
                </td>
              </tr>
              <tr>
                <td>Lost update</td>
                <td>
                  靠 <code>$inc</code> 與定位條件避開 read-modify-write
                </td>
                <td>
                  天生就有：<code>UPDATE … SET n = n + 1</code> 加上交易與列級鎖
                </td>
              </tr>
              <tr>
                <td>寫入量成長</td>
                <td>
                  payload 變 O(1)，但文件本身仍隨比賽變大，影響讀取與複製記錄
                </td>
                <td>一列就是一列，文件大小的概念不存在</td>
              </tr>
              <tr>
                <td>統計欄位定址</td>
                <td>依賴陣列位置或 arrayFilters，路徑不可讀</td>
                <td>
                  <code>WHERE player_id = ? AND set_index = ?</code>
                  ，以識別而非位置定址
                </td>
              </tr>
              <tr>
                <td>遷移成本</td>
                <td>零</td>
                <td>
                  高：schema、repository 實作、聚合查詢、即時推播機制全部要換
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          這張表<strong>不是</strong>
          在主張應該遷移。維持現狀仍然可能是對的——遷移成本很高，而定位寫入能把問題壓到可接受的程度。它要說的是：這個比較屬於{" "}
          <code>v0.18.0 資料庫選型評估</code>，本 Change
          不應該用一個寫入模型的實作把它默默決定掉。這就是 D0 存在的原因。
        </p>
        <Note>
          若 D1
          選擇推導，這張表的前兩列在文件資料庫下的難度會顯著下降——因為需要原子累加的欄位不再存在，剩下的只有
          append 一個 entry，而那是文件資料庫本來就擅長的操作。D1
          的選擇會實質影響選型評估的結論。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="other-domains">其他 domain 為何不納入</h2>
        <p>
          <code>TeamRepositoryImpl.update()</code> 確實是一樣的
          read-modify-write，但三個問題沒有一個成立：team
          文件小而有界、寫入頻率低、由單一使用者操作、不隨比賽成長。
        </p>
        <p>
          更直接的證據是 <code>team.repository.mongo.ts</code> 的{" "}
          <code>removePlayerFromLineups</code> 已經在用 <code>$pull</code> 搭配{" "}
          <code>lineups.$[]</code>——這個 codebase
          本來就會在該用定位運算子的地方用它。缺的不是能力，是 game
          這條路徑上沒有人回頭處理。
        </p>
      </section>

      <section className="space-y-4">
        <h2 id="d2">D2 — 範圍邊界</h2>
        <p>本次要改哪些寫入路徑？</p>
        <DecisionPanel
          options={D2_OPTIONS}
          initial="entries-bundle"
          decided="entries-bundle"
        />
      </section>

      <section className="space-y-4">
        <h2 id="d3">D3 — 既有 update() 的去留</h2>
        <p>
          若 D2 沒有涵蓋全部五條，<code>update()</code>{" "}
          就會與新的定位寫入方法並存。留或不留？
        </p>
        <DecisionPanel
          options={D3_OPTIONS}
          initial="keep-scoped"
          decided="keep-scoped"
        />
      </section>

      <section className="space-y-4">
        <h2 id="d4">D4 — 共用規則落在哪一層</h2>
        <p>
          <code>createRallyHelper</code> / <code>updateRallyHelper</code> 位於{" "}
          <code>src/lib/features/game/helpers/optimistic/</code>，
          <strong>同時被前端 Redux 樂觀更新與後端 usecase 使用</strong>
          。它現在吃一個 <code>GameView</code>、就地改完、回傳整個 game。
        </p>
        <p>
          D1-B 之後後端不再需要 helper 的<strong>產出</strong>，但仍然需要它的{" "}
          <strong>規則</strong>——推導就是用同一套規則從 entries
          算出數字。所以要拆開的是兩件被混在一起的東西：累加規則（兩邊都要）與就地變更整個
          game 物件（只有前端要）。
        </p>
        <p>
          而且一局 ≤60 個 entry、重算成本可忽略，所以前端也不必逐球累加——append
          後整局重算即可。逐球累加的那三個函式因此是 <strong>刪除</strong>
          而非搬移，規則只剩一份實作，原本列為 critical
          的前後端不一致風險隨之消失。
        </p>
        <DecisionPanel
          options={D4_OPTIONS}
          initial="frontend-only"
          decided="frontend-only"
        />
        <Note>
          推導同時逼出一個既有的語意錯誤：<code>TeamStatsClass</code> 把{" "}
          <code>substitution</code> 初始化為 <code>6</code>、
          <code>timeout</code> 為 <code>2</code>、<code>challenge</code> 為{" "}
          <code>2</code>——那是排球規則裡的<strong>剩餘次數</strong>；但{" "}
          <code>substitution.helper.ts</code> 對它做的是{" "}
          <code>substitution++</code>，一次換人後變成 7。既不是剩餘也不是已用。
          之所以沒有人發現，是因為<strong>沒有任何地方讀它</strong>
          。改成推導後，這個欄位的語意必須被明確決定（建議統一為「已用次數」，剩餘由規則上限相減得出），這也是{" "}
          <code>v0.17.0</code> 規則驗證的前置。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="d5">D5 — 既有 stats 欄位的處置</h2>
        <p>
          schema 裡有 <code>teams.X.stats[]</code> 與{" "}
          <code>players[].stats[]</code>。D1-B
          之後沒有人寫它們，那它們該怎麼辦？
        </p>
        <p>
          先釐清一個容易誤判的成本：這裡的「移除」<strong>不是資料遷移</strong>
          。Mongoose schema 拿掉欄位是一行改動，既有文件裡的舊值原樣留著，不需要
          backfill。所以四個選項的成本差距比直覺小很多，真正的差別在語意。
        </p>
        <Note>
          無論選哪一個，<code>components/game/options/overview</code> 與{" "}
          <code>components/game/stats/teams-stats</code> 都必須在同一個 Change
          內改成讀推導值。後者的 <code>getTeamsStats</code> 有一段{" "}
          <code>if (stats.length === 0) return createEmptyTeamStats()</code> 的
          fallback——停止寫入後它會安靜地回傳一組零，畫面看起來完全正常。這是本
          Change 最容易造成靜默錯誤的地方。
        </Note>
        <DecisionPanel
          options={D5_OPTIONS}
          initial="keep-schema-drop-type"
          decided="keep-schema-drop-type"
        />
      </section>

      <section className="space-y-4">
        <h2 id="d6">D6 — 前後端是否共用 entities</h2>
        <p>
          D4-A 把規則移入 domain
          層成為純函式後，它該落在哪一層？這個問題會連帶回答「前後端該不該共用
          domain 模型」。
        </p>
        <Note>
          <strong>與 type-decoupling 的關係。</strong>該 Change（2026-04-08
          歸檔）的目的<strong>不是</strong>
          分離前後端，而是移除三類邊界違規，其中之一是「presentation 層直接
          import domain entities，迫使前端處理 domain 層的 nullable 語意，且
          domain 變更會連帶波及每個元件」。它的規則是
          <strong>元件只 import `*View` 資料形狀</strong>，而它的 design
          同時明訂：
          <em>
            enums 仍可在所有層 import，因為 enums 是值而非資料形狀，不造成耦合
          </em>
          。純函式同樣是值。所以 D6-A 與它不衝突——
          <strong>前提是函式簽章不能吃 domain 資料形狀</strong>
          ，否則就會把 type-decoupling
          移除的耦合搬回來。最小結構化簽章正是為此。
        </Note>
        <p>
          另一個容易混淆的顧慮：把 <code>deriveSetStats</code> 放進{" "}
          <code>entities/game.ts</code> <strong>不會</strong>
          把領域模型從貧血變成充血。充血指的是把行為掛到物件上（
          <code>game.appendRally(rally)</code> 自我變更），那會與前端的 Redux
          不可變模型和 repository pattern 衝突。<code>entities/game.ts</code>{" "}
          現在是「型別 + 純函式」的函式式領域模型——
          <code>validateLineupPlayers</code> 就是同一個形狀，
          <code>deriveSetStats</code>{" "}
          只是再加一個。真正讓模型不貧血的，是領域規則住在領域層，而不是散在
          usecase 與前端 helper 裡。
        </p>
        <h3 id="d6-queries">queries/ 五個函式的分類</h3>
        <p>
          D6 的爭點不只是「<code>deriveSetStats</code> 放哪」，而是{" "}
          <code>helpers/queries/</code>{" "}
          底下既有的五個推導函式要不要一起走。它們不是同一種東西：
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">函式</th>
                <th className="text-left">性質</th>
                <th className="text-left">本 Change 需要嗎</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-primary/5">
                <td>
                  <code>getServingStatus</code>
                </td>
                <td>領域規則（得分方發球）</td>
                <td className="text-primary">需要——rotation 的推導靠它</td>
              </tr>
              <tr className="bg-primary/5">
                <td>
                  <code>getPreviousRally</code>
                </td>
                <td>領域查詢</td>
                <td className="text-primary">需要——getServingStatus 依賴它</td>
              </tr>
              <tr className="bg-primary/5">
                <td>
                  <code>getSetPhase</code>
                </td>
                <td>領域規則（25 分／決勝局分數）</td>
                <td className="text-primary">
                  需要——伺服器必須自行判定一局是否結束才能寫入 set.win（見 D7）
                </td>
              </tr>
              <tr>
                <td>
                  <code>getPreviousScores</code>
                </td>
                <td>顯示便利（getPreviousRally 的薄包裝）</td>
                <td className="text-muted-foreground">不需要（留在前端）</td>
              </tr>
              <tr>
                <td>
                  <code>getSetLineup</code>
                </td>
                <td>UI policy（表單該 seed 哪份陣容）</td>
                <td className="text-muted-foreground">
                  不需要，而且本來就不屬 entities（留在前端）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          五個的參數型別全部是 <code>EntryView</code> / <code>SetView</code> /{" "}
          <code>GameView</code>——<code>z.infer</code> 出來的 API response
          schema，不是 domain 的 <code>Entry</code> / <code>Set</code> /{" "}
          <code>Game</code>。所以「搬進 entities」對每一個都是
          <strong>簽章重設計</strong>
          ，不是搬檔案。這是為什麼一次全搬的成本被低估。
        </Note>
        <DecisionPanel
          options={D6_OPTIONS}
          initial="entities-shared"
          decided="entities-shared"
        />
        <h3 id="d6-constraints">A 成立的兩條約束</h3>
        <p>
          A 本身不違反 type-decoupling，但它<strong>依賴兩條約束</strong>
          才能不違反。兩條都是可檢查的事實，不是期許：
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">約束</th>
                <th className="text-left">失守會怎樣</th>
                <th className="text-left">怎麼檢查</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  移入的函式只宣告最小結構化參數，不吃 <code>Entry[]</code> /{" "}
                  <code>Game</code>
                </td>
                <td>
                  前端呼叫時必須持有 domain 資料形狀，type-decoupling
                  移除的耦合原樣回來
                </td>
                <td>
                  簽章審查；前端以 <code>EntryView[]</code>{" "}
                  呼叫必須型別通過而無需轉換或斷言
                </td>
              </tr>
              <tr>
                <td>
                  <code>entities/</code> 不 import server-only 模組
                </td>
                <td>共用會變成伺服器程式碼洩漏進前端 bundle</td>
                <td>
                  import 邊界測試或 lint 規則（v0.16.0 的分層稽核票會自動化）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="d7">D7 — set.win / game.win 由誰寫入</h2>
        <Note>
          <strong>這是設計審查中發現的漏洞，不是既有問題。</strong>
          <code>set.win</code> 與 <code>game.win</code> 目前
          <strong>只有</strong>在 <code>rally.helper.ts</code> 的{" "}
          <code>processGamePhase</code>{" "}
          裡被寫入，而後端是透過「整份文件覆寫」把它一起存下去的。改成只{" "}
          <code>$push</code> entry 之後，
          <strong>這兩個欄位將永遠不會被寫入</strong>。
        </Note>
        <p>
          損害的位置需要精確界定，我第一版說錯了。記錄頁
          <strong>不會壞</strong>——<code>isSetInProgress</code> 是 Redux 的{" "}
          <code>initialize</code> reducer 以{" "}
          <code>getSetPhase(game, setIndex, entryIndex)</code> 從 entries
          當場算出來的，不讀 <code>set.win</code>
          。所以一局仍然正常結束、interval view 仍然出現。
        </p>
        <Note>
          壞掉的是<strong>另一個頁面</strong>：<code>findGameSummaries</code> 的
          aggregation 直接讀 <code>$$set.win</code> 數勝局、並投影{" "}
          <code>game.win</code>。兩者都不再被寫入後，
          <strong>比賽列表的勝局數會全部顯示 0、勝負永遠停在建立時的 </strong>
          <code>win: false</code>（<code>create-game.usecase.ts:46</code>{" "}
          的初始值）。你正在操作的那一頁完全正常，錯誤出現在別處——這正是它危險的原因。
        </Note>
        <p>
          追根究柢，這是因為「一局結束」目前是
          <strong>記錄一顆球的副作用</strong>
          ，而不是一個明確的操作。整份覆寫把這件事藏起來了；定位寫入把它暴露出來。
        </p>
        <p>
          從 D1-B 的角度看，<code>set.win</code> 與 <code>game.win</code> 同樣是
          entries
          的投影，不是獨立的狀態。差別在於它們的寫入頻率——一局一次，而不是一球一次，因此它不屬於
          D1-B 反對的「逐球累加」。
        </p>
        <h3 id="d7-not-materialization">completeSet 不是局末 materialization</h3>
        <p>
          兩者形式相同、範圍完全不同，值得先分清楚，否則很容易把{" "}
          <code>completeSet</code> 誤解成「順便把統計也存起來」。
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left"></th>
                <th className="text-left">completeSet（D7-A）</th>
                <th className="text-left">局末 materialize 統計（D1-C，已否決）</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>寫什麼</td>
                <td>
                  <code>sets.N.win</code> 一個布林，必要時加 <code>game.win</code>
                </td>
                <td>
                  整組 <code>teams.X.stats[N]</code> 與{" "}
                  <code>players[].stats[N]</code>
                </td>
              </tr>
              <tr>
                <td>為什麼要存</td>
                <td>
                  findGameSummaries 的 aggregation 需要它；不存就得把排球計分規則寫進
                  pipeline
                </td>
                <td>
                  沒有理由——記錄中的顯示無論如何都得推導，存了也救不了
                </td>
              </tr>
              <tr>
                <td>對讀取端的影響</td>
                <td>比賽列表維持現狀，零改動</td>
                <td>
                  同一欄位在局中／局後有兩種語意，讀取端必須知道差別
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          共同點是形式：兩者都是「把推導值在明確時點寫下來」。差別在於{" "}
          <code>set.win</code> 有一個具體的消費者非它不可，而統計沒有。
          <strong>
            跨場的統計 materialization 屬 v0.18.0，本 Change 不做，也不由
            completeSet 順手做。
          </strong>
        </Note>

        <h3 id="d7-null">初始值：null 才是「尚未決定」</h3>
        <p>
          走查時發現一個既有缺陷，範圍正好在 D7 之內。domain 型別本來就寫對了：
        </p>
        <Code lang="ts">{`Set.win:  boolean | null   // entities/game.ts:265
Game.win: boolean | null   // entities/game.ts:282
Rally.win: boolean         // 一顆球一定有勝負，非空是對的`}</Code>
        <p>
          三態語意也已經是 codebase 的既有慣例——
          <code>components/game/sets/list.tsx:88</code> 就是用{" "}
          <code>typeof set.win === &quot;boolean&quot;</code>{" "}
          判斷「這一局結束了沒」，而 <code>header/scores.tsx</code> 用{" "}
          <code>=== true</code> / <code>=== false</code> 分別數雙方勝局。
        </p>
        <Note>
          但 <code>create-game.usecase.ts:46</code> 把新比賽的{" "}
          <code>win</code> 初始化為 <code>false</code>。依這個 codebase 自己的慣例，
          <code>false</code> 的意思是<strong>客隊贏</strong>，不是「還沒打完」。
          <code>create-set.usecase.ts:75</code> 用的是{" "}
          <code>null</code>，是對的——兩者不一致。
        </Note>
        <p>
          第二層問題在讀模型：<code>GameSummary.win</code> 宣告為{" "}
          <code>boolean</code>（非空），但 aggregation 直接投影可能為{" "}
          <code>null</code> 的 <code>game.win</code>
          。型別在說謊，而因為 aggregation 結果經過斷言，TypeScript 抓不到。
        </p>
        <p>
          持久化層兩邊都接受 <code>null</code>：Mongoose 的{" "}
          <code>win: {"{ type: Boolean }"}</code> 沒有 <code>required</code> 也沒有{" "}
          <code>default</code>；關聯式資料庫的 <code>BOOLEAN NULL</code>{" "}
          是標準三值邏輯，而且 <code>COUNT(win)</code>{" "}
          天生略過 null，數已完成的局反而更順。所以沒有任何持久化層面的理由用{" "}
          <code>false</code> 當佔位值。
        </p>
        <Note>
          <strong>納入 D7 範圍：</strong>
          <code>create-game</code> 的初始值改為 <code>null</code>，
          <code>GameSummary.win</code> 型別改為 <code>boolean | null</code>
          ，並確認比賽列表能區分「進行中」與「已敗」。這與 D7 是同一個欄位的同一件事——
          <strong>誰寫它、它能是什麼值</strong>。
        </Note>
        <DecisionPanel
          options={D7_OPTIONS}
          initial="complete-set-op"
          decided="complete-set-op"
        />
      </section>

      <section className="space-y-4">
        <h2 id="diffs">介面與 usecase 的實際改動</h2>
        <p>
          以下是 D0-B + D1-B + D2-B + D3-A + D4-A + D5-D
          這組決策下，介面與呼叫端的實際樣貌。
        </p>

        <div className="space-y-2">
          <p className="m-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            applications/repositories/game.repository.interface.ts
          </p>
          <AnnotatedDiff code={INTERFACE_DIFF} lang="ts" />
        </div>

        <div className="space-y-2">
          <p className="m-0 font-mono text-xs tracking-wide text-muted-foreground uppercase">
            applications/usecases/game/create-rally.usecase.ts
          </p>
          <AnnotatedDiff code={USECASE_DIFF} lang="ts" />
        </div>

        <Note>
          注意 usecase 少掉的那四行：兩處 <code>SET_NOT_FOUND</code>{" "}
          的記憶體檢查消失了。set
          是否存在改由寫入條件本身判定——這是下一節錯誤模型必須重新定義的直接原因，也是先前
          404 語意混淆的所在。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="walkthrough">核心流程走查</h2>
        <p>
          從建立比賽到比賽列表，逐步標出每一步<strong>誰寫入什麼</strong>、
          <strong>什麼改為推導</strong>、<strong>誰在讀</strong>
          。這一輪走查的目的不是說明設計，而是找出還有沒有第二個像{" "}
          <code>set.win</code>{" "}
          那樣、藏在整份覆寫底下而定位寫入會靜默丟掉的副作用。
        </p>
        <Walkthrough />
        <h3 id="walkthrough-findings">走查結論</h3>
        <ul>
          <li>
            <strong>九步中三步標為尚待決策</strong>，全部集中在
            D7（一局／整場的結束）與換人時的陣容寫入。其餘六步已被既有決策涵蓋或完全不受影響。
          </li>
          <li>
            <strong>沒有發現第三個隱藏副作用。</strong>
            逐一比對後，會被定位寫入丟掉的只有 <code>set.win</code> /{" "}
            <code>game.win</code>（步驟 6、8）與換人的 <code>lineups</code>{" "}
            變更（步驟 4），後者已明確保留為 <code>$set</code> 寫入。
          </li>
          <li>
            <strong>推導模式本來就存在於此 codebase。</strong>步驟 9
            的比賽列表比分從來不是儲存的——aggregation 一直是從每局最後一顆 rally
            算出來的。D1-B 是把這個既有模式套用到統計，不是引入新概念。
          </li>
          <li>
            <strong>唯一仍整份覆寫的是建立一局</strong>（步驟 2），而那是 D2-B /
            D3-A 刻意保留的：它沒有 lost update 壓力，且帶著 domain 驗證與{" "}
            <code>delete</code> 語意。
          </li>
        </ul>
        <Note>
          <strong>走查暴露的一致性問題（步驟 4）。</strong>
          換人之後陣容<strong>仍然儲存</strong>
          ，統計卻改為推導——為什麼？界線是：統計是逐球累加的 running total，正是
          lost update
          的來源；陣容是在明確領域事件當下發生的離散狀態變更，一局只有數次。這條界線必須在
          Design 寫死，否則下一個人會問「為什麼不一致」，然後把其中一邊改錯。
        </Note>
      </section>

      <section className="space-y-4">
        <h2 id="layer-audit">分層稽核</h2>
        <p>
          以實際的 import 圖檢查相依方向，而不是以設計意圖檢查。下表是{" "}
          <code>grep</code> 出來的每一層對外 import 統計。
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">層</th>
                <th className="text-left">目前的對外 import</th>
                <th className="text-left">判定</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>entities/</code>
                </td>
                <td>只有 entities 自身（errors 5、team 2、game 2、player 1）</td>
                <td className="text-success">
                  完全乾淨，零外部相依——D6-A 共用的前提成立
                </td>
              </tr>
              <tr>
                <td>
                  <code>applications/</code>
                </td>
                <td>
                  entities 103、applications 92、infrastructure 29、lib 3
                </td>
                <td className="text-warning">兩處要看，見下方</td>
              </tr>
              <tr>
                <td>
                  <code>infrastructure/</code>
                </td>
                <td>applications 45、infrastructure 34、entities 26、lib 2</td>
                <td className="text-success">
                  方向正確（實作 application 定義的介面）
                </td>
              </tr>
              <tr>
                <td>
                  <code>interface/</code>
                </td>
                <td>applications 31、infrastructure 30、entities 11</td>
                <td className="text-success">
                  infrastructure 全是 DI 容器，屬 composition root
                </td>
              </tr>
              <tr>
                <td>
                  <code>components/</code>
                </td>
                <td>
                  對 applications / infrastructure / interface 的 import 為{" "}
                  <strong>0</strong>；對 entities 只有 enums
                </td>
                <td className="text-success">
                  完全符合 type-decoupling 的規則
                </td>
              </tr>
              <tr>
                <td>
                  <code>lib/features/</code>
                </td>
                <td>對 entities 只有 enums（EntryType、MoveType、Side…）</td>
                <td className="text-success">同上</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 id="audit-findings">三個要判斷的點</h3>
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2">
              <p className="m-0 flex flex-wrap items-center gap-2">
                <code className="font-semibold">applications → lib（3 處）</code>
                <Badge
                  variant="outline"
                  className="border-destructive/40 bg-destructive/10 text-destructive"
                >
                  真正的倒置
                </Badge>
              </p>
              <p className="m-0 text-sm leading-relaxed">
                <code>create-rally</code> 與 <code>update-rally</code> import{" "}
                <code>@/lib/features/game/helpers</code>，
                <code>create-player</code> import{" "}
                <code>@/lib/validations/player</code> 的型別。
                <strong>前兩處由本 Change 的 D6-A 修掉</strong>，第三處在 v0.16.0
                的分層稽核票。修完後這個數字從 3 降到 1。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="m-0 flex flex-wrap items-center gap-2">
                <code className="font-semibold">
                  applications → infrastructure/di/types（29 處）
                </code>
                <Badge
                  variant="outline"
                  className="border-warning/40 bg-warning/10 text-warning"
                >
                  位置問題，非行為問題
                </Badge>
              </p>
              <p className="m-0 text-sm leading-relaxed">
                29 處全部指向同一個檔案，而該檔案的內容是一整包{" "}
                <code>Symbol.for(...)</code>
                ——沒有任何基礎設施行為。它是 application 與 infrastructure
                之間的契約，被放錯了目錄。嚴格說 application 層不該指名{" "}
                infrastructure，但風險為零、修法是搬檔案。
                <strong>不在本 Change 範圍</strong>，併入 v0.16.0
                的分層稽核票較合適——monorepo 拆分時它會自然浮現。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-2">
              <p className="m-0 flex flex-wrap items-center gap-2">
                <code className="font-semibold">
                  infrastructure → @/lib/auth（2 處）
                </code>
                <Badge variant="outline" className="border-border">
                  可接受
                </Badge>
              </p>
              <p className="m-0 text-sm leading-relaxed">
                <code>lib/auth.ts</code> 內含 <code>lib/data/mongodb</code> 的
                DB client，本質就是 infrastructure，所以方向是 infrastructure →
                infrastructure，沒有錯。實際代價是{" "}
                <strong>路徑不再是分層的訊號</strong>：
                <code>src/lib/</code> 同時裝著 infrastructure（
                <code>auth.ts</code>、<code>data/</code>）、interface adapters（
                <code>api/wrappers.ts</code>、<code>validations/</code>）與
                presentation（<code>features/</code>、<code>redux/</code>、
                <code>auth-client.ts</code>）。本次稽核必須逐一打開每個{" "}
                <code>→ lib</code> 的 import 才能判斷，就是這個代價。不處理，但它是
                v0.16.0 自動化 import 邊界規則的前置障礙。
              </p>
            </CardContent>
          </Card>
        </div>

        <h3 id="audit-after">變動後的相依圖</h3>
        <Code lang="text">{`entities/            ← 零外部相依（本 Change 後新增 4 個純函式，仍為零）
   ↑        ↑
   │        └──────────────── lib/features/  →  components/
   │                          （只 import 值：enums + 推導純函式）
applications/        → entities ✅ ／ lib ❌ 3→1（D6-A 修掉 2）
   ↑
infrastructure/      → applications ✅（實作介面）
   ↑
interface/ · app/    → 解析 DI 容器（composition root）`}</Code>

        <Note>
          <strong>稽核暴露的一個設計細節。</strong>
          <code>options/overview</code> 與 <code>teams-stats</code>{" "}
          需要推導後的統計，但<strong>元件不應該自己呼叫</strong>{" "}
          <code>deriveSetStats</code>——那會讓 components 開始 import
          entities 的函式，而且會在 render 期間計算。正確位置是{" "}
          <code>game-slice.ts</code> 的 <code>initialize</code> reducer，與{" "}
          <code>isSetInProgress</code> 現在的做法完全一致：slice 算一次存進
          state，元件只讀 state。這同時滿足「元件只 import *View 型別」與「在
          append 時算而非 render 時算」兩條約束。
        </Note>

        <h3 id="audit-verdict">結論</h3>
        <ul>
          <li>
            <strong>entities 零外部相依</strong>，D6-A 前後端共用的前提成立且可驗證。
          </li>
          <li>
            <strong>components 對後端層的 import 為 0</strong>
            ，對 entities 只有 enums——type-decoupling 的規則今天完全被遵守，本
            Change 不會打破它（推導在 slice 呼叫，不在元件）。
          </li>
          <li>
            <strong>唯一真正的倒置是 applications → lib 的 3 處</strong>
            ，本 Change 修掉其中 2 處。
          </li>
          <li>
            其餘兩項（DI 符號的位置、<code>lib/auth</code> 的位置）是命名與擺放問題，方向都正確，
            <strong>不在本 Change 範圍</strong>。
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 id="constraints">三條可驗證的約束</h2>
        <p>
          本 Change 的分層正確性不靠設計意圖維持，靠三條可檢查的約束。它們分散在前面各節被提出，這裡集中列出，
          <strong>每一條都會成為切片的驗收條件</strong>
          ，而不只是寫在文件裡的期許。
        </p>
        <div className="overflow-x-auto">
          <table className="my-0 w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">約束</th>
                <th className="text-left">來源</th>
                <th className="text-left">本 Change 怎麼檢查</th>
                <th className="text-left">之後怎麼自動化</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  資料庫專屬語法不得離開 <code>GameRepositoryImpl</code>
                </td>
                <td>D0-B</td>
                <td>
                  usecase 測試不得 mock 任何資料庫概念——若需要，代表語法已洩漏
                </td>
                <td>import 邊界規則</td>
              </tr>
              <tr>
                <td>
                  <code>entities/</code> 不得 import server-only 模組
                </td>
                <td>D6-A</td>
                <td>
                  entities 目前對外 import 為零，維持零即可；review 檢查項
                </td>
                <td>import 邊界規則</td>
              </tr>
              <tr>
                <td>
                  元件不得呼叫推導函式，推導只在 slice 執行
                </td>
                <td>分層稽核</td>
                <td>
                  <code>components/</code> 不得出現{" "}
                  <code>deriveSetStats</code> 的 import；元件只讀 Redux state
                </td>
                <td>import 邊界規則</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          第三條同時解決兩個問題：維持 type-decoupling「元件只依賴{" "}
          <code>*View</code> 資料形狀」的規則，以及避免推導在 render
          期間執行而非 append 時執行。它與{" "}
          <code>isSetInProgress</code> 現行的做法一致——
          <code>game-slice.ts</code> 的 <code>initialize</code> reducer
          算一次存進 state，元件只讀 state。
        </Note>
        <p className="text-sm text-muted-foreground">
          三條的自動化都指向同一件事：一組可執行的 import
          邊界規則。那屬於 v0.16.0 的分層稽核工作，而它的前置障礙是{" "}
          <code>src/lib/</code>{" "}
          目前同時裝著三個層的東西——路徑無法作為分層訊號，規則就寫不出來。本 Change
          以 review 檢查項的形式先守住這三條。
        </p>
      </section>

      <section className="space-y-4">
        <h2 id="error-model">錯誤模型的變化</h2>
        <p>
          現在的錯誤語意建立在「先讀出來、在記憶體裡檢查」上：usecase 讀完 game
          後自己判斷 <code>!game.sets[setIndex]</code> 才丟{" "}
          <code>SET_NOT_FOUND</code>
          。改成定位寫入後這個結構垮掉——「條件不成立所以什麼都沒寫」變成一個必須主動偵測的正常回傳值，不是例外。
        </p>
        <p>
          先前 rally 送出一律回 404 的缺陷，根源就是這一層的語意混淆。不在同一個
          Change 裡重新定義清楚，等於換一個地方重犯。範圍要收緊：
          <strong>只處理新寫入路徑產生的錯誤語意</strong>
          ，不做全域錯誤訊息盤點。
        </p>
        <div className="space-y-4">
          <Scenario
            given="定位寫入的目標 game 不存在"
            when="更新以 _id 為條件執行"
            then="matchedCount === 0 → GAME_NOT_FOUND (404)"
          />
          <Scenario
            given="game 存在但 setIndex 指向不存在的局"
            when="定位寫入的路徑條件不成立"
            then="matchedCount === 1 且 modifiedCount === 0 → SET_NOT_FOUND (404)；這是新寫入模型下唯一能區分兩者的依據"
          />
          <Scenario
            given="新增的 entry 帶著一個資料庫存不下的值"
            when="Mongoose cast 該片段失敗"
            then="ValidationError (400)，且該局已存在的 entry 完全不受影響——這正是本 Change 要證明的縮小爆炸半徑"
          />
          <Scenario
            given="兩台裝置同時記錄同一局"
            when="兩次 $push 先後抵達"
            then="兩顆球都保留，沒有任何一方的結果被覆蓋；順序由抵達順序決定，語意上的順序衝突留給同步協作的意圖錨點處理"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 id="risks">風險</h2>
        <RiskTable
          risks={[
            {
              name: "set.win / game.win 在定位寫入下永遠不會被寫入",
              severity: "critical",
              mitigation:
                "兩個欄位目前只在 rally.helper 的 processGamePhase 裡被寫入，靠整份覆寫一併存下。改成只 $push entry 後它們會靜默停止更新。記錄頁不受影響（isSetInProgress 由 Redux 從 entries 當場推導），壞的是 findGameSummaries：它讀 $$set.win 數勝局並投影 game.win，比賽列表的勝局數會全部顯示 0、勝負永遠停在建立時的 false。D7-A 以明確的 completeSet 操作在局末寫一次；驗收條件必須包含「完整記錄一局後 set.win 落庫，且比賽列表顯示正確勝局數」",
            },
            {
              name: "新比賽的 win 初始值為 false，語意上等於「已敗」",
              severity: "warning",
              mitigation:
                "create-game.usecase.ts:46 寫 win: false，但依 codebase 自身慣例（sets/list.tsx 用 typeof win === boolean 判斷是否結束）false 代表客隊贏。create-set 用的是 null，兩者不一致。改為 null，並把 GameSummary.win 的型別從 boolean 放寬為 boolean | null——它目前宣告非空卻投影可能為 null 的 game.win，型別在說謊",
            },
            {
              name: "停止寫入 stats 但讀取端未同步改為推導",
              severity: "critical",
              mitigation:
                "teams-stats 的 getTeamsStats 在 stats.length === 0 時回傳 createEmptyTeamStats()，會安靜地顯示一組零而不報錯。options/overview 直接讀 stats[setIndex] 同理。兩個元件必須在同一個 Change 內改成讀推導值，這是驗收條件而非後續工作",
            },
            {
              name: "推導在 render 期間執行而非 append 時執行",
              severity: "warning",
              mitigation:
                "演算法本身可忽略（一局 ≤60 entry，建 Map 後約 O(N + P)），但若在 render 裡直接呼叫，成本會隨 render 次數成長。約束：在 reducer 裡 append 後算一次並存進 state",
            },
            {
              name: "entries 沒有穩定識別，取代第 N 顆球在並行下不安全",
              severity: "warning",
              mitigation:
                "entrySchema 設定 _id: false，entries 只能以陣列位置定址。單一寫入者下 entryIndex 可用；並行寫入下必須改用意圖錨點，這個決定與 v0.20.0 同步協作共用，兩邊要對齊",
            },
            {
              name: "counter 語意本來就是錯的，推導時必須擇一",
              severity: "warning",
              mitigation:
                "TeamStatsClass 以剩餘次數初始化（substitution 6 / timeout 2 / challenge 2），substitution.helper 卻對它遞增。目前無人讀取所以沒有暴露。推導時統一為「已用次數」，剩餘由規則上限相減；此語意是 v0.17.0 規則驗證的前置",
            },
            {
              name: "entities 若引入 server-only 相依，共用會變成洩漏",
              severity: "warning",
              mitigation:
                "只在 D6-A 下成立。entities/game.ts 目前只 import entities/errors 與 entities/team，是乾淨的。需要一條可檢查的邊界約束（import 邊界測試或 lint 規則）防止未來退化",
            },
            {
              name: "推導規則變更會回溯改變歷史比賽數字",
              severity: "warning",
              mitigation:
                "單場推導無凍結點。跨場的凍結由 v0.18.0 的 materialization 在整場結束時提供；本 Change 不自行決定 set 粒度的 materialization",
            },
            {
              name: "資料庫選型決定遷移導致實作作廢",
              severity: "info",
              mitigation:
                "D0-B 已接受此風險：作廢範圍是 GameRepositoryImpl 兩個方法體。分層以可驗證方式保障——資料庫語法不得離開該檔案，usecase 測試不得 mock 任何資料庫概念",
            },
            {
              name: "兩套寫入模型並存期間被誤用",
              severity: "info",
              mitigation:
                "D3-A 在 Change 內寫死 update() 的存續條件與解除條件；新增寫入路徑走定位寫入是 review 的檢查項",
            },
            {
              name: "整合測試涵蓋不到真實提交形狀",
              severity: "info",
              mitigation:
                "既有測試曾因送出的 rally 缺少 player key 而繞過出問題的分支。本 Change 的整合測試必須走真實入口與前端實際提交的 draft 形狀",
            },
          ]}
        />
      </section>
    </div>
  );
}
