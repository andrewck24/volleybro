# Quickstart: 統一 Player 實體重構

**Feature Branch**: `001-unify-player`
**實作方式**: TDD (Test-Driven Development)
**預估工作量**: 5-7 工作天

---

## 實作順序概覽

本功能採用**分層漸進式開發**，遵循 Clean Architecture 由內而外的實作順序：

```
Phase 2: Entity & Schema (1 天)
  ↓
Phase 3: Repository & Use Cases (2-3 天)
  ↓
Phase 4: API Routes & Controllers (1-2 天)
  ↓
Phase 5: Frontend Components (1-2 天)
  ↓
Phase 6: Migration & Cleanup (0.5-1 天)
```

---

## Phase 2: Entity & Schema 層（Day 1）

### 目標

建立核心領域模型與驗證 schema。

### 實作步驟

#### 2.1 建立 Player Entity

**檔案**: `src/entities/player.ts`

**TDD 流程**:

1. **Red**: 撰寫測試

```typescript
// src/entities/__tests__/player.test.ts
import { describe, it, expect } from '@jest/globals';
import { getPlayerStatus, PlayerStatus } from '@/entities/player';

describe('Player Entity', () => {
  describe('getPlayerStatus', () => {
    it('should return JOINED when userId exists', () => {
      const player = {
        _id: '1',
        name: 'Test',
        userId: 'user_123',
        teamId: 'team_456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(getPlayerStatus(player)).toBe(PlayerStatus.JOINED);
    });

    it('should return INVITED when email exists but userId does not', () => {
      const player = {
        _id: '1',
        name: 'Test',
        email: 'test@example.com',
        teamId: 'team_456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(getPlayerStatus(player)).toBe(PlayerStatus.INVITED);
    });

    it('should return PURE_PLAYER when neither email nor userId exists', () => {
      const player = {
        _id: '1',
        name: 'Test',
        teamId: 'team_456',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      expect(getPlayerStatus(player)).toBe(PlayerStatus.PURE_PLAYER);
    });
  });
});
```

