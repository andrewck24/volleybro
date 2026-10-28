import {
  createPlayer,
  createInvitedPlayer,
  createTeam,
} from "@test/support/fixtures/entities";
import {
  createMockPlayerRepository,
  createMockTeamRepository,
} from "@test/support/doubles/repositories";
import { TransferOwnershipUseCase } from "../transfer-ownership.usecase";
import {
  CommonReason,
  PlayerReason,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "@/entities/errors";
import { PlayerRole } from "@/entities/player";

describe("TransferOwnershipUseCase", () => {
  const owner = createPlayer({
    id: "owner",
    teamId: "team",
    userId: "user",
    role: PlayerRole.ADMIN,
  });
  const target = createPlayer({
    id: "target",
    teamId: "team",
    role: PlayerRole.ADMIN,
  });
  const team = createTeam({ id: "team", ownerPlayerId: owner.id });
  const input = { teamId: "team", userId: "user", newOwnerId: "target" };
  const players = createMockPlayerRepository();
  const teams = createMockTeamRepository();
  const useCase = new TransferOwnershipUseCase(players, teams);

  beforeEach(() => {
    jest.resetAllMocks();
    teams.findById.mockResolvedValue(team);
    players.findByTeamIdAndUserId.mockResolvedValue(owner);
    players.findById.mockResolvedValue(target);
    teams.transferOwnership.mockResolvedValue({
      ...team,
      ownerPlayerId: target.id,
    });
  });
  it("returns the updated team", async () => {
    expect(await useCase.execute(input)).toMatchObject({
      ownerPlayerId: target.id,
    });
  });
  it("refuses a missing team", async () => {
    teams.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toMatchObject({
      reason: CommonReason.RESOURCE_NOT_FOUND,
    });
  });
  it.each([
    null,
    createInvitedPlayer({ id: "owner", teamId: "team" }),
    createPlayer({ id: "other", teamId: "team" }),
  ])("refuses a caller who is not the joined owner", async (caller) => {
    players.findByTeamIdAndUserId.mockResolvedValue(caller);
    await expect(useCase.execute(input)).rejects.toMatchObject({
      reason: PlayerReason.NOT_TEAM_OWNER,
    });
  });
  it.each([
    [null, PlayerReason.PLAYER_NOT_FOUND, NotFoundError],
    [
      { ...target, teamId: "other" },
      PlayerReason.TARGET_NOT_IN_TEAM,
      NotFoundError,
    ],
    [owner, PlayerReason.TARGET_ALREADY_OWNER, ConflictError],
    [
      createInvitedPlayer({ id: "target", teamId: "team" }),
      PlayerReason.TARGET_NOT_MEMBER,
      ConflictError,
    ],
    [
      { ...target, role: PlayerRole.MEMBER },
      PlayerReason.TRANSFER_TARGET_NOT_ADMIN,
      ValidationError,
    ],
    [
      { ...target, role: PlayerRole.OWNER },
      PlayerReason.TRANSFER_TARGET_NOT_ADMIN,
      ValidationError,
    ],
  ])("refuses an invalid target: %s", async (candidate, reason, errorType) => {
    players.findById.mockResolvedValue(candidate);
    const attempt = useCase.execute(input);
    await expect(attempt).rejects.toBeInstanceOf(errorType);
    await expect(attempt).rejects.toMatchObject({ reason });
  });
  it("refuses when ownership changed before the write", async () => {
    teams.transferOwnership.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toMatchObject({
      reason: PlayerReason.NOT_TEAM_OWNER,
    });
  });
});
