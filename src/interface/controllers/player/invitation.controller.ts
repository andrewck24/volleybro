import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IRejectInvitationUseCase } from '@/applications/usecases/player/reject-invitation.usecase.interface';

/**
 * Invitation Controller - 被邀請者操作
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const acceptInvitation = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const useCase = container.get<IAcceptInvitationUseCase>(
    TYPES.AcceptInvitationUseCase
  );
  return await useCase.execute(playerId, userId);
};

export const rejectInvitation = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const useCase = container.get<IRejectInvitationUseCase>(
    TYPES.RejectInvitationUseCase
  );
  return await useCase.execute(playerId, userId);
};
