import { AnnotatedDiff } from "@/components/AnnotatedDiff";
import type { DecisionRecord } from "@/lib/decision-record";

import entriesAsSourceOfTruth from "../../content/decisions/0004-entries-as-source-of-truth.json";
import domainOperationRepository from "../../content/decisions/0005-domain-operation-repository.json";
import sharedDomainFunctions from "../../content/decisions/0006-shared-domain-functions.json";
import explicitSetCompletion from "../../content/decisions/0007-explicit-set-completion.json";

// The Vite adapter exposes only the archived data needed for this static rendering.
import {
  // @ts-expect-error appended by the Vite adapter
  RetainedWritePaths,
  // @ts-expect-error appended by the Vite adapter
  RetainedFlowSteps,
  // @ts-expect-error appended by the Vite adapter
  RetainedInterfaceDiff,
  // @ts-expect-error appended by the Vite adapter
  RetainedUsecaseDiff,
} from "../../content/changes/game-positional-writes/design";

type WritePath = {
  id: string;
  usecase: string;
  frequency: string;
  blastRadius: "high" | "medium" | "low" | "none";
  lostUpdate: "high" | "medium" | "low" | "none";
  writeVolume: "high" | "medium" | "low" | "none";
  today: string;
  proposed: string;
  verdict: string;
  slice: string;
};

type FlowStep = {
  id: string;
  label: string;
  route: string;
  todayWrites: string[];
  afterWrites: string[];
  derived: string[];
  reads: string[];
  status: "unchanged" | "resolved" | "open";
  note: string;
};

const WRITE_PATHS = RetainedWritePaths as WritePath[];
const FLOW_STEPS = RetainedFlowSteps as FlowStep[];
const INTERFACE_DIFF = RetainedInterfaceDiff as string;
const USECASE_DIFF = RetainedUsecaseDiff as string;
const LEVEL_LABEL = { high: "高", medium: "中", low: "低", none: "無" };
const STATUS_LABEL = {
  unchanged: "不受影響",
  resolved: "已有決策涵蓋",
  open: "尚待決策",
};
const DECISIONS = [
  entriesAsSourceOfTruth,
  domainOperationRepository,
  sharedDomainFunctions,
  explicitSetCompletion,
] as DecisionRecord[];

