import {
  createMockPlayerRepository,
  createMockTeamRepository,
  createPlayer,
  createTeam,
} from "@/__tests__/helpers";
import { GetUserPlayersUseCase } from "@/applications/usecases/player/get-user-players.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("GetUserPlayersUseCase", () => {
  let usecase: GetUserPlayersUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  const mockPlayers = [
    createPlayer({
      id: "player-1",
      name: "User",
      status: PlayerStatus.JOINED,
    }),
    createPlayer({
      id: "player-2",
      name: "User",
      teamId: "team-2",
      status: PlayerStatus.JOINED,
      role: PlayerRole.ADMIN,
    }),
  ];

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    mockTeamRepository = createMockTeamRepository();
    mockTeamRepository.findById.mockImplementation(async (id: string) =>
      createTeam({ id, name: `Team ${id}` }),
    );
    usecase = new GetUserPlayersUseCase(
      mockPlayerRepository,
      mockTeamRepository,
    );
  });

  it("should return all players for a user with their teamName", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result).toEqual([
      { ...mockPlayers[0], teamName: "Team team-1" },
      { ...mockPlayers[1], teamName: "Team team-2" },
    ]);
  });

  it("should keep the entry with no teamName when its team cannot be found", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);
    mockTeamRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.teamName === undefined)).toBe(true);
  });

  it("should return empty array if user has no players", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue([]);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result).toEqual([]);
  });

  it("should return multiple players for user", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result).toHaveLength(2);
    expect(result[0]!.teamId).toBe("team-1");
    expect(result[1]!.teamId).toBe("team-2");
  });

  it("should include both MEMBER and ADMIN roles", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result[0]).toMatchObject({ role: PlayerRole.MEMBER });
    expect(result[1]).toMatchObject({ role: PlayerRole.ADMIN });
  });

  it("should include status field in results", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute({ userId: "user-1" });

    expect(result.every((p) => p.status === PlayerStatus.JOINED)).toBe(true);
  });

  it("should include userId field in results", async () => {
    mockPlayerRepository.findByUserId.mockResolvedValue(mockPlayers);

    const result = await usecase.execute({ userId: "user-1" });

    expect(
      result.every(
        (p) => p.status === PlayerStatus.JOINED && p.userId === "user-1",
      ),
    ).toBe(true);
  });
});
