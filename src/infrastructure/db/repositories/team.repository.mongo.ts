import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import { Team, type Lineup, type LineupPlayer } from "@/entities/team";
import {
  TeamDocument,
  Team as TeamModel,
} from "@/infrastructure/db/mongoose/schemas/team";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";
import { Types } from "mongoose";

export class TeamRepositoryImpl implements ITeamRepository {
  private mapLineupPlayer(p: {
    playerId?: Types.ObjectId | null;
    position?: string;
    sub?: {
      playerId?: Types.ObjectId | null;
      entryIndex?: { in?: number; out?: number };
    };
  }): LineupPlayer {
    return {
      id: p.playerId?.toString() ?? null,
      position: p.position as LineupPlayer["position"],
      sub: p.sub
        ? {
            id: p.sub.playerId?.toString() ?? null,
            entryIndex: p.sub.entryIndex ?? {},
          }
        : undefined,
    };
  }

  private toLineupPlayerDoc(p: LineupPlayer) {
    return {
      playerId: p.id ? new Types.ObjectId(p.id) : null,
      position: p.position,
      sub: p.sub
        ? {
            playerId: p.sub.id ? new Types.ObjectId(p.sub.id) : null,
            entryIndex: p.sub.entryIndex,
          }
        : undefined,
    };
  }

  private toLineupDoc(lineup: Lineup) {
    return {
      options: lineup.options,
      starting: lineup.starting.map((p) => this.toLineupPlayerDoc(p)),
      liberos: lineup.liberos.map((p) => this.toLineupPlayerDoc(p)),
      substitutes: lineup.substitutes.map((p) => this.toLineupPlayerDoc(p)),
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
      return this.toTeam(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async updateLineups(teamId: string, lineups: Lineup[]): Promise<Lineup[]> {
    try {
      const doc = await TeamModel.findByIdAndUpdate(
        teamId,
        { lineups: lineups.map((lineup) => this.toLineupDoc(lineup)) },
        { new: true },
      ).exec();
      if (!doc)
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The team to update lineups was not found",
        );
      return this.toTeam(doc).lineups;
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
            "lineups.$[].starting": { playerId: objectId },
            "lineups.$[].liberos": { playerId: objectId },
            "lineups.$[].substitutes": { playerId: objectId },
          },
        },
      );
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