export function GamePositionalDetails({
  interfaceDiffHtml,
  usecaseDiffHtml,
}: {
  interfaceDiffHtml: string;
  usecaseDiffHtml: string;
}) {
  return (
    <div className="not-prose my-8 space-y-8">
      <section className="space-y-3" id="pressure-matrix">
        <h2>寫入路徑的風險矩陣</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">路徑／切片</th>
                <th className="text-left">頻率</th>
                <th>爆炸半徑</th>
                <th>Lost update</th>
                <th>寫入量成長</th>
                <th className="text-left">現況寫入</th>
                <th className="text-left">定位寫入</th>
                <th className="text-left">取捨</th>
              </tr>
            </thead>
            <tbody>
              {WRITE_PATHS.map((path) => (
                <tr key={path.id}>
                  <td>
                    <code>{path.id}</code>
                    <p className="m-0">{path.usecase}</p>
                    <p className="m-0 text-muted-foreground">
                      {path.slice === "core" ? "核心切片" : "建議延後"}
                    </p>
                  </td>
                  <td>{path.frequency}</td>
                  <td className="text-center">
                    {LEVEL_LABEL[path.blastRadius]}
                  </td>
                  <td className="text-center">
                    {LEVEL_LABEL[path.lostUpdate]}
                  </td>
                  <td className="text-center">
                    {LEVEL_LABEL[path.writeVolume]}
                  </td>
                  <td>
                    <code className="whitespace-pre-wrap">{path.today}</code>
                  </td>
                  <td>
                    <code className="whitespace-pre-wrap">{path.proposed}</code>
                  </td>
                  <td>{path.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" id="d1-payloads">
        <h2>統計保存與推導的寫入差異</h2>
        <p>
          同一顆球在三種模型下會改動不同範圍。D1 選擇第三種：只新增
          entry，統計由 entries 推導。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">模型</th>
                <th className="text-left">單次寫入</th>
                <th className="text-left">取捨</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>整份文件覆寫（現況）</td>
                <td>重送整場 Game，包含所有局、entries 與統計。</td>
                <td>
                  單一欄位 cast 失敗會拒絕整份寫入；並行的舊快照也可能互相覆蓋。
                </td>
              </tr>
              <tr>
                <td>定位寫入、統計仍儲存（D1-A）</td>
                <td>
                  <code>$push</code> 新 entry，並以 <code>$inc</code>{" "}
                  更新球員與球隊統計。
                </td>
                <td>
                  寫入較小且累加原子，但要維持 entries 與第二份統計狀態一致。
                </td>
              </tr>
              <tr>
                <td>定位寫入、統計由 entries 推導（D1-B）</td>
                <td>
                  只對指定 set 的 entries 執行 <code>$push</code>。
                </td>
                <td>entries 是唯一事實來源，沒有逐球累加路徑需要同步維護。</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 id="d1-options">D1 的選項</h3>
        <p>
          D1-A 可行但保留重複狀態；D1-B 以 entries 推導統計，採用此方向。既有
          aggregation 已從最後一筆 rally 推導比賽比分，提供相同模式的先例。
        </p>
      </section>

      <section className="space-y-3" id="d6-queries">
        <h2>queries 函式的領域分類</h2>
        <p>只有領域規則與查詢移入共用層；顯示便利與 UI policy 留在前端。</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">函式</th>
                <th className="text-left">分類</th>
                <th className="text-left">處理</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>getServingStatus</code>
                </td>
                <td>領域規則：得分方發球</td>
                <td>共用；輪轉推導需要。</td>
              </tr>
              <tr>
                <td>
                  <code>getPreviousRally</code>
                </td>
                <td>領域查詢</td>
                <td>
                  共用；<code>getServingStatus</code> 依賴它。
                </td>
              </tr>
              <tr>
                <td>
                  <code>getSetPhase</code>
                </td>
                <td>領域規則：一般局／決勝局門檻</td>
                <td>共用；伺服器需判斷一局是否結束。</td>
              </tr>
              <tr>
                <td>
                  <code>getPreviousScores</code>
                </td>
                <td>顯示便利</td>
                <td>
                  留在前端；它只是 <code>getPreviousRally</code> 的薄包裝。
                </td>
              </tr>
              <tr>
                <td>
                  <code>getSetLineup</code>
                </td>
                <td>UI policy</td>
                <td>留在前端；它決定表單要 seed 哪份陣容。</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 id="d6-constraints">共用函式的邊界</h3>
        <ul>
          <li>
            函式只接收最小結構化參數；前端可直接以 view 型別呼叫，不必轉換或斷言
            domain 型別。
          </li>
          <li>
            <code>entities</code> 不依賴 server-only 模組；import
            邊界由分層檢查守住。
          </li>
        </ul>
      </section>

      <section className="space-y-3" id="walkthrough">
        <h2>核心流程走查</h2>
        <ol className="space-y-4 pl-6">
          {FLOW_STEPS.map((step) => (
            <li key={step.id} className="space-y-2">
              <h3>{step.label}</h3>
              <p>
                <code>{step.route}</code> · {STATUS_LABEL[step.status]}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <strong>現況寫入</strong>
                  <ul>
                    {step.todayWrites.length ? (
                      step.todayWrites.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>唯讀</li>
                    )}
                  </ul>
                </div>
                <div>
                  <strong>變動後</strong>
                  <ul>
                    {step.afterWrites.length ? (
                      step.afterWrites.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>唯讀</li>
                    )}
                  </ul>
                </div>
              </div>
              {step.derived.length > 0 && (
                <p>
                  <strong>推導：</strong>
                  {step.derived.join("；")}
                </p>
              )}
              {step.reads.length > 0 && (
                <p>
                  <strong>讀取：</strong>
                  {step.reads.join("；")}
                </p>
              )}
              <p>{step.note}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3" id="walkthrough-findings">
        <h2>走查結論</h2>
        <ul>
          <li>
            九步中三步仍待決策，集中在 D7 的局／比賽結束，以及換人時的陣容寫入。
          </li>
          <li>
            定位寫入可能漏掉的副作用只有 <code>set.win</code>、
            <code>game.win</code> 與換人後的 <code>lineups</code>；後者仍以明確{" "}
            <code>$set</code> 寫入。
          </li>
          <li>
            比賽列表原本就從每局最後一顆 rally 推導比分；D1-B
            延續既有方式推導統計。
          </li>
          <li>
            建立新局仍整份覆寫，是刻意保留的路徑：它沒有 lost-update
            壓力，且保有 domain validation 與 delete 語意。
          </li>
        </ul>
        <p>
          統計是逐球累加的 running total，正是 lost update 的來源，因此由
          entries 推導；lineup
          是換人事件當下的離散狀態變更，仍需儲存。兩者責任不同，不應為求形式一致而改成同一模型。
        </p>
      </section>

      <section className="space-y-3" id="audit-findings">
        <h2>分層稽核發現</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">相依</th>
                <th className="text-left">發現與處理</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>applications → lib</code>（3 處）
                </td>
                <td>
                  <code>create-rally</code>、<code>update-rally</code> 使用前端
                  helper，D6-A 移除這兩處；<code>create-player</code> 的
                  validation 型別依賴仍由分層稽核工作處理。
                </td>
              </tr>
              <tr>
                <td>
                  <code>applications → infrastructure/di/types</code>（29 處）
                </td>
                <td>
                  全部是同一份 DI token
                  契約，沒有基礎設施行為；屬檔案位置問題，不在本 Change 範圍。
                </td>
              </tr>
              <tr>
                <td>
                  <code>infrastructure → lib/auth</code>（2 處）
                </td>
                <td>
                  <code>auth</code> 內使用 MongoDB client，實際仍是
                  infrastructure 相依；<code>src/lib</code>{" "}
                  混放多層，路徑無法代表相依方向。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3 id="audit-after">修正後的邊界</h3>
        <p>
          兩處前端 helper 倒置已由 D6-A 移除（3 降至 1）；entities
          保持零外部相依，MongoDB operators 留在 repository implementation。
        </p>
        <h3 id="audit-verdict">結論</h3>
        <p>
          本 Change 修正真正的 applications → lib 倒置；DI token 與 auth
          的位置問題不改變相依方向，留待各自的分層工作處理。
        </p>
      </section>

      <section className="space-y-3" id="decision-records">
        <h2>持久決策</h2>
        <ul>
          {DECISIONS.map((record) => (
            <li key={record.id}>
              <a href={`/features/${record.capabilities[0]}#adr-${record.id}`}>
                ADR-{record.id}：{record.title}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3" id="diffs">
        <h2>介面與 usecase 的實際改動</h2>
        <AnnotatedDiff
          code={INTERFACE_DIFF}
          lang="ts"
          highlightedHtml={interfaceDiffHtml}
        />
        <AnnotatedDiff
          code={USECASE_DIFF}
          lang="ts"
          highlightedHtml={usecaseDiffHtml}
        />
      </section>
    </div>
  );
}
