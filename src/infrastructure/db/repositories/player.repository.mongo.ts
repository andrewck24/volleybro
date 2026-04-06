import { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import { NotFoundError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { Player, PlayerStatus } from "@/entities/player";
import {
  PlayerModel,
  type PlayerDocument,
} from "@/infrastructure/db/mongoose/schemas/player";
import { BaseMongoRepository } from "@/infrastructure/db/repositories/base.repository.mongo";

export class PlayerRepositoryImpl
  extends BaseMongoRepository<Player, PlayerDocument>
  implements IPlayerRepository
{
  constructor() {
    super(PlayerModel);
  }

  private toPlayer(doc: PlayerDocument): Player {
    const obj = doc.toObject();
    return {
      ...obj,
      id: obj.id.toString(),
      teamId: obj.teamId?.toString(),
      userId: obj.userId?.toString(),
    };
  }

  async findById(id: string): Promise<Player | null> {
    const doc = await this.model.findById(id).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    const docs = await this.model.find({ teamId }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findByUserId(userId: string): Promise<Player[]> {
    const docs = await this.model.find({ userId }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findByEmail(email: string): Promise<Player[]> {
    const docs = await this.model.find({ email }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findInvitedByTeamIdAndEmail(
    teamId: string,
    email: string,
  ): Promise<Player | null> {
    const doc = await this.model.findOne({ teamId, email }).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async create(
    player: Omit<Player, "id" | "createdAt" | "updatedAt">,
  ): Promise<Player> {
    const newPlayer = await this.model.create(player);
    return this.toPlayer(newPlayer);
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

    const updated = await this.model
      .findByIdAndUpdate(id, updateOps, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundError(
        CommonReason.RESOURCE_NOT_FOUND,
        "The player to update was not found",
      );
    }
    return this.toPlayer(updated);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  async countByTeamId(teamId: string): Promise<number> {
    return this.model.countDocuments({ teamId }).exec();
  }

  async findTeamOwner(teamId: string): Promise<Player | null> {
    const doc = await this.model.findOne({ teamId, role: "OWNER" }).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async findAdminsByTeamId(teamId: string): Promise<Player[]> {
    const docs = await this.model
      .find({ teamId, role: { $in: ["ADMIN", "OWNER"] } })
      .exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async existsInvitation(teamId: string, email: string): Promise<boolean> {
    const count = await this.model
      .countDocuments({ teamId, email, status: PlayerStatus.INVITED })
      .exec();
    return count > 0;
  }

  async findByTeamIdAndUserId(
    teamId: string,
    userId: string,
  ): Promise<Player | null> {
    const doc = await this.model.findOne({ teamId, userId }).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async linkUserToInvitations(email: string, userId: string): Promise<number> {
    const result = await this.model.updateMany(
      { email, status: PlayerStatus.INVITED },
      { $set: { userId, status: PlayerStatus.INVITED }, $unset: { email: "" } },
    );
    return result.modifiedCount;
  }
}
