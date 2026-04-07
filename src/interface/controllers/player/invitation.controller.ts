import type {
  IAcceptInvitationInput,
  IAcceptInvitationUseCase,
} from "@/applications/usecases/player/accept-invitation.usecase";
import type { IGetPlayerUseCase } from "@/applications/usecases/player/get-player.usecase";
import type {
  ILeaveTeamInput,
  ILeaveTeamUseCase,
} from "@/applications/usecases/player/leave-team.usecase";
import type {
  IRejectInvitationInput,
  IRejectInvitationUseCase,
} from "@/applications/usecases/player/reject-invitation.usecase";
import type { UpdateProfileUseCase } from "@/applications/usecases/user/profile.usecase";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Invitation Controller - 被邀請者操作
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */
export const acceptInvitation = async (
  input: IAcceptInvitationInput,
): Promise<void> => {
  const { playerId, userId } = input;
  const getPlayerUseCase = container.get<IGetPlayerUseCase>(
    TYPES.GetPlayerUseCase,
  );
  const player = await getPlayerUseCase.execute({ playerId });

  const useCase = container.get<IAcceptInvitationUseCase>(
    TYPES.AcceptInvitationUseCase,
  );
  await useCase.execute(input);

  if (player?.teamId) {
    const updateProfileUseCase = container.get<UpdateProfileUseCase>(
      TYPES.UpdateProfileUseCase,
    );
    await updateProfileUseCase.execute({
      userId,
      updates: { activeTeamId: player.teamId },
    });
  }
};

export const rejectInvitation = async (
  input: IRejectInvitationInput,
): Promise<void> => {
  const useCase = container.get<IRejectInvitationUseCase>(
    TYPES.RejectInvitationUseCase,
  );
  return await useCase.execute(input);
};

export const leaveTeam = async (
  input: ILeaveTeamInput,
): Promise<{ success: boolean }> => {
  const useCase = container.get<ILeaveTeamUseCase>(TYPES.LeaveTeamUseCase);
  return await useCase.execute(input);
};
