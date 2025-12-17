# User Creation Flow

> **Version**: 1.0
> **Last Updated**: 2024-12-15
> **Status**: Active

## 概述

本文件說明 VolleyBro 使用者創建流程，從 OAuth 登入到 Profile 自動建立的完整過程。

## 完整流程圖

```text
┌─────────────────────┐
│  使用者點擊登入按鈕   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Redirect to Google │
│   OAuth Consent     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  使用者授權 Google   │
│  (選擇 Google 帳號) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────┐
│  Google 回傳授權碼          │
│  Redirect to /api/auth/...  │
└──────────┬──────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Better Auth 處理 OAuth      │
│  - 驗證授權碼                │
│  - 取得使用者資訊            │
│  - 建立或更新 User           │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  databaseHooks.user.create.after │
│  Hook 觸發                       │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  createProfileController         │
│  透過 DI Container 執行          │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  CreateProfileUseCase            │
│  - 檢查 Profile 是否已存在       │
│  - 建立新 Profile (若不存在)     │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ProfileRepository               │
│  儲存至 MongoDB                  │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Profile 創建完成                │
│  (即使失敗也不中斷登入)          │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  Better Auth 建立 Session        │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│  登入成功，Redirect to /home     │
└──────────────────────────────────┘
```

## Clean Architecture 分層

系統遵循 Clean Architecture 原則，各層職責如下：

```text
Presentation Layer (API Routes)
  ↓ 呼叫
Interface Layer (Controllers)
  ↓ 執行
Application Layer (Use Cases)
  ↓ 調用
Infrastructure Layer (Repositories)
  ↓ 操作
Domain Layer (Entities)
```

### 1. Presentation Layer (API Routes)

**檔案**: [src/app/api/profiles/route.ts](../../../src/app/api/profiles/route.ts)

**職責**：

- 處理 HTTP 請求/回應
- Session 驗證
- 錯誤處理與回應格式化

**設計重點**：

- 不直接操作 Mongoose Model
- 透過 Controller 調用業務邏輯
- 保留 Fallback 機制確保可靠性

### 2. Interface Layer (Controllers)

**檔案**: [src/interface/controllers/user/profile.controller.ts](../../../src/interface/controllers/user/profile.controller.ts)

**職責**：

- 協調 Use Cases 的執行
- 處理 DI Container 的依賴注入
- 統一錯誤處理

**設計重點**：

- 透過 InversifyJS 取得 Use Case 實例
- 捕捉錯誤並回傳 `undefined`（避免中斷流程）

### 3. Application Layer (Use Cases)

**檔案**: [src/applications/usecases/user/profile.usecase.ts](../../../src/applications/usecases/user/profile.usecase.ts)

**包含 Use Cases**：

- `GetProfileUseCase` - 取得 Profile
- `CreateProfileUseCase` - 建立 Profile（含重複檢查）
- `UpdateProfileUseCase` - 更新 Profile

**職責**：

- 實作核心業務邏輯
- 定義輸入/輸出介面
- 調用 Repository 進行資料存取

**設計重點**：

- 使用依賴注入（`@injectable()`, `@inject()`）
- 包含重複檢查邏輯
- 不依賴具體實作，僅依賴介面

### 4. Infrastructure Layer (Repositories)

**檔案**: [src/infrastructure/db/repositories/profile.repository.ts](../../../src/infrastructure/db/repositories/profile.repository.ts)

**職責**：

- 實作 Repository 介面
- 與 MongoDB/Mongoose 互動
- 處理資料持久化

**設計重點**：

- 實作 `IProfileRepository` 介面
- 封裝 Mongoose 操作細節
- 使用 `.lean()` 提升效能

### 5. Domain Layer (Entities)

**檔案**: [src/entities/profile.ts](../../../src/entities/profile.ts)

**職責**：

- 定義核心業務實體
- 不依賴任何外部框架

## Better Auth Hook 整合

### Hook 配置位置

[src/lib/auth.ts](../../../src/lib/auth.ts:51-68)

```typescript
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        await connectToMongoDB();
        const profile = await createProfileController({ userId: user.id });
        // 記錄成功或失敗，但不拋出錯誤
      },
    },
  },
}
```

### 為何選擇 `user.create.after`？

