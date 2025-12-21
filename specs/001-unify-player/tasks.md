# Tasks: 統一 Player 實體重構

**Input**: Design documents from `/specs/001-unify-player/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: 本專案採用 TDD 開發流程，所有測試任務已明確標示。

**Organization**: 任務依 User Story 分組，確保每個故事可獨立實作與測試。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可平行執行（不同檔案、無相依性）
- **[Story]**: 任務所屬的 User Story（例如：US1, US2, US3）
- 描述包含確切檔案路徑

## 路徑慣例

本專案結構：

- Entity 層：`src/entities/`
- Application 層：`src/applications/` (usecases, repositories)
- Infrastructure 層：`src/infrastructure/` (db/repositories, services, di)
- Interface 層：`src/interface/controllers/`
- API Routes：`src/app/api/`
- Validations：`src/lib/validations/`
- Hooks：`src/lib/features/player/hooks/`
- Components：`src/components/team/`
- Tests：與實作同目錄下的 `__tests__/`

---

## Phase 1: Setup（專案初始化）

**目的**：建立專案基礎結構與開發環境

- [x] T001 建立 Player 相關目錄結構（src/entities/, src/applications/usecases/player/, src/infrastructure/db/repositories/, src/app/api/players/）
- [x] T002 [P] 註冊 DI 容器類型定義至 src/infrastructure/di/types.ts
- [x] T003 [P] 準備測試環境設定（jest.setup.ts 已配置，確認 MongoDB mock 正常運作）

---

## Phase 2: Foundational（阻塞性先決條件）

**目的**：核心基礎設施，所有 User Story 開始前必須完成

**⚠️ 重要**：本階段完成前，任何 User Story 實作都無法開始

### Entity & Validation Layer

- [x] T004 [P] 建立 Player Entity 與狀態推斷函式於 src/entities/player.ts
- [x] T005 [P] 撰寫 Player Entity 單元測試於 src/entities/**tests**/player.test.ts（Red-Green-Refactor）
- [x] T006 [P] 建立 Zod 驗證 Schema 於 src/lib/validations/player.ts
- [x] T007 [P] 撰寫 Zod 驗證測試於 src/lib/validations/**tests**/player.test.ts（Red-Green-Refactor）

### Database Layer

- [x] T008 建立 Mongoose Player Schema 於 src/infrastructure/db/mongoose/schemas/player.ts（包含索引定義）
- [x] T009 撰寫 Mongoose Schema 驗證測試於 src/infrastructure/db/mongoose/schemas/**tests**/player.test.ts（Red-Green-Refactor）

### Repository Layer

- [x] T010 定義 IPlayerRepository 介面於 src/applications/repositories/player.repository.interface.ts
- [x] T011 實作 PlayerRepository 於 src/infrastructure/db/repositories/player.repository.ts
- [x] T012 撰寫 PlayerRepository 單元測試於 src/infrastructure/db/repositories/**tests**/player.repository.test.ts（Red-Green-Refactor）

### Authorization Service Update

- [x] T013 擴充 IAuthorizationService 介面，新增 Player 相關權限驗證方法於 src/applications/services/auth/authorization.service.interface.ts
- [x] T014 更新 AuthorizationService 實作，改用 PlayerRepository 查詢角色於 src/infrastructure/services/auth/authorization.service.ts
- [x] T015 撰寫 AuthorizationService 權限驗證測試於 src/infrastructure/services/auth/**tests**/authorization.service.test.ts（Red-Green-Refactor）

### Dependency Injection

- [x] T016 註冊 PlayerRepository 與相關 Use Cases 至 DI Container 於 src/infrastructure/di/container.ts

**Checkpoint**: 基礎設施完成 - User Story 實作可開始平行進行

---

## Phase 3: User Story 1 - 隊伍管理者邀請成員 (Priority: P1) 🎯 MVP

**目標**：隊伍管理者（OWNER 或 ADMIN）可透過 email 邀請其他使用者加入隊伍，並指定角色（MEMBER 或 ADMIN）

**獨立測試**：建立隊伍後發送邀請，驗證邀請記錄正確建立且被邀請者能看到邀請通知

### Tests for User Story 1（TDD - Red Phase）

> **注意：先撰寫測試，確保測試失敗後再實作**

- [x] T017 [P] [US1] 撰寫 CreateInvitationUseCase 測試於 src/applications/usecases/player/**tests**/create-invitation.usecase.test.ts
- [x] T018 [P] [US1] 撰寫 GetUserPlayersUseCase 測試於 src/applications/usecases/player/**tests**/get-user-players.usecase.test.ts
- [x] T019 [P] [US1] 撰寫 POST /api/teams/{teamId}/players（邀請）集成測試於 src/app/api/teams/[teamId]/players/**tests**/route.test.ts
- [x] T020 [P] [US1] 撰寫 GET /api/users/{userId}/players 集成測試於 src/app/api/users/[userId]/players/**tests**/route.test.ts

### Implementation for User Story 1（TDD - Green Phase）

- [x] T021 [P] [US1] 定義 ICreateInvitationUseCase 介面於 src/applications/usecases/player/create-invitation.usecase.interface.ts
- [x] T022 [P] [US1] 定義 IGetUserPlayersUseCase 介面於 src/applications/usecases/player/get-user-players.usecase.interface.ts
- [x] T023 [US1] 實作 CreateInvitationUseCase 於 src/applications/usecases/player/create-invitation.usecase.ts
- [x] T024 [US1] 實作 GetUserPlayersUseCase 於 src/applications/usecases/player/get-user-players.usecase.ts
- [x] T025 [P] [US1] 實作 POST /api/teams/{teamId}/players（建立邀請）於 src/app/api/teams/[teamId]/players/route.ts
- [x] T026 [P] [US1] 實作 GET /api/users/{userId}/players 於 src/app/api/users/[userId]/players/route.ts
- [x] T027 [US1] 建立 PlayerController 邀請相關方法於 src/interface/controllers/player.controller.ts
- [x] T028 [P] [US1] 建立 useUserPlayers SWR hook 於 src/lib/features/player/hooks/use-players.ts
- [x] T029 [P] [US1] 建立 InviteAccordion 元件於 src/components/team/invite-accordion.tsx
- [x] T030 [P] [US1] 建立 RoleSelect 元件於 src/components/team/role-select.tsx
- [x] T031 [US1] 撰寫 InviteAccordion 元件測試於 src/components/team/**tests**/invite-accordion.test.tsx

**Checkpoint**: User Story 1 應完全可運作且可獨立測試

---

## Phase 4: User Story 2 - 使用者接受或拒絕邀請 (Priority: P1) 🎯 MVP

**目標**：被邀請的使用者可查看所有待處理邀請，並選擇接受或拒絕

**獨立測試**：接受一個邀請，驗證 Player 記錄狀態正確更新且使用者能存取隊伍資源

### Tests for User Story 2（TDD - Red Phase）

- [x] T032 [P] [US2] 撰寫 AcceptInvitationUseCase 測試於 src/applications/usecases/player/**tests**/accept-invitation.usecase.test.ts
- [x] T033 [P] [US2] 撰寫 RejectInvitationUseCase 測試於 src/applications/usecases/player/**tests**/reject-invitation.usecase.test.ts
- [x] T034 [P] [US2] 撰寫 PATCH /api/players/{playerId}/status（accept）集成測試於 src/app/api/players/[playerId]/status/**tests**/route.test.ts

### Implementation for User Story 2（TDD - Green Phase）

- [x] T035 [P] [US2] 定義 IAcceptInvitationUseCase 介面於 src/applications/usecases/player/accept-invitation.usecase.interface.ts
- [x] T036 [P] [US2] 定義 IRejectInvitationUseCase 介面於 src/applications/usecases/player/reject-invitation.usecase.interface.ts
- [x] T037 [US2] 實作 AcceptInvitationUseCase 於 src/applications/usecases/player/accept-invitation.usecase.ts
- [x] T038 [US2] 實作 RejectInvitationUseCase 於 src/applications/usecases/player/reject-invitation.usecase.ts
- [x] T039 [US2] 實作 PATCH /api/players/{playerId}/status（含 accept/reject actions）於 src/app/api/players/[playerId]/status/route.ts
- [x] T040 [P] [US2] 建立 usePlayerStatusMutation hook 於 src/lib/features/player/hooks/use-players.ts
- [x] T041 [P] [US2] 建立 InvitationList 元件於 src/components/team/invitation-list.tsx（顯示待處理邀請）
- [x] T042 [US2] 撰寫 InvitationList 元件測試於 src/components/team/**tests**/invitation-list.test.tsx

**Checkpoint**: User Story 1 與 2 應同時正常運作且可獨立測試

---

## Phase 5: User Story 3 - 查看隊伍成員列表 (Priority: P1) 🎯 MVP

**目標**：隊伍成員可查看隊伍中所有球員和成員的列表，包含角色與球員資訊

**獨立測試**：查看隊伍成員頁面，驗證所有成員和球員資訊正確顯示

### Tests for User Story 3（TDD - Red Phase）

- [x] T043 [P] [US3] 撰寫 GetTeamPlayersUseCase 測試於 src/applications/usecases/player/**tests**/get-team-players.usecase.test.ts
- [x] T044 [P] [US3] 撰寫 GetPlayerUseCase 測試於 src/applications/usecases/player/**tests**/get-player.usecase.test.ts
- [x] T045 [P] [US3] 撰寫 GET /api/teams/{teamId}/players 集成測試於 src/app/api/teams/[teamId]/players/**tests**/route.test.ts
- [x] T046 [P] [US3] 撰寫 GET /api/players/{playerId} 集成測試於 src/app/api/players/[playerId]/**tests**/route.test.ts

### Implementation for User Story 3（TDD - Green Phase）

- [x] T047 [P] [US3] 定義 IGetTeamPlayersUseCase 介面於 src/applications/usecases/player/get-team-players.usecase.interface.ts
- [x] T048 [P] [US3] 定義 IGetPlayerUseCase 介面於 src/applications/usecases/player/get-player.usecase.interface.ts
- [x] T049 [US3] 實作 GetTeamPlayersUseCase 於 src/applications/usecases/player/get-team-players.usecase.ts
- [x] T050 [US3] 實作 GetPlayerUseCase 於 src/applications/usecases/player/get-player.usecase.ts
- [x] T051 [US3] 實作 GET /api/teams/{teamId}/players 於 src/app/api/teams/[teamId]/players/route.ts
- [x] T052 [US3] 實作 GET /api/players/{playerId} 於 src/app/api/players/[playerId]/route.ts
- [x] T053 [P] [US3] 建立 useTeamPlayers SWR hook 於 src/lib/features/player/hooks/use-players.ts
- [x] T054 [P] [US3] 建立 PlayerCard 元件於 src/components/team/player-card.tsx
- [x] T055 [P] [US3] 建立 PlayerList 元件於 src/components/team/player-list.tsx（含篩選功能）
- [x] T056 [US3] 撰寫 PlayerCard 元件測試於 src/components/team/**tests**/player-card.test.tsx
- [x] T057 [US3] 撰寫 PlayerList 元件測試於 src/components/team/**tests**/player-list.test.tsx

**Checkpoint**: MVP 核心功能（US1-US3）全部完成，可獨立測試與驗收

---

## Phase 5.5: MVP Hotfixes & Code Quality (Critical Issues After MVP)

**目的**：解決 code review 中發現的 critical security 和 performance 問題，在開始 Phase 6 (US4) 之前完成

### Security & Performance Fixes

- [x] T058 [P] Fix email validation in CreateInvitationUseCase - use Zod schema validation instead of basic string check (防止 email injection 攻擊) 於 src/applications/usecases/player/create-invitation.usecase.ts
- [x] T059 [P] Add owner-only protection for OWNER role assignment in CreateInvitationUseCase (防止非 OWNER 分配 OWNER 角色) 於 src/applications/usecases/player/create-invitation.usecase.ts
- [x] T060 [P] Add missing database indexes to PlayerSchema (teamId+userId, teamId+email, teamId+role) 於 src/infrastructure/db/mongoose/schemas/player.ts
- [x] T061 [P] Replace existsInvitation() call with findInvitedByTeamIdAndEmail() in CreateInvitationUseCase (消除重複查詢邏輯) 於 src/applications/usecases/player/create-invitation.usecase.ts

**Checkpoint**: 所有 MVP critical issues 已修復，可安心進入 Phase 6

---

## Phase 6: User Story 4 - 新增純球員 (Priority: P2)

**目標**：隊伍管理者可新增不需要系統帳號的球員（對手球員、借將）

**獨立測試**：新增一個純球員，驗證 Player 記錄正確建立且可在陣容中使用

### Tests for User Story 4（TDD - Red Phase）

- [x] T062 [P] [US4] 撰寫 CreatePlayerUseCase 測試於 src/applications/usecases/player/**tests**/create-player.usecase.test.ts
- [x] T063 [P] [US4] 撰寫 POST /api/teams/{teamId}/players（純球員）集成測試於 src/app/api/teams/[teamId]/players/**tests**/route.test.ts

### Implementation for User Story 4（TDD - Green Phase）

- [x] T064 [P] [US4] 定義 ICreatePlayerUseCase 介面於 src/applications/usecases/player/create-player.usecase.interface.ts
- [x] T065 [US4] 實作 CreatePlayerUseCase 於 src/applications/usecases/player/create-player.usecase.ts
- [x] T066 [US4] 擴充 POST /api/teams/{teamId}/players 支援純球員建立（無 email）於 src/app/api/teams/[teamId]/players/route.ts
- [x] T067 [P] [US4] 建立 PlayerForm 元件於 src/components/team/player-form.tsx
- [x] T068 [US4] 撰寫 PlayerForm 元件測試於 src/components/team/**tests**/player-form.test.tsx

**Checkpoint**: User Story 4 應可獨立測試

---

## Phase 7: User Story 5 - 管理成員角色與資訊 (Priority: P2)

**目標**：OWNER 和 ADMIN 可調整成員角色與基本資訊

**獨立測試**：將 MEMBER 升級為 ADMIN，驗證角色更新正確且權限生效

### Tests for User Story 5（TDD - Red Phase）

- [x] T069 [P] [US5] 撰寫 UpdateRoleUseCase 測試於 src/applications/usecases/player/**tests**/update-role.usecase.test.ts
- [x] T070 [P] [US5] 撰寫 UpdatePlayerInfoUseCase 測試於 src/applications/usecases/player/**tests**/update-player-info.usecase.test.ts
- [x] T071 [P] [US5] 撰寫 PATCH /api/players/{playerId}/role 集成測試於 src/app/api/players/[playerId]/role/**tests**/route.test.ts
- [x] T072 [P] [US5] 撰寫 PATCH /api/players/{playerId}/info 集成測試於 src/app/api/players/[playerId]/info/**tests**/route.test.ts

### Implementation for User Story 5（TDD - Green Phase）

- [x] T073 [P] [US5] 定義 IUpdateRoleUseCase 介面於 src/applications/usecases/player/update-role.usecase.interface.ts
- [x] T074 [P] [US5] 定義 IUpdatePlayerInfoUseCase 介面於 src/applications/usecases/player/update-player-info.usecase.interface.ts
- [x] T075 [US5] 實作 UpdateRoleUseCase 於 src/applications/usecases/player/update-role.usecase.ts
- [x] T076 [US5] 實作 UpdatePlayerInfoUseCase 於 src/applications/usecases/player/update-player-info.usecase.ts
- [x] T077 [US5] 實作 PATCH /api/players/{playerId}/role 於 src/app/api/players/[playerId]/role/route.ts
- [x] T078 [US5] 實作 PATCH /api/players/{playerId}/info 於 src/app/api/players/[playerId]/info/route.ts
- [x] T079 [P] [US5] 建立 usePlayerMutation hooks（updateRole, updateInfo）於 src/lib/features/player/hooks/use-players.ts
- [ ] T080 [P] [US5] 擴充 PlayerCard 元件支援角色與資訊編輯於 src/components/team/player-card.tsx

**Checkpoint**: User Story 5 應可獨立測試

---

## Phase 8: User Story 6 - 解除成員連結與權限移轉 (Priority: P2)

**目標**：成員可離開隊伍（解除 userId 連結），OWNER 可移轉權限

**獨立測試**：解除成員連結，驗證該使用者無法再存取隊伍管理功能，但 Player 資料保留

### Tests for User Story 6（TDD - Red Phase）

- [x] T081 [P] [US6] 撰寫 LeaveTeamUseCase 測試於 src/applications/usecases/player/**tests**/leave-team.usecase.test.ts
- [x] T082 [P] [US6] 撰寫 TransferOwnershipUseCase 測試於 src/applications/usecases/player/**tests**/transfer-ownership.usecase.test.ts
- [x] T083 [P] [US6] 撰寫 RemovePlayerUseCase 測試於 src/applications/usecases/player/**tests**/remove-player.usecase.test.ts
- [x] T084 [P] [US6] 撰寫 PATCH /api/players/{playerId}/status（leave）集成測試於 src/app/api/players/[playerId]/status/**tests**/route.test.ts
- [x] T085 [P] [US6] 撰寫 DELETE /api/players/{playerId} 集成測試於 src/app/api/players/[playerId]/**tests**/route.test.ts

### Implementation for User Story 6（TDD - Green Phase）

- [x] T086 [P] [US6] 定義 ILeaveTeamUseCase 介面於 src/applications/usecases/player/leave-team.usecase.interface.ts
- [x] T087 [P] [US6] 定義 ITransferOwnershipUseCase 介面於 src/applications/usecases/player/transfer-ownership.usecase.interface.ts
- [x] T088 [P] [US6] 定義 IRemovePlayerUseCase 介面於 src/applications/usecases/player/remove-player.usecase.interface.ts
- [x] T089 [US6] 實作 LeaveTeamUseCase 於 src/applications/usecases/player/leave-team.usecase.ts
- [x] T090 [US6] 實作 TransferOwnershipUseCase 於 src/applications/usecases/player/transfer-ownership.usecase.ts
- [x] T091 [US6] 實作 RemovePlayerUseCase 於 src/applications/usecases/player/remove-player.usecase.ts
- [x] T092 [US6] 擴充 PATCH /api/players/{playerId}/status 支援 leave action 於 src/app/api/players/[playerId]/status/route.ts
- [x] T093 [US6] 實作 DELETE /api/players/{playerId} 於 src/app/api/players/[playerId]/route.ts
- [x] T094 [P] [US6] 擴充 PlayerCard 元件支援離隊與刪除操作於 src/components/team/player-card.tsx

**Checkpoint**: User Story 6 應可獨立測試

---

## Phase 9: User Story 7 - 取消邀請 (Priority: P3)

**目標**：OWNER 或 ADMIN 可取消尚未被接受的邀請

**獨立測試**：取消一個待處理邀請，驗證 Player 的邀請狀態被清除且被邀請者不再看到該邀請

### Tests for User Story 7（TDD - Red Phase）

- [x] T095 [P] [US7] 撰寫 CancelInvitationUseCase 測試於 src/applications/usecases/player/**tests**/cancel-invitation.usecase.test.ts
- [x] T096 [P] [US7] 撰寫 PATCH /api/players/{playerId}/status（cancel）集成測試於 src/app/api/players/[playerId]/status/**tests**/route.test.ts

### Implementation for User Story 7（TDD - Green Phase）

- [x] T097 [P] [US7] 定義 ICancelInvitationUseCase 介面於 src/applications/usecases/player/cancel-invitation.usecase.interface.ts
- [x] T098 [US7] 實作 CancelInvitationUseCase 於 src/applications/usecases/player/cancel-invitation.usecase.ts
- [x] T099 [US7] 擴充 PATCH /api/players/{playerId}/status 支援 cancel action 於 src/app/api/players/[playerId]/status/route.ts
- [x] T100 [P] [US7] 擴充 PlayerCard 元件顯示「取消邀請」按鈕於 src/components/team/player-card.tsx

**Checkpoint**: User Story 7 應可獨立測試

---

## Phase 10: Data Migration & Cleanup（資料遷移與清理）

**目的**：遷移舊資料結構並移除舊程式碼

### Migration Script

- [x] T101 撰寫資料遷移腳本於 scripts/migrations/migrate-to-unified-player.ts（含 role 數值轉字串邏輯）
- [x] T102 撰寫遷移驗證腳本於 scripts/migrations/validate-migration.ts
- [x] T103 執行資料庫備份（mongodump）
- [x] T104 執行資料遷移（tsx scripts/migrations/migrate-to-unified-player.ts）
- [x] T105 執行遷移驗證（npm run validate-migration）

### Code Cleanup

- [x] T106 [P] 刪除 src/entities/member.ts
- [x] T107 [P] 刪除 src/infrastructure/db/mongoose/schemas/member.ts
- [x] T108 [P] 刪除 src/infrastructure/db/repositories/member.repository.ts
- [x] T109 [P] 刪除 src/app/api/members/ 目錄與所有相關路由
- [x] T110 移除 Team Entity 的 members[] 欄位於 src/entities/team.ts
- [x] T111 移除 Team Schema 的 members schema 於 src/infrastructure/db/mongoose/schemas/team.ts
- [x] T112 移除 Profile Entity 的 teams 欄位於 src/entities/profile.ts
- [x] T113 移除 Profile Schema 的 teams 欄位於 src/infrastructure/db/mongoose/schemas/profile.ts
- [x] T114 更新 DI Container 移除舊 Member 相關註冊於 src/infrastructure/di/container.ts
- [x] T115 [P] 刪除 src/components/team/member-list.tsx（被 player-list 取代）
- [x] T116 [P] 刪除 src/components/team/member-card.tsx（被 player-card 取代）
- [x] T117 更新所有 import 路徑移除 member 相關引用（全專案搜尋）

### Verification

- [x] T118 執行 `npm test` 確保所有測試通過
- [x] T119 執行 `npm run lint` 確保無 linting 錯誤

**Checkpoint**: 資料遷移完成且舊程式碼已移除

---

## Phase 11: Polish & Cross-Cutting Concerns（打磨與跨領域關注）

**目的**：改善影響多個 User Story 的功能

- [x] T120 [P] 最佳化 MongoDB 索引效能（確認所有索引正確建立）
- [x] T121 [P] 實作 SWR optimistic updates 減少 UI 延遲於 src/lib/features/player/hooks/use-players.ts
- [x] T122 [P] 新增錯誤處理與使用者友善的錯誤訊息
- [x] T123 [P] 新增無障礙性支援（keyboard navigation, ARIA labels）於所有元件
- [x] T124 [P] 新增 Toast 通知於邀請發送、接受、拒絕等操作
- [x] T125 [P] 程式碼重構與清理（移除重複邏輯、優化命名）
- [ ] T126 [P] 效能優化（減少 API 請求、優化 SWR cache）
- [ ] T127 執行 quickstart.md 驗證（依照 quickstart.md 步驟完整測試）
- [ ] T128 更新專案文件（CLAUDE.md, README.md）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 無相依性 - 可立即開始
- **Foundational (Phase 2)**: 依賴 Setup 完成 - **阻塞所有 User Story**
- **User Stories (Phase 3-9)**: 全部依賴 Foundational 完成
  - User Stories 可平行進行（如有多位開發者）
  - 或依優先順序序列執行（P1 → P2 → P3）
- **Migration (Phase 10)**: 依賴所有 User Story 完成
- **Polish (Phase 11)**: 依賴 Migration 完成

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 完成後可開始 - 無其他 Story 相依
- **User Story 2 (P1)**: Foundational 完成後可開始 - 與 US1 獨立
- **User Story 3 (P1)**: Foundational 完成後可開始 - 與 US1, US2 獨立
- **User Story 4 (P2)**: Foundational 完成後可開始 - 與其他 Story 獨立
- **User Story 5 (P2)**: Foundational 完成後可開始 - 與其他 Story 獨立
- **User Story 6 (P2)**: Foundational 完成後可開始 - 與其他 Story 獨立
- **User Story 7 (P3)**: Foundational 完成後可開始 - 與其他 Story 獨立

### Within Each User Story

- Tests 必須先撰寫且失敗，再進行實作（Red-Green-Refactor）
- Models 先於 Services
- Services 先於 Endpoints
- 核心實作先於整合
- Story 完成後再進入下一優先級

### Parallel Opportunities

- Phase 1 所有標記 [P] 的任務可平行執行
- Phase 2 所有標記 [P] 的任務可平行執行（Entity, Validation, Schema 可同時進行）
- Foundational 完成後，所有 User Story 可平行開始（如團隊容量允許）
- 每個 User Story 內標記 [P] 的測試可平行撰寫
- 每個 User Story 內標記 [P] 的實作可平行進行（不同檔案）

---

## Parallel Example: User Story 1

```bash
# 平行撰寫 User Story 1 的所有測試（Red Phase）:
Task T017: "撰寫 CreateInvitationUseCase 測試"
Task T018: "撰寫 GetUserPlayersUseCase 測試"
Task T019: "撰寫 POST /api/teams/{teamId}/players 集成測試"
Task T020: "撰寫 GET /api/users/{userId}/players 集成測試"

