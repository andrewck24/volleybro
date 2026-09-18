# 方案：WORKFLOW gate 模型重整與 Blueprint 拆分

日期：2026-09-17。狀態：開發者已核准 D1–D4 與 §7 全部決定，進入實作。

## 1. 目標與量測基準

目標：人只在兩個點介入，其餘全由 agent 自動推進；Blueprint 只服務那兩個點；PR diff 只含程式碼、測試、持久知識。

基準（team-membership-authorization，PR #410）：

| 指標 | 現況 | 目標 |
| --- | --- | --- |
| 人工 gate 命中 | 28 次 | ≤ 4 次（2 個 gate 各 1 次，加上釐清問題） |
| Blueprint-only commit | 24 / 50 | 0 |
| gate 後文件重新同步 commit | 13 | 0 |
| 每個 change 的 Blueprint 頁面 | 4 頁 + 10 個 slice JSON + 4 個 ADR JSON | 2 頁 + ADR JSON |
| WORKFLOW 內 Blueprint 寫入義務 | 11 處，其中兩處每輪重複 | 2 處，各一次 |

## 2. 三個決定

### D1 兩個人工 gate

| Gate | 時機 | 人看什麼 | 通過後 agent 直接做什麼 |
| --- | --- | --- | --- |
| G1 Proposal | Discuss 收斂後、Apply 前 | Proposal 頁：TLDR、邊界與依賴方向、behavior contract、acceptance scenarios（given/when/then）、ADR、design mockup、風險 | 切 slice、寫 acceptance test、實作、review 到 fixed point、Archive，全程不停 |
| G2 Delivery | Archive 完成、PR 開啟前 | Delivery 頁：acceptance scenarios 的執行結果、驗證表、review findings、邊界相關的 AnnotatedDiff、殘留風險 | 開 PR、等 CI、merge、關 issue |

被合併或刪除的 gate：Discuss 出口（併入 G1）、Prepare Execution 的 slice 計畫核准（slice 是 agent 的內部工作單位，不需人核）、每輪 review 後的 Review 頁更新（review 是 agent 內部 fixed point，人只看最終狀態）、Archive 前的 reconcile（沒有可過時的頁面）。Ingest 保留，但只在 agent 判定 approved design 不可行時回到 G1。

理據：Uncle Bob 只審 acceptance test 與 QA procedure，不審 unit test 與程式碼；Symphony 只在 ticket 與 PR review 兩端放人；Matt 的 slice 是 agent 的 fresh-context 工作單位，不是給人審的文件。

### D2 Blueprint change 頁面縮成兩頁，且不進 git

| 頁 | 內容 | 沿用元件 | 產生時機 |
| --- | --- | --- | --- |
| `proposal.mdx` 加選用的 `proposal.tsx` | TLDR、Change boundaries 與依賴方向圖、behavior contract、acceptance scenarios、ADR 時間軸、design mockup、風險、testing strategy | `TLDR` `Scenario` `RiskTable` `DecisionTimeline` `InteractiveFlowchart`，mockup 沿用現行 `design.tsx` 的 TSX 頁面模式 | G1 前一次 |
| `delivery.mdx` | TLDR、acceptance 結果表、驗證表、findings（`RiskTable`）、`AnnotatedDiff`（只放邊界或 contract 相關的修法）、殘留風險與後續 | `TLDR` `RiskTable` `AnnotatedDiff` `FileTour` | G2 前一次 |

刪除的內容：Overview 頁（TLDR 與邊界併入 Proposal）、Implementation 頁與 `implementation/plan.json`、`slices/S*.json`（slice 存 issue tracker 或 agent workpad）、Review 頁的輪次紀錄與 plan-versus-actual、`change.json` 的 lifecycle 與 archivedAt、ADR 的 candidate → accepted → implemented 狀態機（ADR 只有「提案中」與「已提升到 features」兩個狀態，由所在目錄表示）。

Design mockup 明確保留在 Proposal 頁。它是 G1 要驗收的東西，也是 HTML 相對純文字最有價值的部分。若 mockup 成為長期規範，Archive 時提升到 design-system 頁面或 feature 頁面，否則隨 Proposal 頁丟棄。

`blueprint/content/changes/` 整個目錄進 `.gitignore`。頁面在 agent 的 worktree 內本地產生，用 `pnpm --filter blueprint dev` 檢視。驗收後留下的持久物只有：提升到 `features/` 的 ADR 與行為描述、changeset、PR body 內匯出的 Delivery 摘要（Markdown）。

### D3 features 與 design-system 留在 git 且部署不變

