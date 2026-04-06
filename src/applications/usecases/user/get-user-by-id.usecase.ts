import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { Result } from "@/applications/types/result";
import { NotFoundError } from "@/entities/errors/app-error";
import { CommonReason } from "@/entities/errors/reasons/common";
import type { User } from "@/entities/user";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

@injectable()
export class GetUserByIdUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<Result<User>> {
    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      return {
        ok: false,
        error: new NotFoundError(
          CommonReason.RESOURCE_NOT_FOUND,
          "User not found",
          `User with id ${userId} not found`,
        ),
      };
    }

    return {
      ok: true,
      value: user,
    };
  }
}
