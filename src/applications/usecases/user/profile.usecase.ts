import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import { ValidationError } from "@/entities/errors/app-error";
import { ProfileReason } from "@/entities/errors/reasons/profile";
import type { Profile } from "@/entities/profile";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

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

export interface IUpdateProfileInput {
  userId: string;
  updates: Partial<Omit<Profile, "id" | "userId">>;
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

    if ("userId" in updates || "id" in updates) {
      throw new ValidationError(
        ProfileReason.INVALID_EMAIL,
        "Cannot update userId or id fields",
      );
    }

    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (!existingProfile) {
      return null;
    }

    const updatedProfile = await this.profileRepository.update(
      existingProfile.id,
      { ...existingProfile, ...updates },
    );

    return updatedProfile;
  }
}
