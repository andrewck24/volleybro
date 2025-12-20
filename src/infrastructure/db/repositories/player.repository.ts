import { Player } from '@/entities/player';
import { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import { PlayerModel } from '../mongoose/schemas/player';

/**
 * PlayerRepository Implementation
 * Provides MongoDB data access operations for Player entity
 * Implements Repository Pattern for Clean Architecture
 */
export class PlayerRepository implements IPlayerRepository {
  /**
   * Convert Mongoose document to Player entity
   * Handles ObjectId to string conversion for _id and teamId
   */
  private toPlayer(doc: any): Player {
    const obj = doc.toObject();
    return {
      ...obj,
      _id: obj._id.toString(),
      teamId: obj.teamId?.toString(),
    };
  }

  async findById(id: string): Promise<Player | null> {
    const doc = await PlayerModel.findById(id).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async findByTeamId(teamId: string): Promise<Player[]> {
    const docs = await PlayerModel.find({ teamId }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findByUserId(userId: string): Promise<Player[]> {
    const docs = await PlayerModel.find({ userId }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findByEmail(email: string): Promise<Player[]> {
    const docs = await PlayerModel.find({ email }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async findInvitedByTeamIdAndEmail(
    teamId: string,
    email: string
  ): Promise<Player | null> {
    const doc = await PlayerModel.findOne({ teamId, email }).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async create(
    player: Omit<Player, '_id' | 'createdAt' | 'updatedAt'>
  ): Promise<Player> {
    const newPlayer = await PlayerModel.create(player);
    return this.toPlayer(newPlayer);
  }

  async update(id: string, updates: Partial<Player>): Promise<Player | null> {
    const updated = await PlayerModel.findByIdAndUpdate(id, updates, {
      new: true,
    }).exec();
    return updated ? this.toPlayer(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await PlayerModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async countByTeamId(teamId: string): Promise<number> {
    return PlayerModel.countDocuments({ teamId }).exec();
  }

  async findTeamOwner(teamId: string): Promise<Player | null> {
    const doc = await PlayerModel.findOne({
      teamId,
      role: 'OWNER',
    }).exec();
    return doc ? this.toPlayer(doc) : null;
  }

  async findAdminsByTeamId(teamId: string): Promise<Player[]> {
    const docs = await PlayerModel.find({
      teamId,
      role: { $in: ['ADMIN', 'OWNER'] },
    }).exec();
    return docs.map((doc) => this.toPlayer(doc));
  }

  async existsInvitation(teamId: string, email: string): Promise<boolean> {
    const count = await PlayerModel.countDocuments({
      teamId,
      email,
      userId: { $exists: false },
    }).exec();
    return count > 0;
  }
}
