import type {
  ITransferOwnershipInput,
  ITransferOwnershipUseCase,
} from "@/applications/usecases/player/transfer-ownership.usecase";
import type { Team } from "@/entities/team";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

export const transferOwnershipController = async (
  input: ITransferOwnershipInput,
): Promise<Team> => {
  const useCase = container.get<ITransferOwnershipUseCase>(
    TYPES.TransferOwnershipUseCase,
  );
  return await useCase.execute(input);
};