`features/` 是 WORKFLOW 宣告的 canonical capability knowledge，agent 每次 intake 都讀，必須與程式碼同版本。`design-system/` 內嵌 app tokens 的凍結副本，docs/design-system.md 指它為 rendered source of truth，必須與 src 一起改。兩者的 diff 是有價值的 diff。

Cloudflare build 指令不變，產出只剩 features 與 design-system。CI 的 blueprint job 保留，但不再被 change 頁面的 MDX 或元件錯誤擋住。

### D4 Change 範圍：軟性目標加具名逃生口

成熟團隊（Google eng-practices、SWE book、Chromium LSC、Shopify、SmartBear 研究）一致用軟性目標綁定範圍，約 100–300 行、一個自足的 change，沒有任何一家用硬性拒絕的上限，且全部豁免大型 refactor 與工具生成的 change。大型遷移一律漸進（Strangler Fig、Branch by Abstraction、expand/contract、LSC shards），全局判斷前移到一份核准過的 proposal，各 shard 的 reviewer 只判斷「是否符合計畫」。

| 指標 | 軟性目標 | 超過時 agent 的動作 |
| --- | --- | --- |
| slice 數 | ≤ 5 | 在 G1 提案時拆成多個 Change |
| src 變動檔案 | ≤ 30 | 同上 |
| Proposal 頁 acceptance scenarios | ≤ 8 | 同上 |
| Delivery 摘要進 PR body | ≤ 40 行 | 其餘留在 commit body |

兩條硬規則：

- 一個 Change 只能是 structure（行為不變的 refactor）或 behavior 其中一種，不能混合。structure Change 的 acceptance 是既有測試全綠加上依賴方向檢查。
- 逃生口是 **Migration Change**：一份涵蓋整個遷移的 Proposal 在 G1 核准一次，內含 shard 清單、順序、每個 shard 的行為不變證明方式與完成條件。之後每個 shard 是獨立的 Change 與 PR，引用該 Migration Proposal 的 slug，跳過 G1，只過 G2。Linear 上以一個 tracking issue 串起所有 shard。Migration Proposal 的 ADR 在第一個 shard 進 features 時提升，之後的 shard 不再重複。

`check-workflow.js` 對照 base 跑 `git diff --stat`，超過軟性目標且 PR body 未引用 Migration Proposal slug 時警告而非失敗。

## 3. WORKFLOW.md 改動對照

| 區段 | 行 | 改動 |
| --- | --- | --- |
| Authority and retention | 72–87 | 「Blueprint Changes own durable rationale, adopted design, implementation slices, lifecycle, and human review presentation」改為「Blueprint Change pages are throwaway review surfaces for the two human gates; durable rationale lives in Feature ADRs, PR bodies, and commit bodies」。 |
| Lifecycle §1 Discuss | 113–127 | 保留 grill-with-docs 與 CONTEXT.md 規則。Exit 改為「Proposal 頁產生完成並通知開發者」，不再要求 Linear 內明示邊界。 |
| §2 Propose | 129–144 | 與 §1 合併為「Discuss and propose」。輸出物改為 Proposal 頁與 ADR JSON。刪除「commit Overview and Design on the Change branch」。 |
| §3 Prepare execution | 146–161 | 刪除整節。slice 切分移到 §4 Apply 第一步，是 agent 內部動作，不停。`ready-for-review` `ready-for-implementation` `agent:ready` 的 lifecycle 規則一併刪除；Symphony 的觸發改由 tracker 狀態決定（見 Execution modes）。 |
| §4 Apply | 163–209 | 步驟 1 改為「read Proposal page, ADRs, git state；decompose into slices in the workpad」。刪除步驟 5「change the slice status」與步驟 6 的「completed slice JSON together」。步驟 7 的 commit trailer `Implements: S0X` 保留，slice ID 由 workpad 定義。第一個 slice 固定為「把 Proposal 的 acceptance scenarios 寫成可執行的 acceptance test」。Ingest 改寫為「回到 G1」。 |
| §5 Pre-PR gate and delivery | 210–245 | 步驟 5「update Blueprint Review after each round」刪除。步驟 6 改為「產生 Delivery 頁，瀏覽器內閱讀一次，通知開發者」。刪除 lifecycle 設定。「Reading the source is not reading the page」保留。 |
| §6 Archive | 247–269 | 縮成三步：提升 ADR 與行為到 features、CONTEXT.md 只在詞彙變動時改、把 Delivery 摘要匯出到 PR body。刪除 reconcile 四頁、lifecycle、archivedAt、Blueprint build 驗證改為只跑 features 的 build。Archive 移到 G2 之前執行，G2 通過即開 PR。 |
| Implementation-slice contract | 271–322 | 從「Blueprint JSON」改為「`.scratch/<slug>/S0X.md`（手動模式）或 Linear sub-issue（Symphony 模式）」，一 slice 一檔，隨 worktree 消失；欄位沿用現行 contract。schema 檔刪除。加入 D4 的範圍目標、structure/behavior 二選一與 Migration Change 規則。 |
| Decision-record contract | 323–357 | 保留 JSON schema 與 `targets`。刪除 candidate/accepted/implemented 狀態欄位，改為「位於 change 目錄即提案中，位於 features 目錄即已採用」。 |
| Workpad and handoff | 407–430 | 手動模式改為以 `.scratch/<slug>/` 承接 slice 與 next_action；Symphony 模式 workpad 不變。兩者都是 Operational，Archive 後刪除。 |
| Execution modes | 373–406 | Symphony 觸發條件改為 tracker 狀態，不再依賴 `agent:ready` 與 Blueprint lifecycle。Workpad 承接 slice 狀態。 |
| Blueprint knowledge contract | 431–446 | 五項改為三項：Proposal、Delivery、Features。 |
| Presentation | 447–483 | 元件表保留。「Minimum per page」改寫為 Proposal 與 Delivery 兩頁的最低要求。加一條：「Change pages are not committed; the durable export is Markdown」。 |

