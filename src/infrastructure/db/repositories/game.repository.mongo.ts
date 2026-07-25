import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import { EntryType, type Game, type GameSummary } from "@/entities/game";
import {
  GameDocument,
  Game as GameModel,
} from "@/infrastructure/db/mongoose/schemas/game";
import { translateRepositoryError } from "@/infrastructure/db/repositories/repository-helpers.mongo";
import mongoose, { type Types } from "mongoose";

/** Raw (persisted) shapes returned by `doc.toObject()`, before id mapping. */
type RawRef = Types.ObjectId | null | undefined;
type RawLineupPlayer = {
  playerId?: RawRef;
  position?: string;
  sub?: { playerId?: RawRef; entryIndex?: { in?: number; out?: number } };
};
type RawLineup = {
  options?: unknown;
  starting?: RawLineupPlayer[];
  liberos?: RawLineupPlayer[];
  substitutes?: RawLineupPlayer[];
};
type RawSnapshot = { playerId?: RawRef } & Record<string, unknown>;
type RawTeam = {
  players?: RawSnapshot[];
  staffs?: RawSnapshot[];
  lineup?: RawLineup;
} & Record<string, unknown>;
type RawRallyDetail = {
  player?: { playerId?: RawRef; zone?: number };
} & Record<string, unknown>;
type RawEntry = {
  type?: EntryType;
  home?: RawRallyDetail;
  away?: RawRallyDetail;
  players?: { in?: RawRef; out?: RawRef };
} & Record<string, unknown>;
type RawSet = {
  lineups?: { home?: RawLineup; away?: RawLineup };
  entries?: RawEntry[];
} & Record<string, unknown>;

export class GameRepositoryImpl implements IGameRepository {
  private readonly model = GameModel;

  // --- read mapping: persisted playerId -> domain id ---

  private mapLineupPlayerRead(p: RawLineupPlayer) {
    return {
      id: p?.playerId?.toString() ?? null,
      position: p?.position,
      sub: p?.sub
        ? {
            id: p.sub.playerId?.toString() ?? null,
            entryIndex: p.sub.entryIndex ?? {},
          }
        : undefined,
    };
  }

  private toLineupRead(lineup: RawLineup | undefined) {
    if (!lineup) return lineup;
    return {
      ...lineup,
      starting: (lineup.starting ?? []).map((p) => this.mapLineupPlayerRead(p)),
      liberos: (lineup.liberos ?? []).map((p) => this.mapLineupPlayerRead(p)),
      substitutes: (lineup.substitutes ?? []).map((p) =>
        this.mapLineupPlayerRead(p),
      ),
    };
  }

  private mapSnapshotRead(snapshot: RawSnapshot) {
    const { playerId, ...rest } = snapshot;
    return { ...rest, id: playerId?.toString() ?? null };
  }

  private mapTeamRead(team: RawTeam | undefined) {
    if (!team) return team;
    return {
      ...team,
      players: (team.players ?? []).map((p) => this.mapSnapshotRead(p)),
      staffs: (team.staffs ?? []).map((s) => this.mapSnapshotRead(s)),
      lineup: team.lineup ? this.toLineupRead(team.lineup) : team.lineup,
    };
  }

  private mapRallyDetailRead(detail: RawRallyDetail | undefined) {
    if (!detail?.player) return detail;
    return {
      ...detail,
      player: {
        id: detail.player.playerId?.toString() ?? null,
        zone: detail.player.zone,
      },
    };
  }

  private mapEntryRead(entry: RawEntry) {
    if (entry?.type === EntryType.RALLY) {
      return {
        ...entry,
        home: this.mapRallyDetailRead(entry.home),
        away: this.mapRallyDetailRead(entry.away),
      };
    }
    if (entry?.type === EntryType.SUBSTITUTION && entry.players) {
      return {
        ...entry,
        players: {
          in: entry.players.in?.toString() ?? entry.players.in,
          out: entry.players.out?.toString() ?? entry.players.out,
        },
      };
    }
    return entry;
  }

  private mapSetRead(set: RawSet) {
    return {
      ...set,
      lineups: {
        home: this.toLineupRead(set.lineups?.home),
        away: set.lineups?.away
          ? this.toLineupRead(set.lineups.away)
          : set.lineups?.away,
      },
      entries: (set.entries ?? []).map((e) => this.mapEntryRead(e)),
    };
  }

