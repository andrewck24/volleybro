import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import { Team, type Lineup } from "@/entities/team";
import {
  TeamDocument,
  Team as TeamModel,
} from "@/infrastructure/db/mongoose/schemas/team";
import {
  toLineupDoc,
  toTeam,
  type RawTeam,
} from "@/infrastructure/db/repositories/team.mapping.mongo";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";
import { Types } from "mongoose";

const fromDocument = (doc: TeamDocument): Team =>
  toTeam(doc.toObject() as RawTeam);

export class TeamRepositoryImpl implements ITeamRepository {
  async findById(id: string): Promise<Team | null> {
    try {
      const doc = await TeamModel.findById(id).exec();
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(
    data: Omit<Team, "id" | "createdAt" | "updatedAt">,
  ): Promise<Team> {
    try {
      const doc = await TeamModel.create({
        ...data,
        lineups: data.lineups.map((lineup) => toLineupDoc(lineup)),
      });
      return fromDocument(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, updates: Partial<Team>): Promise<Team> {
    try {
      const doc = await TeamModel.findByIdAndUpdate(id, updates, {
        new: true,
      }).exec();
      if (!doc)
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The team to update was not found",
        );
      return fromDocument(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]> {
    try {
      const doc = await TeamModel.findByIdAndUpdate(
        teamId,
        { lineups: lineups.map((lineup) => toLineupDoc(lineup)) },
        { new: true },
      ).exec();
      if (!doc)
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The team to update lineups was not found",
        );
      return fromDocument(doc).lineups;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async removePlayerFromLineups(
    teamId: string,
    playerId: string,
  ): Promise<void> {
    try {
      const objectId = new Types.ObjectId(playerId);
      // A starting slot is a court position, so it empties in place; liberos
      // and substitutes are plain lists. One update cannot $set and $pull the
      // same array, hence separate operations in one ordered bulk write.
      await TeamModel.bulkWrite([
        {
          updateOne: {
            filter: { _id: teamId },
            update: {
              $set: {
                "lineups.$[].starting.$[slot].playerId": null,
                "lineups.$[].starting.$[startingSub].sub.playerId": null,
                "lineups.$[].liberos.$[liberoSub].sub.playerId": null,
                "lineups.$[].substitutes.$[benchSub].sub.playerId": null,
              },
            },
            arrayFilters: [
              { "slot.playerId": objectId },
              { "startingSub.sub.playerId": objectId },
              { "liberoSub.sub.playerId": objectId },
              { "benchSub.sub.playerId": objectId },
            ],
          },
        },
        {
          updateOne: {
            filter: { _id: teamId },
            update: {
              $pull: {
                "lineups.$[].liberos": { playerId: objectId },
                "lineups.$[].substitutes": { playerId: objectId },
              },
            },
          },
        },
        {
          // Pipeline, since the bound is another field: the editor's libero-count cap.
          updateOne: {
            filter: { _id: teamId },
            update: [
              {
                $set: {
                  lineups: {
                    $map: {
                      input: "$lineups",
                      in: {
                        $mergeObjects: [
                          "$$this",
                          {
                            options: {
                              $mergeObjects: [
                                "$$this.options",
                                {
                                  liberoReplaceMode: {
                                    $min: [
                                      {
                                        $ifNull: [
                                          "$$this.options.liberoReplaceMode",
                                          0,
                                        ],
                                      },
                                      {
                                        $size: {
                                          $ifNull: ["$$this.liberos", []],
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ]);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
