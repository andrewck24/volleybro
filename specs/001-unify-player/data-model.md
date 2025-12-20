# Data Model: 統一 Player 實體

**Feature Branch**: `001-unify-player`
**Date**: 2025-12-20

## 概述

本文件定義統一 Player 實體的完整資料模型，包含實體定義、關係、索引策略、驗證規則和狀態機。

---

## 核心實體關係圖

### 1. 使用者球隊邀請/身份功能

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           使用者球隊邀請/身份功能                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    User ──────1:N──────► Player ◄──────N:1────── Team                      │
│     │                      │                       │                        │
│     │                      │                       │                        │
│     │    ┌─────────────────┼─────────────────┐     │                        │
│     │    │                 │                 │     │                        │
│     │    ▼                 ▼                 ▼     │                        │
│     │  userId           teamId             role    │                        │
│     │  (optional)       (optional)      (optional) │                        │
│     │                                              │                        │
│     │  Player.role（隊伍角色，字串 enum）:         │                        │
│     │  ┌──────────────────────────────────────┐   │                        │
│     │  │ "MEMBER"  → 一般成員                  │   │                        │
│     │  │ "ADMIN"   → 管理員                    │   │                        │
│     │  │ "OWNER"   → 擁有者（每隊唯一）        │   │                        │
│     │  │ null      → 臨打球員（未來功能）      │   │                        │
│     │  └──────────────────────────────────────┘   │                        │
│     │                                              │                        │
│     │  成員狀態（由欄位組合推斷）:                  │                        │
│     │  ┌──────────────────────────────────────┐   │                        │
│     │  │ INVITED     = email ✓ && userId ✗    │   │                        │
│     │  │ JOINED      = userId ✓               │   │                        │
│     │  │ PURE_PLAYER = email ✗ && userId ✗    │   │                        │
│     │  └──────────────────────────────────────┘   │                        │
│     │                                              │                        │
│     │  注意：role 只會受到權限調整而改變           │                        │
│     │                                              │                        │
└─────┴──────────────────────────────────────────────┴────────────────────────┘
```

### 2. 使用者比賽表現查詢功能

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         使用者比賽表現查詢功能                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    User ───1:N───► Player ───1:N───► SetPlayerStats                        │
│                       │                    │                                │
│                       │                    │ (透過 matchId 與 setId 關聯)   │
│                       │                    │                                │
│                       │                    ▼                                │
│                       │              ┌──────────┐                           │
│                       │              │ Match    │                           │
│                       │              │ (Record) │                           │
│                       │              └────┬─────┘                           │
│                       │                   │                                 │
│                       │                   │ 1:N                             │
│                       │                   ▼                                 │
│                       │              ┌──────────┐                           │
│                       │              │   Set    │                           │
│                       │              └────┬─────┘                           │
│                       │                   │                                 │
│                       │                   │ 1:N                             │
│                       │                   ▼                                 │
│                       │         ┌─────────────────────┐                     │
│                       └────────►│   SetPlayerStats    │                     │
│                                 │ (單局單一球員數據)   │                     │
│                                 └─────────────────────┘                     │
│                                                                             │
│    查詢路徑:                                                                 │
│    1. User → Player(s) → 該球員所有比賽局數據                               │
│    2. Match → Set(s) → 該局所有球員數據                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 實體定義

### Player（統一球員實體）

#### TypeScript 類型定義

```typescript
// entities/player.ts

export enum PlayerRole {
  MEMBER = 'MEMBER', // 一般成員
  ADMIN = 'ADMIN', // 管理員
  OWNER = 'OWNER', // 擁有者
}

export enum Position {
  NONE = '',
  OH = 'OH', // Outside Hitter
  MB = 'MB', // Middle Blocker
  OP = 'OP', // Opposite
  S = 'S', // Setter
  L = 'L', // Libero
}

export enum PlayerStatus {
  INVITED = 'INVITED', // 邀請中
  JOINED = 'JOINED', // 已加入
  PURE_PLAYER = 'PURE', // 純球員
}

export type Player = {
  _id: string; // MongoDB ObjectId（未來遷移為 id: cuid）
  name: string; // 必填
  number?: number; // 0-99
  position?: Position;
  teamId?: string; // 關聯 Team._id（無 teamId = 臨打球員）
  userId?: string; // 關聯 Better Auth user.id（有 userId = 已加入成員）
  email?: string; // 邀請 email（有 email 且無 userId = 邀請中）
  role?: PlayerRole; // 隊伍角色（null = 臨打球員）
  createdAt: Date;
  updatedAt: Date;
};

