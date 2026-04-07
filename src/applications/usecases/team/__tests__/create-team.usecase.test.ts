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

    const result = await useCase.execute({
      name: "Test Team",
      nickname: "TT",
      userId: "user-1",
      userName: "John Doe",
    });

    expect(result.id).toBe("team-1");
  });
});
