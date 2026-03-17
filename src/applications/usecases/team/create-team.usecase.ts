import { injectable, inject } from "inversify";
import { TYPES } from "@/infrastructure/di/types";
import type { ICreateTeamUseCase, CreateTeamInput } from "./create-team.usecase.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { IProfileRepository } from "@/applications/repositories/profile.repository.interface";
import type { Team } from "@/entities/team";
import { PlayerRole, PlayerStatus } from "@/entities/player";

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

  async execute(
    input: CreateTeamInput,
    userId: string,
    userName: string,
  ): Promise<Team> {
    const team = await this.teamRepository.create({
      name: input.name,
      nickname: input.nickname,
      lineups: new Array(3).fill({
        options: {
          liberoReplaceMode: 0,
          liberoReplacePosition: "",
        },
        starting: new Array(6).fill({ _id: null }),
        liberos: [],
        substitutes: [],
      }),
    });

    if (!team) {
      throw new Error("Failed to create team");
    }

    await this.playerRepository.create({
      name: userName,
      status: PlayerStatus.JOINED,
      number: 1,
      role: PlayerRole.OWNER,
      teamId: team._id,
      userId,
    });

    await this.profileRepository.updateActiveTeamId(userId, team._id);

    return team;
  }
}
