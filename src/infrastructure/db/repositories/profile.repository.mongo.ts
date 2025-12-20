import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Profile } from "@/entities/profile";
import {
  Profile as ProfileModel,
  type ProfileDocument,
} from "@/infrastructure/db/mongoose/schemas/profile";
import { BaseMongoRepository } from "@/infrastructure/db/repositories";

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

  async updateTeams(
    userId: string,
    teams: Profile["teams"],
  ): Promise<Profile | null> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $set: { teams } },
      { new: true },
    );
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }

  async addTeamToJoined(
    userId: string,
    teamId: string,
  ): Promise<Profile | null> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $addToSet: { "teams.joined": teamId } },
      { new: true },
    );
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }

  async addTeamToInviting(
    userId: string,
    teamId: string,
  ): Promise<Profile | null> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $addToSet: { "teams.inviting": teamId } },
      { new: true },
    );
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }

  async removeTeamFromJoined(
    userId: string,
    teamId: string,
  ): Promise<Profile | null> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $pull: { "teams.joined": teamId } },
      { new: true },
    );
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }

  async removeTeamFromInviting(
    userId: string,
    teamId: string,
  ): Promise<Profile | null> {
    const doc = await this.model.findOneAndUpdate(
      { userId },
      { $pull: { "teams.inviting": teamId } },
      { new: true },
    );
    if (!doc) return null;
    return doc.toJSON() as unknown as Profile;
  }
}
