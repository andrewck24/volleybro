import {
  createInvitedPlayer,
  createPlayer,
  createUnlinkedPlayer,
  createUser,
} from "@test/support/fixtures/entities";
import { createMockAuthorizationService } from "@test/support/doubles/services";
import {
  createMockPlayerRepository,
  createMockUserRepository,
} from "@test/support/doubles/repositories";
import type { ICreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import { CreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import { PlayerReason } from "@/entities/errors";
import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CreatePlayerUseCase", () => {
  let useCase: ICreatePlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockUserRepository: ReturnType<typeof createMockUserRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  const teamId = "team_123";
  const userId = "user_456";

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockUserRepository = createMockUserRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new CreatePlayerUseCase(
      mockPlayerRepository,
      mockUserRepository,
      mockAuthService,
    );
  });

  const noMatchingAccountOrInvitation = () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
  };

  describe("execute", () => {
    it("creates an unlinked player without a role when no email is given", async () => {
      const input = { name: "陳球員", number: 5, position: Position.MB };
      const created = createUnlinkedPlayer({ id: "player_new_001", teamId });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.create.mockResolvedValue(created);

      const result = await useCase.execute({ teamId, data: input, userId });

      expect(result).toEqual(created);
      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        name: "陳球員",
        status: PlayerStatus.NONE,
        number: 5,
        position: Position.MB,
        teamId,
      });
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it("creates an invitee holding only a lowercased, trimmed email", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      noMatchingAccountOrInvitation();
      mockPlayerRepository.create.mockImplementation(async (player) =>
        createInvitedPlayer({ teamId, ...player } as never),
      );

      const result = await useCase.execute({
        teamId,
        data: {
          name: "王小明",
          email: "  Wang@Example.COM ",
          role: PlayerRole.ADMIN,
        },
        userId,
      });

      expect(result).toMatchObject({
        name: "王小明",
        status: PlayerStatus.INVITED,
        email: "wang@example.com",
        role: PlayerRole.ADMIN,
      });
      expect(result).not.toHaveProperty("userId");
    });

    it("links the account that holds the normalized address", async () => {
      const invitee = createUser({
        id: "user_invitee",
        email: "wang@example.com",
      });
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockImplementation(async (address) =>
        address === "wang@example.com" ? invitee : null,
      );
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.create.mockImplementation(async (player) =>
        createInvitedPlayer({ teamId, ...player } as never),
      );

      const result = await useCase.execute({
        teamId,
        data: { name: "王小明", email: "  Wang@Example.COM " },
        userId,
      });

      expect(result).toMatchObject({ userId: invitee.id });
    });

    it("links the account when the email is already registered", async () => {
      const invitee = createUser({
        id: "user_invitee",
        email: "wang@example.com",
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(
        createInvitedPlayer({ teamId, userId: invitee.id }),
      );

      await useCase.execute({
        teamId,
        data: { name: "王小明", email: "Wang@example.com" },
        userId,
      });

      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PlayerStatus.INVITED,
          userId: invitee.id,
        }),
      );
      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ email: expect.anything() }),
      );
    });

    it("defaults an invitee's role to MEMBER", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      noMatchingAccountOrInvitation();
      mockPlayerRepository.create.mockResolvedValue(createInvitedPlayer());

      await useCase.execute({
        teamId,
        data: { name: "Test Player", email: "test@example.com" },
        userId,
      });

      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: PlayerRole.MEMBER }),
      );
    });

    it("should reject if user is not admin", async () => {
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User not authorized"),
      );

      await expect(
        useCase.execute({
          teamId,
          data: { name: "Test Player", email: "test@example.com" },
          userId,
        }),
      ).rejects.toThrow("User not authorized");
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an account that already has a player on this team", async () => {
      const invitee = createUser({ id: "user_invitee" });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(invitee);
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(
        createPlayer({ teamId, userId: invitee.id }),
      );

      await expect(
        useCase.execute({
          teamId,
          data: { name: "Test Player", email: "test@example.com" },
          userId,
        }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an account whose address this team already invited", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(
        createUser({ id: "user_invitee", email: "test@example.com" }),
      );
      mockPlayerRepository.findByTeamIdAndUserId.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(
        createInvitedPlayer({ teamId, email: "test@example.com" }),
      );

      await expect(
        useCase.execute({
          teamId,
          data: { name: "Test Player", email: "test@example.com" },
          userId,
        }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_INVITED });
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it("should reject if email already invited in team", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(
        createInvitedPlayer({
          id: "player_123",
          teamId,
          email: "test@example.com",
        }),
      );

      await expect(
        useCase.execute({
          teamId,
          data: { name: "Test Player", email: "test@example.com" },
          userId,
        }),
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_INVITED });
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });
  });
});
