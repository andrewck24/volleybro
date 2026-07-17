import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  ConflictError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import type { Player } from "@/entities/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import type { CreatePlayerInput } from "@/lib/validations/player";
import { inject, injectable } from "inversify";

export interface ICreatePlayerInput {
  teamId: string;
  data: CreatePlayerInput;
  userId: string;
}

export interface ICreatePlayerUseCase {
  execute(input: ICreatePlayerInput): Promise<Player>;
}

@injectable()
export class CreatePlayerUseCase implements ICreatePlayerUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({ teamId, data, userId }: ICreatePlayerInput): Promise<Player> {
    // 1. 驗證權限 - 必須是 ADMIN 或 OWNER
    await this.authService.verifyIsTeamAdmin(teamId, userId);

    // 2. 如果有 email，檢查是否已經邀請過
    if (data.email) {
      const existingInvitation =
        await this.playerRepository.findInvitedByTeamIdAndEmail(
          teamId,
          data.email,
        );
      if (existingInvitation) {
        throw new ConflictError(
          PlayerReason.EMAIL_ALREADY_INVITED,
          "This email already has a pending invitation for this team",
        );
      }
    }

    // 3. 建立球員（純球員，status: NONE）
    const player = await this.playerRepository.create({
      name: data.name,
      status: PlayerStatus.NONE,
      number: data.number,
      position: data.position,
      teamId,
      email: data.email,
      role: data.role || PlayerRole.MEMBER,
    });

    if (!player) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to create player",
      );
    }

    return player;
  }
}
