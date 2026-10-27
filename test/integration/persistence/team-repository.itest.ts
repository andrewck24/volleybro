import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { NotFoundError } from "@/entities/errors";
import { Position, type Lineup } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid } from "../support/seed";

const teams = () => container.get<ITeamRepository>(TYPES.TeamRepository);

describe("team reads and writes", () => {
  it("finds no team for an id nobody holds", async () => {
    expect(await teams().findById(oid())).toBeNull();
  });

  it("reads an id that is not an ObjectId as a team that does not exist", async () => {
    await expect(teams().findById("not-an-id")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("persists the fields an update changes and returns the stored team", async () => {
    const { id } = await teams().create({ name: "Before", lineups: [] });

    const updated = await teams().update(id, { name: "After" });

    expect(updated).toMatchObject({ id, name: "After" });
    expect(await teams().findById(id)).toMatchObject({ name: "After" });
  });

  it("refuses to update a team that does not exist", async () => {
    await expect(
      teams().update(oid(), { name: "Nobody" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(teams().updateLineups(oid(), [])).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("stores a lineup's player ids and keeps an empty slot as a slot", async () => {
    const { id } = await teams().create({ name: "Lineup", lineups: [] });
    const playerId = oid();
    const lineup: Lineup = {
      options: {
        liberoReplaceMode: 0,
        liberoReplacePosition: Position.NONE,
      },
      starting: [{ id: playerId, position: Position.OH }, { id: null }],
      liberos: [],
      substitutes: [],
    };

    const returned = await teams().updateLineups(id, [lineup]);
    const stored = (await teams().findById(id))!.lineups;

    for (const lineups of [returned, stored]) {
      expect(lineups[0]!.starting.map((slot) => slot.id)).toEqual([
        playerId,
        null,
      ]);
    }
  });
});
