import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Position, type Lineup } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { lineupFor, oid } from "./support/seed";

const repo = () => container.get<ITeamRepository>(TYPES.TeamRepository);

describe("removing a player from a team's lineups", () => {
  let teamId: string;
  let ids: string[];
  let removed: string;

  beforeEach(async () => {
    ids = Array.from({ length: 10 }, oid);
    removed = oid();
    const base = lineupFor(ids);
    const lineup: Lineup = {
      ...base,
      starting: base.starting.map((player, i) =>
        i === 1
          ? { ...player, id: removed }
          : i === 3
            ? { ...player, sub: { id: removed, entryIndex: {} } }
            : player,
      ),
      liberos: [
        { id: removed, position: Position.L },
        {
          id: ids[6],
          position: Position.L,
          sub: { id: removed, entryIndex: {} },
        },
      ],
      substitutes: [{ id: ids[7] }, { id: removed }, { id: ids[8] }],
    };
    const team = await repo().create({ name: "Lineup Team", lineups: [] });
    teamId = team.id;
    await repo().updateLineups(teamId, [lineup]);

    await repo().removePlayerFromLineups(teamId, removed);
  });

  const read = async () => (await repo().findById(teamId))!.lineups[0]!;

  it("empties the starting slot in place, so every other player keeps their slot", async () => {
    const { starting } = await read();

    expect(starting.map((player) => player.id)).toEqual([
      ids[0],
      null,
      ids[2],
      ids[3],
      ids[4],
      ids[5],
    ]);
    expect(starting[1]!.position).toBe(Position.MB);
  });

  it("clears the player where they appear only as a sub", async () => {
    const { starting, liberos } = await read();

    expect(starting[3]!.id).toBe(ids[3]);
    expect(starting[3]!.sub?.id ?? null).toBeNull();
    expect(
      liberos.find((player) => player.id === ids[6])!.sub?.id ?? null,
    ).toBeNull();
  });

  it("drops the player from the libero and substitute lists, which have no fixed slots", async () => {
    const { liberos, substitutes } = await read();

    expect(liberos.map((player) => player.id)).toEqual([ids[6]]);
    expect(substitutes.map((player) => player.id)).toEqual([ids[7], ids[8]]);
  });
});
