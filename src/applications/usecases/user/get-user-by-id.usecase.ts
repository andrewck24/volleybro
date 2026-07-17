import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { Result } from "@/applications/types/result";
import { NotFoundError, CommonReason } from "@/entities/errors";
import type { User } from "@/entities/user";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetUserByIdInput {
  userId: string;
}

export interface IGetUserByIdUseCase {
  execute(input: IGetUserByIdInput): Promise<Result<User>>;
}

@injectable()
export class GetUserByIdUseCase implements IGetUserByIdUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
  ) {}

  async execute({ userId }: IGetUserByIdInput): Promise<Result<User>> {
    const user = await this.userRepository.findById(userId);

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
