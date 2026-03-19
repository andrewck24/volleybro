import { inject, injectable } from "inversify";
import { NotFoundError, ValidationError } from "@/entities/errors/app-error";
import type { Result } from "@/applications/types/result";
import { TYPES } from "@/infrastructure/di/types";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";

export type SearchUserOutput = {
  _id: string;
  name: string;
  image?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@injectable()
export class SearchUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository
  ) {}

  async execute(email: string): Promise<Result<SearchUserOutput>> {
    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        ok: false,
        error: new ValidationError("Invalid email format"),
      };
    }

    const user = await this.userRepository.findOne({ email });

    if (!user) {
      return {
        ok: false,
        error: new NotFoundError(`User with email ${email} not found`),
      };
    }

    return {
      ok: true,
      value: {
        _id: user._id,
        name: user.name,
        image: user.image,
      },
    };
  }
}
