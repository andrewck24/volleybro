import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Player, PlayerStatus } from "@/entities/player";
import { normalizeEmail } from "@/entities/user";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface IGetUserPlayersInput {
  userId: string;
  email: string;
}

const isInvitationNotLinkedToAccount = (player: Player) =>
  player.status === PlayerStatus.INVITED && Boolean(player.email);

export type PlayerWithTeamName = Player & { teamName?: string };

export interface IGetUserPlayersUseCase {
  execute(input: IGetUserPlayersInput): Promise<PlayerWithTeamName[]>;
}

@injectable()
export class GetUserPlayersUseCase implements IGetUserPlayersUseCase {
  constructor(
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
  ) {}

  async execute({
    userId,
    email,
  }: IGetUserPlayersInput): Promise<PlayerWithTeamName[]> {
    const address = normalizeEmail(email);
    let players = await this.playerRepository.findByUserIdOrInvitedEmail(
      userId,
      address,
    );

    if (players.some(isInvitationNotLinkedToAccount)) {
      await this.playerRepository.linkUserToInvitations(address, userId);
      players = await this.playerRepository.findByUserId(userId);
    }

    return Promise.all(
      players.map(async (player) => {
        const team = player.teamId
          ? await this.teamRepository.findById(player.teamId)
          : null;
        return { ...player, teamName: team?.name };
      }),
    );
  }
}
