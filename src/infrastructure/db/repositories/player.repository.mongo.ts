import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { NotFoundError, CommonReason } from "@/entities/errors";
import {
  NewPlayer,
  Player,
  PlayerFields,
  PlayerStatus,
} from "@/entities/player";
import {
  PlayerModel,
  type PlayerDocument,
} from "@/infrastructure/db/mongoose/schemas/player";
import {
  toPlayer,
  type RawPlayer,
  toPlayerUpdateOps,
} from "@/infrastructure/db/repositories/player.mapping.mongo";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";

const fromDocument = (doc: PlayerDocument): Player =>
  toPlayer(doc.toObject() as RawPlayer);

export class PlayerRepositoryImpl implements IPlayerRepository {
  async findById(id: string): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findById(id).exec();
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({ teamId }).exec();
      return docs.map((doc) => fromDocument(doc));
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByUserId(userId: string): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({ userId }).exec();
      return docs.map((doc) => fromDocument(doc));
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
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(player: NewPlayer): Promise<Player> {
    try {
      const newPlayer = await PlayerModel.create(player);
      return fromDocument(newPlayer);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, updates: Partial<PlayerFields>): Promise<Player> {
    const updateOps = toPlayerUpdateOps(updates);

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
      return fromDocument(updated);
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

  async findByTeamIdAndUserId(
    teamId: string,
    userId: string,
  ): Promise<Player | null> {
    try {
      const doc = await PlayerModel.findOne({ teamId, userId }).exec();
      return doc ? fromDocument(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async linkUserToInvitations(email: string, userId: string): Promise<number> {
    try {
      // The address arrives in whatever case the identity provider holds it,
      // and an invitation stored before this release kept the case it was typed
      // in. The same collation the user lookup uses lets the two meet, without
      // a $regex, whose `.` would reach a different address.
      const result = await PlayerModel.updateMany(
        { email, status: PlayerStatus.INVITED },
        {
          $set: { userId, status: PlayerStatus.INVITED },
          $unset: { email: "" },
        },
      ).collation({ locale: "en", strength: 2 });
      return result.modifiedCount;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
