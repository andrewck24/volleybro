import { Position, type Lineup } from "@/entities/team";
import {
  toLineupDoc,
  toTeam,
  type RawTeam,
} from "@/infrastructure/db/repositories/team.mapping.mongo";
import { Team as TeamModel } from "@/infrastructure/db/mongoose/schemas/team";
import { Types } from "mongoose";

const playerHexId = "64b000000000000000000001";
const subHexId = "64b000000000000000000002";

const options = {
  liberoReplaceMode: 0 as const,
  liberoReplacePosition: Position.NONE as const,
};

describe("team document mapping", () => {
  it("writes a filled slot as an ObjectId and an empty slot as an object with a null playerId", () => {
    const lineup: Lineup = {
      options,
      starting: [
        {
          id: playerHexId,
          position: Position.OH,
          sub: { id: subHexId, entryIndex: { in: 2 } },
        },
        { id: null },
      ],
      liberos: [],
      substitutes: [],
    };

    const { starting } = toLineupDoc(lineup);

    expect(starting[0]!.playerId).toEqual(new Types.ObjectId(playerHexId));
    expect(starting[0]!.sub!.playerId).toEqual(new Types.ObjectId(subHexId));
    expect(starting[1]).toMatchObject({ playerId: null });
  });

  it("reads stored ids back to the domain id and an empty slot to a null id", () => {
    const stored = {
      _id: new Types.ObjectId(),
      name: "Team",
      lineups: [
        {
          options,
          starting: [
            {
              playerId: new Types.ObjectId(playerHexId),
              position: "OH",
              sub: { playerId: new Types.ObjectId(subHexId) },
            },
            { playerId: null },
          ],
          liberos: [],
          substitutes: [],
        },
      ],
    } as unknown as RawTeam;

    const team = toTeam(stored);

    const [lineup] = team.lineups;
    expect(lineup!.starting[0]).toMatchObject({
      id: playerHexId,
      position: Position.OH,
      sub: { id: subHexId, entryIndex: {} },
    });
    expect(lineup!.starting[1]!.id).toBeNull();
  });

  it("maps a stored lineup id out of teams and does not generate ids for new lineups", () => {
    const stored = {
      _id: new Types.ObjectId(),
      name: "Team",
      lineups: [
        {
          _id: new Types.ObjectId(),
          options,
          starting: [],
          liberos: [],
          substitutes: [],
        },
      ],
    } as unknown as RawTeam;

    const [lineup] = toTeam(stored).lineups;
    const created = new TeamModel({
      name: "Team",
      lineups: [{ options, starting: [], liberos: [], substitutes: [] }],
    }).toObject();

    expect(lineup).not.toHaveProperty("_id");
    expect(created.lineups[0]).not.toHaveProperty("_id");
  });

  it("reads a team stored without lineups as an empty list", () => {
    const stored = { _id: new Types.ObjectId(), name: "Team" } as RawTeam;

    expect(toTeam(stored).lineups).toEqual([]);
  });
});
