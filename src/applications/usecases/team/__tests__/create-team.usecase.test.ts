import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import { createMockTransactionRunner } from "@test/support/doubles/services";
import { createTeam } from "@test/support/fixtures/entities";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
import { CreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";

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

  it("rethrows the owner error so the transaction can roll the team back", async () => {
    const ownerError = new Error("owner write failed");
    mockTeamRepository.create.mockResolvedValue(mockTeam);
    mockPlayerRepository.create.mockRejectedValue(ownerError);

    await expect(useCase.execute(input)).rejects.toBe(ownerError);
  });
});
