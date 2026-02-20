import { injectable, inject } from "inversify";
import { headers } from "next/headers";
import { TYPES } from "@/infrastructure/di/types";
import { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { User } from "@/entities/user";
import { auth } from "@/lib/auth";

@injectable()
export class AuthenticationService implements IAuthenticationService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository
  ) {}

  async verifySession(): Promise<User> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) throw new Error("Invalid session");

    const user = await this.userRepository.findOne({
      _id: session.user.id,
    });
    if (!user) throw new Error("User not found");

    return user;
  }
}