2. **Green**: 實作程式碼（參考 [data-model.md](./data-model.md#1-player-entity-定義)）

3. **Refactor**: 優化程式碼結構

**驗證**: `npm test -- entities/player`

---

#### 2.2 建立 Zod Validation Schema

**檔案**: `src/lib/validations/player.ts`

**TDD 流程**:

1. **Red**: 撰寫測試

```typescript
// src/lib/validations/__tests__/player.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  CreatePlayerSchema,
  UpdatePlayerInfoSchema,
  UpdatePlayerRoleSchema,
  UpdatePlayerStatusSchema,
} from '@/lib/validations/player';

describe('Player Validation Schemas', () => {
  describe('CreatePlayerSchema', () => {
    it('should validate valid player creation', () => {
      const data = {
        name: '王小明',
        number: 12,
        position: 'OH',
        email: 'test@example.com',
      };
      expect(() => CreatePlayerSchema.parse(data)).not.toThrow();
    });

    it('should reject empty name', () => {
      const data = { name: '' };
      expect(() => CreatePlayerSchema.parse(data)).toThrow();
    });

    it('should reject invalid number range', () => {
      const data = { name: 'Test', number: 100 };
      expect(() => CreatePlayerSchema.parse(data)).toThrow();
    });

    it('should reject invalid email format', () => {
      const data = { name: 'Test', email: 'invalid-email' };
      expect(() => CreatePlayerSchema.parse(data)).toThrow();
    });
  });

  describe('UpdatePlayerStatusSchema', () => {
    it('should validate invite action with email', () => {
      const data = { action: 'invite', email: 'test@example.com' };
      expect(() => UpdatePlayerStatusSchema.parse(data)).not.toThrow();
    });

    it('should reject invite action without email', () => {
      const data = { action: 'invite' };
      expect(() => UpdatePlayerStatusSchema.parse(data)).toThrow();
    });

    it('should validate accept action without email', () => {
      const data = { action: 'accept' };
      expect(() => UpdatePlayerStatusSchema.parse(data)).not.toThrow();
    });
  });
});
```

2. **Green**: 實作 schema（參考 [data-model.md](./data-model.md#3-zod-schema-定義)）

3. **Refactor**: 提取共用驗證邏輯

**驗證**: `npm test -- validations/player`

---

#### 2.3 建立 Mongoose Schema & Model

**檔案**: `src/infrastructure/db/schemas/player.schema.ts`

**TDD 流程**:

1. **Red**: 撰寫測試（使用 mock）

```typescript
// src/infrastructure/db/schemas/__tests__/player.schema.test.ts
import { describe, it, expect, beforeAll } from '@jest/globals';
import mongoose from 'mongoose';
import { PlayerModel } from '../player.schema';

describe('Player Schema', () => {
  beforeAll(async () => {
    // Mock MongoDB connection
  });

  it('should create player with valid data', async () => {
    const playerData = {
      name: '王小明',
      number: 12,
      position: 'OH',
      teamId: new mongoose.Types.ObjectId(),
      role: 'MEMBER',
    };

    const player = new PlayerModel(playerData);
    const validation = player.validateSync();
    expect(validation).toBeUndefined();
  });

  it('should reject invalid position', async () => {
    const playerData = {
      name: '王小明',
      position: 'INVALID',
    };

    const player = new PlayerModel(playerData);
    const validation = player.validateSync();
    expect(validation).toBeDefined();
    expect(validation?.errors.position).toBeDefined();
  });

  it('should enforce number range', async () => {
    const playerData = {
      name: '王小明',
      number: 100,
    };

    const player = new PlayerModel(playerData);
    const validation = player.validateSync();
    expect(validation).toBeDefined();
    expect(validation?.errors.number).toBeDefined();
  });
});
```

2. **Green**: 實作 schema（參考 [data-model.md](./data-model.md#2-mongoose-schema-定義)）

3. **Refactor**: 優化索引與驗證規則

**驗證**: `npm test -- schemas/player`

**Checkpoint**: 執行 `npm test` 確保所有測試通過，`npm run lint` 無錯誤

---

## Phase 3: Repository & Use Cases 層（Day 2-4）

### 目標

實作資料存取層與業務邏輯層。

### 實作順序

按**依賴關係由淺入深**實作：

1. PlayerRepository（Day 2）
2. 查詢類 Use Cases（Day 2）
3. 變更類 Use Cases（Day 3-4）

---

### 3.1 實作 PlayerRepository

**檔案**:
- `src/applications/repositories/player.repository.interface.ts`
- `src/infrastructure/db/repositories/player.repository.ts`

**TDD 流程**:

1. **Red**: 定義介面與測試

```typescript
// src/applications/repositories/player.repository.interface.ts
import type { Player } from '@/entities/player';

export interface IPlayerRepository {
  findById(id: string): Promise<Player | null>;
  findByTeamId(teamId: string): Promise<Player[]>;
  findByUserId(userId: string): Promise<Player[]>;
  findByEmail(email: string): Promise<Player[]>;
  create(data: Partial<Player>): Promise<Player>;
  update(id: string, data: Partial<Player>): Promise<Player | null>;
  delete(id: string): Promise<boolean>;
  existsByTeamAndEmail(teamId: string, email: string): Promise<boolean>;
}
```

```typescript
// src/infrastructure/db/repositories/__tests__/player.repository.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { PlayerRepository } from '../player.repository';

describe('PlayerRepository', () => {
  let repository: IPlayerRepository;

  beforeEach(() => {
    repository = new PlayerRepository();
  });

  describe('create', () => {
    it('should create invited player with email', async () => {
      const data = {
        name: '王小明',
        email: 'test@example.com',
        teamId: 'team_123',
        role: 'MEMBER' as const,
      };

      const player = await repository.create(data);
      expect(player).toMatchObject(data);
      expect(player._id).toBeDefined();
      expect(player.createdAt).toBeDefined();
    });

    it('should create pure player without email', async () => {
      const data = {
        name: '陳球員',
        number: 5,
        position: 'MB' as const,
        teamId: 'team_123',
      };

      const player = await repository.create(data);
      expect(player.email).toBeUndefined();
      expect(player.userId).toBeUndefined();
    });
  });

  describe('findByTeamId', () => {
    it('should return all players for a team', async () => {
      // Setup: create multiple players
      await repository.create({ name: 'Player 1', teamId: 'team_123' });
      await repository.create({ name: 'Player 2', teamId: 'team_123' });
      await repository.create({ name: 'Player 3', teamId: 'team_456' });

      const players = await repository.findByTeamId('team_123');
      expect(players).toHaveLength(2);
    });
  });

  describe('existsByTeamAndEmail', () => {
    it('should return true if email exists in team', async () => {
      await repository.create({
        name: 'Test',
        email: 'test@example.com',
        teamId: 'team_123',
      });

      const exists = await repository.existsByTeamAndEmail(
        'team_123',
        'test@example.com'
      );
      expect(exists).toBe(true);
    });

    it('should return false if email does not exist', async () => {
      const exists = await repository.existsByTeamAndEmail(
        'team_123',
        'nonexistent@example.com'
      );
      expect(exists).toBe(false);
    });
  });
});
```

2. **Green**: 實作 repository

```typescript
// src/infrastructure/db/repositories/player.repository.ts
import { injectable } from 'inversify';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { Player } from '@/entities/player';
import { PlayerModel } from '../schemas/player.schema';

@injectable()
export class PlayerRepository implements IPlayerRepository {
  async findById(id: string): Promise<Player | null> {
    const doc = await PlayerModel.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    const docs = await PlayerModel.find({ teamId })
      .sort({ createdAt: 1 })
      .lean();
    return docs.map(this.toEntity);
  }

  async findByUserId(userId: string): Promise<Player[]> {
    const docs = await PlayerModel.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(this.toEntity);
  }

  async findByEmail(email: string): Promise<Player[]> {
    const docs = await PlayerModel.find({
      email,
      userId: { $exists: false },
    })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(this.toEntity);
  }

  async create(data: Partial<Player>): Promise<Player> {
    const doc = await PlayerModel.create(data);
    return this.toEntity(doc.toObject());
  }

  async update(id: string, data: Partial<Player>): Promise<Player | null> {
    const doc = await PlayerModel.findByIdAndUpdate(id, data, {
      new: true,
    }).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await PlayerModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async existsByTeamAndEmail(
    teamId: string,
    email: string
  ): Promise<boolean> {
    const count = await PlayerModel.countDocuments({ teamId, email });
    return count > 0;
  }

  private toEntity(doc: any): Player {
    return {
      _id: doc._id.toString(),
      name: doc.name,
      number: doc.number,
      position: doc.position,
      teamId: doc.teamId?.toString(),
      userId: doc.userId,
      email: doc.email,
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
```

3. **Refactor**: 提取共用轉換邏輯

**驗證**: `npm test -- repositories/player`

---

### 3.2 實作查詢類 Use Cases

**優先順序**: GetPlayerUseCase → GetTeamPlayersUseCase → GetUserPlayersUseCase

#### 範例: GetTeamPlayersUseCase

**檔案**:
- `src/applications/usecases/player/get-team-players.usecase.interface.ts`
- `src/applications/usecases/player/get-team-players.usecase.ts`

**TDD 流程**:

1. **Red**: 撰寫測試

```typescript
// src/applications/usecases/player/__tests__/get-team-players.usecase.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { IGetTeamPlayersUseCase } from '../get-team-players.usecase.interface';
import { GetTeamPlayersUseCase } from '../get-team-players.usecase';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';

describe('GetTeamPlayersUseCase', () => {
  let useCase: IGetTeamPlayersUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockAuthService: jest.Mocked<IAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = {
      findByTeamId: jest.fn(),
    } as any;

    mockAuthService = {
      verifyTeamRole: jest.fn(),
    } as any;

    useCase = new GetTeamPlayersUseCase(
      mockPlayerRepository,
      mockAuthService
    );
  });

  it('should return all players for authorized user', async () => {
    const teamId = 'team_123';
    const userId = 'user_456';
    const mockPlayers = [
      { _id: '1', name: 'Player 1', teamId, userId },
      { _id: '2', name: 'Player 2', teamId, email: 'p2@example.com' },
    ];

    mockAuthService.verifyTeamRole.mockResolvedValue();
    mockPlayerRepository.findByTeamId.mockResolvedValue(mockPlayers as any);

    const result = await useCase.execute(teamId, userId);

    expect(mockAuthService.verifyTeamRole).toHaveBeenCalledWith(
      teamId,
      userId,
      'MEMBER'
    );
    expect(result).toHaveLength(2);
  });

  it('should throw error for unauthorized user', async () => {
    mockAuthService.verifyTeamRole.mockRejectedValue(
      new Error('User not in team')
    );

    await expect(useCase.execute('team_123', 'user_456')).rejects.toThrow(
      'User not in team'
    );
  });

  it('should filter by status when provided', async () => {
    const mockPlayers = [
      { _id: '1', name: 'Player 1', userId: 'user_1' }, // JOINED
      { _id: '2', name: 'Player 2', email: 'p2@example.com' }, // INVITED
    ];

    mockAuthService.verifyTeamRole.mockResolvedValue();
    mockPlayerRepository.findByTeamId.mockResolvedValue(mockPlayers as any);

    const result = await useCase.execute('team_123', 'user_456', {
      status: 'JOINED',
    });

    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('1');
  });
});
```

2. **Green**: 實作 use case

```typescript
// src/applications/usecases/player/get-team-players.usecase.ts
import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { IGetTeamPlayersUseCase } from './get-team-players.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import { getPlayerStatus, PlayerRole, PlayerStatus } from '@/entities/player';

@injectable()
export class GetTeamPlayersUseCase implements IGetTeamPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    teamId: string,
    userId: string,
    filters?: { status?: PlayerStatus; role?: PlayerRole }
  ): Promise<Player[]> {
    // 驗證權限
    await this.authService.verifyTeamRole(teamId, userId, PlayerRole.MEMBER);

    // 查詢球員
    let players = await this.playerRepository.findByTeamId(teamId);

    // 過濾狀態
    if (filters?.status) {
      players = players.filter(
        (p) => getPlayerStatus(p) === filters.status
      );
    }

    // 過濾角色
    if (filters?.role) {
      players = players.filter((p) => p.role === filters.role);
    }

    return players;
  }
}
```

3. **Refactor**: 提取過濾邏輯

**驗證**: `npm test -- usecases/player/get-team-players`

**重複此流程**: 完成其他查詢類 use cases

---

### 3.3 實作變更類 Use Cases

**實作順序**（按複雜度遞增）:

1. **CreatePlayerUseCase**（Day 3 上午）
2. **UpdatePlayerInfoUseCase**（Day 3 上午）
3. **CreateInvitationUseCase**（Day 3 下午）
4. **AcceptInvitationUseCase**（Day 3 下午）
5. **RejectInvitationUseCase**（Day 3 下午）
6. **CancelInvitationUseCase**（Day 3 下午）
7. **UpdateRoleUseCase**（Day 4 上午）
8. **LeaveTeamUseCase**（Day 4 上午）
9. **DeletePlayerUseCase**（Day 4 下午）
10. **TransferOwnershipUseCase**（Day 4 下午）

#### 範例: CreateInvitationUseCase

**TDD 流程**:

1. **Red**: 撰寫測試

```typescript
// src/applications/usecases/player/__tests__/create-invitation.usecase.test.ts
describe('CreateInvitationUseCase', () => {
  it('should create invitation for pure player', async () => {
    const playerId = 'player_123';
    const email = 'test@example.com';
    const userId = 'user_456';

    const existingPlayer = {
      _id: playerId,
      name: '王小明',
      teamId: 'team_123',
    }; // PURE_PLAYER

    mockPlayerRepository.findById.mockResolvedValue(existingPlayer as any);
    mockPlayerRepository.existsByTeamAndEmail.mockResolvedValue(false);
    mockAuthService.verifyTeamRole.mockResolvedValue();
    mockPlayerRepository.update.mockResolvedValue({
      ...existingPlayer,
      email,
      role: 'MEMBER',
    } as any);

    const result = await useCase.execute(playerId, email, userId);

    expect(result.email).toBe(email);
    expect(result.role).toBe('MEMBER');
  });

  it('should reject if email already invited in team', async () => {
    mockPlayerRepository.findById.mockResolvedValue({
      _id: 'player_123',
      name: 'Test',
      teamId: 'team_123',
    } as any);
    mockPlayerRepository.existsByTeamAndEmail.mockResolvedValue(true);

    await expect(
      useCase.execute('player_123', 'test@example.com', 'user_456')
    ).rejects.toThrow('DUPLICATE_INVITATION');
  });

  it('should reject if player is already invited or joined', async () => {
    mockPlayerRepository.findById.mockResolvedValue({
      _id: 'player_123',
      name: 'Test',
      email: 'existing@example.com',
      teamId: 'team_123',
    } as any);

    await expect(
      useCase.execute('player_123', 'new@example.com', 'user_456')
    ).rejects.toThrow('INVALID_STATE');
  });
});
```

2. **Green**: 實作 use case

```typescript
// src/applications/usecases/player/create-invitation.usecase.ts
@injectable()
export class CreateInvitationUseCase implements ICreateInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    playerId: string,
    email: string,
    userId: string
  ): Promise<Player> {
    // 1. 查詢球員
    const player = await this.playerRepository.findById(playerId);
    if (!player) throw new Error('NOT_FOUND');

    // 2. 驗證權限
    await this.authService.verifyTeamRole(
      player.teamId!,
      userId,
      PlayerRole.ADMIN
    );

    // 3. 驗證狀態
    const status = getPlayerStatus(player);
    if (status !== PlayerStatus.PURE_PLAYER) {
      throw new Error('INVALID_STATE');
    }

    // 4. 檢查重複邀請
    const exists = await this.playerRepository.existsByTeamAndEmail(
      player.teamId!,
      email
    );
    if (exists) throw new Error('DUPLICATE_INVITATION');

    // 5. 更新球員
    const updated = await this.playerRepository.update(playerId, {
      email,
      role: player.role || PlayerRole.MEMBER,
    });

    if (!updated) throw new Error('UPDATE_FAILED');

    // TODO: 未來整合通知系統，觸發邀請通知

    return updated;
  }
}
```

3. **Refactor**: 提取狀態驗證邏輯

**驗證**: `npm test -- usecases/player/create-invitation`

**重複此流程**: 完成所有變更類 use cases

**Checkpoint**:
- `npm test` 確保所有 use case 測試通過
- `npm run lint` 無錯誤
- Code coverage 應達 80% 以上

---

## Phase 4: API Routes & Controllers（Day 5-6）

### 目標

實作 API 端點與控制器層。

### 實作順序

按 API 路徑分組實作：

1. `/api/players/[playerId]`（Day 5 上午）
2. `/api/teams/[teamId]/players`（Day 5 下午）
3. `/api/users/[userId]/players`（Day 6 上午）

---

### 4.1 實作 Player API Routes

**檔案**: `src/app/api/players/[playerId]/route.ts`

**TDD 流程**:

1. **Red**: 撰寫 API 測試

```typescript
// src/app/api/players/[playerId]/__tests__/route.test.ts
import { describe, it, expect } from '@jest/globals';
import { GET, DELETE } from '../route';

describe('GET /api/players/[playerId]', () => {
  it('should return player for authorized user', async () => {
    const req = new Request('http://localhost/api/players/player_123');
    const params = { playerId: 'player_123' };

    const response = await GET(req, { params });
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data._id).toBe('player_123');
  });

  it('should return 401 for unauthorized user', async () => {
    const req = new Request('http://localhost/api/players/player_123');
    const params = { playerId: 'player_123' };

    const response = await GET(req, { params });
    expect(response.status).toBe(401);
  });

  it('should return 404 for non-existent player', async () => {
    const req = new Request('http://localhost/api/players/nonexistent');
    const params = { playerId: 'nonexistent' };

    const response = await GET(req, { params });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/players/[playerId]', () => {
  it('should delete player for authorized admin', async () => {
    const req = new Request('http://localhost/api/players/player_123', {
      method: 'DELETE',
    });
    const params = { playerId: 'player_123' };

    const response = await DELETE(req, { params });
    expect(response.status).toBe(204);
  });

  it('should return 409 if player is in use', async () => {
    const req = new Request('http://localhost/api/players/player_in_use', {
      method: 'DELETE',
    });
    const params = { playerId: 'player_in_use' };

    const response = await DELETE(req, { params });
    expect(response.status).toBe(409);

    const data = await response.json();
    expect(data.error).toBe('PLAYER_IN_USE');
  });
});
```

2. **Green**: 實作 route handler

```typescript
// src/app/api/players/[playerId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import type { IGetPlayerUseCase } from '@/applications/usecases/player/get-player.usecase.interface';
import type { IDeletePlayerUseCase } from '@/applications/usecases/player/delete-player.usecase.interface';

export async function GET(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    // 驗證登入
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 執行 use case
    const useCase = container.get<IGetPlayerUseCase>(TYPES.GetPlayerUseCase);
    const player = await useCase.execute(params.playerId, session.user.id);

    return NextResponse.json(player);
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    if (error.message.includes('not found in team')) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const useCase = container.get<IDeletePlayerUseCase>(
      TYPES.DeletePlayerUseCase
    );
    await useCase.execute(params.playerId, session.user.id);

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.message === 'PLAYER_IN_USE') {
      return NextResponse.json(
        {
          error: 'PLAYER_IN_USE',
          message: '球員已被比賽記錄引用，無法刪除',
        },
        { status: 409 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

3. **Refactor**: 提取錯誤處理邏輯

**驗證**: `npm test -- api/players`

---

### 4.2 實作 Sub-resource Routes

**檔案**:
- `src/app/api/players/[playerId]/info/route.ts`
- `src/app/api/players/[playerId]/role/route.ts`
- `src/app/api/players/[playerId]/status/route.ts`

**範例**: `info/route.ts`

```typescript
// src/app/api/players/[playerId]/info/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/di/container';
import { TYPES } from '@/infrastructure/di/types';
import { auth } from '@/lib/auth';
import { UpdatePlayerInfoSchema } from '@/lib/validations/player';
import type { IUpdatePlayerInfoUseCase } from '@/applications/usecases/player/update-player-info.usecase.interface';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    // 驗證請求
    const body = await req.json();
    const validated = UpdatePlayerInfoSchema.parse(body);

    // 執行 use case
    const useCase = container.get<IUpdatePlayerInfoUseCase>(
      TYPES.UpdatePlayerInfoUseCase
    );
    const player = await useCase.execute(
      params.playerId,
      validated,
      session.user.id
    );

    return NextResponse.json(player);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
```

**重複此流程**: 完成所有 API routes

**Checkpoint**:
- 使用 Postman Collection 測試所有端點
- `npm test -- api/` 確保所有 API 測試通過

---

## Phase 5: Frontend Components（Day 6-7）

### 目標

實作前端 UI 元件與資料整合。

### 實作順序

1. **SWR Hooks**（Day 6 下午）
2. **UI Components**（Day 7 上午）
3. **整合測試**（Day 7 下午）

---

### 5.1 實作 SWR Hooks

**檔案**: `src/hooks/use-players.ts`

**TDD 流程**:

1. **Red**: 撰寫測試

```typescript
// src/hooks/__tests__/use-players.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamPlayers } from '../use-players';

describe('useTeamPlayers', () => {
  it('should fetch team players', async () => {
    const { result } = renderHook(() => useTeamPlayers('team_123'));

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.players).toHaveLength(3);
    });
  });

  it('should handle error', async () => {
    const { result } = renderHook(() => useTeamPlayers('invalid_id'));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

2. **Green**: 實作 hook

```typescript
// src/hooks/use-players.ts
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { Player, PlayerRole } from '@/entities/player';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTeamPlayers(teamId: string) {
  return useSWR<{ players: Player[]; total: number }>(
    `/api/teams/${teamId}/players`,
    fetcher
  );
}

export function usePlayerMutation(playerId: string) {
  const updateInfo = useSWRMutation(
    `/api/players/${playerId}/info`,
    async (url, { arg }: { arg: Partial<Player> }) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  );

  const updateRole = useSWRMutation(
    `/api/players/${playerId}/role`,
    async (url, { arg }: { arg: { role: PlayerRole } }) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  );

  const updateStatus = useSWRMutation(
    `/api/players/${playerId}/status`,
    async (url, { arg }: { arg: any }) => {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(arg),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  );

  return { updateInfo, updateRole, updateStatus };
}
```

3. **Refactor**: 提取共用 fetcher 邏輯

**驗證**: `npm test -- hooks/use-players`

---

### 5.2 實作 UI Components

**實作順序**:

1. `player-card.tsx`（基礎卡片）
2. `player-list.tsx`（列表）
3. `invite-accordion.tsx`（邀請介面）
4. `role-select.tsx`（角色選擇）

**範例**: `player-card.tsx`

```typescript
// src/components/team/player-card.tsx
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/entities/player';
import { getPlayerStatus, PlayerStatus } from '@/entities/player';

interface PlayerCardProps {
  player: Player;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function PlayerCard({ player, onEdit, onDelete }: PlayerCardProps) {
  const status = getPlayerStatus(player);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{player.name}</h3>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent>
        {player.number && <p>號碼: {player.number}</p>}
        {player.position && <p>位置: {player.position}</p>}
        {player.role && <p>角色: {player.role}</p>}
        {status === PlayerStatus.INVITED && <p>Email: {player.email}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: PlayerStatus }) {
  const variants = {
    [PlayerStatus.JOINED]: 'default',
    [PlayerStatus.INVITED]: 'secondary',
    [PlayerStatus.PURE_PLAYER]: 'outline',
  };

  const labels = {
    [PlayerStatus.JOINED]: '已加入',
    [PlayerStatus.INVITED]: '邀請中',
    [PlayerStatus.PURE_PLAYER]: '球員',
  };

  return <Badge variant={variants[status] as any}>{labels[status]}</Badge>;
}
```

**Component Testing**:

```typescript
// src/components/team/__tests__/player-card.test.tsx
import { render, screen } from '@testing-library/react';
import { PlayerCard } from '../player-card';

describe('PlayerCard', () => {
  it('should render joined player', () => {
    const player = {
      _id: '1',
      name: '王小明',
      number: 12,
      position: 'OH',
      userId: 'user_123',
      role: 'MEMBER',
    };

    render(<PlayerCard player={player as any} />);

    expect(screen.getByText('王小明')).toBeInTheDocument();
    expect(screen.getByText('已加入')).toBeInTheDocument();
  });

  it('should render invited player with email', () => {
    const player = {
      _id: '2',
      name: '李小華',
      email: 'player@example.com',
      role: 'MEMBER',
    };

    render(<PlayerCard player={player as any} />);

    expect(screen.getByText('邀請中')).toBeInTheDocument();
    expect(screen.getByText(/player@example.com/)).toBeInTheDocument();
  });
});
```

**重複此流程**: 完成所有 UI components

**Checkpoint**:
- `npm test -- components/team/` 確保元件測試通過
- `npm run storybook` 檢視元件視覺呈現

---

## Phase 6: Migration & Cleanup（Day 7-8）

### 目標

遷移舊資料並移除舊程式碼。

### 6.1 資料遷移腳本

**檔案**: `scripts/migrations/001-unify-player.ts`

```typescript
// scripts/migrations/001-unify-player.ts
import mongoose from 'mongoose';
import { MemberModel } from '@/infrastructure/db/schemas/member.schema';
import { TeamModel } from '@/infrastructure/db/schemas/team.schema';
import { PlayerModel } from '@/infrastructure/db/schemas/player.schema';

const roleMapping = {
  0: 'MEMBER',
  1: 'OWNER',
  2: 'ADMIN',
} as const;

async function migrate() {
  console.log('Starting migration...');

  // 1. 遷移 Member collection
  const members = await MemberModel.find().lean();
  console.log(`Found ${members.length} members to migrate`);

  for (const member of members) {
    await PlayerModel.create({
      _id: member._id, // 保留 _id
      name: member.name,
      number: member.number,
      position: member.position,
      teamId: member.team_id,
      userId: member.user_id,
      email: member.email,
      role: member.role ? roleMapping[member.role] : 'MEMBER',
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    });
  }

  // 2. 遷移 Team.members[]
  const teams = await TeamModel.find().lean();
  console.log(`Found ${teams.length} teams to migrate`);

  for (const team of teams) {
    for (const teamMember of team.members || []) {
      const existingPlayer = await PlayerModel.findOne({
        userId: teamMember.user_id.toString(),
        teamId: team._id,
      });

      if (!existingPlayer) {
        await PlayerModel.create({
          name: teamMember.name || 'Unknown',
          number: teamMember.number,
          teamId: team._id,
          userId: teamMember.user_id.toString(),
          role: roleMapping[teamMember.role] || 'MEMBER',
        });
      }
    }
  }

  console.log('Migration completed!');
}

// 執行遷移
migrate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
```

**執行遷移**:

```bash
# 備份資料庫
mongodump --uri="$MONGODB_URI" --out=./backup/$(date +%Y%m%d)

# 執行遷移
tsx scripts/migrations/001-unify-player.ts

# 驗證資料
npm run validate-migration
```

---

### 6.2 移除舊程式碼

**Checklist**:

- [ ] 刪除 `src/entities/member.ts`
- [ ] 刪除 `src/infrastructure/db/schemas/member.schema.ts`
- [ ] 刪除 `src/infrastructure/db/repositories/member.repository.ts`
- [ ] 刪除 `src/app/api/members/**`
- [ ] 移除 `Team.members[]` 欄位（保留至所有功能遷移完成）
- [ ] 移除 `Profile.teams[]` 欄位（保留至所有功能遷移完成）
- [ ] 更新 DI container 註冊
- [ ] 更新相關 import 路徑

**驗證**:

```bash
# 確保沒有引用舊程式碼
grep -r "from '@/entities/member'" src/
grep -r "/api/members" src/

# 執行完整測試
npm test
npm run build
```

---

## 最終驗收

### Pre-commit Checklist

- [ ] `npm test` 所有測試通過
- [ ] `npm run lint` 無錯誤
- [ ] `npm run build` 建置成功
- [ ] `npm run type-check` 無 TypeScript 錯誤
- [ ] Code coverage ≥ 80%
- [ ] Storybook 所有元件正常顯示
- [ ] Postman Collection 所有端點測試通過

### Constitution Check

驗證是否符合專案憲法：

- [ ] **MVP First**: P1 功能完整實作
- [ ] **TDD**: 所有程式碼遵循 Red-Green-Refactor
- [ ] **Quality First**: 測試覆蓋率達標，無 lint 錯誤
- [ ] **Chinese Docs / Multilingual UI**: 文件使用中文，UI 支援多語系
- [ ] **Clean Architecture**: 層級分離清晰，依賴方向正確

### 建立 Pull Request

```bash
# 確認所有變更
git status

# 建立 commit
git add .
git commit -m "feat: unify player entity with invitation system

- Implement Player entity with INVITED/JOINED/PURE_PLAYER states
- Migrate Member collection and Team.members[] to unified Player
- Add invitation workflow with accept/reject/cancel actions
- Implement role management (MEMBER/ADMIN/OWNER)
- Add RESTful API endpoints for player operations
- Create SWR hooks and UI components for team management"

# 推送到遠端
git push origin 001-unify-player

# 建立 PR（合併到 main）
gh pr create --title "feat: 統一 Player 實體重構" \
  --base main \
  --body "$(cat <<'EOF'
## Summary

統一 Player 實體，整合球員資料、邀請系統與隊伍成員管理。

## Changes

- ✅ Player entity with state machine (INVITED/JOINED/PURE_PLAYER)
- ✅ Role management (MEMBER/ADMIN/OWNER)
- ✅ Invitation workflow (invite/accept/reject/cancel)
- ✅ RESTful API endpoints
- ✅ SWR hooks and UI components
- ✅ Data migration from Member collection

## Test Coverage

- Unit tests: 85%
- Integration tests: 100% API endpoints
- Component tests: 90%

## Screenshots

[Add screenshots here]

---

## 摘要

統一 Player 實體，整合球員資料、邀請系統與隊伍成員管理，提供完整的角色管理與邀請流程。

## 變更內容

- ✅ Player 實體與狀態機（INVITED/JOINED/PURE_PLAYER）
- ✅ 角色管理（MEMBER/ADMIN/OWNER）
- ✅ 邀請流程（invite/accept/reject/cancel）
- ✅ RESTful API 端點
- ✅ SWR hooks 與 UI 元件
- ✅ 從 Member collection 資料遷移

## 測試覆蓋率

- 單元測試：85%
- 整合測試：100% API 端點
- 元件測試：90%
EOF
)"
```

---

## 常見問題排解

### Q1: MongoDB 索引建立失敗

**症狀**: `E11000 duplicate key error`

**解決**:
```bash
# 刪除舊索引
db.players.dropIndexes()

# 重新建立索引
db.players.createIndex({ teamId: 1, email: 1 }, { unique: true, sparse: true })
```

### Q2: Zod 驗證錯誤格式不一致

**症狀**: 錯誤訊息格式與前端不符

**解決**: 使用統一的錯誤處理器

```typescript
function formatZodError(error: ZodError) {
  return {
    error: 'VALIDATION_ERROR',
    message: '資料驗證失敗',
    details: Object.fromEntries(
      error.errors.map((e) => [e.path.join('.'), e.message])
    ),
  };
}
```

### Q3: SWR cache 不同步

**症狀**: 更新後資料未自動刷新

**解決**: 確保使用正確的 cache key

```typescript
// 更新後手動 revalidate
const { mutate } = useSWRConfig();
await updatePlayer(data);
mutate(`/api/teams/${teamId}/players`);
```

---

## 參考資料

- [Spec](./spec.md) - 功能規格
- [Data Model](./data-model.md) - 資料模型
- [API Contracts](./contracts/players-api.yaml) - API 規格
- [Research](./research.md) - 技術研究
- [Plan](./plan.md) - 實作計畫

---

**祝開發順利！🏐**
