import type { IPlayerRepository } from "@/applications/repositories/player.repository.interface";
import type { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import type { ITransactionRunner } from "@/applications/services/transaction/transaction-runner.interface";
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
    @inject(TYPES.TransactionRunner)
    private transactionRunner: ITransactionRunner,
  ) {}

  async execute({
    name,
    nickname,
    userId,
    userName,
  }: ICreateTeamInput): Promise<Team> {
    return this.transactionRunner.run(async () => {
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

      const owner = await this.playerRepository.create({
        name: userName,
        status: PlayerStatus.JOINED,
        number: 1,
        role: PlayerRole.OWNER,
        teamId: team.id,
        userId,
      });

      return this.teamRepository.update(team.id, {
        ownerPlayerId: owner.id,
      });
    });
  }
}