// 成員狀態推斷函數
export function getPlayerStatus(player: Player): PlayerStatus {
  if (player.userId) return PlayerStatus.JOINED;
  if (player.email) return PlayerStatus.INVITED;
  return PlayerStatus.PURE_PLAYER;
}

// 權限檢查輔助函數
export function canManageTeam(player: Player): boolean {
  return player.role === PlayerRole.OWNER || player.role === PlayerRole.ADMIN;
}

export function isOwner(player: Player): boolean {
  return player.role === PlayerRole.OWNER;
}
```

#### Mongoose Schema 定義

```typescript
// infrastructure/db/mongoose/schemas/player.ts
import mongoose from 'mongoose';

const PlayerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    number: {
      type: Number,
      min: 0,
      max: 99,
    },
    position: {
      type: String,
      enum: ['', 'OH', 'MB', 'OP', 'S', 'L'],
      default: '',
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    userId: {
      type: String, // Better Auth user.id
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['MEMBER', 'ADMIN', 'OWNER'],
    },
  },
  {
    timestamps: true,
    collection: 'players',
  }
);

// 索引定義
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

// 複合唯一索引：防止同一隊伍重複邀請同一 email
PlayerSchema.index(
  { teamId: 1, email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: null, $ne: '' },
    },
  }
);

// 虛擬欄位：status
PlayerSchema.virtual('status').get(function () {
  if (this.userId) return 'JOINED';
  if (this.email) return 'INVITED';
  return 'PURE_PLAYER';
});

export const PlayerModel = mongoose.model('Player', PlayerSchema);
```

#### Zod 驗證 Schema

```typescript
// lib/validations/player.ts
import { z } from 'zod';
import { PlayerRole, Position } from '@/entities/player';

export const PlayerRoleSchema = z.nativeEnum(PlayerRole);
export const PositionSchema = z.nativeEnum(Position);

// 完整 Player schema
export const PlayerSchema = z.object({
  _id: z.string(),
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

// API Request Schemas
export const CreatePlayerSchema = z.object({
  name: z.string().min(1, '姓名為必填'),
  number: z.number().int().min(0).max(99).optional(),
  position: PositionSchema.optional(),
  role: PlayerRoleSchema.default(PlayerRole.MEMBER),
  email: z.string().email().optional(), // 有 email = 建立邀請
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
  z.object({
    action: z.literal('invite'),
    email: z.string().email('請輸入有效的 email'),
  }),
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('accept') }),
  z.object({ action: z.literal('reject') }),
  z.object({ action: z.literal('leave') }),
]);

export type CreatePlayerInput = z.infer<typeof CreatePlayerSchema>;
export type UpdatePlayerInfoInput = z.infer<typeof UpdatePlayerInfoSchema>;
export type UpdatePlayerRoleInput = z.infer<typeof UpdatePlayerRoleSchema>;
export type UpdatePlayerStatusInput = z.infer<typeof UpdatePlayerStatusSchema>;
```

---

## 成員狀態狀態機

### 狀態轉換圖

```text
  ┌────────────────┐
  │ 建立邀請        │
  │ (設定 email)   │
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │ INVITED        │  email: ✓  userId: ✗  role: 設定
  │ (邀請中)        │
  └───────┬────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────────────┐
│ reject │  │ accept          │
│ cancel │  │ (設定 userId)   │
└────┬───┘  └───────┬────────┘
     │              │
     ▼              ▼
┌────────────┐  ┌────────────────┐
│ PURE       │  │ JOINED          │  email: ✓  userId: ✓  role: 維持
│ (清空email)│  │ (已加入)        │
└────────────┘  └───────┬────────┘
email: ✗               │
userId: ✗              ▼
role: 維持         ┌────────────────┐
                   │ leave           │
                   │ (清空 userId)   │
                   └───────┬────────┘
                           │
                           ▼
                   ┌────────────────┐
                   │ PURE            │  email: ✗  userId: ✗  role: 維持
                   │ (純球員)        │
                   └────────────────┘