  private toGame(doc: GameDocument): Game {
    const obj = doc.toObject() as {
      _id: Types.ObjectId;
      teamId: Types.ObjectId;
      teams?: { home?: RawTeam; away?: RawTeam };
      sets?: RawSet[];
    } & Record<string, unknown>;
    return {
      ...obj,
      id: obj._id.toString(),
      teamId: obj.teamId.toString(),
      teams: {
        home: this.mapTeamRead(obj.teams?.home),
        away: this.mapTeamRead(obj.teams?.away),
      },
      sets: (obj.sets ?? []).map((s) => this.mapSetRead(s)),
    } as unknown as Game;
  }

  // --- write mapping: domain id -> persisted playerId (Mongoose casts) ---

  private mapLineupPlayerWrite(p: {
    id?: string | null;
    position?: string;
    sub?: { id?: string; entryIndex?: { in?: number; out?: number } };
  }) {
    return {
      playerId: p?.id ?? null,
      position: p?.position,
      sub: p?.sub
        ? { playerId: p.sub.id ?? null, entryIndex: p.sub.entryIndex }
        : undefined,
    };
  }

  private toLineupWrite<
    T extends {
      starting?: unknown[];
      liberos?: unknown[];
      substitutes?: unknown[];
    },
  >(lineup: T | undefined) {
    if (!lineup) return lineup;
    const map = (arr: unknown[] | undefined) =>
      (arr ?? []).map((p) =>
        this.mapLineupPlayerWrite(
          p as Parameters<typeof this.mapLineupPlayerWrite>[0],
        ),
      );
    return {
      ...lineup,
      starting: map(lineup.starting),
      liberos: map(lineup.liberos),
      substitutes: map(lineup.substitutes),
    };
  }

  private mapSnapshotWrite(
    snapshot: { id?: string | null } & Record<string, unknown>,
  ) {
    const { id, ...rest } = snapshot;
    return { ...rest, playerId: id ?? null };
  }

  private mapTeamWrite(
    team:
      | (Record<string, unknown> & {
          players?: unknown[];
          staffs?: unknown[];
          lineup?: {
            starting?: unknown[];
            liberos?: unknown[];
            substitutes?: unknown[];
          };
        })
      | undefined,
  ) {
    if (!team) return team;
    return {
      ...team,
      players: (team.players ?? []).map((p) =>
        this.mapSnapshotWrite(
          p as { id?: string | null } & Record<string, unknown>,
        ),
      ),
      staffs: (team.staffs ?? []).map((s) =>
        this.mapSnapshotWrite(
          s as { id?: string | null } & Record<string, unknown>,
        ),
      ),
      lineup: team.lineup ? this.toLineupWrite(team.lineup) : team.lineup,
    };
  }

  private mapRallyDetailWrite(detail: unknown) {
    const d = detail as
      | ({ player?: { id?: string | null; zone?: number } } & Record<
          string,
          unknown
        >)
      | undefined;
    if (!d?.player) return d;
    return {
      ...d,
      player: { playerId: d.player.id ?? null, zone: d.player.zone },
    };
  }

  private mapEntryWrite(entry: Record<string, unknown> & { type?: EntryType }) {
    // Substitution `players.in/out` keep their field names; Mongoose casts the
    // hex strings to ObjectId on the declared paths. Only rally detail needs the
    // `player.id -> player.playerId` rename.
    if (entry?.type === EntryType.RALLY) {
      return {
        ...entry,
        home: this.mapRallyDetailWrite(entry.home),
        away: this.mapRallyDetailWrite(entry.away),
      };
    }
    return entry;
  }

  private mapSetWrite(
    set: Record<string, unknown> & {
      lineups?: {
        home?: { starting?: unknown[] };
        away?: { starting?: unknown[] };
      };
      entries?: unknown[];
    },
  ) {
    return {
      ...set,
      lineups: set.lineups
        ? {
            home: this.toLineupWrite(
              set.lineups.home as Parameters<typeof this.toLineupWrite>[0],
            ),
            away: set.lineups.away
              ? this.toLineupWrite(
                  set.lineups.away as Parameters<typeof this.toLineupWrite>[0],
                )
              : set.lineups.away,
          }
        : set.lineups,
      entries: (set.entries ?? []).map((e) =>
        this.mapEntryWrite(e as Record<string, unknown> & { type?: EntryType }),
      ),
    };
  }

