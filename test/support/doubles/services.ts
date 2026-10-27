import { createPlayer } from "@test/support/fixtures/entities";
import type { IAuthenticationService } from "@/applications/services/auth/authentication.service.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";

export function createMockAuthenticationService(): jest.Mocked<IAuthenticationService> {
  return {
    verifySession: jest.fn(),
  };
}

export function createMockAuthorizationService(): jest.Mocked<IAuthorizationService> {
  return {
    verifyTeamRole: jest.fn().mockResolvedValue(createPlayer()),
    verifyIsTeamAdmin: jest.fn(),
  };
}

export function createMockTransactionRunner(): jest.Mocked<ITransactionRunner> {
  return {
    run: jest.fn((fn: () => Promise<unknown>) => fn()) as jest.MockedFunction<
      ITransactionRunner["run"]
    >,
  };
}
