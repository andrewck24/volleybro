import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { ICreateInvitationUseCase } from '@/applications/usecases/player/create-invitation.usecase.interface';
import type { IUpdateRoleUseCase } from '@/applications/usecases/player/update-role.usecase.interface';
import type { ICancelInvitationUseCase } from '@/applications/usecases/player/cancel-invitation.usecase.interface';
import type { Player, PlayerRole } from '@/entities/player';

/**
 * Membership Controller - 隊籍管理（管理者操作）
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const createInvitation = async (
  playerId: string,
  email: string,
  role: PlayerRole,
  userId: string
): Promise<Player> => {
  const useCase = container.get<ICreateInvitationUseCase>(
    TYPES.CreateInvitationUseCase
  );
  return await useCase.execute(playerId, email, role, userId);
};

export const updateRole = async (
  playerId: string,
  role: PlayerRole,
  userId: string
): Promise<Player> => {
  const useCase = container.get<IUpdateRoleUseCase>(TYPES.UpdateRoleUseCase);
  return await useCase.execute(playerId, role, userId);
};

export const cancelInvitation = async (
  playerId: string,
  userId: string
): Promise<Player> => {
  const useCase = container.get<ICancelInvitationUseCase>(
    TYPES.CancelInvitationUseCase
  );
  return await useCase.execute(playerId, userId);
};
