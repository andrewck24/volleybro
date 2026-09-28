import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Position, type Lineup } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { TYPES } from "@/infrastructure/di/types";
import { Types } from "mongoose";

import { lineupFor, oid } from "../support/seed";

const repo = () => container.get<ITeamRepository>(TYPES.TeamRepository);

describe("removing a player from a team's lineups", () => {
  const removed = oid();
  const libero = oid();
  const benchA = oid();
  const benchB = oid();
  let ids: string[];
  let teamId: string;

  beforeEach(async () => {
    ids = Array.from({ length: 6 }, oid);
    const starting = lineupFor(ids).starting;
    starting[1] = { ...starting[1]!, id: removed };
    starting[3] = { ...starting[3]!, sub: { id: removed, entryIndex: {} } };
    const lineup: Lineup = {
      ...lineupFor(ids),
      options: { ...lineupFor(ids).options, liberoReplaceMode: 2 },
      starting,
      liberos: [
        { id: removed, position: Position.L },
        {
          id: libero,
          position: Position.L,
          sub: { id: removed, entryIndex: {} },
        },
      ],
      substitutes: [{ id: benchA }, { id: removed }, { id: benchB }],
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
      liberos.find((player) => player.id === libero)!.sub?.id ?? null,
    ).toBeNull();
  });

  it("drops the player from the libero and substitute lists, which have no fixed slots", async () => {
    const { liberos, substitutes } = await read();

    expect(liberos.map((player) => player.id)).toEqual([libero]);
    expect(substitutes.map((player) => player.id)).toEqual([benchA, benchB]);
  });

  it("lowers the libero replacement mode when fewer liberos remain", async () => {
    const { options, liberos } = await read();

    expect(liberos).toHaveLength(1);
    expect(options.liberoReplaceMode).toBeLessThanOrEqual(1);
  });
});

describe("removing a player from a lineup stored without a libero mode", () => {
  it("leaves the mode at none rather than raising it to the libero count", async () => {
    const [removed, libero] = [oid(), oid()];
    const team = await repo().create({ name: "Legacy Team", lineups: [] });
    await repo().updateLineups(team.id, [
      {
        ...lineupFor(Array.from({ length: 6 }, oid)),
        liberos: [
          { id: removed, position: Position.L },
          { id: libero, position: Position.L },
        ],
      },
    ]);
    await TeamModel.collection.updateOne(
      { _id: new Types.ObjectId(team.id) },
      { $unset: { "lineups.0.options.liberoReplaceMode": "" } },
    );

    await repo().removePlayerFromLineups(team.id, removed);

    const [lineup] = (await repo().findById(team.id))!.lineups;
    expect(lineup!.options.liberoReplaceMode).toBe(0);
  });
});

describe("creating a team with lineups", () => {
  it("stores the lineup's players", async () => {
    const ids = Array.from({ length: 6 }, oid);
    const team = await repo().create({
      name: "Seeded Team",
      lineups: [lineupFor(ids)],
    });

    const [lineup] = (await repo().findById(team.id))!.lineups;
    expect(lineup!.starting.map((player) => player.id)).toEqual(ids);
  });
});
