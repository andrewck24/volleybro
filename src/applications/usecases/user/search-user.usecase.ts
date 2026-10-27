import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { Result } from "@/applications/types/result";
import {
  ConflictError,
  PlayerReason,
  NotFoundError,
  ValidationError,
  CommonReason,
  ProfileReason,
} from "@/entities/errors";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ISearchUserInput {
  email: string;
  // The lookup exists for inviting to this team, so only its admins may run it.
  teamId: string;
  userId: string;
}

export type ISearchUserOutput = {
  id: string;
  name: string;
  image?: string;
};

export interface ISearchUserUseCase {
  execute(input: ISearchUserInput): Promise<Result<ISearchUserOutput>>;
}

@injectable()
export class SearchUserUseCase implements ISearchUserUseCase {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({
    email,
    teamId,
    userId,
  }: ISearchUserInput): Promise<Result<ISearchUserOutput>> {
    await this.authService.verifyIsTeamAdmin(teamId, userId);

    if (!email || !EMAIL_REGEX.test(email)) {
      return {
        ok: false,
        error: new ValidationError(
          ProfileReason.INVALID_EMAIL,
          "Invalid email format",
        ),
      };
    }

    const matches = await this.userRepository.findAllByEmailInsensitive(email);
    if (matches.length > 1) {
      throw new ConflictError(
        PlayerReason.AMBIGUOUS_EMAIL,
        "This email matches more than one account",
      );
    }
    const user = matches[0];

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
