import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import { AuthenticationError, AuthReason } from "@/entities/errors";
import { User } from "@/entities/user";
import { TYPES } from "@/infrastructure/di/types";
import { auth } from "@/lib/auth";
import { inject, injectable } from "inversify";
import { headers } from "next/headers";

@injectable()
export class AuthenticationService implements IAuthenticationService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
  ) {}

  async verifySession(): Promise<User> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session)
      throw new AuthenticationError(
        AuthReason.INVALID_SESSION,
        "Invalid or expired session",
      );

    const user = await this.userRepository.findById(session.user.id);
    if (!user)
      throw new AuthenticationError(
        AuthReason.USER_NOT_FOUND,
        "Authenticated user account not found",
      );

    return user;
  }
}
