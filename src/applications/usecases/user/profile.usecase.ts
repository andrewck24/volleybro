import { inject, injectable } from "inversify";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Profile } from "@/entities/profile";
import { TransientError } from "@/applications/errors/app-error";
import type { Result } from "@/applications/types/result";
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

export type ICreateProfileOutput = Result<Profile>;

@injectable()
export class CreateProfileUseCase {
  constructor(
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(input: ICreateProfileInput): Promise<ICreateProfileOutput> {
    const { userId } = input;

    try {
      const existingProfile = await this.profileRepository.findByUserId(userId);
      if (existingProfile) {
        return { ok: true, value: existingProfile };
      }

      const profile = await this.profileRepository.create({ userId });
      return { ok: true, value: profile };
    } catch {
      return {
        ok: false,
        error: new TransientError("Failed to create profile"),
      };
    }
  }
}

// ============ Update Profile Use Case ============

export interface IUpdateProfileInput {
  userId: string;
  updates: Partial<Omit<Profile, "_id" | "userId">>;
}

export type IUpdateProfileOutput = Profile | null;

/**
 * Use Case Layer 業務規則錯誤
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessRuleError";
  }
}

@injectable()
export class UpdateProfileUseCase {
  constructor(
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute(input: IUpdateProfileInput): Promise<IUpdateProfileOutput> {
    const { userId, updates } = input;

    // ============ Use Case Layer Validation: 業務規則驗證 ============

    // 業務規則 1：不允許更新 userId 或 _id（雖然型別已阻止，但加上執行時檢查）
    if ("userId" in updates || "_id" in updates) {
      throw new BusinessRuleError(
        "Cannot update userId or _id fields - these are immutable identifiers",
      );
    }

    // 業務規則 2：檢查 Profile 是否存在
    const existingProfile = await this.profileRepository.findByUserId(userId);
    if (!existingProfile) {
      return null;
    }

    // ============ 執行更新 ============
    const updatedProfile = await this.profileRepository.update(
      { _id: existingProfile._id },
      { ...existingProfile, ...updates },
    );

    return updatedProfile;
  }
}
