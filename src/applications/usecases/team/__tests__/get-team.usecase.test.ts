import {
  createMockAuthorizationService,
  createMockTeamRepository,
  createTeam,
} from "@/__tests__/helpers";
import { GetTeamUseCase } from "@/applications/usecases/team/get-team.usecase";
import { AuthorizationError, AuthReason } from "@/entities/errors";
import { PlayerRole } from "@/entities/player";

describe("GetTeamUseCase", () => {
  let usecase: GetTeamUseCase;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;
  let mockAuthService: ReturnType<typeof createMockAuthorizationService>;

  const team = createTeam();

  beforeEach(() => {
    mockTeamRepository = createMockTeamRepository();
    mockAuthService = createMockAuthorizationService();
    mockAuthService.verifyTeamRole.mockResolvedValue();
    usecase = new GetTeamUseCase(mockTeamRepository, mockAuthService);
  });

  it("should require the caller to be a member of the team", async () => {
    mockTeamRepository.findById.mockResolvedValue(team);

    const result = await usecase.execute({
      teamId: "team-1",
      userId: "user-1",
    });

    expect(mockAuthService.verifyTeamRole).toHaveBeenCalledWith(
      "team-1",
      "user-1",
      PlayerRole.MEMBER,
    );
    expect(result).toEqual(team);
  });

  it("should reject a non-member without reading the team", async () => {
    mockAuthService.verifyTeamRole.mockRejectedValue(
      new AuthorizationError(
        AuthReason.NOT_TEAM_MEMBER,
        "User is not a member of this team",
      ),
    );

    await expect(
      usecase.execute({ teamId: "team-1", userId: "outsider" }),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(mockTeamRepository.findById).not.toHaveBeenCalled();
  });

  it("should return null for a team that does not exist", async () => {
    mockTeamRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({
      teamId: "team-1",
      userId: "user-1",
    });

    expect(result).toBeNull();
  });
});
