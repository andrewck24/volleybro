import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  ConflictError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import type { Player, Position } from "@/entities/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreatePlayerInput {
  teamId: string;
  data: {
    name: string;
    number?: number;
    position?: Position;
    /** Only meaningful with an email: the role the invitation offers. */
    role?: PlayerRole.MEMBER | PlayerRole.ADMIN;
    email?: string;
  };
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
    await this.authService.verifyIsTeamAdmin(teamId, userId);

    const { name, number, position } = data;
    const email = data.email?.trim().toLowerCase();

    if (email) {
      const existingInvitation =
        await this.playerRepository.findInvitedByTeamIdAndEmail(teamId, email);
      if (existingInvitation) {
        throw new ConflictError(
          PlayerReason.EMAIL_ALREADY_INVITED,
          "This email already has a pending invitation for this team",
        );
      }
    }

    // An invitation carries only the email until the invitee accepts: writing a
    // userId here would hand them a member's permissions before they do.
    const player = await this.playerRepository.create(
      email
        ? {
            name,
            status: PlayerStatus.INVITED,
            number,
            position,
            teamId,
            email,
            role: data.role ?? PlayerRole.MEMBER,
          }
        : { name, status: PlayerStatus.NONE, number, position, teamId },
    );

    if (!player) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to create player",
      );
    }

    return player;
  }
}
