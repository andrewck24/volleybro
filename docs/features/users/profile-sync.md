# Profile Sync and Data Normalization

> **Version**: 1.0
> **Last Updated**: 2024-12-15
> **Status**: Active

## 概述

本文件說明 VolleyBro 使用者資料（name, image）的儲存策略、Google OAuth 自動同步機制，以及未來自訂個人資訊的設計規劃。

## 目前設計：User 集中儲存

### 資料結構

```typescript
// User (Better Auth 管理)
interface User {
  id: string;
  email: string;
  name: string;          // ← 目前儲存位置
  image: string;         // ← 目前儲存位置
  emailVerified: boolean;
}

// Profile (VolleyBro 管理)
interface Profile {
  _id: ObjectId;
  userId: string;
  teams: {
    joined: string[];
    inviting: string[];
  };
  // 注意：目前不包含 name 和 image
}
```

### 設計原則

**資料正規化（Data Normalization）**：

- User 資料（name, image）由 Better Auth 管理，儲存在 `users` collection
- Profile 只儲存業務相關資料（teams），不重複儲存 User 資料
- 避免資料重複與不一致問題

**優勢**：

- ✅ Single Source of Truth（User 是唯一真實來源）
- ✅ 避免 User 與 Profile 資料不同步
- ✅ Better Auth 自動處理 OAuth 資料同步

## Google OAuth 自動同步

### Better Auth 內建機制

Better Auth 在使用者透過 Google OAuth 登入時，會**自動同步**以下資料：

| 欄位    | 同步時機 | 說明                     |
| ------- | -------- | ------------------------ |
| `name`  | 每次登入 | Google 帳號顯示名稱      |
| `image` | 每次登入 | Google 個人頭像 URL      |
| `email` | 首次登入 | 不會更新（作為帳號識別） |

**實作位置**：Better Auth 框架內建，無需額外程式碼

### 使用者更換頭像測試

**測試步驟**：

1. 使用者在 Google 帳號設定中更換頭像
2. 登出 VolleyBro
3. 重新透過 Google OAuth 登入
4. Better Auth 自動更新 `users.image`

**資料流程**：

```text
Google 更換頭像
    ↓
使用者重新登入
    ↓
Better Auth 取得新頭像 URL
    ↓
自動更新 users.image
    ↓
應用程式顯示新頭像
```

## 前端使用方式

### 取得使用者資訊

目前應透過 Better Auth 提供的 `session.user` 取得：

```typescript
// Client-side
import { useSession } from "@/lib/auth-client";

const { data: session } = useSession();
const userName = session?.user.name;
const userImage = session?.user.image;
```

```typescript
// Server-side (API Route)
import { auth } from "@/lib/auth";

const session = await auth.api.getSession({ headers: await headers() });
const userName = session?.user.name;
const userImage = session?.user.image;
```

**重要**：

- 不要從 Profile 取得 name/image（目前 Profile 沒有這些欄位）
- 直接使用 `session.user.name` 和 `session.user.image`

## 未來設計：自訂 Name 與 Image

### 功能需求

當新增「自訂個人頭像」與「修改個人資訊」功能時，將採用以下設計：

### 擴展後的 Profile 結構

```typescript
interface Profile {
  _id: ObjectId;
  userId: string;
  name?: string;         // ← 未來新增：使用者自訂名稱
  image?: string;        // ← 未來新增：使用者自訂頭像 URL
  teams: {
    joined: string[];
    inviting: string[];
  };
}
```

### 資料讀取優先順序

```typescript
// 優先使用 Profile 的自訂值，若無則使用 User 的 OAuth 值
const displayName = profile.name ?? user.name;
const displayImage = profile.image ?? user.image;
```

**優先順序邏輯**：

1. **Profile 自訂值優先**：使用者主動上傳/設定的資料
2. **User OAuth 值作為 Fallback**：若使用者未自訂，則使用 Google 同步的資料

### 設計優勢

