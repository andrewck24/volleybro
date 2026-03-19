import { inject, injectable } from "inversify";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Profile } from "@/entities/profile";
import { ValidationError } from "@/entities/errors/app-error";
import { ProfileReason } from "@/entities/errors/reasons/profile";
import { TYPES } from "@/infrastructure/di/types";

// ============ Get Profile Use Case ============

export interface IGetProfileInput {
  userId: string;
}

export type IGetProfileOutput = Profile | null;

@injectable()
export class GetProfileUseCase {
  constructor(
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(input: IGetProfileInput): Promise<IGetProfileOutput> {
    const { userId } = input;

    const profile = await this.profileRepository.findByUserId(userId);
    return profile;
  }
}

// ============ Create Profile Use Case ============

export interface ICreateProfileInput {
  userId: string;
}

@injectable()
export class CreateProfileUseCase {
  constructor(
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(input: ICreateProfileInput): Promise<Profile> {
    const { userId } = input;

    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (existingProfile) {
      return existingProfile;
    }

    const profile = await this.profileRepository.create({ userId });
    return profile;
  }
}

// ============ Update Profile Use Case ============

export interface IUpdateProfileInput {
  userId: string;
  updates: Partial<Omit<Profile, "_id" | "userId">>;
}

export type IUpdateProfileOutput = Profile | null;

@injectable()
export class UpdateProfileUseCase {
  constructor(
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(input: IUpdateProfileInput): Promise<IUpdateProfileOutput> {
    const { userId, updates } = input;

    if ("userId" in updates || "_id" in updates) {
      throw new ValidationError(
        ProfileReason.INVALID_EMAIL,
        "Cannot update userId or _id fields",
      );
    }

    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (!existingProfile) {
      return null;
    }

    const updatedProfile = await this.profileRepository.update(
      { _id: existingProfile._id },
      { ...existingProfile, ...updates },
    );

    return updatedProfile;
  }
}
