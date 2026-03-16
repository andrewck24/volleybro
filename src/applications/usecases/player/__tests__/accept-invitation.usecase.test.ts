import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { AcceptInvitationUseCase } from "@/applications/usecases/player/accept-invitation.usecase";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";

describe("AcceptInvitationUseCase", () => {
  let usecase: AcceptInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  // userId-linked invitation (after linkUserToInvitations or direct userId invite)
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

    usecase = new AcceptInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to JOINED and set userId, clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...invitedPlayer,
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.findById).toHaveBeenCalledWith("player-1");
    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });
  });

  it("should throw error if userId does not match invited recipient", async () => {
    mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);

    await expect(usecase.execute("player-1", "wrong-user")).rejects.toThrow(
      "User is not the invited recipient",
    );
    expect(mockPlayerRepository.update).not.toHaveBeenCalled();
  });

  it("should throw error if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute("nonexistent", "user-1")).rejects.toThrow(
      "Player record not found",
    );
  });

  it("should throw error if player is already JOINED", async () => {
    const joinedPlayer: Player = {
      ...invitedPlayer,
      status: PlayerStatus.JOINED,
      userId: "existing-user",
      email: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(joinedPlayer);

    await expect(usecase.execute("player-1", "user-1")).rejects.toThrow(
      "Player is already a joined member",
    );
  });

  it("should throw error if player status is NONE (no invitation)", async () => {
    const nonePlayer: Player = {
      ...invitedPlayer,
      status: PlayerStatus.NONE,
      email: undefined,
    };
    mockPlayerRepository.findById.mockResolvedValue(nonePlayer);

    await expect(usecase.execute("player-1", "user-1")).rejects.toThrow(
      "No invitation found for this player",
    );
  });

  it("should preserve role when accepting invitation", async () => {
    const adminInvite: Player = {
      ...invitedPlayer,
      role: PlayerRole.ADMIN,
    };
    mockPlayerRepository.findById.mockResolvedValue(adminInvite);
    mockPlayerRepository.update.mockResolvedValue({
      ...adminInvite,
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });
  });
});
