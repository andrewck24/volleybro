import { container } from '@/infrastructure/di/inversify.config';
import { TYPES } from '@/infrastructure/di/types';
import type { ITransferOwnershipUseCase } from '@/applications/usecases/player/transfer-ownership.usecase.interface';
import type { Player } from '@/entities/player';

/**
 * Ownership Controller - 隊伍所有權管理
 * 透過 DI container 獲取 use cases 並執行業務邏輯
 */

export const transferOwnership = async (
  teamId: string,
  newOwnerId: string,
  userId: string
): Promise<Player> => {
  const useCase = container.get<ITransferOwnershipUseCase>(
    TYPES.TransferOwnershipUseCase
  );
  return await useCase.execute(teamId, newOwnerId, userId);
};
