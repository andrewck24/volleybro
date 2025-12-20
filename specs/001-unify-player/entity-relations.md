# Entity Relations: 統一 Player 實體

**Feature Branch**: `001-unify-player`
**Created**: 2025-12-19

## 核心實體關係圖

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
│     │  Player.role（隊伍角色，可選）:              │                        │
│     │  ┌──────────────────────────────────────┐   │                        │
│     │  │ MEMBER   → 一般成員                   │   │                        │
│     │  │ ADMIN    → 管理員                     │   │                        │
│     │  │ OWNER    → 擁有者（每隊唯一）         │   │                        │
│     │  │ null     → 臨打球員（未來功能）       │   │                        │
│     │  └──────────────────────────────────────┘   │                        │
│     │                                              │                        │
│     │  成員狀態（由欄位組合推斷）:                  │                        │
│     │  ┌──────────────────────────────────────┐   │                        │
│     │  │ 邀請中 = email 存在 && userId 不存在  │   │                        │
│     │  │ 已加入 = userId 存在                  │   │                        │
│     │  │ 純球員 = email 不存在 && userId 不存在│   │                        │
│     │  └──────────────────────────────────────┘   │                        │
│     │                                              │                        │
│     │  注意：role 只會受到權限調整而改變       │                        │
│     │                                              │                        │
└─────┴──────────────────────────────────────────────┴────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         使用者比賽表現查詢功能                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    User ───1:N───► Player ───1:N───► SetPlayerStats                        │
│                       │                    │                                │
│                       │                    │ (透過 matchId 與 setId 關聯)           │
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

## 實體定義

### Player（統一球員實體）

```typescript
enum PlayerRole {
  MEMBER = "MEMBER",     // 一般成員
  ADMIN = "ADMIN",       // 管理員
  OWNER = "OWNER",       // 擁有者
}

type Player = {
  _id: string;
  name: string;
  number?: number;
  position?: Position;
  teamId?: string;         // 可選，關聯 Team（無 teamId 表示臨打球員）
  userId?: string;         // 可選，關聯 User（已加入的成員）
  email?: string;          // 可選，邀請時使用（邀請中 = email 存在 && userId 不存在）
  role?: PlayerRole;       // 可選，隊伍角色（null 表示臨打球員）
  createdAt: Date;
  updatedAt: Date;
};

// 成員狀態推斷邏輯：
// - 邀請中 = email 存在 && userId 不存在
// - 已加入 = userId 存在
// - 純球員 = email 不存在 && userId 不存在
//
// 注意：role 只會受到權限調整而改變，不會因邀請拒絕/取消或離隊而改變
```

### Match（比賽紀錄，原 Record）

```typescript
type Match = {
  _id: string;
  win: boolean;
  teamId: string;          // 記錄所屬隊伍
  info: MatchInfo;
  teams: {
    home: MatchTeam;       // 內嵌球隊快照
    away: MatchTeam;
  };
  sets: Set[];
};

type MatchTeam = {
  _id: string;
  name: string;
  players: MatchPlayer[];  // 內嵌球員快照
  staffs: Staff[];
  stats: TeamStats[];      // 每局隊伍統計
};

type MatchPlayer = {
  _id: string;             // 參照 Player._id
  name: string;
  number: number;
  stats: PlayerStats[];    // 每局球員統計（SetPlayerStats）
};
```

### Set（單局紀錄）

```typescript
type Set = {
  win: boolean;
  lineups: {
    home: Lineup;
    away?: Lineup;
  };
  options: SetOptions;
  entries: Entry[];        // 逐球紀錄
};
```

### SetPlayerStats（單局單一球員數據總計）

```typescript
// 內嵌於 MatchPlayer.stats[] 陣列中
// 索引對應 Match.sets[] 的索引
type SetPlayerStats = PlayerStats; // { [MoveType]: { success, error } }
```

## 關係說明

### 1. 使用者球隊邀請/身份功能

**關係**: `User --1:N-- Player --N:1-- Team`

