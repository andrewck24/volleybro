import {
  Player,
  PlayerRole,
  Position,
  PlayerStatus,
  getPlayerStatus,
  canManageTeam,
  isOwner,
} from '../player';

describe('Player Entity', () => {
  describe('getPlayerStatus', () => {
    it('should return JOINED when userId exists', () => {
      const player: Player = {
        _id: 'player-1',
        name: 'John Doe',
        teamId: 'team-1',
        userId: 'user-1',
        email: 'john@example.com',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getPlayerStatus(player)).toBe(PlayerStatus.JOINED);
    });

    it('should return INVITED when email exists but no userId', () => {
      const player: Player = {
        _id: 'player-2',
        name: 'Jane Smith',
        teamId: 'team-1',
        email: 'jane@example.com',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getPlayerStatus(player)).toBe(PlayerStatus.INVITED);
    });

    it('should return PURE_PLAYER when neither email nor userId exist', () => {
      const player: Player = {
        _id: 'player-3',
        name: 'Opponent Player',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getPlayerStatus(player)).toBe(PlayerStatus.PURE_PLAYER);
    });

    it('should prioritize userId over email when both exist', () => {
      const player: Player = {
        _id: 'player-4',
        name: 'Member',
        teamId: 'team-1',
        userId: 'user-1',
        email: 'member@example.com',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(getPlayerStatus(player)).toBe(PlayerStatus.JOINED);
    });
  });

  describe('canManageTeam', () => {
    it('should return true for OWNER role', () => {
      const player: Player = {
        _id: 'player-1',
        name: 'Owner',
        teamId: 'team-1',
        userId: 'user-1',
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(canManageTeam(player)).toBe(true);
    });

    it('should return true for ADMIN role', () => {
      const player: Player = {
        _id: 'player-2',
        name: 'Admin',
        teamId: 'team-1',
        userId: 'user-2',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(canManageTeam(player)).toBe(true);
    });

    it('should return false for MEMBER role', () => {
      const player: Player = {
        _id: 'player-3',
        name: 'Member',
        teamId: 'team-1',
        userId: 'user-3',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(canManageTeam(player)).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const player: Player = {
        _id: 'player-4',
        name: 'Pure Player',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(canManageTeam(player)).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true for OWNER role', () => {
      const player: Player = {
        _id: 'player-1',
        name: 'Owner',
        teamId: 'team-1',
        userId: 'user-1',
        role: PlayerRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isOwner(player)).toBe(true);
    });

    it('should return false for ADMIN role', () => {
      const player: Player = {
        _id: 'player-2',
        name: 'Admin',
        teamId: 'team-1',
        userId: 'user-2',
        role: PlayerRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isOwner(player)).toBe(false);
    });

    it('should return false for MEMBER role', () => {
      const player: Player = {
        _id: 'player-3',
        name: 'Member',
        teamId: 'team-1',
        userId: 'user-3',
        role: PlayerRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isOwner(player)).toBe(false);
    });

    it('should return false when role is undefined', () => {
      const player: Player = {
        _id: 'player-4',
        name: 'Pure Player',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(isOwner(player)).toBe(false);
    });
  });
});
