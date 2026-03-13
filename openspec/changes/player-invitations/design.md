## Context

現行 Player 邀請系統使用 email/userId 欄位的有無來隱式推導狀態，並在 Profile.teams 中冗餘儲存隊伍關係。這導致：

- 狀態判斷散落在 entity helper、use cases、前端 filter 中
- Profile.teams 與 Player 之間需手動同步
- Legacy `/api/users/teams` 與新版 `/api/players/{id}/invitations` 兩套路徑並行

上一次的 `2026-02-20-unify-player` change 建立了 Player 統一模型，但保留了 field-based 狀態推導。本次在此基礎上引入顯式 status 欄位，並清理冗餘的 Profile.teams。

## Goals / Non-Goals

**Goals:**

- Player status 由顯式欄位驅動，消除 field-based 推導
- 邀請流程支援已註冊/未註冊使用者，統一走 Player-based 路徑
- 移除 Profile.teams 冗餘，以 Player 作為 team membership 的 single source of truth
- 引入 AppError class 體系與混合 Result pattern（pilot scope）

**Non-Goals:**

- 全面遷移所有 use cases 至 Result pattern（另開 change）
- EmailService / NotificationService（未來 change）
- 使用者搜尋支援名稱、id 等欄位（本次僅 email 精確查詢）
- MongoDB transaction（updateMany 已滿足需求，不引入 replica set 依賴）

## Decisions

### D1: Player Status 三態模型 — NONE / INVITED / JOINED

**選擇**: 顯式 `status` 欄位，三個 enum 值

**替代方案**:

- 四態（加 PENDING 拆分未註冊邀請）→ 拒絕：增加狀態數量但語義可用欄位組合區分
- 四態（加 LEAVED）→ 拒絕：離開隊伍後保留記錄的需求不明確，增加複雜度
- 維持 field-based 推導 → 拒絕：正是要解決的問題

**欄位與狀態對應**:

| status  | userId | email | 語義                 |
| ------- | ------ | ----- | -------------------- |
| NONE    | ✗      | ✗     | 純球員，未連結使用者 |
| INVITED | ✓      | ✗     | 已邀請已註冊使用者   |
| INVITED | ✗      | ✓     | 已邀請未註冊使用者   |
| JOINED  | ✓      | ✗     | 已加入隊伍           |

不合法組合：NONE + userId/email、INVITED 無 userId 也無 email、INVITED 同時有 userId 和 email、JOINED + email、JOINED 無 userId。

### D2: 邀請流程 — 搜尋優先

**選擇**: 管理者輸入 email → 呼叫 user search API → 根據結果決定填 userId 或 email

**理由**: 避免所有邀請都走 email 路徑，已註冊使用者可直接用 userId 建立邀請，前端可顯示使用者資訊（大頭貼、姓名）。

### D3: Registration Hook — Use Case 直接呼叫

**選擇**: `user.create.after` hook 中直接從 DI container resolve use case，不經 controller

**理由**: Hook 不是 HTTP 請求，不需要 controller 的 transport validation。現有的 `createProfileController` 呼叫也應比照修正。

**Hook 流程**:

1. `CreateProfileUseCase.execute({ userId })`
2. `LinkPendingInvitationsUseCase.execute({ userId, email })`
   - Repository 層用 `updateMany({ email, status: INVITED }, { $set: { userId }, $unset: { email } })`
   - 天然冪等 — 已更新的 player 不再匹配查詢條件
   - 失敗 → delay + retry 1 次 → 再失敗 log error，不阻塞註冊

### D4: Batch Update 策略 — updateMany（非 transaction）

**選擇**: MongoDB `updateMany` 放在 Infrastructure repository 層

**替代方案**:

- 逐筆 update + 收集失敗（application layer）→ 拒絕：多次 DB round-trip，更多失敗機會
- MongoDB transaction → 拒絕：需 replica set，部分失敗不危險且操作冪等

