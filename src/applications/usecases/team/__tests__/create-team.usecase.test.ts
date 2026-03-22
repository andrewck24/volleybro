import {
  createMockPlayerRepository,
  createMockProfileRepository,
  createMockTeamRepository,
  createPlayer,
  createTeam,
} from "@/__tests__/helpers";
import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { CreateTeamUseCase } from "@/applications/usecases/team/create-team.usecase";
import { UnexpectedError } from "@/entities/errors/app-error";

describe("CreateTeamUseCase", () => {
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockProfileRepository: jest.Mocked<IProfileRepository>;
  const mockTeam = createTeam();

  let useCase: CreateTeamUseCase;

  beforeEach(() => {
    mockTeamRepository = createMockTeamRepository();
    mockPlayerRepository = createMockPlayerRepository();
    mockProfileRepository = createMockProfileRepository();
    useCase = new CreateTeamUseCase(
      mockTeamRepository,
      mockPlayerRepository,
      mockProfileRepository,
    );
  });

  it("should create team, owner player, and update active team", async () => {
    mockTeamRepository.create.mockResolvedValue(mockTeam);
    mockPlayerRepository.create.mockResolvedValue(createPlayer());
    mockProfileRepository.updateActiveTeamId.mockResolvedValue(null);

    const result = await useCase.execute(
      { name: "Test Team", nickname: "TT" },
      "user-1",
      "John Doe",
    );

    expect(result._id).toBe("team-1");
  });

  it("throws UnexpectedError when team creation returns null", async () => {
    mockTeamRepository.create.mockResolvedValue(null);

    await expect(
      useCase.execute({ name: "Test Team", nickname: "TT" }, "user-1", "John"),
    ).rejects.toBeInstanceOf(UnexpectedError);
  });
});