| 設計面向     | 說明                                               |
| ------------ | -------------------------------------------------- |
| **彈性**     | 使用者可選擇使用 Google 資料或自訂資料             |
| **Fallback** | 未自訂時，自動使用 OAuth 資料                      |
| **清晰**     | Profile 中的 `name`/`image` 明確代表「使用者自訂」 |
| **可選**     | `name?` 和 `image?` 為 optional，不強制使用者設定  |

### 實作範例（未來）

```typescript
// Helper function（未來實作）
function getDisplayName(user: User, profile: Profile | null): string {
  return profile?.name ?? user.name ?? "Unknown User";
}

function getDisplayImage(user: User, profile: Profile | null): string {
  return profile?.image ?? user.image ?? "/default-avatar.png";
}
```

```typescript
// UI Component（未來實作）
const DisplayAvatar = () => {
  const { data: session } = useSession();
  const { data: profile } = useProfile();

  const displayName = getDisplayName(session.user, profile);
  const displayImage = getDisplayImage(session.user, profile);

  return (
    <Avatar>
      <AvatarImage src={displayImage} alt={displayName} />
      <AvatarFallback>{displayName[0]}</AvatarFallback>
    </Avatar>
  );
};
```

## 設計決策記錄

### 為何不現在就加入 name/image 到 Profile？

**原因**：

1. **功能未開發**：目前無「自訂頭像」與「修改個人資訊」功能
2. **避免冗餘**：若現在加入，會重複儲存 OAuth 資料（違反 DRY）
3. **清晰語意**：Profile 中的 `name`/`image` 應明確代表「使用者自訂」，而非 OAuth 同步值
4. **YAGNI 原則**：You Aren't Gonna Need It - 在需要時再實作

### 為何未來要加入 name/image 到 Profile？

**原因**：

1. **使用者需求**：使用者希望上傳自訂頭像，不限於 Google 頭像
2. **功能擴展**：使用者可能想使用與 Google 不同的暱稱
3. **多帳號整合**：未來支援 Email/Apple 登入時，需統一的自訂資料位置

### 資料不一致的處理

**情境**：使用者自訂頭像後，又在 Google 更換頭像

**處理方式**：

- Profile 自訂頭像不會被 Google OAuth 覆蓋
- 使用者需手動「重設為 Google 頭像」（刪除 `profile.image`）
- 或在 UI 提供「同步 Google 頭像」按鈕

## 實作時程規劃

### Phase 1: 目前（已完成）

- ✅ User 與 Profile 分離設計
- ✅ Better Auth 自動同步 OAuth 資料
- ✅ 前端使用 `session.user.name/image`

### Phase 2: 未來功能（待開發）

- [ ] 新增 Profile `name`/`image` 欄位（optional）
- [ ] 實作「編輯個人資訊」頁面
- [ ] 實作「上傳自訂頭像」功能
- [ ] 實作「重設為 Google 資料」功能
- [ ] 更新前端使用 `getDisplayName`/`getDisplayImage` helper

### Phase 3: 進階功能（待規劃）

- [ ] 頭像裁切工具
- [ ] 支援多種圖片格式
- [ ] 圖片壓縮與 CDN 整合
- [ ] 「同步 Google 頭像」自動化選項

## 相關文件

- [User Management Overview](./index.md) - User Management 總覽
- [User Creation Flow](./user-creation-flow.md) - 使用者創建流程
- [Better Auth Documentation](https://better-auth.com/docs) - Better Auth 官方文件

## 參考資料

### Better Auth OAuth Sync

Better Auth 的 Google Provider 會自動同步以下欄位：

- [Better Auth - Social Providers](https://better-auth.com/docs/concepts/social-providers)
- [OAuth User Info Endpoint](https://developers.google.com/identity/protocols/oauth2/openid-connect#obtainuserinfo)

### 資料正規化原則

- [Database Normalization](https://en.wikipedia.org/wiki/Database_normalization)
- [Single Source of Truth](https://en.wikipedia.org/wiki/Single_source_of_truth)
