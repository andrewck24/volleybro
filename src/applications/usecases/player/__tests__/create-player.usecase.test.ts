import {
  createInvitedPlayer,
  createMockAuthorizationService,
  createMockPlayerRepository,
  createMockUserRepository,
  createPlayer,
  createUnlinkedPlayer,
  createUser,
} from "@/__tests__/helpers";
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

  /** No account holds the address, and nobody on the team was invited to it. */
  const unregistered = () => {
    mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([]);
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
      expect(
        mockUserRepository.findAllByEmailInsensitive,
      ).not.toHaveBeenCalled();
    });

    it("creates an invitee holding only a lowercased, trimmed email", async () => {
      const created = createInvitedPlayer({
        id: "player_invited_001",
        teamId,
        email: "wang@example.com",
        role: PlayerRole.ADMIN,
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      unregistered();
      mockPlayerRepository.create.mockResolvedValue(created);

      const result = await useCase.execute({
        teamId,
        data: {
          name: "王小明",
          email: "  Wang@Example.COM ",
          role: PlayerRole.ADMIN,
        },
        userId,
      });

      expect(result).toEqual(created);
      expect(mockUserRepository.findAllByEmailInsensitive).toHaveBeenCalledWith(
        "Wang@Example.COM",
      );
      expect(mockPlayerRepository.create).toHaveBeenCalledWith({
        name: "王小明",
        status: PlayerStatus.INVITED,
        number: undefined,
        position: undefined,
        teamId,
        email: "wang@example.com",
        role: PlayerRole.ADMIN,
      });
    });

    it("links the account when the email is already registered", async () => {
      const invitee = createUser({
        id: "user_invitee",
        email: "wang@example.com",
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([invitee]);
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
      unregistered();
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
      expect(
        mockUserRepository.findAllByEmailInsensitive,
      ).not.toHaveBeenCalled();
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it("rejects an account that already has a player on this team", async () => {
      const invitee = createUser({ id: "user_invitee" });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([invitee]);
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

    it("should reject if email already invited in team", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockUserRepository.findAllByEmailInsensitive.mockResolvedValue([]);
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
      ).rejects.toMatchObject({ reason: PlayerReason.ALREADY_ON_ROSTER });
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });
  });
});
