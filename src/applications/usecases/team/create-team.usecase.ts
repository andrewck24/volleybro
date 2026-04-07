import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { PlayerRole, PlayerStatus } from "@/entities/player";
import type { Team } from "@/entities/team";
import { TYPES } from "@/infrastructure/di/types";
import { inject, injectable } from "inversify";

export interface CreateTeamInput {
  name: string;
  nickname?: string;
}

export interface ICreateTeamInput {
  name: string;
  nickname?: string;
  userId: string;
  userName: string;
}

export interface ICreateTeamUseCase {
  execute(input: ICreateTeamInput): Promise<Team>;
}

@injectable()
export class CreateTeamUseCase implements ICreateTeamUseCase {
  constructor(
    @inject(TYPES.TeamRepository)
    private teamRepository: ITeamRepository,
    @inject(TYPES.PlayerRepository)
    private playerRepository: IPlayerRepository,
    @inject(TYPES.ProfileRepository)
    private profileRepository: IProfileRepository,
  ) {}

  async execute({
    name,
    nickname,
    userId,
    userName,
  }: ICreateTeamInput): Promise<Team> {
    const team = await this.teamRepository.create({
      name: name,
      nickname: nickname,
      lineups: new Array(3).fill({
        options: {
          liberoReplaceMode: 0,
          liberoReplacePosition: "",
        },
        starting: new Array(6).fill({ id: null }),
        liberos: [],
        substitutes: [],
      }),
    });

    await this.playerRepository.create({
      name: userName,
      status: PlayerStatus.JOINED,
      number: 1,
      role: PlayerRole.OWNER,
      teamId: team.id,
      userId,
    });

    await this.profileRepository.updateActiveTeamId(userId, team.id);

    return team;
  }
}
