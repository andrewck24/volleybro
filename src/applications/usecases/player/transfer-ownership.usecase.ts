import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ITransferOwnershipUseCase } from './transfer-ownership.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import { PlayerRole } from '@/entities/player';

@injectable()
export class TransferOwnershipUseCase implements ITransferOwnershipUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    currentOwnerId: string,
    newOwnerId: string,
    userId: string
  ): Promise<Player> {
    // 1. Get both players
    const currentOwner = await this.playerRepository.findById(currentOwnerId);
    const newOwner = await this.playerRepository.findById(newOwnerId);

    if (!currentOwner || !newOwner) {
      throw new Error('Player not found');
    }

    // 2. Verify they're in same team
    if (currentOwner.teamId !== newOwner.teamId) {
      throw new Error('Players must be in same team');
    }

    // 3. Verify current user is the current owner
    if (currentOwner.userId !== userId) {
      throw new Error('Only current owner can transfer ownership');
    }

    // 4. Verify current user has OWNER role
    if (currentOwner.role !== PlayerRole.OWNER) {
      throw new Error('User must be OWNER to transfer ownership');
    }

    // 5. Transfer ownership - update new owner to OWNER
    const updatedNewOwner = await this.playerRepository.update(newOwnerId, {
      role: PlayerRole.OWNER,
    });

    if (!updatedNewOwner) {
      throw new Error('Failed to update new owner');
    }

    // 6. Optionally downgrade current owner (can remain as ADMIN/MEMBER)
    // For now, we leave current owner as is - let them decide their own role
    // They would use updateRole usecase to change themselves if desired

    return updatedNewOwner;
  }
}
