# User Management

> **Version**: 1.0
> **Last Updated**: 2024-12-15
> **Status**: Active

## 概述

VolleyBro 的使用者管理系統採用 **User-Profile 分離設計**，將驗證資料與業務資料區隔，確保系統的模組化與可維護性。

## 核心概念

### User vs Profile 分離

系統將使用者資料分為兩個獨立實體：

| 實體        | 管理者                | 用途     | 資料範例                                        |
| ----------- | --------------------- | -------- | ----------------------------------------------- |
| **User**    | Better Auth           | 身份驗證 | `id`, `email`, `name`, `image`, `emailVerified` |
| **Profile** | VolleyBro Application | 業務邏輯 | `userId`, `teams.joined[]`, `teams.inviting[]`  |

**設計優勢**：

- ✅ **關注點分離**：驗證邏輯與業務邏輯解耦
- ✅ **易於遷移**：未來更換驗證框架時，業務資料不受影響
- ✅ **安全性**：敏感驗證資料與業務資料隔離
- ✅ **可擴展性**：Profile 可獨立擴展業務欄位

### 資料流程

```text
OAuth 登入 → Better Auth 建立 User → Hook 自動建立 Profile → 應用程式使用 Profile
```

詳細流程說明請參閱 [User Creation Flow](./user-creation-flow.md)

## 驗證方式

目前支援的驗證提供者：

| Provider       | Status     | Implementation                 |
| -------------- | ---------- | ------------------------------ |
| Google OAuth   | ✅ Active  | Better Auth + Google OAuth 2.0 |
| Email/Password | 🔜 Planned | Better Auth Email Provider     |
| Apple Sign In  | 🔜 Planned | Better Auth Apple Provider     |

**驗證配置位置**：[src/lib/auth.ts](../../../src/lib/auth.ts)

## Profile 資料結構

```typescript
interface Profile {
  _id: ObjectId;
  userId: string;  // Reference to User.id
  teams: {
    joined: string[];    // Team IDs user has joined
    inviting: string[];  // Team IDs user is invited to
  };
}
```

**重要說明**：

- Profile 目前**不包含** `name` 和 `image` 欄位
- 這些資料目前儲存在 `User` 中，由 Better Auth 管理
- 未來計劃：新增自訂 `name` 與 `image` 功能時，將加入到 Profile
- 資料讀取優先順序：`profile.name/image` → `user.name/image`（fallback）

詳細說明請參閱 [Profile Sync](./profile-sync.md)

## Clean Architecture 實作

User Management 遵循 Clean Architecture 原則：

```text
Presentation Layer (API Routes)
        ↓
Interface Layer (Controllers)
        ↓
Application Layer (Use Cases)
        ↓
Infrastructure Layer (Repositories)
        ↓
Domain Layer (Entities)
```

### 關鍵檔案

#### Use Cases

- [src/applications/usecases/user/profile.usecase.ts](../../../src/applications/usecases/user/profile.usecase.ts)
  - `GetProfileUseCase` - 取得使用者 Profile
  - `CreateProfileUseCase` - 建立使用者 Profile
  - `UpdateProfileUseCase` - 更新使用者 Profile

#### Controllers

- [src/interface/controllers/user/profile.controller.ts](../../../src/interface/controllers/user/profile.controller.ts)
  - `getProfileController`
  - `createProfileController`
  - `updateProfileController`

#### API Routes

- [src/app/api/profiles/route.ts](../../../src/app/api/profiles/route.ts)
  - `GET /api/profiles` - 取得當前用戶 Profile（含 fallback 機制）
  - `PATCH /api/profiles` - 更新當前用戶 Profile

#### Repositories

- [src/infrastructure/db/repositories/profile.repository.ts](../../../src/infrastructure/db/repositories/profile.repository.ts)
  - MongoDB Profile Repository 實作

## Profile 自動創建機制

### Hook 觸發點

使用 Better Auth 的 `databaseHooks.user.create.after`：

```typescript
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        await createProfileController({ userId: user.id });
      },
    },
  },
}
```

**特性**：

- ✅ 適用所有驗證方式（Google, Email, Apple）
- ✅ 非阻塞設計（失敗不影響登入）
- ✅ 遵循 Clean Architecture（透過 Controller → Use Case → Repository）

### Fallback 機制

若 Hook 失敗（網路問題、DB 異常等），`GET /api/profiles` 會自動建立 Profile：

```typescript
let profile = await getProfileController({ userId: session.user.id });

if (!profile) {
  // Fallback: 透過 Controller 建立
  profile = await createProfileController({ userId: session.user.id });
}
```

**優勢**：

- 提升系統可靠性
- 處理歷史資料（遷移前的帳號）
- 方便開發除錯

## API 使用範例

### 取得當前用戶 Profile

```typescript
const response = await fetch('/api/profiles', {
  headers: { 'Content-Type': 'application/json' },
});
const profile = await response.json();
// { _id: "...", userId: "...", teams: { joined: [...], inviting: [...] } }
```

### 更新 Profile

```typescript
const response = await fetch('/api/profiles', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teams: { joined: ['team1', 'team2'], inviting: [] }
  }),
});
const updatedProfile = await response.json();
```

## 相關文件

- [User Creation Flow](./user-creation-flow.md) - 完整使用者創建流程說明
- [Profile Sync](./profile-sync.md) - Google Image 同步與未來設計
- [Better Auth Integration](../../stories/better-auth-follow-up.md) - Better Auth 遷移與後續任務
- [Source Tree](../../architecture/source-tree.md) - 專案架構與檔案結構

## 測試

### 手動測試清單

1. **新使用者註冊**
   - [ ] Google OAuth 登入
   - [ ] 檢查 Profile 是否自動建立
   - [ ] 檢查 `teams.joined` 和 `teams.inviting` 為空陣列

2. **重複登入**
   - [ ] 已存在的使用者登入
   - [ ] 確認不會重複建立 Profile

3. **Fallback 機制**
   - [ ] 手動刪除 Profile
   - [ ] 訪問 `/api/profiles`
   - [ ] 確認自動重新建立

4. **Google Image 同步**
   - [ ] 更換 Google 頭像
   - [ ] 重新登入
   - [ ] 確認 `user.image` 更新

## 未來計劃

- [ ] 實作 Email/Password 驗證
- [ ] 實作 Apple Sign In
- [ ] 新增自訂 Profile `name` 和 `image` 欄位
- [ ] 實作頭像上傳功能
- [ ] 新增 Profile 偏好設定（語言、通知等）
