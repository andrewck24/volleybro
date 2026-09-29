import { EntryType, MoveType, Side, type Game } from "@/entities/game";
import {
  toGame,
  toGameDoc,
  type RawGame,
} from "@/infrastructure/db/repositories/game.mapping.mongo";
import { Types } from "mongoose";

const playerHexId = "64b000000000000000000001";
const inHexId = "64b000000000000000000002";
const teamHexId = "64b0000000000000000000aa";

describe("game document mapping", () => {
  it("toGame exposes a snapshot's player id as id, not playerId", () => {
    const stored = {
      _id: new Types.ObjectId(),
      teamId: new Types.ObjectId(teamHexId),
      win: false,
      teams: {
        home: {
          name: "Home",
          players: [
            {
              playerId: new Types.ObjectId(playerHexId),
              name: "P1",
              number: 1,
            },
          ],
          staffs: [],
        },
        away: { name: "Away", players: [], staffs: [] },
      },
      sets: [],
    } as unknown as RawGame;

    const game = toGame(stored);

    expect(game.teamId).toBe(teamHexId);
    const [snapshot] = game.teams.home.players ?? [];
    expect(snapshot).toMatchObject({ id: playerHexId, name: "P1" });
    expect(snapshot).not.toHaveProperty("playerId");
  });

  it("toGameDoc stores client ids as playerId and drops the entity id", () => {
    const domainGame = {
      id: "ignored",
      win: false,
      teamId: teamHexId,
      teams: {
        home: {
          id: teamHexId,
          name: "Home",
          players: [{ id: playerHexId, name: "P1", number: 1 }],
          staffs: [],
        },
        away: { id: teamHexId, name: "Away", players: [], staffs: [] },
      },
      sets: [
        {
          win: null,
          lineups: {
            home: {
              options: { liberoReplaceMode: 0, liberoReplacePosition: "" },
              starting: [{ id: playerHexId, position: "OH" }, { id: null }],
              liberos: [],
              substitutes: [],
            },
          },
          entries: [
            {
              type: EntryType.RALLY,
              win: true,
              home: {
                score: 1,
                type: MoveType.ATTACK,
                num: 1,
                player: { id: playerHexId, zone: 4 },
              },
              away: { score: 0, type: MoveType.ATTACK, num: 1 },
            },
            {
              type: EntryType.SUBSTITUTION,
              team: Side.HOME,
              players: { in: inHexId, out: "" },
            },
          ],
        },
      ],
    } as unknown as Game;

    const doc = toGameDoc(domainGame) as unknown as {
      id?: string;
      teams: { home: { players: Record<string, unknown>[] } };
      sets: {
        lineups: { home: { starting: Record<string, unknown>[] } };
        entries: unknown[];
      }[];
    };

    expect(doc.id).toBeUndefined();
    const [player] = doc.teams.home.players;
    expect(player).toMatchObject({ playerId: playerHexId, name: "P1" });
    expect(player).not.toHaveProperty("id");

    const { starting } = doc.sets[0]!.lineups.home;
    expect(starting[0]!.playerId).toBe(playerHexId);
    expect(starting[1]!.playerId).toBeNull();

    const [rally, substitution] = doc.sets[0]!.entries as [
      { home: { player: Record<string, unknown> } },
      { players: { in: string | null; out: string | null } },
    ];
    expect(rally.home.player).toEqual({ playerId: playerHexId, zone: 4 });
    expect(substitution.players).toEqual({ in: inHexId, out: null });
  });
});
