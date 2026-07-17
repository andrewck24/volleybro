import {
  createMockPlayerRepository,
  createMockProfileRepository,
  createMockTeamRepository,
  createPlayer,
  createProfile,
} from "@/__tests__/helpers";
import type { ILeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import { LeaveTeamUseCase } from "@/applications/usecases/player/leave-team.usecase";
import {
  AuthorizationError,
  NotFoundError,
  UnexpectedError,
} from "@/entities/errors";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { beforeEach, describe, expect, it } from "@jest/globals";

describe("LeaveTeamUseCase", () => {
  let useCase: ILeaveTeamUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;
  let mockProfileRepository: ReturnType<typeof createMockProfileRepository>;

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockTeamRepository = createMockTeamRepository();
    mockProfileRepository = createMockProfileRepository();
    useCase = new LeaveTeamUseCase(
      mockPlayerRepository,
      mockTeamRepository,
      mockProfileRepository,
    );
  });

  describe("execute", () => {
    it("should set status to NONE and clear userId when leaving", async () => {
      const player = createPlayer({
        id: "player_123",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
      });

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue({
        ...player,
        status: PlayerStatus.NONE,
        userId: undefined,
      });
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
      mockProfileRepository.findByUserId.mockResolvedValue(
        createProfile({ userId: "user_456", activeTeamId: "team_789" }),
      );
      mockProfileRepository.updateActiveTeamId.mockResolvedValue(null);

      const result = await useCase.execute({
        playerId: "player_123",
        userId: "user_456",
      });

      expect(result).toEqual({ success: true });
    });

    it("should not clear activeTeamId if it points to a different team", async () => {
      const player = createPlayer({
        id: "player_123",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
      });

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue({
        ...player,
        status: PlayerStatus.NONE,
        userId: undefined,
      });
      mockTeamRepository.removePlayerFromLineups.mockResolvedValue();
      mockProfileRepository.findByUserId.mockResolvedValue(
        createProfile({ userId: "user_456", activeTeamId: "other_team" }),
      );

      await useCase.execute({ playerId: "player_123", userId: "user_456" });

      expect(mockProfileRepository.updateActiveTeamId).not.toHaveBeenCalled();
    });

    it("should reject if player not found", async () => {
      mockPlayerRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId: "player_999", userId: "user_456" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("should reject if user does not own the player", async () => {
      const player = createPlayer({
        id: "player_123",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_999",
      });

      mockPlayerRepository.findById.mockResolvedValue(player);

      await expect(
        useCase.execute({ playerId: "player_123", userId: "user_456" }),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should reject if owner tries to leave the team", async () => {
      const owner = createPlayer({
        id: "player_123",
        name: "Team Owner",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
        role: PlayerRole.OWNER,
      });

      mockPlayerRepository.findById.mockResolvedValue(owner);

      await expect(
        useCase.execute({ playerId: "player_123", userId: "user_456" }),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it("should reject if update fails", async () => {
      const player = createPlayer({
        id: "player_123",
        teamId: "team_789",
        status: PlayerStatus.JOINED,
        userId: "user_456",
      });

      mockPlayerRepository.findById.mockResolvedValue(player);
      mockPlayerRepository.update.mockResolvedValue(null);

      await expect(
        useCase.execute({ playerId: "player_123", userId: "user_456" }),
      ).rejects.toBeInstanceOf(UnexpectedError);
    });
  });
});