# 平行定義 User Story 1 的所有介面（Green Phase）:
Task T021: "定義 ICreateInvitationUseCase 介面"
Task T022: "定義 IGetUserPlayersUseCase 介面"

# 平行建立 User Story 1 的所有元件（Green Phase）:
Task T028: "建立 useUserPlayers SWR hook"
Task T029: "建立 InviteAccordion 元件"
Task T030: "建立 RoleSelect 元件"
```

---

## Implementation Strategy

### MVP First (User Story 1-3 Only)

1. 完成 Phase 1: Setup
2. 完成 Phase 2: Foundational（**重要 - 阻塞所有 Story**）
3. 完成 Phase 3: User Story 1（邀請成員）
4. 完成 Phase 4: User Story 2（接受/拒絕邀請）
5. 完成 Phase 5: User Story 3（查看成員列表）
6. **停止並驗證**: 測試 MVP 功能獨立運作
7. 準備部署/展示

### Incremental Delivery

1. 完成 Setup + Foundational → 基礎就緒
2. 新增 User Story 1 → 獨立測試 → 部署/展示（MVP 第一階段）
3. 新增 User Story 2 → 獨立測試 → 部署/展示（MVP 第二階段）
4. 新增 User Story 3 → 獨立測試 → 部署/展示（MVP 完整版）
5. 新增 User Story 4-7 → 獨立測試 → 部署/展示（功能擴充）
6. 每個 Story 增加價值而不破壞先前 Story

### Parallel Team Strategy

多位開發者時：

1. 團隊一起完成 Setup + Foundational
2. Foundational 完成後：
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories 獨立完成並整合

---

## Notes

- [P] 標記 = 不同檔案，無相依性，可平行執行
- [Story] 標記 = 將任務對應至特定 User Story，便於追蹤
- 每個 User Story 應可獨立完成與測試
- 遵循 TDD：驗證測試失敗後再實作
- 每個任務或邏輯群組完成後提交
- 在任何 Checkpoint 停止以獨立驗證 Story
- 避免：模糊任務、相同檔案衝突、破壞獨立性的跨 Story 相依

---

## Task Count Summary

- **Total Tasks**: 132 tasks
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 13 tasks
- **Phase 3 (US1 - P1)**: 15 tasks
- **Phase 4 (US2 - P1)**: 11 tasks
- **Phase 5 (US3 - P1)**: 15 tasks
- **Phase 5.5 (Hotfixes)**: 4 tasks
- **Phase 6 (US4 - P2)**: 7 tasks
- **Phase 7 (US5 - P2)**: 12 tasks
- **Phase 8 (US6 - P2)**: 14 tasks
- **Phase 9 (US7 - P3)**: 6 tasks
- **Phase 10 (Migration)**: 19 tasks
- **Phase 11 (Polish)**: 9 tasks

**Parallel Opportunities**: 約 60% 的任務標記 [P]，可在同一 Phase 內平行執行

**Suggested MVP Scope**: Phase 1-5（Setup + Foundational + US1-US3），共 57 tasks
