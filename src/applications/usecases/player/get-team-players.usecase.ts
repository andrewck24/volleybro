import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IAuthorizationService } from "@/applications/services/auth/authorization.service.interface";
import { Player, PlayerRole } from "@/entities/player";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetTeamPlayersInput {
  teamId: string;
  userId: string;
}

export interface IGetTeamPlayersUseCase {
  execute(input: IGetTeamPlayersInput): Promise<Player[]>;
}

/**
 * GetTeamPlayersUseCase Implementation
 * Get all players in a team (members, invitees, pure players)
 */
@injectable()
export class GetTeamPlayersUseCase implements IGetTeamPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.AuthorizationService)
    private authorizationService: IAuthorizationService,
  ) {}

  async execute({ teamId, userId }: IGetTeamPlayersInput): Promise<Player[]> {
    await this.authorizationService.verifyTeamRole(
      teamId,
      userId,
      PlayerRole.MEMBER,
    );
    return this.playerRepository.findByTeamId(teamId);
  }
}
