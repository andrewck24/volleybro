# API Contracts

本目錄包含統一 Player 實體的 API 合約定義。

## 檔案說明

### 1. `players-api.yaml`

OpenAPI 3.1 規格文件，定義所有 Player 相關的 API 端點。

**用途**:
- API 文件生成
- Mock Server 建立
- API 測試工具整合（Postman, Insomnia）
- 前後端開發合約

**線上檢視**:
```bash
# 使用 Swagger Editor
npx swagger-editor-dist players-api.yaml

# 或使用 Redoc
npx @redocly/cli preview-docs players-api.yaml
```

### 2. `schemas.json`

JSON Schema 定義，用於資料驗證與型別生成。

**用途**:
- 前端 TypeScript 型別生成
- API 請求/回應驗證
- 測試資料生成

**整合範例**:

#### TypeScript 型別生成

```bash
# 使用 json-schema-to-typescript
npm install -D json-schema-to-typescript

# 生成型別
json2ts contracts/schemas.json > src/types/player-api.generated.ts
```

#### Zod Schema 生成

```typescript
// 使用 json-schema-to-zod
import { jsonSchemaToZod } from 'json-schema-to-zod';
import schemas from './schemas.json';

const zodSchema = jsonSchemaToZod(schemas.definitions.CreatePlayerRequest);
```

## API 端點總覽

### Player Operations (球員個體操作)

| 方法 | 端點 | 描述 | 權限 |
|------|------|------|------|
| GET | `/api/players/{playerId}` | 取得球員詳細資訊 | OWNER/ADMIN/MEMBER |
| DELETE | `/api/players/{playerId}` | 刪除球員 | OWNER/ADMIN |
| PATCH | `/api/players/{playerId}/info` | 更新基本資訊 | OWNER/ADMIN/本人 |
| PATCH | `/api/players/{playerId}/role` | 更新角色 | OWNER |
| PATCH | `/api/players/{playerId}/status` | 狀態轉換 | 視 action 而定 |

### Team Players (隊伍成員管理)

| 方法 | 端點 | 描述 | 權限 |
|------|------|------|------|
| GET | `/api/teams/{teamId}/players` | 取得隊伍所有球員 | OWNER/ADMIN/MEMBER |
| POST | `/api/teams/{teamId}/players` | 建立球員（含邀請） | OWNER/ADMIN |

### User Players (使用者球員關聯)

| 方法 | 端點 | 描述 | 權限 |
|------|------|------|------|
| GET | `/api/users/{userId}/players` | 取得使用者的所有球員 | 本人 |

## 狀態轉換 Actions

`PATCH /api/players/{playerId}/status` 支援的 actions:

| Action | 狀態轉換 | 權限 | Request Body |
|--------|----------|------|--------------|
| `invite` | PURE_PLAYER → INVITED | OWNER/ADMIN | `{ action: "invite", email: "..." }` |
| `accept` | INVITED → JOINED | 被邀請者本人 | `{ action: "accept" }` |
| `reject` | INVITED → deleted | 被邀請者本人 | `{ action: "reject" }` |
| `cancel` | INVITED → deleted | OWNER/ADMIN | `{ action: "cancel" }` |
| `leave` | JOINED → deleted | 本人（非 OWNER） | `{ action: "leave" }` |

## 錯誤代碼

| 代碼 | HTTP Status | 說明 |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | 未登入 |
| `FORBIDDEN` | 403 | 權限不足 |
| `NOT_FOUND` | 404 | 資源不存在 |
| `VALIDATION_ERROR` | 400 | 資料驗證失敗 |
| `DUPLICATE_INVITATION` | 409 | Email 已被邀請 |
| `INVALID_STATE_TRANSITION` | 409 | 無效的狀態轉換 |
| `PLAYER_IN_USE` | 409 | 球員已被比賽記錄引用 |
| `INVALID_OPERATION` | 403 | 無效操作（如直接變更 OWNER） |

## 開發工作流程

### 1. 前端開發

