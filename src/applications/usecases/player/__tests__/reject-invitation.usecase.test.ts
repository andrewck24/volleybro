import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { RejectInvitationUseCase } from "@/applications/usecases/player/reject-invitation.usecase";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";

describe("RejectInvitationUseCase", () => {
  let usecase: RejectInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const emailInvitedPlayer: Player = {
    _id: "player-1",
    name: "test",
    teamId: "team-1",
    status: PlayerStatus.INVITED,
    email: "test@example.com",
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
      findByTeamIdAndUserId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
      linkUserToInvitations: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    usecase = new RejectInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to NONE and clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(emailInvitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...emailInvitedPlayer,
      status: PlayerStatus.NONE,
      email: undefined,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.findById).toHaveBeenCalledWith("player-1");
    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });
  });

  it("should reject userId-based invitation and clear userId", async () => {
    const userIdInvitedPlayer: Player = {
      ...emailInvitedPlayer,
      email: undefined,
      userId: "user-1",
    };
    mockPlayerRepository.findById.mockResolvedValue(userIdInvitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...userIdInvitedPlayer,
      status: PlayerStatus.NONE,
      userId: undefined,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });
  });

  it("should throw error if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute("nonexistent", "user-1")).rejects.toThrow(
      "Player record not found",
    );
  });

  it("should throw error if player status is not INVITED", async () => {
    const nonePlayer: Player = {
      ...emailInvitedPlayer,
      status: PlayerStatus.NONE,
      email: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(usecase.execute("player-1", "user-1")).rejects.toThrow(
      "No invitation found for this player",
    );
  });

  it("should preserve role when rejecting invitation", async () => {
    const adminInvite: Player = {
      ...emailInvitedPlayer,
      role: PlayerRole.ADMIN,
    };
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue({
      ...adminInvite,
      status: PlayerStatus.NONE,
      email: undefined,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.NONE,
      email: undefined,
      userId: undefined,
    });
  });
});
