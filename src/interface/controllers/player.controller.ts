import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { ICreateInvitationUseCase } from '@/applications/usecases/player/create-invitation.usecase.interface';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IRejectInvitationUseCase } from '@/applications/usecases/player/reject-invitation.usecase.interface';
import type { IGetUserPlayersUseCase } from '@/applications/usecases/player/get-user-players.usecase.interface';
import type { IGetTeamPlayersUseCase } from '@/applications/usecases/player/get-team-players.usecase.interface';
import type { IGetPlayerUseCase } from '@/applications/usecases/player/get-player.usecase.interface';
import { Player } from '@/entities/player';

/**
 * PlayerController - 邀請相關的協調器
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */
export const createInvitationController = async (
  teamId: string,
  email: string,
  role: string,
  createdBy: string
): Promise<string> => {
  const useCase = container.get<ICreateInvitationUseCase>(
    TYPES.CreateInvitationUseCase
  );
  return await useCase.execute(teamId, email, role, createdBy);
};

export const acceptInvitationController = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const useCase = container.get<IAcceptInvitationUseCase>(
    TYPES.AcceptInvitationUseCase
  );
  return await useCase.execute(playerId, userId);
};

export const rejectInvitationController = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const useCase = container.get<IRejectInvitationUseCase>(
    TYPES.RejectInvitationUseCase
  );
  return await useCase.execute(playerId, userId);
};

export const getUserPlayersController = async (
  userId: string
): Promise<Player[]> => {
  const useCase = container.get<IGetUserPlayersUseCase>(
    TYPES.GetUserPlayersUseCase
  );
  return await useCase.execute(userId);
};

export const getTeamPlayersController = async (
  teamId: string
): Promise<Player[]> => {
  const useCase = container.get<IGetTeamPlayersUseCase>(
    TYPES.GetTeamPlayersUseCase
  );
  return await useCase.execute(teamId);
};

export const getPlayerController = async (playerId: string): Promise<Player> => {
  const useCase = container.get<IGetPlayerUseCase>(TYPES.GetPlayerUseCase);
  return await useCase.execute(playerId);
};