```

### 狀態定義

| 狀態        | email | userId | role   | 說明             |
| ----------- | ----- | ------ | ------ | ---------------- |
| INVITED     | ✓     | ✗      | 已設定 | 待接受的邀請     |
| JOINED      | ✓     | ✓      | 已設定 | 已加入的成員     |
| PURE_PLAYER | ✗     | ✗      | 可選   | 純球員（無帳號） |

### 狀態轉換操作

| 操作   | 起始狀態    | 目標狀態    | 欄位變更                  | 權限要求         |
| ------ | ----------- | ----------- | ------------------------- | ---------------- |
| invite | PURE_PLAYER | INVITED     | 設定 email, role          | ADMIN+           |
| accept | INVITED     | JOINED      | 設定 userId               | 被邀請者         |
| reject | INVITED     | PURE_PLAYER | 清空 email                | 被邀請者         |
| cancel | INVITED     | PURE_PLAYER | 清空 email                | ADMIN+           |
| leave  | JOINED      | PURE_PLAYER | 清空 userId（保留 email） | 成員本人或 OWNER |

**注意**：`role` 欄位獨立於成員狀態，只透過角色管理操作變更，不受邀請流程影響。

---

## 角色管理狀態機

### 角色轉換圖

```text
  MEMBER ◄────升/降級────► ADMIN
                            │
                            │ 權限移轉
                            ▼
                          OWNER
```

### 角色轉換規則

| 操作          | 執行者 | 目標角色 | 前置條件               | 副作用                  |
| ------------- | ------ | -------- | ---------------------- | ----------------------- |
| 升級為 ADMIN  | OWNER  | ADMIN    | 目標為 MEMBER          | 無                      |
| 降級為 MEMBER | ADMIN  | MEMBER   | 目標為自己             | 無                      |
| 降級為 MEMBER | OWNER  | MEMBER   | 目標為 ADMIN           | 無                      |
| 移轉 OWNER    | OWNER  | OWNER    | 目標為 MEMBER 或 ADMIN | 原 OWNER 自動降為 ADMIN |

**特殊規則**：

- OWNER 不能降級自己（需先移轉 OWNER）
- 每個隊伍只能有一個 OWNER
- ADMIN 可以自願降級為 MEMBER

---

## 查詢模式與索引策略

### 查詢模式

| 查詢需求         | 查詢條件                                             | 頻率 | 索引                             |
| ---------------- | ---------------------------------------------------- | ---- | -------------------------------- |
| 隊伍的所有球員   | `{ teamId }`                                         | 高   | `{ teamId: 1 }`                  |
| 使用者加入的隊伍 | `{ userId }`                                         | 高   | `{ userId: 1 }`                  |
| 使用者收到的邀請 | `{ email: user.email, userId: { $exists: false } }`  | 中   | `{ email: 1 }`                   |
| 隊伍的待處理邀請 | `{ teamId, email: { $exists: true }, userId: null }` | 中   | `{ teamId: 1, email: 1 }`        |
| 檢查重複邀請     | `{ teamId, email }`                                  | 高   | `{ teamId: 1, email: 1 }` unique |
| 隊伍的已加入成員 | `{ teamId, userId: { $exists: true } }`              | 高   | `{ teamId: 1, userId: 1 }`       |
| 單一球員查詢     | `{ _id }`                                            | 極高 | `{ _id: 1 }` (預設)              |

### 索引定義

```typescript
// 單欄位索引
PlayerSchema.index({ teamId: 1 });
PlayerSchema.index({ userId: 1 });
PlayerSchema.index({ email: 1 });

// 複合唯一索引（Sparse + Partial Filter）
PlayerSchema.index(
  { teamId: 1, email: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      email: { $exists: true, $ne: null, $ne: '' },
    },
  }
);