## 4. docs/agents 改動

- `blueprint.md`：「Change-scoped durable record」整段刪除，改為「Change pages are review surfaces, gitignored, regenerated per gate」。「Canonical current knowledge」保留。
- `artifact-lifecycle.md`：表格的「Change-scoped durable」列刪除，Proposal 與 Delivery 頁歸入 Operational。「Branch-local Archive」九步縮成上述三步。
- `issue-tracker.md`：加入 slice 條目的放置位置（Linear sub-issue 或 workpad 段落）。

## 5. Blueprint 程式與內容改動

| 項目 | 動作 |
| --- | --- |
| `blueprint/.gitignore` 與根 `.gitignore` | 加入 `blueprint/content/changes/` 與 `.scratch/`。 |
| 既有 24 個 change 目錄 | 從 git index 移除（`git rm -r --cached`）。歷史仍在 git log。開發者已同意。 |
| `source.config.ts` | changes collection 在目錄不存在時要能 build；或改為只在 dev 模式載入。 |
| `schemas/` | 刪除 `change.schema.json` 與 `implementation-slice.schema.json`；`decision-record.schema.json` 保留並移除 status enum。 |
| `scripts/check-workflow.js` | 移除 FileTour code 必填、四頁存在性、lifecycle 檢查；改為檢查 Proposal 含 `Scenario`、Delivery 含驗證表、D4 範圍警告。 |
| 元件 | 保留 `TLDR` `Scenario` `RiskTable` `AnnotatedDiff` `FileTour` `DecisionTimeline` `InteractiveFlowchart` `DocsLayoutShell`。刪除 `ImplementationSlices` `TaskProgress` `Timeline` `LifecycleBadge` `StatusBadge` `ChangeCard` `ChangesCatalog` `ChangeOverview` `WorkflowBlastRadius` `WorkflowLifecycleFlowchart` 與其測試。 |
| CI `blueprint` job | 保留 test 與 build。 |
| `docs/design-system.md` | 不動。 |

## 6. 切片與順序

全部在一個 change branch 完成，slug 建議 `two-gate-workflow`。

1. S01 WORKFLOW.md 與 docs/agents 三檔改寫（純文件，可交 executor，驗收命令 `pnpm check:workflow` 需同步調整）。
2. S02 `check-workflow.js` 與 schema 調整，讓 S01 的新規則可被檢查。
3. S03 Blueprint：gitignore、source.config、元件刪除、既有 changes 從 index 移除。驗收命令 `pnpm --filter blueprint test && pnpm --filter blueprint build`。
4. S04 CONTRIBUTING.md 的 commit trailer 段落改為引用 workpad slice ID。
5. S05 用一個小 change 做 dry run，量測 §1 的指標。

S01 與 S03 可並行；S02 依賴 S01。

## 7. 已決定事項

1. 既有 24 個 change 目錄從 git 移除。
2. slice 存 `.scratch/<slug>/`（手動）或 Linear sub-issue（Symphony），隨 workflow 結束移除。
3. Delivery 摘要上限 40 行；Change 範圍採 D4 的軟性目標加 Migration Change 逃生口。
4. Change 頁不部署，本地 `pnpm --filter blueprint dev` 檢視；遠端預覽 script 留待需要時再加。
