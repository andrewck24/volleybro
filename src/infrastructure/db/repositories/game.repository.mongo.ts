import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { EntryType, type Game, type GameSummary } from "@/entities/game";
import {
  GameDocument,
  Game as GameModel,
} from "@/infrastructure/db/mongoose/schemas/game";
import { translateRepositoryError } from "@/infrastructure/db/repositories/repository-helpers.mongo";
import mongoose from "mongoose";

export class GameRepositoryImpl implements IGameRepository {
  private readonly model = GameModel;

  private toGame(doc: GameDocument): Game {
    const obj = doc.toObject();
    return {
      ...obj,
      id: obj._id.toString(),
      teamId: obj.teamId.toString(),
    };
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
      const doc = await this.model.create(data as object);
      return this.toGame(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, data: Partial<Game>): Promise<Game> {
    try {
      const doc = await this.model
        .findByIdAndUpdate(id, { $set: data }, { new: true })
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
        lastId: data.length > 0 ? data[data.length - 1].id : (lastId ?? ""),
      };
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
