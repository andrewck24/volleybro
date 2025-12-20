import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { CreateInvitationUseCase } from "@/applications/usecases/player/create-invitation.usecase";
import { PlayerRole } from "@/entities/player";

describe("CreateInvitationUseCase", () => {
  let usecase: CreateInvitationUseCase;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockAuthService: jest.Mocked<IAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = {
      findInvitedByTeamIdAndEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countByTeamId: jest.fn(),
      findTeamOwner: jest.fn(),
      findAdminsByTeamId: jest.fn(),
      existsInvitation: jest.fn(),
    } as jest.Mocked<IPlayerRepository>;

    mockAuthService = {
      verifyIsTeamAdmin: jest.fn(),
      verifyIsTeamOwner: jest.fn(),
      verifyPlayerRole: jest.fn(),
      getPlayerRole: jest.fn(),
      verifyTeamRole: jest.fn(),
    } as jest.Mocked<IAuthorizationService>;

    usecase = new CreateInvitationUseCase(
      mockPlayerRepository,
      mockAuthService,
    );
  });

  it("should create invitation when user is admin", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
    mockPlayerRepository.create.mockResolvedValue({
      _id: "player-1",
      name: "test",
      teamId: "team-1",
      email: "test@example.com",
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const playerId = await usecase.execute(
      "team-1",
      "test@example.com",
      PlayerRole.MEMBER,
      "admin-user",
    );

    expect(playerId).toBe("player-1");
    expect(mockAuthService.verifyIsTeamAdmin).toHaveBeenCalledWith(
      "team-1",
      "admin-user",
    );
    expect(mockPlayerRepository.create).toHaveBeenCalled();
  });

  it("should throw error if user is not admin", async () => {
    mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
      new Error("User is not admin of the team"),
    );

    await expect(
      usecase.execute(
        "team-1",
        "test@example.com",
        PlayerRole.MEMBER,
        "user-1",
      ),
    ).rejects.toThrow("User is not admin of the team");
  });

  it("should throw error if invitation already exists", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue({
      _id: "existing-player",
      name: "test",
      teamId: "team-1",
      email: "test@example.com",
      role: PlayerRole.MEMBER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      usecase.execute(
        "team-1",
        "test@example.com",
        PlayerRole.MEMBER,
        "admin-user",
      ),
    ).rejects.toThrow("Invitation already exists for this email");
  });

  it("should throw error if email is invalid", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);

    await expect(
      usecase.execute(
        "team-1",
        "invalid-email",
        PlayerRole.MEMBER,
        "admin-user",
      ),
    ).rejects.toThrow("Invalid email format");
  });

  it("should throw error if role is invalid", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);

    await expect(
      usecase.execute(
        "team-1",
        "test@example.com",
        "INVALID_ROLE",
        "admin-user",
      ),
    ).rejects.toThrow("Invalid role: INVALID_ROLE");
  });

  it("should lowercase email when creating invitation", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
    mockPlayerRepository.create.mockResolvedValue({
      _id: "player-1",
      name: "test",
      teamId: "team-1",
      email: "test@example.com",
      role: PlayerRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await usecase.execute(
      "team-1",
      "TEST@EXAMPLE.COM",
      PlayerRole.ADMIN,
      "admin-user",
    );

    expect(mockPlayerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "test@example.com",
      }),
    );
  });

  it("should assign ADMIN role when specified", async () => {
    mockAuthService.verifyIsTeamAdmin.mockResolvedValue(undefined);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
    mockPlayerRepository.create.mockResolvedValue({
      _id: "player-1",
      name: "test",
      teamId: "team-1",
      email: "test@example.com",
      role: PlayerRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await usecase.execute(
      "team-1",
      "test@example.com",
      PlayerRole.ADMIN,
      "admin-user",
    );

    expect(mockPlayerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: PlayerRole.ADMIN,
      }),
    );
  });
});
