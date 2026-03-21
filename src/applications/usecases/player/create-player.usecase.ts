import { injectable, inject } from 'inversify';
import { TYPES } from '@/infrastructure/di/types';
import type { ICreatePlayerUseCase } from './create-player.usecase.interface';
import type { IPlayerRepository } from '@/applications/repositories/player.repository.interface';
import type { IAuthorizationService } from '@/applications/services/auth/authorization.service.interface';
import type { Player } from '@/entities/player';
import type { CreatePlayerInput } from '@/lib/validations/player';
import { PlayerRole, PlayerStatus } from '@/entities/player';
import { ConflictError, UnexpectedError } from '@/entities/errors/app-error';
import { PlayerReason } from '@/entities/errors/reasons/player';
import { CommonReason } from '@/entities/errors/reasons/common';

@injectable()
export class CreatePlayerUseCase implements ICreatePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService
  ) {}

  async execute(
    teamId: string,
    input: CreatePlayerInput,
    userId: string
  ): Promise<Player> {
    // 1. 驗證權限 - 必須是 ADMIN 或 OWNER
    await this.authService.verifyIsTeamAdmin(teamId, userId);

    // 2. 如果有 email，檢查是否已經邀請過
    if (input.email) {
      const existingInvitation = await this.playerRepository.findInvitedByTeamIdAndEmail(
        teamId,
        input.email
      );
      if (existingInvitation) {
        throw new ConflictError(PlayerReason.EMAIL_ALREADY_INVITED, "This email already has a pending invitation for this team");
      }
    }

    // 3. 建立球員（純球員，status: NONE）
    const player = await this.playerRepository.create({
      name: input.name,
      status: PlayerStatus.NONE,
      number: input.number,
      position: input.position,
      teamId,
      email: input.email,
      role: input.role || PlayerRole.MEMBER,
    });

    if (!player) {
      throw new UnexpectedError(CommonReason.UNHANDLED_ERROR, "Failed to create player");
    }

    return player;
  }
}
