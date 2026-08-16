import type { IGameRepository } from "@/applications/repositories/game.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";

export function createMockPlayerRepository(): jest.Mocked<IPlayerRepository> {
  return {
    findById: jest.fn(),
    findByTeamId: jest.fn(),
    findByUserId: jest.fn(),
    findByEmail: jest.fn(),
    findInvitedByTeamIdAndEmail: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countByTeamId: jest.fn(),
    findTeamOwner: jest.fn(),
    findAdminsByTeamId: jest.fn(),
    existsInvitation: jest.fn(),
    findByTeamIdAndUserId: jest.fn(),
    linkUserToInvitations: jest.fn(),
  };
}

export function createMockTeamRepository(): jest.Mocked<ITeamRepository> {
  return {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateLineups: jest.fn(),
    delete: jest.fn(),
    removePlayerFromLineups: jest.fn(),
  };
}

export function createMockGameRepository(): jest.Mocked<IGameRepository> {
  return {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    appendEntry: jest.fn(),
    replaceEntry: jest.fn(),
    completeSet: jest.fn(),
    delete: jest.fn(),
    findGameSummaries: jest.fn(),
  };
}

export function createMockUserRepository(): jest.Mocked<IUserRepository> {
  return {
    findById: jest.fn(),
    findByEmail: jest.fn(),
  };
}

export function createMockProfileRepository(): jest.Mocked<IProfileRepository> {
  return {
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateActiveTeamId: jest.fn(),
  };
}
