import type {
  EntryRef,
  IGameRepository,
} from "@/applications/repositories/game.repository.interface";
import {
  NotFoundError,
  ValidationError,
  CommonReason,
  GameReason,
} from "@/entities/errors";
import {
  EntryType,
  type Entry,
  type Game,
  type GameSummary,
  type Set,
} from "@/entities/game";
import {
  GameDocument,
  Game as GameModel,
} from "@/infrastructure/db/mongoose/schemas/game";
import {
  mapEntryRead,
  mapEntryWrite,
  toGame,
  toGameDoc,
  toLineupWrite,
  type RawGame,
  type RawSet,
} from "@/infrastructure/db/repositories/game.mapping.mongo";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";
import mongoose from "mongoose";

const fromDocument = (doc: GameDocument): Game =>
  toGame(doc.toObject() as RawGame);

export class GameRepositoryImpl implements IGameRepository {
  private readonly model = GameModel;

  async findById(id: string): Promise<Game | null> {
    try {
      const doc = await this.model.findById(id).exec();
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(data: Omit<Game, "id">): Promise<Game> {
    try {
      const doc = await this.model.create(toGameDoc(data) as object);
      return fromDocument(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    try {
      const doc = await this.model
        .findByIdAndUpdate(
          id,
          { $set: toGameDoc(data) },
          { returnDocument: "after" },
        )
        .exec();
      if (!doc)
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The game to update was not found",
        );
      return fromDocument(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  /**
   * A positional write touches one entry, so the guard has to keep the write
   * off a path that does not exist yet — an out-of-range index would otherwise
   * pad the array with nulls instead of failing.
   */
  private async writeToSet(
    { gameId, setIndex }: EntryRef,
    guardPath: string,
    update: Record<string, unknown>,
  ): Promise<Entry[]> {
    try {
      const doc = await this.model
        .findOneAndUpdate(
          { _id: gameId, [guardPath]: { $exists: true } },
          update,
          {
            returnDocument: "after",
            projection: { sets: { $slice: [setIndex, 1] } },
          },
        )
        .exec();
      if (doc) {
        const [set] =
          (doc.toObject() as unknown as { sets?: RawSet[] }).sets ?? [];
        return (set?.entries ?? []).map((e) =>
          mapEntryRead(e),
        ) as unknown as Entry[];
      }
      // The guard failed as a whole; one lookup says which half of it did.
      const game = await this.model.exists({ _id: gameId }).exec();
      throw game
        ? new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found")
        : new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  /**
   * One entry becomes two candidate operations, and exactly one lands: a
   * `$set` through an array filter when the identity already exists, or a
   * guarded `$push` when it does not. Both are ordinary updates rather than
   * an aggregation pipeline update, so Mongoose casting still applies.
   */
  async upsertEntry(
    ref: EntryRef,
    entries: Entry[],
    lineups?: Partial<Set["lineups"]>,
  ): Promise<Entry[]> {
    const { gameId, setIndex } = ref;
    const path = `sets.${setIndex}`;
    const guard = { _id: gameId, [path]: { $exists: true } };
    const setLineups = Object.entries(lineups ?? {}).map(
      ([side, lineup]) =>
        [
          `${path}.lineups.${side}`,
          toLineupWrite(
            lineup as unknown as Parameters<typeof toLineupWrite>[0],
          ),
        ] as const,
    );
    const lineupSet = setLineups.length
      ? Object.fromEntries(setLineups)
      : undefined;

    // `id: undefined` reaches Mongo as null, which the arrayFilters below
    // match against every other entry that also has none -- one edit would
    // overwrite all of them. Pre-identity documents make that reachable.
    const anonymous = entries.find(
      (entry) => typeof entry.id !== "string" || typeof entry.seq !== "number",
    );
    if (anonymous)
      throw new ValidationError(
        CommonReason.INVALID_INPUT,
        "An entry must carry an id and a seq to be written",
      );

    const ops = entries.flatMap((entry) => {
      const mapped = mapEntryWrite(entry);
      return [
        {
          updateOne: {
            filter: { ...guard, [`${path}.entries.id`]: entry.id },
            update: {
              $set: {
                [`${path}.entries.$[e]`]: mapped,
                ...lineupSet,
              },
            },
            arrayFilters: [{ "e.id": entry.id }],
          },
        },
        {
          updateOne: {
            filter: { ...guard, [`${path}.entries.id`]: { $ne: entry.id } },
            update: {
              $push: {
                [`${path}.entries`]: { $each: [mapped], $sort: { seq: 1 } },
              },
              ...(lineupSet && { $set: lineupSet }),
            },
          },
        },
      ];
    });

    try {
      if (ops.length) await this.model.bulkWrite(ops, { ordered: true });
    } catch (error) {
      throw translateRepositoryError(error);
    }

    try {
      const doc = await this.model
        .findOne(guard, { sets: { $slice: [setIndex, 1] } })
        .exec();
      if (!doc) {
        const game = await this.model.exists({ _id: gameId }).exec();
        throw game
          ? new NotFoundError(GameReason.SET_NOT_FOUND, "Set not found")
          : new NotFoundError(GameReason.GAME_NOT_FOUND, "Game not found");
      }
      const [set] =
        (doc.toObject() as unknown as { sets?: RawSet[] }).sets ?? [];
      return (set?.entries ?? []).map((e) => mapEntryRead(e)) as Entry[];
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async completeSet(
    ref: EntryRef,
    win: boolean | null,
    gameWin?: boolean | null,
  ): Promise<void> {
    const path = `sets.${ref.setIndex}`;
    await this.writeToSet(ref, path, {
      $set: {
        [`${path}.win`]: win,
        ...(gameWin !== undefined && { win: gameWin }),
      },
    });
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
