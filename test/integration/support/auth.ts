import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { User } from "@/entities/user";
import { PlayerRole } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const FAKE_USER: User = {
  id: "0".repeat(24),
  name: "Test User",
  email: "test@example.com",
  emailVerified: true,
};

/**
 * Replace the real auth services with doubles so integration tests exercise the
 * route -> usecase -> repository -> DB seam without a Better Auth session.
 * Returns a restore fn; the authenticated userId and granted role are overridable.
 */
export const useFakeAuth = ({
  userId = FAKE_USER.id,
  role = PlayerRole.OWNER,
}: { userId?: string; role?: PlayerRole } = {}) => {
  const authentication: IAuthenticationService = {
    verifySession: async () => ({ ...FAKE_USER, id: userId }),
  };
  const authorization: IAuthorizationService = {
    verifyTeamRole: async () => {},
    verifyIsTeamAdmin: async () => {},
    verifyIsTeamOwner: async () => {},
    verifyPlayerRole: async () => {},
    getPlayerRole: async () => role,
  };

  container.rebind(TYPES.AuthenticationService).toConstantValue(authentication);
  container.rebind(TYPES.AuthorizationService).toConstantValue(authorization);
};
