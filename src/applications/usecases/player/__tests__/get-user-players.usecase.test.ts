import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import {
  createInvitedPlayer,
  createPlayer,
  createTeam,
} from "@test/support/fixtures/entities";
import { GetUserPlayersUseCase } from "@/applications/usecases/player/get-user-players.usecase";
import { PlayerRole, PlayerStatus } from "@/entities/player";

describe("GetUserPlayersUseCase", () => {
  let usecase: GetUserPlayersUseCase;
  let mockPlayerRepository: ReturnType<typeof createMockPlayerRepository>;
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  const email = "alice@example.com";

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
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toEqual([
      { ...mockPlayers[0], teamName: "Team team-1" },
      { ...mockPlayers[1], teamName: "Team team-2" },
    ]);
  });

  it("should keep the entry with no teamName when its team cannot be found", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );
    mockTeamRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.teamName === undefined)).toBe(true);
  });

  it("should return empty array if user has no players", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue([]);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toEqual([]);
  });

  it("finds the players held under the normalized address", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockImplementation(
      async (_userId, address) => (address === email ? mockPlayers : []),
    );

    const result = await usecase.execute({
      userId: "user-1",
      email: "  Alice@Example.COM ",
    });

    expect(result).toHaveLength(2);
  });

  it("links a waiting email invitation and returns it as linked", async () => {
    const invited = createInvitedPlayer({
      id: "player-3",
      teamId: "team-3",
      email,
    });
    const linked = createInvitedPlayer({
      id: "player-3",
      teamId: "team-3",
      userId: "user-1",
    });
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue([
      ...mockPlayers,
      invited,
    ]);
    let linkedRows = false;
    mockPlayerRepository.linkUserToInvitations.mockImplementation(
      async (address) => {
        linkedRows = address === email;
        return linkedRows ? 1 : 0;
      },
    );
    mockPlayerRepository.findByUserId.mockImplementation(async () =>
      linkedRows ? [...mockPlayers, linked] : mockPlayers,
    );

    const result = await usecase.execute({
      userId: "user-1",
      email: "  Alice@Example.COM ",
    });

    expect(result).toHaveLength(3);
    expect(result[2]).toMatchObject({ id: "player-3", userId: "user-1" });
    expect(result[2]).not.toHaveProperty("email");
  });

  it("does not link when no email invitation is waiting", async () => {
    mockPlayerRepository.findByUserIdOrInvitedEmail.mockResolvedValue(
      mockPlayers,
    );

    mockPlayerRepository.findByUserId.mockResolvedValue([]);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toHaveLength(mockPlayers.length);
  });
});
