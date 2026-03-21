import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { RejectInvitationUseCase } from "@/applications/usecases/player/reject-invitation.usecase";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";
import { NotFoundError, AuthorizationError } from "@/entities/errors/app-error";

describe("RejectInvitationUseCase", () => {
  let usecase: RejectInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  const invitedPlayer: Player = {
    _id: "player-1",
    name: "test",
    teamId: "team-1",
    status: PlayerStatus.INVITED,
    userId: "user-1",
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
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
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

  it("should throw error if userId does not match invited recipient", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

    await expect(usecase.execute("player-1", "wrong-user")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(mockPlayerRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute("nonexistent", "user-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("should throw error if player status is not INVITED", async () => {
    const nonePlayer: Player = {
      ...invitedPlayer,
      status: PlayerStatus.NONE,
      email: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(usecase.execute("player-1", "user-1")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("should preserve role when rejecting invitation", async () => {
    const adminInvite: Player = {
      ...invitedPlayer,
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
