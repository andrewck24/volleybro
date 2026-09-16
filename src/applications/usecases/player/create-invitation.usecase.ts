import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  asRosterConflict,
  resolveInviteeLink,
} from "@/applications/usecases/player/invitee-link";
import {
  ConflictError,
  NotFoundError,
  UnexpectedError,
  CommonReason,
  PlayerReason,
} from "@/entities/errors";
import type { Player } from "@/entities/player";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface ICreateInvitationInput {
  playerId: string;
  email: string;
  role: PlayerRole;
  userId: string;
}

export interface ICreateInvitationUseCase {
  execute(input: ICreateInvitationInput): Promise<Player>;
}

/**
 * CreateInvitationUseCase - Invite a NONE player: status NONE → INVITED
 */
@injectable()
export class CreateInvitationUseCase implements ICreateInvitationUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({
    playerId,
    email,
    role,
    userId,
  }: ICreateInvitationInput): Promise<Player> {
    const player = await this.playerRepository.findById(playerId);
    if (!player) {
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player not found",
      );
    }
    if (!player.teamId)
      throw new NotFoundError(
        PlayerReason.PLAYER_NOT_FOUND,
        "Player has no team",
      );

    // Whether this player is already invited or already a member is part of the
    // team's roster, so it is answered only to someone who may manage it.
    await this.authService.verifyIsTeamAdmin(player.teamId, userId);

    if (player.status === PlayerStatus.INVITED) {
      throw new ConflictError(
        PlayerReason.ALREADY_INVITED,
        "Player already has a pending invitation",
      );
    }
    if (player.status === PlayerStatus.JOINED) {
      throw new ConflictError(
        PlayerReason.ALREADY_MEMBER,
        "Player is already a member of this team",
      );
    }

    const link = await resolveInviteeLink(
      { players: this.playerRepository, users: this.userRepository },
      player.teamId,
      email,
    );

    const updated = await this.playerRepository
      .update(playerId, {
        status: PlayerStatus.INVITED,
        role,
        userId: undefined,
        email: undefined,
        ...link,
      })
      .catch((error: unknown) => {
        throw asRosterConflict(error);
      });

    if (!updated) {
      throw new UnexpectedError(
        CommonReason.UNHANDLED_ERROR,
        "Failed to create invitation",
      );
    }

    return updated;
  }
}