  private toGameDoc(data: Partial<Game>) {
    const { id: _id, ...rest } = data;
    void _id;
    const doc: Record<string, unknown> = { ...rest };
    if (data.teams) {
      doc.teams = {
        home: this.mapTeamWrite(
          data.teams.home as unknown as Parameters<typeof this.mapTeamWrite>[0],
        ),
        away: this.mapTeamWrite(
          data.teams.away as unknown as Parameters<typeof this.mapTeamWrite>[0],
        ),
      };
    }
    if (data.sets) {
      doc.sets = data.sets.map((s) =>
        this.mapSetWrite(
          s as unknown as Parameters<typeof this.mapSetWrite>[0],
        ),
      );
    }
    return doc;
  }

  async findById(id: string): Promise<Game | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? this.toGame(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(data: Omit<Game, "id">): Promise<Game> {
    try {
      const doc = await this.model.create(this.toGameDoc(data) as object);
      return this.toGame(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    try {
      const doc = await this.model
        .findByIdAndUpdate(
          id,
          { $set: this.toGameDoc(data) },
          { returnDocument: "after" },
        )
        .exec();
      if (!doc)
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The game to update was not found",
        );
      return this.toGame(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.model.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findGameSummaries(
    teamId: string,
    options: { lastId?: string; limit?: number } = {},
  ): Promise<{ data: GameSummary[]; hasMore: boolean; lastId: string }> {
    try {
      const { lastId, limit = 10 } = options;
      const teamObjectId = new mongoose.Types.ObjectId(teamId);

      const matchFilter: Record<string, unknown> = { teamId: teamObjectId };
      if (lastId && /^[0-9a-fA-F]{24}$/.test(lastId)) {
        matchFilter._id = { $lt: new mongoose.Types.ObjectId(lastId) };
      }

      const results = await this.model
        .aggregate<GameSummary>([
          { $match: matchFilter },
          { $sort: { _id: -1 } },
          { $limit: limit + 1 },
          {
            $addFields: {
              setLastRallies: {
                $map: {
                  input: "$sets",
                  as: "set",
                  in: {
                    $let: {
                      vars: {
                        rallies: {
                          $filter: {
                            input: "$$set.entries",
                            as: "entry",
                            cond: { $eq: ["$$entry.type", EntryType.RALLY] },
                          },
                        },
                      },
                      in: { $arrayElemAt: ["$$rallies", -1] },
                    },
                  },
                },
              },
              setResults: {
                $map: {
                  input: "$sets",
                  as: "set",
                  in: "$$set.win",
                },
              },
            },
          },
          {
            $addFields: {
              "teams.home.scores": {
                $map: {
                  input: "$setLastRallies",
                  as: "lastRally",
                  in: "$$lastRally.home.score",
                },
              },
              "teams.away.scores": {
                $map: {
                  input: "$setLastRallies",
                  as: "lastRally",
                  in: "$$lastRally.away.score",
                },
              },
              "teams.home.sets": {
                $size: {
                  $filter: {
                    input: "$setResults",
                    as: "win",
                    cond: { $eq: ["$$win", true] },
                  },
                },
              },
              "teams.away.sets": {
                $size: {
                  $filter: {
                    input: "$setResults",
                    as: "win",
                    cond: { $eq: ["$$win", false] },
                  },
                },
              },
            },
          },
          {
            $project: {
              id: { $toString: "$_id" },
              win: 1,
              info: 1,
              "teams.home.id": { $toString: "$teams.home._id" },
              "teams.home.name": 1,
              "teams.home.sets": 1,
              "teams.home.scores": 1,
              "teams.away.id": { $toString: "$teams.away._id" },
              "teams.away.name": 1,
              "teams.away.sets": 1,
              "teams.away.scores": 1,
            },
          },
        ])
        .exec();

      const hasMore = results.length > limit;
      const data = hasMore ? results.slice(0, limit) : results;

      return {
        data,
        hasMore,
        // length checked > 0, so the last element is present
        lastId: data.length > 0 ? data[data.length - 1]!.id : (lastId ?? ""),
      };
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