**理由**: 單次 DB call 最可靠，冪等操作允許安全重試，部分失敗不造成資料損壞（使用者少看到幾個邀請但不會看到錯誤邀請）。

### D5: Profile.teams 移除 → activeTeamId

**選擇**: 移除 `Profile.teams.joined[]` 和 `inviting[]`，新增 `Profile.activeTeamId`

**理由**: 隊伍關係以 Player 為 single source of truth，Profile 不再冗餘儲存。`activeTeamId` 取代 `joined[0]` 的隱式慣例。

**Active team 寫入時機**:

- 建隊：`POST /api/teams` 設定 `activeTeamId = newTeamId`
- 接受邀請：`AcceptInvitationUseCase` 後設定 `activeTeamId = teamId`
- 手動切換：`PATCH /api/profiles` 更新 `activeTeamId`

**Fallback**: 前端讀到 `activeTeamId` 為 null 或指向已離開的隊伍時，從 JOINED players 取第一個 teamId，或顯示新手引導。

### D6: User Search API — 擴充現有端點

**選擇**: `GET /api/users?email={email}`，擴充現有 route

**替代方案**:

- 獨立端點 `GET /api/users/search` → 拒絕：REST 慣例偏好同一 resource collection 用 query params 區分

**行為**:

- 無 searchParams → 查自己（現有行為）
- 有 `email` param → 搜尋使用者，回傳 `{ _id, name, image }`
- 權限：任何已登入使用者 + rate limit
- 精確匹配

### D7: Error Handling — 混合 Result + Typed Error

**選擇**: 業務邏輯用 `Result<T>` type，基礎設施錯誤繼續 throw

**Error class 體系**:

```text
AppError (abstract base)
├── NotFoundError        (isTransient: false)
├── ValidationError      (isTransient: false)
├── AuthorizationError   (isTransient: false)
├── ConflictError        (isTransient: false)
└── TransientError       (isTransient: true)
```

**Result type**:

```typescript
type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }
```

**Pilot scope**: `LinkPendingInvitationsUseCase`、`CreateProfileUseCase`、`SearchUserUseCase`、`GetUserByIdUseCase`。caller（hook）根據 `error.isTransient` 決定是否 retry；route 層根據 `error.code` 映射 HTTP status。

### D8: Leave Team 行為

**選擇**: 離開隊伍時清 userId，status → NONE，Player 記錄保留

**UI**: 離開隊伍按鈕置於隊伍資訊頁最底部，附確認提示「離開後將無法查看隊伍相關資訊與個人數據」。

## Risks / Trade-offs

**[INVITED 子情境的隱式區分]** INVITED 狀態下用 userId/email 欄位有無區分已註冊/未註冊使用者，回到了部分 field-based 判斷。→ 可接受：僅在 INVITED 內部有此區分，比原系統全面依賴 field 推導簡單得多，且兩種子情境的行為差異僅在 UI 顯示和操作權限。

**[Registration hook 失敗]** updateMany 失敗後 retry 1 次仍失敗，pending invitation 不會被 link。→ 可接受：發生機率極低（hook 能跑到第二步代表 DB 連線正常），且後果為使用者看不到邀請而非資料損壞。

**[Profile.teams 移除的 breaking change]** 所有依賴 `profile.teams` 的前端元件和 API route 都需同步修改。→ 依賴範圍已完整盤點：NavLinks、Home、Notifications、Menu、Invitations、ConfirmInvitation、POST /api/teams、/api/users/teams。

**[activeTeamId 指向無效隊伍]** 使用者被踢出隊伍或隊伍被刪除後，activeTeamId 變成孤兒引用。→ 前端 fallback 至 JOINED players 的第一個 teamId 或新手引導，不做後端主動清理。

**[User search email enumeration]** 任何已登入使用者可查詢 email 是否已註冊。→ 以 rate limit 緩解，未來可加 CAPTCHA 或限制搜尋次數。
