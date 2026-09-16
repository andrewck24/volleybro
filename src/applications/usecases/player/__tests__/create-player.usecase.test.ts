import {
  createInvitedPlayer,
  createMockAuthorizationService,
  createMockPlayerRepository,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import type { ICreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import { CreatePlayerUseCase } from "@/applications/usecases/player/create-player.usecase";
import { ConflictError } from "@/entities/errors";
import { PlayerRole, PlayerStatus, Position } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CreatePlayerUseCase", () => {
  let useCase: ICreatePlayerUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  const teamId = "team_123";
  const userId = "user_456";

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new CreatePlayerUseCase(mockPlayerRepository, mockAuthService);
  });

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
    });

    it("creates an invitee holding only a lowercased, trimmed email", async () => {
      const created = createInvitedPlayer({
        id: "player_invited_001",
        teamId,
        email: "wang@example.com",
        role: PlayerRole.ADMIN,
      });

      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
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
      expect(
        mockPlayerRepository.findInvitedByTeamIdAndEmail,
      ).toHaveBeenCalledWith(teamId, "wang@example.com");
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

    it("does not link the invitation to an account", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
      mockPlayerRepository.create.mockResolvedValue(createInvitedPlayer());

      await useCase.execute({
        teamId,
        data: { name: "王小明", email: "wang@example.com" },
        userId,
      });

      expect(mockPlayerRepository.create).toHaveBeenCalledWith(
        expect.not.objectContaining({ userId: expect.anything() }),
      );
    });

    it("defaults an invitee's role to MEMBER", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.findInvitedByTeamIdAndEmail.mockResolvedValue(null);
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
        useCase.execute({ teamId, data: { name: "Test Player" }, userId }),
      ).rejects.toThrow("User not authorized");
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });

    it("should reject if email already invited in team", async () => {
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
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
      ).rejects.toBeInstanceOf(ConflictError);
      expect(mockPlayerRepository.create).not.toHaveBeenCalled();
    });
  });
});
