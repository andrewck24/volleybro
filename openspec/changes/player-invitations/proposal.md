## Why

現行的 Player 邀請系統透過 email/userId 欄位的有無來推導邀請狀態（INVITED/JOINED/PURE_PLAYER），邏輯複雜且在使用者變更 email 時會導致資料不一致。同時，邀請資訊冗餘地存在於 Profile.teams.inviting[] 和 Player 兩處，存在雙路徑（legacy `/api/users/teams` 與新版 `/api/players/{id}/invitations`）並行的問題。

## What Changes

### Player Status 模型重構

- **BREAKING**: 新增顯式 `status` 欄位（`NONE` / `INVITED` / `JOINED`），取代現行的 field-based 狀態推導
- 移除 `getPlayerStatus()` 推導函式與 Mongoose virtual status
- `NONE` 狀態下不允許存在 email 或 userId

### 邀請流程重新設計

- 邀請時先透過 user search API 搜尋使用者
  - 搜到已註冊使用者：直接填入 userId，status 設為 INVITED
  - 搜不到：填入 email，status 設為 INVITED，待使用者註冊後 hook 自動填入 userId 並清除 email
- 新增 `LinkPendingInvitationsUseCase`：使用者註冊時批量連結待處理邀請
- Registration hook（`user.create.after`）重構為直接 resolve use case，不經 controller

### User Search API

- 擴充 `GET /api/users?email={email}` 支援使用者搜尋
- 精確匹配，回傳精簡版資訊（\_id, name, image）
- 任何已登入使用者可用，附 rate limit

### Profile.teams 移除與 Active Team 機制

- **BREAKING**: 移除 `Profile.teams.joined[]` 和 `Profile.teams.inviting[]`
- 新增 `Profile.activeTeamId` 取代現行的「joined[0] = active team」隱式慣例
- 已加入/受邀隊伍改從 `Player.find({ userId })` 查詢，前端 filter status
- Active team 切換：`PATCH /api/profiles` 更新 `activeTeamId`
- 建隊時自動設定 `activeTeamId` 為新隊伍
- 接受邀請時自動設定 `activeTeamId` 為新加入的隊伍
- Edge case：`activeTeamId` 為 null 或指向已離開的隊伍時，前端 fallback 至 JOINED players 中第一個隊伍或顯示新手引導

### Legacy 系統清理

- **BREAKING**: 移除 `GET/PATCH /api/users/teams` 端點
- 移除 `useUserTeams` SWR hook
- 移除 `ConfirmInvitation` component

### Error Handling Pilot

- 引入 `AppError` class 繼承體系（NotFoundError, ValidationError, AuthorizationError, ConflictError, TransientError）
- 引入混合 Result pattern：業務邏輯用 Result type，基礎設施錯誤繼續 throw
- 此次僅套用於 `LinkPendingInvitationsUseCase` 和 `CreateProfileUseCase`

### UI 變更

- `InviteSection`：從 email input 改為使用者搜尋 UI（按鈕觸發 fetch，非 SWR）
- `InvitedSection`：根據子情境顯示使用者資訊或 email
- `InvitationList`：過濾條件改為 `player.status === INVITED`
- `Invitations` 頁面與 `Menu`：資料來源從 `useUserTeams` 改為 player-based 查詢（SWR）
- `NavLinks`、`Home`、`Notifications`：`profile.teams.joined[0]` 改為 `profile.activeTeamId`
- `POST /api/teams`（建隊）：移除 `profile.teams.joined.unshift()`，改為設定 `activeTeamId` 並建立 JOINED status 的 owner player

## Capabilities

### New Capabilities

- `team-membership`: Player 顯式狀態模型（NONE/INVITED/JOINED）、狀態轉換規則、欄位約束、邀請 UI 搜尋流程、Profile.teams 移除與 activeTeamId、legacy 系統清理
- `user-search`: 使用者搜尋 API，支援 email 精確查詢，附 rate limit 與精簡回傳
- `invitation-linking`: 使用者註冊時自動連結待處理邀請（registration hook + batch update + retry）
- `error-handling`: AppError class 繼承體系與混合 Result pattern（pilot scope）

### Modified Capabilities

（無既有 specs）

## Impact

### Entity Layer

- `player.ts`: 新增 `status` 欄位、移除 `getPlayerStatus()`、更新 `PlayerStatus` enum
- `profile.ts`: 移除 `teams`、新增 `activeTeamId`

### Application Layer

- 所有 13 個 player use cases 需更新 status 邏輯
- 新增 `LinkPendingInvitationsUseCase`
- Profile use cases 需移除 teams 相關邏輯
- 新增 `AppError` 與 Result type 定義

### Infrastructure Layer

- Player Mongoose schema: 新增 `status` 欄位、移除 virtual、新增 `linkUserToInvitations` repository method（updateMany）
- Profile Mongoose schema: 移除 `teams`、新增 `activeTeamId`
- `auth.ts` hook: 重構為 use case 直接呼叫、新增 link invitations 邏輯
- Profile repository: 移除 `addTeamToJoined/Inviting`、`removeTeamFromJoined/Inviting`

### API Routes

- `GET /api/users`: 擴充 searchParams 支援 email 搜尋
- `PATCH /api/profiles`: 調整 validation schema 支援 `activeTeamId` 更新
- `POST /api/teams`: 移除 `profile.teams.joined.unshift()`，改為設定 `activeTeamId`，建立 owner player 時帶 `status: JOINED`
- `GET/PATCH /api/users/teams`: 移除
- Player 相關 routes: 調整 validation schemas

### UI Components

- 重寫: `InviteSection`, `Invitations` 頁面, `Menu`
- 修改: `InvitedSection`, `InvitationList`, `PlayerInfo`, `MembershipSection`, `NavLinks`, `Home`, `Notifications`
- 移除: `ConfirmInvitation`

### SWR Hooks

- 移除: `useUserTeams`
- 新增或調整: player-based 查詢 hook
