import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { IAcceptInvitationUseCase } from '@/applications/usecases/player/accept-invitation.usecase.interface';
import type { IRejectInvitationUseCase } from '@/applications/usecases/player/reject-invitation.usecase.interface';
import type { ILeaveTeamUseCase } from '@/applications/usecases/player/leave-team.usecase.interface';
import type { IGetPlayerUseCase } from '@/applications/usecases/player/get-player.usecase.interface';
import type { UpdateProfileUseCase } from '@/applications/usecases/user/profile.usecase';

/**
 * Invitation Controller - 被邀請者操作
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const acceptInvitation = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const getPlayerUseCase = container.get<IGetPlayerUseCase>(TYPES.GetPlayerUseCase);
  const player = await getPlayerUseCase.execute(playerId);

  const useCase = container.get<IAcceptInvitationUseCase>(TYPES.AcceptInvitationUseCase);
  await useCase.execute(playerId, userId);

  if (player?.teamId) {
    const updateProfileUseCase = container.get<UpdateProfileUseCase>(TYPES.UpdateProfileUseCase);
    await updateProfileUseCase.execute({ userId, updates: { activeTeamId: player.teamId } });
  }
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

export const leaveTeam = async (
  playerId: string,
  userId: string
): Promise<void> => {
  const useCase = container.get<ILeaveTeamUseCase>(TYPES.LeaveTeamUseCase);
  await useCase.execute(playerId, userId);
};
