import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";

export function createMockAuthenticationService(): jest.Mocked<IAuthenticationService> {
  return {
    verifySession: jest.fn(),
  };
}

export function createMockAuthorizationService(): jest.Mocked<IAuthorizationService> {
  return {
    verifyTeamRole: jest.fn(),
    verifyIsTeamAdmin: jest.fn(),
    verifyIsTeamOwner: jest.fn(),
    verifyPlayerRole: jest.fn(),
    getPlayerRole: jest.fn(),
  };
}
