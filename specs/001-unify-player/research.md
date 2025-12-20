# Research: 統一 Player 實體重構

**Feature Branch**: `001-unify-player`
**Date**: 2025-12-20

## 研究摘要

本文件記錄 Phase 0 研究階段的技術決策和最佳實踐調查結果。

---

## 1. Enum 類型選擇：數值 vs 字串

### 決策：使用字串 Enum

**背景**：現有 `team.ts` 的 `Role` enum 使用數值（`MEMBER = 0, OWNER = 1, ADMIN = 2`），需決定新的 `PlayerRole` 採用何種格式。

**分析比較**：

| 面向            | 數值 Enum                  | 字串 Enum                       |
| --------------- | -------------------------- | ------------------------------- |
| 儲存空間        | 較小（整數）               | 較大（字串，但差異微乎其微）    |
| 可讀性          | 差（DB 顯示 0, 1, 2）      | 佳（DB 顯示 'MEMBER', 'ADMIN'） |
| 維護安全        | 差（順序變更導致資料錯亂） | 佳（順序無關）                  |
| Debug           | 困難                       | 友善                            |
| Prisma 相容     | 需轉換                     | 原生支援（Prisma enum 為字串）  |
| PostgreSQL 相容 | 需轉換                     | 原生支援                        |

**決策理由**：

1. **未來 Prisma 遷移相容**：Prisma enum 編譯為字串
2. **可讀性優先**：排球隊管理場景，資料量不大，效能差異可忽略
3. **維護安全**：避免數值順序變更導致的資料錯亂
4. **現有 Position enum 已是字串**：保持一致性

**實作方式**：

```typescript
// entities/player.ts
export enum PlayerRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
}

// Zod schema
export const PlayerRoleSchema = z.nativeEnum(PlayerRole);
```

**遷移注意**：現有 `Team.members[].role` 使用數值（0, 1, 2），遷移腳本需轉換為字串。

---

## 2. SWR 與 useSWRMutation 整合策略

### 決策：使用 useSWRMutation 處理所有變更操作

**理由**：

- `useSWR` 適合讀取操作（自動 revalidation、快取）
- `useSWRMutation` 適合寫入操作（手動觸發、optimistic updates）
- 兩者可共享同一個 cache key，實現自動 revalidation

**實作模式**：

```typescript
// use-players.ts
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

// 讀取 hook
export function useTeamPlayers(teamId: string) {
  return useSWR(`/api/teams/${teamId}/players`, fetcher);
}

// 變更 hook
export function usePlayerMutation(playerId: string) {
  const updateInfo = useSWRMutation(
    `/api/players/${playerId}/info`,
    async (url, { arg }: { arg: PlayerInfoUpdate }) => {
      return fetch(url, { method: 'PATCH', body: JSON.stringify(arg) }).then(
        (res) => res.json()
      );
    }
  );

  const updateRole = useSWRMutation(
    `/api/players/${playerId}/role`,
    async (url, { arg }: { arg: { role: PlayerRole } }) => {
      return fetch(url, { method: 'PATCH', body: JSON.stringify(arg) }).then(
        (res) => res.json()
      );
    }
  );

  const updateStatus = useSWRMutation(
    `/api/players/${playerId}/status`,
    async (url, { arg }: { arg: StatusAction }) => {
      return fetch(url, { method: 'PATCH', body: JSON.stringify(arg) }).then(
        (res) => res.json()
      );
    }
  );

  return { updateInfo, updateRole, updateStatus };
}
```

**Optimistic Updates 策略**：

```typescript
const { trigger } = useSWRMutation('/api/players/123/role', updateRole, {
  optimisticData: (current) => ({ ...current, role: newRole }),
  rollbackOnError: true,
  revalidate: true,
});
```

**評估的替代方案**：

- ❌ 純 fetch + manual state：缺乏快取和 revalidation
- ❌ React Query：專案已使用 SWR，避免引入重複依賴

---

## 3. Zod Schema 設計與未來 Prisma 遷移相容性

### 決策：Zod 作為 API 驗證層，設計相容未來 Prisma 遷移

**現階段策略（MongoDB + Mongoose）**：

```typescript
// lib/validations/player.ts
import { z } from 'zod';
import { PlayerRole, Position } from '@/entities/player';

export const PlayerRoleSchema = z.nativeEnum(PlayerRole);
export const PositionSchema = z.nativeEnum(Position);

export const PlayerSchema = z.object({
  _id: z.string(), // MongoDB ObjectId（未來遷移改為 id: cuid）
  name: z.string().min(1, '姓名為必填'),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  teamId: z.string().optional(),
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: PlayerRoleSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Player = z.infer<typeof PlayerSchema>;

// API Request Schemas
export const CreatePlayerSchema = z.object({
  name: z.string().min(1),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  role: PlayerRoleSchema.default(PlayerRole.MEMBER),
  email: z.string().email().optional(), // 有 email = 邀請
});

export const UpdatePlayerInfoSchema = z.object({
  name: z.string().min(1).optional(),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
});

export const UpdatePlayerRoleSchema = z.object({
  role: PlayerRoleSchema,
});

export const UpdatePlayerStatusSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('invite'), email: z.string().email() }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('leave') }),
]);
```

**未來遷移策略（PostgreSQL + Prisma）**：