```typescript
// 使用生成的型別
import type {
  Player,
  CreatePlayerRequest,
  UpdatePlayerStatusRequest
} from '@/types/player-api.generated';

// SWR Hook
export function useTeamPlayers(teamId: string) {
  return useSWR<GetTeamPlayersResponse>(
    `/api/teams/${teamId}/players`,
    fetcher
  );
}

// Mutation Hook
export function usePlayerStatusMutation(playerId: string) {
  return useSWRMutation<Player, Error, string, UpdatePlayerStatusRequest>(
    `/api/players/${playerId}/status`,
    async (url, { arg }) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  );
}
```

### 2. 後端開發

```typescript
// API Route Handler
import { PlayerSchema, UpdatePlayerInfoSchema } from '@/lib/validations/player';
import type { NextRequest } from 'next/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  // 驗證請求
  const body = await req.json();
  const validated = UpdatePlayerInfoSchema.parse(body);

  // 業務邏輯
  const useCase = container.get<UpdatePlayerInfoUseCase>(TYPES.UpdatePlayerInfoUseCase);
  const player = await useCase.execute(params.playerId, validated);

  // 回應驗證
  return Response.json(PlayerSchema.parse(player));
}
```

### 3. 測試開發

```typescript
// Integration Test
import { describe, it, expect } from '@jest/globals';

describe('POST /api/teams/{teamId}/players', () => {
  it('should create invited player when email is provided', async () => {
    const response = await fetch(`/api/teams/${teamId}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '王小明',
        email: 'player@example.com',
        number: 12,
        position: 'OH',
      }),
    });

    expect(response.status).toBe(201);
    const player = await response.json();
    expect(player).toMatchObject({
      name: '王小明',
      email: 'player@example.com',
      number: 12,
      position: 'OH',
      role: 'MEMBER',
    });
    expect(player.userId).toBeUndefined(); // INVITED 狀態
  });
});
```

## Zod Schema 對照

本專案使用 Zod 進行驗證，對應的 schema 定義於：

- **Entity Schema**: `src/entities/player.ts`
- **Validation Schema**: `src/lib/validations/player.ts`

與 JSON Schema 的對應關係：

| JSON Schema | Zod Schema | 用途 |
|-------------|------------|------|
| `CreatePlayerRequest` | `CreatePlayerSchema` | POST 請求驗證 |
| `UpdatePlayerInfoRequest` | `UpdatePlayerInfoSchema` | PATCH info 驗證 |
| `UpdatePlayerRoleRequest` | `UpdatePlayerRoleSchema` | PATCH role 驗證 |
| `UpdatePlayerStatusRequest` | `UpdatePlayerStatusSchema` | PATCH status 驗證 |
| `Player` | `PlayerSchema` | 回應驗證 |

## 未來整合點

### 通知系統

以下端點在未來整合通知系統時會觸發通知：

| 端點 | 觸發時機 | 通知對象 |
|------|----------|----------|
| `POST /api/teams/{teamId}/players` | email 存在時 | 被邀請者 |
| `PATCH /status` (invite) | 執行後 | 被邀請者 |
| `PATCH /status` (accept/reject) | 執行後 | 隊伍 OWNER/ADMIN |
| `PATCH /status` (cancel) | 執行後 | 被邀請者 |
| `PATCH /role` | 執行後 | 被變更者 |

### Prisma 遷移

未來遷移至 PostgreSQL + Prisma 時：

1. 使用 `zod-prisma-types` 自動生成 Zod schema
2. 更新 JSON Schema 以反映 Prisma 的型別定義
3. 將 `_id` 改為 `id`（cuid）
4. Enum 值保持不變（已使用字串 enum）

## 驗證與測試

### OpenAPI 驗證

```bash
# 使用 Redocly CLI
npx @redocly/cli lint players-api.yaml

# 檢查規格有效性
npx swagger-cli validate players-api.yaml
```

### JSON Schema 驗證

```bash
# 使用 AJV CLI
npm install -g ajv-cli

# 驗證範例資料
ajv validate -s schemas.json -d examples/create-player.json
```

## 參考資料

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [JSON Schema Draft 7](https://json-schema.org/draft-07/schema)
- [Zod Documentation](https://zod.dev/)
- [SWR Documentation](https://swr.vercel.app/)
