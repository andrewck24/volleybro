import {
  createMockAuthorizationService,
  createMockPlayerRepository,
  createPlayer,
} from "@/__tests__/helpers";
import { CancelInvitationUseCase } from "@/applications/usecases/player/cancel-invitation.usecase";
import type { ICancelInvitationUseCase } from "@/applications/usecases/player/cancel-invitation.usecase.interface";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors/app-error";
import { PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("CancelInvitationUseCase", () => {
  let useCase: ICancelInvitationUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockAuthService = createMockAuthorizationService();
    useCase = new CancelInvitationUseCase(
      mockPlayerRepository,
      mockAuthService,
    );
  });

  describe("execute", () => {
    it("should cancel invitation by setting status to NONE and clearing email/userId", async () => {
      const invitedPlayer = createPlayer({
        _id: "player_123",
        status: PlayerStatus.INVITED,
        email: "invited@example.com",
        teamId: "team_789",
      });

      const cancelledPlayer = {
        ...invitedPlayer,
        status: PlayerStatus.NONE,
        email: undefined,
        userId: undefined,
      };

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(cancelledPlayer);

      const result = await useCase.execute("player_123", "user_456");

      expect(result.email).toBeUndefined();
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute("player_999", "user_456"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if user is not team admin", async () => {
      const invitedPlayer = createPlayer({
        _id: "player_123",
        status: PlayerStatus.INVITED,
        email: "invited@example.com",
        teamId: "team_789",
      });

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockRejectedValue(
        new Error("User not authorized"),
      );

      await expect(useCase.execute("player_123", "user_456")).rejects.toThrow(
        "User not authorized",
      );
    });

    it("should reject if player status is not INVITED", async () => {
      const nonePlayer = createPlayer({
        _id: "player_123",
        status: PlayerStatus.NONE,
        teamId: "team_789",
      });

      mockPlayerRepository.findById.mockResolvedValue(nonePlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();

      await expect(
        useCase.execute("player_123", "user_456"),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("should reject if update fails", async () => {
      const invitedPlayer = createPlayer({
        _id: "player_123",
        status: PlayerStatus.INVITED,
        email: "invited@example.com",
        teamId: "team_789",
      });

      mockPlayerRepository.findById.mockResolvedValue(invitedPlayer);
      mockAuthService.verifyIsTeamAdmin.mockResolvedValue();
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute("player_123", "user_456"),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
