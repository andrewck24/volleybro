import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { UnexpectedError } from "@/entities/errors/app-error";
import { CreateTeamUseCase } from "../create-team.usecase";

describe("CreateTeamUseCase", () => {
  let useCase: CreateTeamUseCase;
  let mockTeamRepository: jest.Mocked<ITeamRepository>;
  let mockPlayerRepository: jest.Mocked<IPlayerRepository>;
  let mockProfileRepository: jest.Mocked<IProfileRepository>;

  const mockTeam = {
    _id: "team-1",
    name: "Test Team",
    lineups: [],
  };

  beforeEach(() => {
    mockTeamRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      removePlayerFromLineups: jest.fn(),
    } as any;

    mockPlayerRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByTeamId: jest.fn(),
      findByUserId: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findInvitedByTeamIdAndEmail: jest.fn(),
      findByTeamIdAndUserId: jest.fn(),
      linkUserToInvitations: jest.fn(),
    } as any;

    mockProfileRepository = {
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateActiveTeamId: jest.fn(),
    } as any;

    useCase = new CreateTeamUseCase(
      mockTeamRepository,
      mockPlayerRepository,
      mockProfileRepository,
    );
  });

  it("should create team, owner player, and update active team", async () => {
    mockTeamRepository.create.mockResolvedValue(mockTeam as any);
    mockPlayerRepository.create.mockResolvedValue({} as any);
    mockProfileRepository.updateActiveTeamId.mockResolvedValue(null);

    const result = await useCase.execute(
      { name: "Test Team", nickname: "TT" },
      "user-1",
      "John Doe",
    );

    expect(mockTeamRepository.create).toHaveBeenCalled();
    expect(mockPlayerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: "team-1", userId: "user-1" }),
    );
    expect(mockProfileRepository.updateActiveTeamId).toHaveBeenCalledWith(
      "user-1",
      "team-1",
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