1. 建立 Prisma schema 定義 Player model
2. 使用 `zod-prisma-types` 自動生成 Zod schema
3. 刪除手寫的 Zod schema，改用自動生成版本

```prisma
// 未來 Prisma schema 範例
model Player {
  id        String      @id @default(cuid())
  name      String
  number    Int?
  position  Position?
  teamId    String?
  userId    String?
  email     String?
  role      PlayerRole?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  team      Team?       @relation(fields: [teamId], references: [id])

  @@index([teamId])
  @@index([userId])
  @@index([email])
  @@unique([teamId, email])
}

enum PlayerRole {
  MEMBER
  ADMIN
  OWNER
}

enum Position {
  OH
  MB
  OP
  S
  L
}

generator zod {
  provider                  = "zod-prisma-types"
  createRelationValuesTypes = true
  createPartialTypes        = true
}
```

**其他實體的 Zod 驗證**：

- ✅ Player：本次新增 Zod 驗證
- ⏸️ Team, Record, Profile：維持現狀，待 PostgreSQL 遷移時統一處理
- 原因：避免過度重構，專注於本次功能範圍

---

## 4. MongoDB 索引策略（相容未來 PostgreSQL 遷移）

### 決策：基於查詢模式建立索引，使用標準命名

**主要查詢模式分析**：

| 查詢需求         | 查詢條件                  | MongoDB 索引                     | PostgreSQL 對應             |
| ---------------- | ------------------------- | -------------------------------- | --------------------------- |
| 隊伍的所有球員   | `{ teamId }`              | `{ teamId: 1 }`                  | `@@index([teamId])`         |
| 使用者加入的隊伍 | `{ userId }`              | `{ userId: 1 }`                  | `@@index([userId])`         |
| 使用者收到的邀請 | `{ email, userId: null }` | `{ email: 1 }`                   | `@@index([email])`          |
| 檢查重複邀請     | `{ teamId, email }`       | `{ teamId: 1, email: 1 }` unique | `@@unique([teamId, email])` |

**MongoDB 索引定義**：

```typescript
const PlayerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    number: { type: Number, min: 0, max: 99 },
    position: { type: String, enum: ['', 'OH', 'MB', 'OP', 'S', 'L'] },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    userId: { type: String },
    email: { type: String },
    role: { type: String, enum: ['MEMBER', 'ADMIN', 'OWNER'] },
  },
  { timestamps: true }
);

// 單欄位索引
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

// 複合唯一索引：防止同一隊伍重複邀請同一 email
PlayerSchema.index(
  { teamId: 1, email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { email: { $exists: true, $ne: null } },
  }
);
```

---

## 5. 成員狀態推斷邏輯

### 決策：使用 computed property 而非儲存狀態欄位

**理由**：

- 減少資料不一致風險
- 狀態由 email/userId 欄位組合推斷
- 符合 Single Source of Truth 原則

**實作模式**：

```typescript
// entities/player.ts
export enum PlayerStatus {
  INVITED = 'INVITED', // email 存在 && userId 不存在
  JOINED = 'JOINED', // userId 存在
  PURE_PLAYER = 'PURE', // email 不存在 && userId 不存在
}

export function getPlayerStatus(player: Player): PlayerStatus {
  if (player.userId) return PlayerStatus.JOINED;
  if (player.email) return PlayerStatus.INVITED;
  return PlayerStatus.PURE_PLAYER;
}
```

---

## 6. 權限驗證整合

### 決策：擴充現有 AuthorizationService，改用 PlayerRepository

**修改方案**：

```typescript
// applications/services/auth/authorization.service.interface.ts
export interface IAuthorizationService {
  verifyTeamRole(
    teamId: string,
    userId: string,
    role: PlayerRole
  ): Promise<void>;
  verifyPlayerAccess(playerId: string, userId: string): Promise<Player>;
  verifyInvitationAccess(playerId: string, userEmail: string): Promise<Player>;
}
```

---

## 7. 資料遷移策略

### 決策：單次執行腳本，完整遷移

**遷移步驟**：

1. 備份現有資料
2. 建立 Player collection
3. 遷移 Member collection → Player（保留 `_id`）
4. 遷移 Team.members[] → Player（**注意：數值 role 轉字串**）
5. 驗證 Profile.teams 對應的 Player 關係
6. 移除舊欄位（Team.members[], Profile.teams）
7. 刪除 Member collection

**Role 轉換對照**：

```typescript
const roleMapping = {
  0: 'MEMBER', // Role.MEMBER
  1: 'OWNER', // Role.OWNER
  2: 'ADMIN', // Role.ADMIN
};
```

---

## 8. 未來通知系統整合點

### 決策：Use Case 層預留擴充點

| Use Case                 | 通知類型     | 接收者     |
| ------------------------ | ------------ | ---------- |
| CreateInvitationUseCase  | 邀請通知     | 被邀請者   |
| CancelInvitationUseCase  | 取消邀請通知 | 被邀請者   |
| UpdateRoleUseCase        | 角色變更通知 | 被變更者   |
| TransferOwnershipUseCase | 權限移轉通知 | 新舊 OWNER |

---

## 研究結論

所有技術決策已確認，無需進一步澄清。可進入 Phase 1 設計階段。