// 複合索引（查詢已加入成員）
PlayerSchema.index({ teamId: 1, userId: 1 });
```

---

## 與現有結構的對照

### 移除的結構

| 原結構              | 位置                                               | 替代方案                  |
| ------------------- | -------------------------------------------------- | ------------------------- |
| `Team.members[]`    | `src/entities/team.ts`                             | `Player.find({ teamId })` |
| `Profile.teams`     | `src/entities/profile.ts`                          | `Player.find({ userId })` |
| `Member` collection | `src/infrastructure/db/mongoose/schemas/member.ts` | 合併至 `Player`           |

### 保留的結構（快照）

| 結構          | 位置        | 說明                                 |
| ------------- | ----------- | ------------------------------------ |
| `MatchPlayer` | Record 內嵌 | 比賽時的球員快照，包含每局統計       |
| `MatchTeam`   | Record 內嵌 | 比賽時的隊伍快照，包含球員和教練列表 |

### 資料遷移對照

| 來源              | 欄位               | 目標 Player 欄位 | 轉換規則                         |
| ----------------- | ------------------ | ---------------- | -------------------------------- |
| Member collection | `_id`              | `_id`            | 保留（比賽紀錄引用）             |
| Member collection | `team_id`          | `teamId`         | ObjectId 轉字串                  |
| Member collection | `name`             | `name`           | 直接複製                         |
| Member collection | `number`           | `number`         | 直接複製                         |
| Team.members[]    | `_id`              | `_id`            | 若 Member 已存在則更新，否則建立 |
| Team.members[]    | `user_id`          | `userId`         | 直接複製                         |
| Team.members[]    | `email`            | `email`          | 直接複製                         |
| Team.members[]    | `role` (數值 enum) | `role`           | 0→'MEMBER', 1→'OWNER', 2→'ADMIN' |

---

## 業務規則與約束

### 唯一性約束

1. **每個隊伍只能有一個 OWNER**
   - 實作：應用層驗證（Use Case）
   - 移轉 OWNER 時自動降級原 OWNER

2. **每個隊伍不能重複邀請同一 email**
   - 實作：複合唯一索引 `{ teamId, email }`
   - 邀請被拒絕或取消後，email 清空，可再次邀請

3. **背號可重複**
   - 無唯一性約束
   - 允許同隊多人使用相同背號

### 刪除約束

1. **Player 刪除條件**
   - 必須無比賽紀錄（檢查 Record.teams.\*.players 中是否引用）
   - 必須無 userId（已加入成員不可刪除，需先離隊）
   - 實作：Use Case 層驗證

2. **Team 刪除時級聯處理**
   - 刪除所有 `Player.find({ teamId })`
   - 前置檢查：所有 Player 均無比賽紀錄

3. **User 刪除時處理**
   - 清空所有 `Player.find({ userId }).userId`
   - 保留 Player 記錄（轉為純球員）

---

## 未來 PostgreSQL 遷移對照

### Prisma Schema 定義

```prisma
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
```

### 欄位對照

| MongoDB             | PostgreSQL        | 轉換說明           |
| ------------------- | ----------------- | ------------------ |
| `_id` (ObjectId)    | `id` (cuid)       | ObjectId → cuid    |
| `teamId` (ObjectId) | `teamId` (String) | ObjectId → cuid    |
| `userId` (String)   | `userId` (String) | 直接複製           |
| 其他欄位            | 同名              | 類型相容，直接複製 |

---

## 資料完整性檢查清單

遷移後需驗證：

- [ ] 所有原 Member 記錄已遷移至 Player
- [ ] 所有原 Team.members[] 的 role 資訊已遷移
- [ ] 每個隊伍有且僅有一個 OWNER
- [ ] 所有 Record.teams.\*.players 引用的 Player.\_id 存在
- [ ] 所有 Lineup.\*.players 引用的 Player.\_id 存在
- [ ] 索引正確建立且 unique 約束生效
- [ ] `Player.find({ userId })` 正確返回使用者的所有隊伍
- [ ] `Player.find({ email, userId: null })` 正確返回待處理邀請

---

## 附錄：完整範例資料

### 範例 1：邀請中的成員

```json
{
  "_id": "player-invite-001",
  "name": "王小明",
  "number": 10,
  "position": "OH",
  "teamId": "team-001",
  "userId": null,
  "email": "wang@example.com",
  "role": "MEMBER",
  "createdAt": "2025-12-20T10:00:00Z",
  "updatedAt": "2025-12-20T10:00:00Z"
}
```

狀態：`INVITED`（等待 wang@example.com 接受邀請）

### 範例 2：已加入的成員

```json
{
  "_id": "player-joined-001",
  "name": "王小明",
  "number": 10,
  "position": "OH",
  "teamId": "team-001",
  "userId": "user-wang-123",
  "email": "wang@example.com",
  "role": "ADMIN",
  "createdAt": "2025-12-20T10:00:00Z",
  "updatedAt": "2025-12-20T11:00:00Z"
}
```

狀態：`JOINED`（已接受邀請並加入）

### 範例 3：純球員

```json
{
  "_id": "player-pure-001",
  "name": "對手攻擊手",
  "number": 7,
  "position": "OH",
  "teamId": null,
  "userId": null,
  "email": null,
  "role": null,
  "createdAt": "2025-12-20T12:00:00Z",
  "updatedAt": "2025-12-20T12:00:00Z"
}
```

狀態：`PURE_PLAYER`（臨打球員或對手球員）
