import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import { createPlayer, createTeam } from "@test/support/fixtures/entities";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { CreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("CreateTeamUseCase", () => {
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  const mockTeam = createTeam();

  let useCase: CreateTeamUseCase;

  beforeEach(() => {
    mockTeamRepository = createMockTeamRepository();
    mockPlayerRepository = createMockPlayerRepository();
    useCase = new CreateTeamUseCase(mockTeamRepository, mockPlayerRepository);
  });

  it("creates the team with the caller as its joined owner", async () => {
    mockTeamRepository.create.mockResolvedValue(mockTeam);
    mockPlayerRepository.create.mockResolvedValue(createPlayer());

    const result = await useCase.execute({
      name: "Test Team",
      nickname: "TT",
      userId: "user-1",
      userName: "John Doe",
    });

    expect(result).toBe(mockTeam);
    expect(mockPlayerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: mockTeam.id,
        userId: "user-1",
        status: PlayerStatus.JOINED,
        role: PlayerRole.OWNER,
      }),
    );
  });

  describe("when the owner cannot be created", () => {
    const input = { name: "Test Team", userId: "user-1", userName: "John Doe" };
    const ownerError = new Error("owner write failed");

    beforeEach(() => {
      mockTeamRepository.create.mockResolvedValue(mockTeam);
      mockPlayerRepository.create.mockRejectedValue(ownerError);
    });

    it("deletes the new team and rethrows the owner error", async () => {
      mockTeamRepository.delete.mockResolvedValue();

      await expect(useCase.execute(input)).rejects.toBe(ownerError);
      expect(mockTeamRepository.delete).toHaveBeenCalledWith(mockTeam.id);
    });

    it("still rethrows the owner error when the delete also fails", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      mockTeamRepository.delete.mockRejectedValue(new Error("delete failed"));

      await expect(useCase.execute(input)).rejects.toBe(ownerError);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
