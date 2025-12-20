import { PlayerRepository } from '../player.repository';
import { PlayerModel } from '../../mongoose/schemas/player';
import { Player, PlayerRole } from '@/entities/player';

// Mock the PlayerModel
jest.mock('../../mongoose/schemas/player', () => ({
  PlayerModel: {
    findById: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

describe('PlayerRepository', () => {
  let repository: PlayerRepository;
  const mockPlayer: Player = {
    _id: 'player-1',
    name: 'Test Player',
    teamId: 'team-1',
    role: PlayerRole.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repository = new PlayerRepository();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return player by id', async () => {
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => mockPlayer,
      });
      (PlayerModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findById('player-1');

      expect(PlayerModel.findById).toHaveBeenCalledWith('player-1');
      expect(result).toEqual(mockPlayer);
    });

    it('should return null if player not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findById as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByTeamId', () => {
    it('should return all players in a team', async () => {
      const mockExec = jest.fn().mockResolvedValue([
        { toObject: () => mockPlayer },
      ]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByTeamId('team-1');

      expect(PlayerModel.find).toHaveBeenCalledWith({ teamId: 'team-1' });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockPlayer);
    });

    it('should return empty array if no players in team', async () => {
      const mockExec = jest.fn().mockResolvedValue([]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByTeamId('empty-team');

      expect(result).toEqual([]);
    });
  });

  describe('findByUserId', () => {
    it('should return all players for a user', async () => {
      const mockExec = jest.fn().mockResolvedValue([
        { toObject: () => mockPlayer },
      ]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByUserId('user-1');

      expect(PlayerModel.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmail', () => {
    it('should return players by email', async () => {
      const mockExec = jest.fn().mockResolvedValue([
        { toObject: () => mockPlayer },
      ]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findByEmail('test@example.com');

      expect(PlayerModel.find).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findInvitedByTeamIdAndEmail', () => {
    it('should return invited player', async () => {
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => mockPlayer,
      });
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findInvitedByTeamIdAndEmail(
        'team-1',
        'test@example.com'
      );

      expect(PlayerModel.findOne).toHaveBeenCalledWith({
        teamId: 'team-1',
        email: 'test@example.com',
      });
      expect(result).toEqual(mockPlayer);
    });

    it('should return null if invitation not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findInvitedByTeamIdAndEmail(
        'team-1',
        'nonexistent@example.com'
      );

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and return new player', async () => {
      const playerInput = {
        name: 'New Player',
        teamId: 'team-1',
      };
      (PlayerModel.create as jest.Mock).mockResolvedValue({
        toObject: () => ({ ...playerInput, _id: 'new-id' }),
      });

      const result = await repository.create(playerInput);

      expect(PlayerModel.create).toHaveBeenCalledWith(playerInput);
      expect(result.name).toBe('New Player');
    });
  });

  describe('update', () => {
    it('should update and return updated player', async () => {
      const updates = { role: PlayerRole.ADMIN };
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => ({ ...mockPlayer, ...updates }),
      });
      (PlayerModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.update('player-1', updates);

      expect(PlayerModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'player-1',
        updates,
        { new: true }
      );
      expect(result?.role).toBe(PlayerRole.ADMIN);
    });

    it('should return null if player not found during update', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.update('nonexistent', {});

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete player and return true', async () => {
      const mockExec = jest.fn().mockResolvedValue(mockPlayer);
      (PlayerModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.delete('player-1');

      expect(PlayerModel.findByIdAndDelete).toHaveBeenCalledWith('player-1');
      expect(result).toBe(true);
    });

    it('should return false if player not found', async () => {
      const mockExec = jest.fn().mockResolvedValue(null);
      (PlayerModel.findByIdAndDelete as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('countByTeamId', () => {
    it('should return count of players in team', async () => {
      const mockExec = jest.fn().mockResolvedValue(5);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.countByTeamId('team-1');

      expect(PlayerModel.countDocuments).toHaveBeenCalledWith({
        teamId: 'team-1',
      });
      expect(result).toBe(5);
    });
  });

  describe('findTeamOwner', () => {
    it('should return team owner', async () => {
      const owner = { ...mockPlayer, role: PlayerRole.OWNER };
      const mockExec = jest.fn().mockResolvedValue({
        toObject: () => owner,
      });
      (PlayerModel.findOne as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findTeamOwner('team-1');

      expect(PlayerModel.findOne).toHaveBeenCalledWith({
        teamId: 'team-1',
        role: 'OWNER',
      });
      expect(result?.role).toBe(PlayerRole.OWNER);
    });
  });

  describe('findAdminsByTeamId', () => {
    it('should return all admins and owner in team', async () => {
      const mockExec = jest.fn().mockResolvedValue([
        { toObject: () => mockPlayer },
      ]);
      (PlayerModel.find as jest.Mock).mockReturnValue({ exec: mockExec });

      const result = await repository.findAdminsByTeamId('team-1');

      expect(PlayerModel.find).toHaveBeenCalledWith({
        teamId: 'team-1',
        role: { $in: ['ADMIN', 'OWNER'] },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('existsInvitation', () => {
    it('should return true if invitation exists', async () => {
      const mockExec = jest.fn().mockResolvedValue(1);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.existsInvitation(
        'team-1',
        'test@example.com'
      );

      expect(result).toBe(true);
    });

    it('should return false if invitation does not exist', async () => {
      const mockExec = jest.fn().mockResolvedValue(0);
      (PlayerModel.countDocuments as jest.Mock).mockReturnValue({
        exec: mockExec,
      });

      const result = await repository.existsInvitation(
        'team-1',
        'nonexistent@example.com'
      );

      expect(result).toBe(false);
    });
  });
});
