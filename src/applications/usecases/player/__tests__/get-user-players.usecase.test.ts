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
import { PlayerRole, PlayerStatus, type Player } from "@/entities/player";

const isInvitedTo = (player: Player, email: string) =>
  player.status === PlayerStatus.INVITED && player.email === email;

/** The player port over a rows array, so a test sees the state a call leaves behind. */
const inMemoryPlayers = (rows: Player[]) => {
  const repository = createMockPlayerRepository();
  repository.findByUserId.mockImplementation(async (userId) =>
    rows.filter((p) => "userId" in p && p.userId === userId),
  );
  repository.findByUserIdOrInvitedEmail.mockImplementation(
    async (userId, email) =>
      rows.filter(
        (p) => ("userId" in p && p.userId === userId) || isInvitedTo(p, email),
      ),
  );
  repository.linkUserToInvitations.mockImplementation(async (email, userId) => {
    let linked = 0;
    rows.forEach((p, i) => {
      if (!isInvitedTo(p, email)) return;
      const { email: _email, ...rest } = p as Player & { email: string };
      rows[i] = { ...rest, userId } as Player;
      linked += 1;
    });
    return linked;
  });
  return repository;
};

describe("GetUserPlayersUseCase", () => {
  let mockTeamRepository: ReturnType<typeof createMockTeamRepository>;

  const email = "alice@example.com";
  const mine = [
    createPlayer({ id: "player-1", teamId: "team-1", userId: "user-1" }),
    createPlayer({
      id: "player-2",
      teamId: "team-2",
      userId: "user-1",
      role: PlayerRole.ADMIN,
    }),
  ];
  const othersSeat = createPlayer({ id: "player-9", userId: "user-2" });
  const otherAddress = createInvitedPlayer({
    id: "player-8",
    teamId: "team-8",
    email: "bob@example.com",
  });
  const waiting = createInvitedPlayer({
    id: "player-3",
    teamId: "team-3",
    email,
  });

  const build = (rows: Player[]) => {
    const players = inMemoryPlayers(rows);
    return {
      players,
      usecase: new GetUserPlayersUseCase(players, mockTeamRepository),
    };
  };

  beforeEach(() => {
    mockTeamRepository = createMockTeamRepository();
    mockTeamRepository.findById.mockImplementation(async (id: string) =>
      createTeam({ id, name: `Team ${id}` }),
    );
  });

  it("returns the user's seats with their teamName, and no one else's", async () => {
    const { usecase } = build([...mine, othersSeat, otherAddress]);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toEqual([
      { ...mine[0], teamName: "Team team-1" },
      { ...mine[1], teamName: "Team team-2" },
    ]);
  });

  it("keeps the entry with no teamName when its team cannot be found", async () => {
    const { usecase } = build([...mine]);
    mockTeamRepository.findById.mockResolvedValue(null);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(result).toHaveLength(2);
    expect(result.every((p) => p.teamName === undefined)).toBe(true);
  });

  it("returns an empty list when the user has no seats", async () => {
    const { usecase } = build([othersSeat, otherAddress]);

    expect(await usecase.execute({ userId: "user-1", email })).toEqual([]);
  });

  it("links the invitation to this user, leaves other rows alone, and returns the linked seat", async () => {
    const rows: Player[] = [...mine, othersSeat, otherAddress, waiting];
    const { usecase } = build(rows);

    const result = await usecase.execute({
      userId: "user-1",
      email: "  Alice@Example.COM ",
    });

    const held = rows.find((p) => p.id === "player-3");
    expect(held).toMatchObject({ userId: "user-1" });
    expect(held).not.toHaveProperty("email");
    expect(rows.find((p) => p.id === "player-9")).toBe(othersSeat);
    expect(rows.find((p) => p.id === "player-8")).toBe(otherAddress);
    expect(result.map((p) => p.id).sort()).toEqual([
      "player-1",
      "player-2",
      "player-3",
    ]);
    expect(result.find((p) => p.id === "player-3")).toMatchObject({
      userId: "user-1",
      teamName: "Team team-3",
    });
  });

  it("makes one repository query and no link or re-read when no invitation is waiting", async () => {
    const rows: Player[] = [...mine, othersSeat, otherAddress];
    const snapshot = [...rows];
    const { usecase, players } = build(rows);

    const result = await usecase.execute({ userId: "user-1", email });

    expect(rows).toEqual(snapshot);
    expect(result.map((p) => p.id)).toEqual(["player-1", "player-2"]);
    expect(players.findByUserIdOrInvitedEmail).toHaveBeenCalledTimes(1);
    expect(players.linkUserToInvitations).not.toHaveBeenCalled();
    expect(players.findByUserId).not.toHaveBeenCalled();
  });
});
