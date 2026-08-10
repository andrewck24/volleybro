import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import { Player, PlayerRole, PlayerStatus } from "@/entities/player";
import {
  PlayerModel,
  type PlayerDocument,
} from "@/infrastructure/db/mongoose/schemas/player";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";

export class PlayerRepositoryImpl implements IPlayerRepository {
  private toPlayer(doc: PlayerDocument): Player {
    const obj = doc.toObject();
    return {
      ...obj,
      id: obj._id.toString(),
      teamId: obj.teamId?.toString(),
      userId: obj.userId?.toString(),
    };
  }

  async findById(id: string): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findById(id).exec();
      return doc ? this.toPlayer(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({ teamId }).exec();
      return docs.map((doc) => this.toPlayer(doc));
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByUserId(userId: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({ userId }).exec();
      return docs.map((doc) => this.toPlayer(doc));
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByEmail(email: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({ email }).exec();
      return docs.map((doc) => this.toPlayer(doc));
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findInvitedByTeamIdAndEmail(
    teamId: string,
    email: string,
  ): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findOne({ teamId, email }).exec();
      return doc ? this.toPlayer(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(
    player: Omit<Player, "id" | "createdAt" | "updatedAt">,
  ): Promise<Player> {
    try {
      const newPlayer = await PlayerModel.create(player);
      return this.toPlayer(newPlayer);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, updates: Partial<Player>): Promise<Player> {
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, string> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) {
        $unset[key] = "";
      } else {
        $set[key] = value;
      }
    }

    const updateOps: Record<string, unknown> = {};
    if (Object.keys($set).length > 0) updateOps.$set = $set;
    if (Object.keys($unset).length > 0) updateOps.$unset = $unset;

    try {
      const updated = await PlayerModel.findByIdAndUpdate(id, updateOps, {
        new: true,
      }).exec();
      if (!updated) {
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The player to update was not found",
        );
      }
      return this.toPlayer(updated);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await PlayerModel.findByIdAndDelete(id).exec();
      return !!result;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async countByTeamId(teamId: string): Promise<number> {
    try {
      return await PlayerModel.countDocuments({ teamId }).exec();
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findTeamOwner(teamId: string): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findOne({
        teamId,
        role: PlayerRole.OWNER,
      }).exec();
      return doc ? this.toPlayer(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findAdminsByTeamId(teamId: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({
        teamId,
        role: { $in: [PlayerRole.ADMIN, PlayerRole.OWNER] },
      }).exec();
      return docs.map((doc) => this.toPlayer(doc));
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async existsInvitation(teamId: string, email: string): Promise<boolean> {
    try {
      const count = await PlayerModel.countDocuments({
        teamId,
        email,
        status: PlayerStatus.INVITED,
      }).exec();
      return count > 0;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByTeamIdAndUserId(
    teamId: string,
    userId: string,
  ): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findOne({ teamId, userId }).exec();
      return doc ? this.toPlayer(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async linkUserToInvitations(email: string, userId: string): Promise<number> {
    try {
      const result = await PlayerModel.updateMany(
        { email, status: PlayerStatus.INVITED },
        {
          $set: { userId, status: PlayerStatus.INVITED },
          $unset: { email: "" },
        },
      );
      return result.modifiedCount;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