| Hook        | 時機            | User 資料  | 阻塞登入? | 選用原因                    |
| ----------- | --------------- | ---------- | --------- | --------------------------- |
| `before`    | User 建立前     | 尚未建立   | ✅        | ❌ 無法取得 `user.id`       |
| **`after`** | **User 建立後** | **已完成** | **❌**    | **✅ 可安全使用 `user.id`** |

**優勢**：

- User 已儲存，`user.id` 可用
- 適用所有登入方式（Google, Email, Apple）
- 非阻塞設計，Profile 建立失敗不影響登入

### 為何透過 Controller 而非直接操作 Mongoose？

**理由**：

- Hook 屬於 Infrastructure Layer
- 不應跨層直接操作資料模型
- 必須透過 Controller 調用業務邏輯
- 確保業務邏輯集中在 Use Case（如重複檢查）

## Fallback 機制

### 為何需要 Fallback？

1. **Hook 可能失敗**：網路問題、MongoDB 暫時無法連線
2. **歷史資料**：遷移前已存在的 User 沒有 Profile
3. **開發除錯**：手動刪除 Profile 後測試

### Fallback 實作位置

[src/app/api/profiles/route.ts](../../../src/app/api/profiles/route.ts:24-46)

GET `/api/profiles` 會檢查 Profile 是否存在，若不存在則自動建立：

```typescript
let profile = await getProfileController({ userId: session.user.id });

if (!profile) {
  // Fallback: 透過相同的 Controller 建立
  profile = await createProfileController({ userId: session.user.id });
}
```

**優勢**：

- 提升系統可靠性
- 使用相同的 `CreateProfileUseCase` 邏輯（含重複檢查）
- 統一的業務規則

## 錯誤處理策略

### 分層錯誤處理原則

| Layer      | 錯誤處理方式                 | 理由             |
| ---------- | ---------------------------- | ---------------- |
| Use Case   | 讓錯誤傳播                   | 保持業務邏輯純粹 |
| Controller | 捕捉並記錄，回傳 `undefined` | 避免中斷 Hook    |
| API Route  | 捕捉並回傳 HTTP 錯誤碼       | 標準化 API 回應  |
| Hook       | 記錄但不拋出                 | 避免阻塞登入流程 |

### 設計優勢

- Profile 建立失敗不影響登入成功
- 統一的錯誤日誌記錄
- 清晰的錯誤邊界

## 依賴注入設置

### 註冊位置

- **Use Case Symbols**: [src/infrastructure/di/types.ts](../../../src/infrastructure/di/types.ts:14-16)
- **Use Case 註冊**: [src/infrastructure/di/inversify.config.ts](../../../src/infrastructure/di/inversify.config.ts:61-69)

### 註冊的 Use Cases

```typescript
container.bind<GetProfileUseCase>(TYPES.GetProfileUseCase).to(GetProfileUseCase);
container.bind<CreateProfileUseCase>(TYPES.CreateProfileUseCase).to(CreateProfileUseCase);
container.bind<UpdateProfileUseCase>(TYPES.UpdateProfileUseCase).to(UpdateProfileUseCase);
```

## 測試策略

### 手動測試清單

1. **新使用者註冊**
   - [ ] Google OAuth 登入
   - [ ] 檢查 User 和 Profile 是否同時建立
   - [ ] 驗證 `teams.joined` 和 `teams.inviting` 為空陣列

2. **重複登入**
   - [ ] 已存在的使用者登入
   - [ ] 確認不會重複建立 Profile

3. **Fallback 機制**
   - [ ] 手動刪除 Profile
   - [ ] 訪問 `/api/profiles`
   - [ ] 確認自動重新建立

4. **Hook 失敗情境**
   - [ ] 模擬 MongoDB 連線失敗
   - [ ] 驗證登入仍然成功
   - [ ] 確認 Fallback 機制能補建 Profile

## 效能考量

### MongoDB 索引

確保 `userId` 欄位有唯一索引：

```typescript
ProfileSchema.index({ userId: 1 }, { unique: true });
```

### Repository 優化

使用 `.lean()` 提升查詢效能：

- 回傳純 JavaScript 物件
- 不包含 Mongoose 方法和 overhead

## 相關文件

- [User Management Overview](./index.md) - User Management 總覽
- [Profile Sync](./profile-sync.md) - Google Image 同步與未來設計
- [Clean Architecture](../../architecture/index.md) - 專案架構說明
- [Source Tree](../../architecture/source-tree.md) - 檔案結構
