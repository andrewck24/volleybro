import type {
  ICancelInvitationInput,
  ICancelInvitationUseCase,
} from "@/applications/usecases/player/cancel-invitation.usecase";
import type {
  ICreateInvitationInput,
  ICreateInvitationUseCase,
} from "@/applications/usecases/player/create-invitation.usecase";
import type {
  IUpdateRoleInput,
  IUpdateRoleUseCase,
} from "@/applications/usecases/player/update-role.usecase";
import type { Player } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Membership Controller - 隊籍管理（管理者操作）
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const createInvitation = async (
  input: ICreateInvitationInput,
): Promise<Player> => {
  const useCase = container.get<ICreateInvitationUseCase>(
    TYPES.CreateInvitationUseCase,
  );
  return await useCase.execute(input);
};

export const updateRole = async (input: IUpdateRoleInput): Promise<Player> => {
  const useCase = container.get<IUpdateRoleUseCase>(TYPES.UpdateRoleUseCase);
  return await useCase.execute(input);
};

export const cancelInvitation = async (
  input: ICancelInvitationInput,
): Promise<Player> => {
  const useCase = container.get<ICancelInvitationUseCase>(
    TYPES.CancelInvitationUseCase,
  );
  return await useCase.execute(input);
};
