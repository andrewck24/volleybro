import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Profile } from "@/entities/profile";
import {
  Profile as ProfileModel,
  type ProfileDocument,
} from "@/infrastructure/db/mongoose/schemas/profile";
import { translateRepositoryError } from "@/infrastructure/db/repositories/repository-helpers.mongo";

export class ProfileRepositoryImpl implements IProfileRepository {
  private toProfile(doc: ProfileDocument): Profile {
    const obj = doc.toObject();
    return {
      ...obj,
      id: obj._id.toString(),
      userId: obj.userId.toString(),
      activeTeamId: obj.activeTeamId?.toString(),
    };
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    try {
      const doc = await ProfileModel.findOne({ userId });
      return doc ? this.toProfile(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async create(
    data: Omit<Profile, "id" | "createdAt" | "updatedAt">,
  ): Promise<Profile> {
    try {
      const doc = await ProfileModel.create(data);
      return this.toProfile(doc);
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async update(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    try {
      const doc = await ProfileModel.findByIdAndUpdate(id, updates, {
        new: true,
      });
      return doc ? this.toProfile(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async updateActiveTeamId(
    userId: string,
    activeTeamId: string | null,
  ): Promise<Profile | null> {
    try {
      const update =
        activeTeamId === null
          ? { $unset: { activeTeamId: "" } }
          : { $set: { activeTeamId } };
      const doc = await ProfileModel.findOneAndUpdate({ userId }, update, {
        new: true,
      });
      return doc ? this.toProfile(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
