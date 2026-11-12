import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { User } from "@/entities/user";
import { createPlayer } from "@test/support/fixtures/entities";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const FAKE_USER: User = {
  id: "0".repeat(24),
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
};

export const useFakeAuth = ({
  userId = FAKE_USER.id,
  playerId = "0".repeat(23) + "1",
}: { userId?: string; playerId?: string } = {}) => {
  const authentication: IAuthenticationService = {
    verifySession: async () => ({ ...FAKE_USER, id: userId }),
  };
  const authorization: IAuthorizationService = {
    verifyTeamRole: async () => createPlayer({ id: playerId, userId }),
    verifyIsTeamAdmin: async () => {},
  };

  container.rebind(TYPES.AuthenticationService).toConstantValue(authentication);
  container.rebind(TYPES.AuthorizationService).toConstantValue(authorization);
};
