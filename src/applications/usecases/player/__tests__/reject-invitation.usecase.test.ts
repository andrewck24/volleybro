import { RejectInvitationUseCase } from '../reject-invitation.usecase';
import { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { Player, PlayerRole } from '@/entities/player';

describe('RejectInvitationUseCase', () => {
  let usecase: RejectInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const invitedPlayer: Player = {
    _id: 'player-1',
    name: 'test',
    teamId: 'team-1',
    email: 'test@example.com',
    role: PlayerRole.MEMBER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPlayerRepository = {
      findById: jest.fn(),
      update: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
    } as any;

    usecase = new RejectInvitationUseCase(mockPlayerRepository);
  });

  it('should reject invitation and clear email', async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
      email: undefined,
    });

    await usecase.execute('player-1', 'user-1');

    expect(mockPlayerRepository.findById).toHaveBeenCalledWith('player-1');
    expect(mockPlayerRepository.update).toHaveBeenCalledWith('player-1', {
      email: undefined,
    });
  });

  it('should throw error if player not found', async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute('nonexistent', 'user-1')).rejects.toThrow(
      'Player record not found'
    );
  });

  it('should throw error if no invitation to reject', async () => {
    const purePlayer: Player = {
      ...invitedPlayer,
      email: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(purePlayer);

    await expect(usecase.execute('player-1', 'user-1')).rejects.toThrow(
      'No invitation found for this player'
    );
  });

  it('should preserve role when rejecting invitation', async () => {
    const adminInvite: Player = {
      ...invitedPlayer,
      role: PlayerRole.ADMIN,
    };
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue({
      ...adminInvite,
      email: undefined,
    });

    await usecase.execute('player-1', 'user-1');

    expect(mockPlayerRepository.update).toHaveBeenCalledWith('player-1', {
      email: undefined,
    });
  });

  it('should convert INVITED to PURE_PLAYER status', async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
      email: undefined,
    });

    await usecase.execute('player-1', 'user-1');

    // After update, email is cleared, converting INVITED -> PURE_PLAYER
    expect(mockPlayerRepository.update).toHaveBeenCalledWith('player-1', {
      email: undefined,
    });
  });
});