| 查詢需求         | 實作方式                                                                        |
| ---------------- | ------------------------------------------------------------------------------- |
| 使用者加入的隊伍 | `Player.find({ userId })`                                                       |
| 使用者收到的邀請 | `Player.find({ email: user.email, userId: { $exists: false } })`                |
| 隊伍的已加入成員 | `Player.find({ teamId, userId: { $exists: true } })`                            |
| 隊伍的待邀請成員 | `Player.find({ teamId, email: { $exists: true }, userId: { $exists: false } })` |
| 隊伍的所有球員   | `Player.find({ teamId })`                                                       |

**成員狀態轉換**（基於 email/userId 欄位）:

```text
  ┌────────────────┐
  │ 建立邀請        │
  │ (設定 email)   │
  └───────┬────────┘
          │
          ▼
  ┌────────────────┐
  │ 邀請中          │  email: ✓  userId: ✗
  │ (待接受)        │
  └───────┬────────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────────────┐
│ 拒絕    │  │ 接受            │
│ 取消    │  │ (設定 userId)   │
└────┬───┘  └───────┬────────┘
     │              │
     ▼              ▼
┌────────────┐  ┌────────────────┐
│ 純球員      │  │ 已加入成員      │  email: ✓  userId: ✓
│ (清空email)│  │                │
└────────────┘  └───────┬────────┘
email: ✗               │
userId: ✗              ▼
                ┌────────────────┐
                │ 離隊            │
                │ (清空 userId)  │
                └───────┬────────┘
                        │
                        ▼
                ┌────────────────┐
                │ 純球員          │  email: ✗  userId: ✗
                └────────────────┘
```

**角色轉換**（role 欄位，獨立於成員狀態）:

```text
  MEMBER ◄────升/降級────► ADMIN
                            │
                            │ 權限移轉
                            ▼
                          OWNER
```

### 2. 使用者比賽表現查詢功能

**關係**: `User --1:N-- Player --1:N-- SetPlayerStats`

**Match 與 Set 關係**: `Match --1:N-- Set --1:N-- SetPlayerStats`

| 查詢需求           | 實作方式                                            |
| ------------------ | --------------------------------------------------- |
| 使用者某場比賽表現 | 透過 `Player._id` 在 `Match.teams.*.players` 中查找 |
| 使用者某局表現     | `MatchPlayer.stats[setIndex]`                       |
| 使用者歷史表現     | 聚合所有 Match 中該 Player 的 stats                 |

**資料結構示意**:

```json
{
  "_id": "match-001",
  "teamId": "team-001",
  "sets": [
    { "win": true, "entries": [...] },
    { "win": true, "entries": [...] },
    { "win": false, "entries": [...] }
  ],
  "teams": {
    "home": {
      "_id": "team-001",
      "name": "我的隊伍",
      "players": [
        {
          "_id": "player-001",
          "name": "王小明",
          "number": 10,
          "stats": [
            { "1": { "success": 3, "error": 1 }, ... },  // Set 1
            { "1": { "success": 2, "error": 0 }, ... },  // Set 2
            { "1": { "success": 4, "error": 2 }, ... }   // Set 3
          ]
        }
      ]
    }
  }
}
```

## 與現有結構的差異

### 移除的結構

| 原結構              | 位置                                               | 替代方案                            |
| ------------------- | -------------------------------------------------- | ----------------------------------- |
| `Team.members[]`    | `src/entities/team.ts`                             | 透過 `Player.find({ teamId })` 查詢 |
| `Profile.teams`     | `src/entities/profile.ts`                          | 透過 `Player.find({ userId })` 查詢 |
| `Member` collection | `src/infrastructure/db/mongoose/schemas/member.ts` | 合併至 `Player`                     |

### 保留的結構（快照）

| 結構          | 位置        | 說明                           |
| ------------- | ----------- | ------------------------------ |
| `MatchPlayer` | Record 內嵌 | 比賽時的球員快照，包含每局統計 |
| `MatchTeam`   | Record 內嵌 | 比賽時的隊伍快照               |

## 注意事項

1. **Player 刪除條件**: 只有在 Player 無任何比賽紀錄時才能刪除
2. **快照一致性**: Match 中的 MatchPlayer 是快照，不會隨 Player 更新而變化
3. **查詢效率**: 建議為 `Player` 建立以下索引：
   - `{ teamId: 1 }`
   - `{ userId: 1 }`
   - `{ email: 1 }`
