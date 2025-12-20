# Implementation Plan: 統一 Player 實體重構

**Branch**: `001-unify-player` | **Date**: 2025-12-20 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-unify-player/spec.md`

## Summary

將現有分散的 `Team.members[]`（角色管理）和 `Member` collection（球員資訊）統一為單一 `Player` 實體，支援隊伍邀請、成員管理和比賽紀錄功能。採用 Clean Architecture 架構、TDD 開發流程、Zod 資料驗證和 SWR 前端快取。

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+, React 19
**Primary Dependencies**: Next.js 15+, Mongoose ODM, Better Auth, Redux Toolkit, SWR, Zod, InversifyJS
**Storage**: MongoDB (Atlas)
**Testing**: Jest with jsdom environment, TDD workflow (Red-Green-Refactor)
**Target Platform**: Web (PWA), Mobile-first responsive design
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: 網路請求 < 500ms (p95), 頁面載入 < 2.5s (LCP)
**Constraints**: 離線功能 (PWA), 不需向後相容 (0.x.x 階段)
**Scale/Scope**: 單一隊伍約 20-30 名球員，使用者可加入多個隊伍

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### 計畫階段檢查（Phase 0 前）

#### I. MVP First - ✅ PASS

- P1 優先級用戶故事（US1-US3）構成 MVP：邀請成員、接受/拒絕邀請、查看成員列表
- 每個 P1 故事可獨立測試和交付
- P2/P3 功能（角色管理、權限移轉、取消邀請）在 MVP 完成後實作

#### II. Test-Driven Development - ✅ PASS

- 使用者指定使用 Jest 搭配 TDD 開發
- 每個 User Story 有明確的驗收情境 (Given-When-Then)
- 將遵循 Red-Green-Refactor 循環

#### III. Quality First - ✅ PASS

- 遵循 Clean Architecture 分層原則
- 使用 Zod 進行資料驗證
- TypeScript 嚴格模式
- 使用者指定使用 Shadcn/UI 和 CSS variables

#### IV. Chinese Docs, Multilingual UI - ✅ PASS

- 規格文件和計畫文件使用繁體中文
- 程式碼和 commit message 使用英文

#### V. Clean Architecture Adherence - ✅ PASS

- 依賴方向正確：Entities → Applications → Infrastructure → Interface
- 使用 InversifyJS 依賴注入
- Repository pattern 分離資料存取

---

### 設計階段檢查（Phase 1 完成後） - ✅ PASS

**檢查時間**: 2025-12-20
**檢查範圍**: research.md, data-model.md, API contracts, quickstart.md

#### I. MVP First（設計階段） - ✅ PASS

- **Data Model** 設計支援 MVP 最小化實作：
  - Player 實體包含 P1 所需的核心欄位（name, email, userId, role, teamId）
  - 狀態推斷使用 computed property，避免儲存冗餘狀態欄位
  - P2/P3 功能（角色變更、權限移轉）可透過相同資料模型擴充，無需修改 schema

- **API Contracts** 遵循 MVP 分階段交付：
  - P1 端點：POST /teams/{teamId}/players（邀請）、PATCH /players/{playerId}/status（accept/reject）、GET /teams/{teamId}/players
  - P2/P3 端點明確標示，不影響 P1 功能獨立性

- **Quickstart** 實作順序由簡入深：
  - Phase 2（Entity & Schema）→ Phase 3（查詢 Use Cases）→ Phase 4（變更 Use Cases）→ Phase 5（API）→ Phase 6（Frontend）
  - 每個 Phase 有獨立的 checkpoint 和驗證步驟

#### II. Test-Driven Development（設計階段） - ✅ PASS

- **Research** 明確定義 TDD 策略：
  - 所有驗證邏輯使用 Zod schema（可自動測試）
  - Use Cases 採用 mock repository 進行單元測試
  - API routes 整合測試使用 Jest + Supertest

- **Quickstart** 詳細記錄 Red-Green-Refactor 流程：
  - 每個實作步驟包含完整測試範例（先寫測試 → 實作 → 重構）
  - Checkpoint 要求測試覆蓋率：核心邏輯 ≥ 85%，元件 ≥ 80%
  - Pre-commit checklist 強制執行 `npm test`、`npm run lint`、`npm run build`

- **API Contracts** 包含測試範例：
  - OpenAPI 定義完整的錯誤回應格式
  - Postman Collection 提供端點測試範例
  - JSON Schema 用於自動化驗證測試

#### III. Quality First（設計階段） - ✅ PASS

- **Code Quality**:
  - Data Model 使用 TypeScript 嚴格型別（PlayerRole, PlayerStatus enum）
  - Zod schema 確保執行時驗證
  - Mongoose schema 包含完整的資料庫層驗證（enum, min/max, required）
  - 索引策略明確定義（單欄位索引、複合唯一索引、partial filter）

- **UX Quality**:
  - API 設計遵循 RESTful 最佳實踐（resource-based URLs, 無動詞）
  - 錯誤回應格式一致（error code + message + details）
  - 狀態轉換使用 discriminated union，避免無效操作
  - Quickstart 包含無障礙性考量（keyboard navigation, ARIA labels）

- **Performance**:
  - MongoDB 索引優化查詢效能（teamId, userId, email 索引）
  - SWR 實作 optimistic updates 減少 UI 延遲
  - API contracts 定義效能預算（< 500ms p95）

#### IV. Chinese Docs, Multilingual UI（設計階段） - ✅ PASS

- **專案文件（繁體中文）**:
  - research.md, data-model.md, quickstart.md 全部使用繁體中文
  - API contracts README 使用繁體中文
  - Commit message 與 PR 標題使用英文（符合規範）

- **代碼層面（英文）**:
  - Entity 定義、API route、變數命名使用英文
  - OpenAPI schema 描述使用繁體中文（面向使用者的 API 文件）
  - 無 AI 相關署名

- **UI 多語系準備**:
  - Quickstart 定義元件測試包含文字內容驗證
  - 預留未來 i18n 整合點（通知系統）

#### V. Clean Architecture Adherence（設計階段） - ✅ PASS

- **依賴方向正確**:
  - Entity (`player.ts`) 無外部依賴，純業務邏輯（getPlayerStatus 函式）
  - Use Cases 僅依賴 repository interface，不依賴實作
  - Repository 實作依賴 Mongoose，但透過 interface 隔離
  - API routes 透過 DI container 注入 use cases

- **關注點分離**:
  - 邀請/角色/資訊三類業務邏輯拆分為不同 use cases
  - API 端點按資源與子資源清晰劃分（/players/{id}/info, /players/{id}/role, /players/{id}/status）
  - 通知系統整合點明確標註但不影響核心邏輯

- **可測試性**:
  - 所有 use cases 使用 interface 依賴，可 mock 測試
  - Entity 層純函式（getPlayerStatus）可獨立測試
  - Quickstart 提供完整的單元測試、整合測試、元件測試範例

---

**最終結論**: ✅ **設計階段憲法檢查全數通過，可進入 Phase 2 實作階段**

**特別亮點**:

1. 字串 enum 設計考量未來 Prisma 遷移相容性（研究詳盡）
2. API 端點設計經多次迭代，達到 RESTful 最佳實踐
3. 通知系統整合點預留，但不增加當前複雜度
4. Quickstart 提供逐步 TDD 範例，降低實作門檻

## Project Structure

### Documentation (this feature)

```text
specs/001-unify-player/
├── spec.md              # Feature specification
├── entity-relations.md  # Entity relationship diagram
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── entities/
│   ├── player.ts              # NEW: 統一 Player 實體定義
│   ├── team.ts                # MODIFY: 移除 members[], Member type, 保留 Lineup
│   ├── member.ts              # DELETE: 合併至 player.ts
│   ├── profile.ts             # MODIFY: 移除 teams 欄位
│   └── record.ts              # KEEP: 保留 MatchPlayer 快照結構
│
├── applications/
│   ├── repositories/
│   │   ├── player.repository.interface.ts    # NEW
│   │   ├── team.repository.interface.ts      # MODIFY
│   │   └── profile.repository.interface.ts   # MODIFY: 移除 teams 相關方法
│   ├── usecases/
│   │   └── player/
│   │       # 邀請管理（未來整合通知：建立邀請時觸發）
│   │       ├── create-invitation.usecase.ts  # NEW: 建立邀請
│   │       ├── cancel-invitation.usecase.ts  # NEW: 取消邀請
│   │       ├── accept-invitation.usecase.ts  # NEW: 接受邀請
│   │       ├── reject-invitation.usecase.ts  # NEW: 拒絕邀請
│   │       # 角色管理（未來整合通知：角色變更時觸發）
│   │       ├── update-role.usecase.ts        # NEW: 更新角色
│   │       ├── transfer-ownership.usecase.ts # NEW: 移轉 OWNER
│   │       # 球員資訊管理（無通知需求）
│   │       ├── create-player.usecase.ts      # NEW: 新增純球員
│   │       ├── update-player-info.usecase.ts # NEW: 更新資訊（name, number, position）
│   │       ├── leave-team.usecase.ts         # NEW: 離開隊伍
│   │       └── delete-player.usecase.ts      # NEW: 刪除球員
│   └── services/
│       └── auth/
│           └── authorization.service.interface.ts  # MODIFY: 改用 Player 查詢角色
│
├── infrastructure/
│   ├── db/
│   │   ├── mongoose/schemas/
│   │   │   ├── player.ts                     # NEW: Player schema
│   │   │   ├── team.ts                       # MODIFY: 移除 members schema
│   │   │   ├── profile.ts                    # MODIFY: 移除 teams 欄位
│   │   │   └── member.ts                     # DELETE: 合併至 player
│   │   └── repositories/
│   │       ├── player.repository.ts          # NEW
│   │       ├── team.repository.ts            # MODIFY
│   │       └── profile.repository.ts         # MODIFY
│   ├── services/
│   │   └── auth/
│   │       └── authorization.service.ts      # MODIFY: 改用 PlayerRepository
│   └── di/
│       └── container.ts                      # MODIFY: 註冊新服務
│
├── interface/controllers/
│   └── player.controller.ts                  # NEW
│
├── app/api/
│   ├── players/[playerId]/
│   │   ├── route.ts                          # NEW: GET, DELETE
│   │   ├── info/
│   │   │   └── route.ts                      # NEW: PATCH 更新資訊（無通知）
│   │   ├── role/
│   │   │   └── route.ts                      # NEW: PATCH 更新角色（含 OWNER 移轉）
│   │   └── status/
│   │       └── route.ts                      # NEW: PATCH 成員狀態操作
│   │                                         #   { action: "invite", email } - 建立邀請
│   │                                         #   { action: "cancel" } - 取消邀請
│   │                                         #   { action: "accept" } - 接受邀請
│   │                                         #   { action: "reject" } - 拒絕邀請
│   │                                         #   { action: "leave" } - 離開隊伍
│   ├── teams/[teamId]/
│   │   ├── players/
│   │   │   └── route.ts                      # NEW: GET 列表, POST 新增
│   │   │                                     #   POST body 含 email → 邀請；無 email → 純球員
│   │   ├── members/
│   │   │   └── route.ts                      # DELETE: 移除舊 API
│   │   └── lineups/
│   │       └── route.ts                      # MODIFY: 更新引用 Player
│   ├── users/[userId]/
│   │   └── players/
│   │       └── route.ts                      # NEW: GET 使用者所有 Player（含待處理邀請）
│   ├── members/
│   │   ├── route.ts                          # DELETE: 移除舊 API
│   │   └── [memberId]/
│   │       └── route.ts                      # DELETE: 移除舊 API
│   └── users/teams/
│       └── route.ts                          # DELETE: 改用 /api/users/[userId]/players
│
├── lib/
│   ├── validations/
│   │   └── player.ts                         # NEW: Zod schemas
│   └── features/
│       └── player/
│           ├── hooks/
│           │   └── use-players.ts            # NEW: SWR 讀取 + useSWRMutation 變更操作
│           └── api/
│               └── player-api.ts             # NEW: API client
│
└── components/
    └── team/
        ├── player-list.tsx                   # NEW: 球員列表（含篩選：全部/已加入/邀請中/純球員）
        ├── player-card.tsx                   # NEW: 球員卡片（含角色、邀請狀態、操作按鈕）
        ├── player-form.tsx                   # NEW: 新增/編輯球員表單
        ├── invite-accordion.tsx              # NEW: 邀請手風琴（輸入 email、選擇角色、填寫球員資訊）
        ├── role-select.tsx                   # NEW: 角色選擇下拉元件
        ├── member-list.tsx                   # DELETE: 被 player-list 取代
        └── member-card.tsx                   # DELETE: 被 player-card 取代

scripts/
└── migrations/
    └── migrate-to-unified-player.ts          # NEW: 資料遷移腳本
```

**Structure Decision**: 遵循現有 Clean Architecture 結構，新增 Player 相關檔案，移除並重構 Member 相關檔案。移除所有舊的 `/api/members` 路由，統一使用 `/api/players` 和 `/api/teams/[teamId]/players`。權限驗證邏輯保留在現有的 `AuthorizationService`，修改為透過 `PlayerRepository` 查詢角色。

## Complexity Tracking

> 無 Constitution 違規需要記錄。
