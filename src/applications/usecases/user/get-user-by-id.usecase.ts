import { inject, injectable } from "inversify";
import { NotFoundError } from "@/applications/errors/app-error";
import type { Result } from "@/applications/types/result";
import { TYPES } from "@/infrastructure/di/types";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { SearchUserOutput } from "./search-user.usecase";

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository
  ) {}

  async execute(userId: string): Promise<Result<SearchUserOutput>> {
    const user = await this.userRepository.findOne({ _id: userId });

    if (!user) {
      return {
        ok: false,
        error: new NotFoundError(`User with id ${userId} not found`),
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
