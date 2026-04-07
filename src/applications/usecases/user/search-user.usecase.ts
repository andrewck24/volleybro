import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { Result } from "@/applications/types/result";
import { NotFoundError, ValidationError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import { ProfileReason } from "@/entities/errors/reasons/profile";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export type SearchUserOutput = {
  id: string;
  name: string;
  image?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@injectable()
export class SearchUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
  ) {}

  async execute(email: string): Promise<Result<SearchUserOutput>> {
    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        ok: false,
        error: new ValidationError(
          ProfileReason.INVALID_EMAIL,
          "Invalid email format",
        ),
      };
    }

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      return {
        ok: false,
        error: new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "User not found",
          `User with email ${email} not found`,
        ),
      };
    }

    return {
      ok: true,
      value: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    };
  }
}
