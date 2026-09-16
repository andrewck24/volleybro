import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import {
  asRosterConflict,
  resolveInviteeLink,
} from "@/applications/usecases/player/invitee-link";
import { UnexpectedError, CommonReason } from "@/entities/errors";
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
    @inject(TYPES.UserRepository)
    private userRepository: IUserRepository,
    @inject(TYPES.AuthorizationService)
    private authService: IAuthorizationService,
  ) {}

  async execute({ teamId, data, userId }: ICreatePlayerInput): Promise<Player> {
    await this.authService.verifyIsTeamAdmin(teamId, userId);

    const { name, number, position } = data;
    const address = data.email?.trim();
    const link = address
      ? await resolveInviteeLink(
          { players: this.playerRepository, users: this.userRepository },
          teamId,
          address,
        )
      : null;

    const player = await this.playerRepository
      .create(
        link
          ? {
              name,
              status: PlayerStatus.INVITED,
              number,
              position,
              teamId,
              role: data.role ?? PlayerRole.MEMBER,
              ...link,
            }
          : { name, status: PlayerStatus.NONE, number, position, teamId },
      )
      .catch((error: unknown) => {
        throw asRosterConflict(error);
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
