import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Team, type LineupPlayer } from "@/entities/team";
import {
  TeamDocument,
  Team as TeamModel,
} from "@/infrastructure/db/mongoose/schemas/team";
import { translateRepositoryError } from "@/infrastructure/db/repositories/repository-helpers.mongo";
import { Types } from "mongoose";

export class TeamRepositoryImpl implements ITeamRepository {
  private mapLineupPlayer(p: {
    _id?: Types.ObjectId;
    position?: string;
    sub?: { _id?: Types.ObjectId; entryIndex?: { in?: number; out?: number } };
  }): LineupPlayer {
    return {
      id: p._id?.toString() ?? null,
      position: p.position as LineupPlayer["position"],
      sub: p.sub
        ? {
            id: p.sub._id?.toString() ?? "",
            entryIndex: p.sub.entryIndex ?? {},
          }
        : undefined,
    };
  }

  private toTeam(doc: TeamDocument): Team {
    type RawPlayer = Parameters<typeof this.mapLineupPlayer>[0];
    type RawLineup = {
      options: Team["lineups"][number]["options"];
      starting: RawPlayer[];
      liberos: RawPlayer[];
      substitutes: RawPlayer[];
    };
    const obj = doc.toObject() as {
      _id: Types.ObjectId;
      lineups?: RawLineup[];
    } & Omit<Team, "id" | "lineups">;
    return {
      ...obj,
      id: obj._id.toString(),
      lineups:
        obj.lineups?.map((lineup) => ({
          ...lineup,
          starting: lineup.starting.map((p) => this.mapLineupPlayer(p)),
          liberos: lineup.liberos.map((p) => this.mapLineupPlayer(p)),
          substitutes: lineup.substitutes.map((p) => this.mapLineupPlayer(p)),
        })) ?? [],
    };
  }

  async findById(id: string): Promise<Team | null> {
    try {
      const doc = await TeamModel.findById(id).exec();
      return doc ? this.toTeam(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(
    data: Omit<Team, "id" | "createdAt" | "updatedAt">,
  ): Promise<Team> {
    try {
      const doc = await TeamModel.create(data);
      return this.toTeam(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, updates: Partial<Team>): Promise<Team | null> {
    try {
      const doc = await TeamModel.findByIdAndUpdate(id, updates, {
        new: true,
      }).exec();
      return doc ? this.toTeam(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await TeamModel.findByIdAndDelete(id).exec();
      return !!result;
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
      await TeamModel.updateOne(
        { _id: teamId },
        {
          $pull: {
            "lineups.$[].starting": { _id: objectId },
            "lineups.$[].liberos": { _id: objectId },
            "lineups.$[].substitutes": { _id: objectId },
          },
        },
      );
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
