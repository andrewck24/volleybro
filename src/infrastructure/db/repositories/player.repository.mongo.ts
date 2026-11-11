import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import {
  ConflictError,
  NotFoundError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import {
  NewPlayer,
  Player,
  PlayerFields,
  PlayerRole,
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

/**
 * The partial unique indexes on (teamId, userId), (teamId, email) and
 * (teamId, inviteeEmail) close the races the use cases' checks cannot; which
 * one fired is in the driver error's key pattern. To the caller a collision is
 * a roster conflict, not the generic duplicate-resource one.
 *
 * Two invitations to one account break both the userId and the invitee index,
 * and the server reports whichever it checks first, so a userId collision is
 * told apart by the status of the row already holding the seat.
 */
const translatePlayerWriteError = async (error: unknown) => {
  const { code, keyPattern, keyValue } = (error ?? {}) as {
    code?: unknown;
    keyPattern?: object;
    keyValue?: object;
  };
  if (code === 11000) {
    const keys = Object.keys(keyPattern ?? keyValue ?? {});
    const invited =
      keys.includes("email") ||
      keys.includes("inviteeEmail") ||
      (keys.includes("userId") &&
        keyValue !== undefined &&
        (await PlayerModel.exists({
          ...keyValue,
          status: PlayerStatus.INVITED,
        })) !== null);
    if (invited)
      return new ConflictError(
        PlayerReason.ALREADY_INVITED,
        "This person has already been invited to this team",
      );
    if (keys.includes("userId"))
      return new ConflictError(
        PlayerReason.ALREADY_ON_ROSTER,
        "This account already belongs to a player on this team",
      );
  }
  return translateRepositoryError(error);
};

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

  async findByUserIdOrInvitedEmail(
    userId: string,
    email: string,
  ): Promise<Player[]> {
    try {
      const docs = await PlayerModel.find({
        $or: [{ userId }, { email, status: PlayerStatus.INVITED }],
      }).exec();
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
      const doc = await PlayerModel.findOne({
        teamId,
        status: PlayerStatus.INVITED,
        $or: [{ email }, { inviteeEmail: email }],
      }).exec();
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
      throw await translatePlayerWriteError(error);
    }
  }

  async update(id: string, updates: Partial<PlayerFields>): Promise<Player> {
    const updateOps = toPlayerUpdateOps(updates);

    try {
      const updated = await PlayerModel.findByIdAndUpdate(id, updateOps, {
        returnDocument: "after",
      }).exec();
      if (!updated) {
        throw new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "The player to update was not found",
        );
      }
      return fromDocument(updated);
    } catch (error) {
      throw await translatePlayerWriteError(error);
    }
  }

  async updateRoleIf(
    id: string,
    from: PlayerRole,
    to: PlayerRole,
  ): Promise<Player | null> {
    try {
      const updated = await PlayerModel.findOneAndUpdate(
        { _id: id, role: from },
        { $set: { role: to } },
        { returnDocument: "after" },
      ).exec();
      return updated ? fromDocument(updated) : null;
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
