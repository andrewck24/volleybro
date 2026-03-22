import { createMockPlayerRepository, createPlayer } from "@/__tests__/helpers";
import { GetTeamPlayersUseCase } from "@/applications/usecases/player/get-team-players.usecase";

describe("GetTeamPlayersUseCase", () => {
  let usecase: GetTeamPlayersUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const teamPlayers = [
    createPlayer({
      _id: "player-1",
      name: "Member User",
      email: "member@example.com",
    }),
    createPlayer({
      _id: "player-2",
      name: "invited",
      email: "invited@example.com",
      userId: undefined,
    }),
    createPlayer({
      _id: "player-3",
      name: "Pure Player",
      email: undefined,
      userId: undefined,
      role: undefined,
    }),
  ];

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new GetTeamPlayersUseCase(mockPlayerRepository);
  });

  it("should return all players in team", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    expect(result).toEqual(teamPlayers);
  });

  it("should return empty array if team has no players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue([]);

    const result = await usecase.execute("team-1");

    expect(result).toEqual([]);
  });

  it("should include members, invitees, and pure players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    expect(result).toHaveLength(3);
    expect(result[0].userId).toBeDefined(); // Member
    expect(result[1].email).toBeDefined(); // Invitee
    expect(result[1].userId).toBeUndefined(); // Invitee
    expect(result[2].email).toBeUndefined(); // Pure player
    expect(result[2].userId).toBeUndefined(); // Pure player
  });

  it("should include all player information", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute("team-1");

    result.forEach((player) => {
      expect(player._id).toBeDefined();
      expect(player.name).toBeDefined();
      expect(player.teamId).toBe("team-1");
      expect(player.createdAt).toBeDefined();
      expect(player.updatedAt).toBeDefined();
    });
  });
});
