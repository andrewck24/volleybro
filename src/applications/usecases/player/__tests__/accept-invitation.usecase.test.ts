import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { AcceptInvitationUseCase } from "@/applications/usecases/player/accept-invitation.usecase";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";

describe("AcceptInvitationUseCase", () => {
  let usecase: AcceptInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;

  // Email-based invitation (unregistered user)
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

    usecase = new AcceptInvitationUseCase(mockPlayerRepository);
  });

  it("should transition status from INVITED to JOINED and set userId, clear email", async () => {
    mockPlayerRepository.findById.mockResolvedValue(emailInvitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...emailInvitedPlayer,
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

  it("should accept userId-based invitation (INVITED + userId)", async () => {
    const userIdInvitedPlayer: Player = {
      ...emailInvitedPlayer,
      email: undefined,
      userId: "user-1",
    };
    mockPlayerRepository.findById.mockResolvedValue(userIdInvitedPlayer);
    mockPlayerRepository.update.mockResolvedValue({
      ...userIdInvitedPlayer,
      status: PlayerStatus.JOINED,
    });

    await usecase.execute("player-1", "user-1");

    expect(mockPlayerRepository.update).toHaveBeenCalledWith("player-1", {
      status: PlayerStatus.JOINED,
      userId: "user-1",
      email: undefined,
    });
  });

  it("should throw error if player not found", async () => {
    mockPlayerRepository.findById.mockResolvedValue(null);

    await expect(usecase.execute("nonexistent", "user-1")).rejects.toThrow(
      "Player record not found",
    );
  });

  it("should throw error if player is already JOINED", async () => {
    const joinedPlayer: Player = {
      ...emailInvitedPlayer,
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
      ...emailInvitedPlayer,
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
      ...emailInvitedPlayer,
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
