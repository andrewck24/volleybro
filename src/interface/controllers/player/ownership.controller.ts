import type {
  ITransferOwnershipInput,
  ITransferOwnershipUseCase,
} from "@/applications/usecases/player/transfer-ownership.usecase";
import type { Player } from "@/entities/player";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";

/**
 * Ownership Controller - 隊伍所有權管理
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const transferOwnership = async (
  input: ITransferOwnershipInput,
): Promise<Player> => {
  const useCase = container.get<ITransferOwnershipUseCase>(
    TYPES.TransferOwnershipUseCase,
  );
  return await useCase.execute(input);
};
