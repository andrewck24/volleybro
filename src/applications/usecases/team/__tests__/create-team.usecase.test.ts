import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import { createMockTransactionRunner } from "@test/support/doubles/services";
import { createPlayer, createTeam } from "@test/support/fixtures/entities";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import { CreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("CreateTeamUseCase", () => {
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockTransactionRunner: jest.Mocked<ITransactionRunner>;
  const mockTeam = createTeam();
  const input = {
    name: "Test Team",
    nickname: "TT",
    userId: "user-1",
    userName: "John Doe",
  };

  let useCase: CreateTeamUseCase;

  beforeEach(() => {
    mockTeamRepository = createMockTeamRepository();
    mockPlayerRepository = createMockPlayerRepository();
    mockTransactionRunner = createMockTransactionRunner();
    useCase = new CreateTeamUseCase(
      mockTeamRepository,
      mockPlayerRepository,
      mockTransactionRunner,
    );
  });

  it("creates the team with the caller as its joined owner", async () => {
    const owned = { ...mockTeam, ownerPlayerId: "player-9" };
    mockTeamRepository.create.mockResolvedValue(mockTeam);
    mockPlayerRepository.create.mockResolvedValue(
      createPlayer({ id: "player-9" }),
    );
    mockTeamRepository.update.mockResolvedValue(owned);

    const result = await useCase.execute(input);

    expect(result).toBe(owned);
    expect(mockPlayerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: mockTeam.id,
        userId: "user-1",
        status: PlayerStatus.JOINED,
        role: PlayerRole.ADMIN,
      }),
    );
  });

  it("rethrows the owner error so the transaction can roll the team back", async () => {
    const ownerError = new Error("owner write failed");
    mockTeamRepository.create.mockResolvedValue(mockTeam);
    mockPlayerRepository.create.mockRejectedValue(ownerError);

    await expect(useCase.execute(input)).rejects.toBe(ownerError);
  });
});
