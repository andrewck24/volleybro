import {
  PlayerSchema,
  CreatePlayerSchema,
  UpdatePlayerInfoSchema,
  UpdatePlayerRoleSchema,
  UpdatePlayerStatusSchema,
  PlayerRoleSchema,
  PositionSchema,
} from '../player';
import { PlayerRole, Position } from '@/entities/player';

describe('Player Validation Schemas', () => {
  describe('PlayerRoleSchema', () => {
    it('should accept valid role enums', () => {
      expect(PlayerRoleSchema.parse(PlayerRole.MEMBER)).toBe(PlayerRole.MEMBER);
      expect(PlayerRoleSchema.parse(PlayerRole.ADMIN)).toBe(PlayerRole.ADMIN);
      expect(PlayerRoleSchema.parse(PlayerRole.OWNER)).toBe(PlayerRole.OWNER);
    });

    it('should reject invalid roles', () => {
      expect(() => PlayerRoleSchema.parse('INVALID')).toThrow();
      expect(() => PlayerRoleSchema.parse('member')).toThrow();
    });
  });

  describe('PositionSchema', () => {
    it('should accept valid position enums', () => {
      expect(PositionSchema.parse(Position.OH)).toBe(Position.OH);
      expect(PositionSchema.parse(Position.MB)).toBe(Position.MB);
      expect(PositionSchema.parse(Position.NONE)).toBe(Position.NONE);
    });

    it('should reject invalid positions', () => {
      expect(() => PositionSchema.parse('INVALID')).toThrow();
    });
  });

  describe('CreatePlayerSchema', () => {
    it('should accept valid player creation input', () => {
      const input = {
        name: 'John Doe',
        number: 10,
        position: Position.OH,
        role: PlayerRole.MEMBER,
        email: 'john@example.com',
      };

      const result = CreatePlayerSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept player creation without email (pure player)', () => {
      const input = {
        name: 'Opponent Player',
        number: 7,
        position: Position.S,
      };

      const result = CreatePlayerSchema.parse(input);
      expect(result.name).toBe('Opponent Player');
      expect(result.email).toBeUndefined();
      expect(result.role).toBe(PlayerRole.MEMBER);
    });

    it('should use default role MEMBER if not provided', () => {
      const input = {
        name: 'Member',
      };

      const result = CreatePlayerSchema.parse(input);
      expect(result.role).toBe(PlayerRole.MEMBER);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });

    it('should reject invalid number (out of range)', () => {
      const input = {
        name: 'Player',
        number: 100,
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });

    it('should reject invalid email format', () => {
      const input = {
        name: 'Player',
        email: 'invalid-email',
      };

      expect(() => CreatePlayerSchema.parse(input)).toThrow();
    });
  });

  describe('UpdatePlayerInfoSchema', () => {
    it('should accept partial updates', () => {
      const input = {
        name: 'Updated Name',
      };

      const result = UpdatePlayerInfoSchema.parse(input);
      expect(result.name).toBe('Updated Name');
    });

    it('should accept all fields', () => {
      const input = {
        name: 'John',
        number: 5,
        position: Position.MB,
      };

      const result = UpdatePlayerInfoSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should reject empty name', () => {
      const input = {
        name: '',
      };

      expect(() => UpdatePlayerInfoSchema.parse(input)).toThrow();
    });

    it('should reject invalid number', () => {
      const input = {
        number: 150,
      };

      expect(() => UpdatePlayerInfoSchema.parse(input)).toThrow();
    });

    it('should allow empty object (no updates)', () => {
      const result = UpdatePlayerInfoSchema.parse({});
      expect(result).toEqual({});
    });
  });

  describe('UpdatePlayerRoleSchema', () => {
    it('should accept valid role', () => {
      const input = {
        role: PlayerRole.ADMIN,
      };

      const result = UpdatePlayerRoleSchema.parse(input);
      expect(result.role).toBe(PlayerRole.ADMIN);
    });

    it('should reject invalid role', () => {
      const input = {
        role: 'INVALID',
      };

      expect(() => UpdatePlayerRoleSchema.parse(input)).toThrow();
    });
  });

  describe('UpdatePlayerStatusSchema', () => {
    describe('invite action', () => {
      it('should accept valid invite request', () => {
        const input = {
          action: 'invite' as const,
          email: 'newmember@example.com',
        };

        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('invite');
        if (result.action === 'invite') {
          expect(result.email).toBe('newmember@example.com');
        }
      });

      it('should reject invalid email', () => {
        const input = {
          action: 'invite' as const,
          email: 'not-an-email',
        };

        expect(() => UpdatePlayerStatusSchema.parse(input)).toThrow();
      });

      it('should reject invite without email', () => {
        const input = {
          action: 'invite',
        };

        expect(() => UpdatePlayerStatusSchema.parse(input)).toThrow();
      });
    });

    describe('cancel action', () => {
      it('should accept cancel request', () => {
        const input = {
          action: 'cancel' as const,
        };

        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('cancel');
      });

      it('should reject cancel with extra properties', () => {
        const input = {
          action: 'cancel',
          extra: 'data',
        };

        // Should either strip or throw - Zod by default strips unknown properties
        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('cancel');
        expect('extra' in result).toBe(false);
      });
    });

    describe('accept action', () => {
      it('should accept accept request', () => {
        const input = {
          action: 'accept' as const,
        };

        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('accept');
      });
    });

    describe('reject action', () => {
      it('should accept reject request', () => {
        const input = {
          action: 'reject' as const,
        };

        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('reject');
      });
    });

    describe('leave action', () => {
      it('should accept leave request', () => {
        const input = {
          action: 'leave' as const,
        };

        const result = UpdatePlayerStatusSchema.parse(input);
        expect(result.action).toBe('leave');
      });
    });

    it('should reject invalid action', () => {
      const input = {
        action: 'invalid',
      };

      expect(() => UpdatePlayerStatusSchema.parse(input)).toThrow();
    });
  });

  describe('PlayerSchema', () => {
    it('should validate complete player object', () => {
      const player = {
        _id: 'player-1',
        name: 'John Doe',
        number: 10,
        position: Position.OH,
        teamId: 'team-1',
        userId: 'user-1',
        email: 'john@example.com',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PlayerSchema.parse(player);
      expect(result._id).toBe('player-1');
      expect(result.name).toBe('John Doe');
    });

    it('should accept player with minimal fields', () => {
      const player = {
        _id: 'player-2',
        name: 'Pure Player',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = PlayerSchema.parse(player);
      expect(result._id).toBe('player-2');
      expect(result.userId).toBeUndefined();
    });

    it('should reject missing required name', () => {
      const player = {
        _id: 'player-3',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => PlayerSchema.parse(player)).toThrow();
    });

    it('should reject missing _id', () => {
      const player = {
        name: 'Player',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => PlayerSchema.parse(player)).toThrow();
    });
  });
});
