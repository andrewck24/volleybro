import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Profile } from "@/entities/profile";
import {
  Profile as ProfileModel,
  type ProfileDocument,
} from "@/infrastructure/db/mongoose/schemas/profile";
import { BaseMongoRepository } from "@/infrastructure/db/repositories/base.repository.mongo";

export class ProfileRepositoryImpl
  extends BaseMongoRepository<Profile, ProfileDocument>
  implements IProfileRepository
{
  constructor() {
    super(ProfileModel);
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const doc = await this.model.findOne({ userId });
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }

  async updateActiveTeamId(
    userId: string,
    activeTeamId: string | null,
  ): Promise<Profile | null> {
    const update =
      activeTeamId === null
        ? { $unset: { activeTeamId: "" } }
        : { $set: { activeTeamId } };
    const doc = await this.model.findOneAndUpdate({ userId }, update, {
      new: true,
    });
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }
}
