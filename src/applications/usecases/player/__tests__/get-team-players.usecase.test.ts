import {
  createInvitedPlayer,
  createMockPlayerRepository,
  createPlayer,
  createUnlinkedPlayer,
} from "@/__tests__/helpers";
import { GetTeamPlayersUseCase } from "@/applications/usecases/player/get-team-players.usecase";
import { PlayerStatus } from "@/entities/player";

describe("GetTeamPlayersUseCase", () => {
  let usecase: GetTeamPlayersUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;

  const teamPlayers = [
    createPlayer({ id: "player-1", name: "Member User" }),
    createInvitedPlayer({
      id: "player-2",
      name: "invited",
      email: "invited@example.com",
    }),
    createUnlinkedPlayer({ id: "player-3", name: "Unlinked Player" }),
  ];

  beforeEach(() => {
    mockPlayerRepository = createMockPlayerRepository();
    usecase = new GetTeamPlayersUseCase(mockPlayerRepository);
  });

  it("should return all players in team", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute({ teamId: "team-1" });

    expect(result).toEqual(teamPlayers);
  });

  it("should return empty array if team has no players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue([]);

    const result = await usecase.execute({ teamId: "team-1" });

    expect(result).toEqual([]);
  });

  it("should include members, invitees, and unlinked players", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute({ teamId: "team-1" });

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      status: PlayerStatus.JOINED,
      userId: "user-1",
    });
    expect(result[1]).toMatchObject({
      status: PlayerStatus.INVITED,
      email: "invited@example.com",
    });
    expect(result[1]).not.toHaveProperty("userId");
    expect(result[2]).toMatchObject({ status: PlayerStatus.NONE });
    expect(result[2]).not.toHaveProperty("email");
    expect(result[2]).not.toHaveProperty("role");
  });

  it("should include all player information", async () => {
    mockPlayerRepository.findByTeamId.mockResolvedValue(teamPlayers);

    const result = await usecase.execute({ teamId: "team-1" });

    result.forEach((player) => {
      expect(player.id).toBeDefined();
      expect(player.name).toBeDefined();
      expect(player.teamId).toBe("team-1");
      expect(player.createdAt).toBeDefined();
      expect(player.updatedAt).toBeDefined();
    });
  });
});
