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

export const createInvitationController = async (
  input: ICreateInvitationInput,
): Promise<Player> => {
  const useCase = container.get<ICreateInvitationUseCase>(
    TYPES.CreateInvitationUseCase,
  );
  return await useCase.execute(input);
};

export const updateRoleController = async (
  input: IUpdateRoleInput,
): Promise<Player> => {
  const useCase = container.get<IUpdateRoleUseCase>(TYPES.UpdateRoleUseCase);
  return await useCase.execute(input);
};

export const cancelInvitationController = async (
  input: ICancelInvitationInput,
): Promise<Player> => {
  const useCase = container.get<ICancelInvitationUseCase>(
    TYPES.CancelInvitationUseCase,
  );
  return await useCase.execute(input);
};
