import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import { AuthenticationService } from "@/infrastructure/service/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/service/auth/authorization.service";
import {
  type Record,
  type Set,
  PlayerStatsClass,
  TeamStatsClass,
} from "@/entities/record";
import { type Lineup, Role } from "@/entities/team";

export interface ICreateSetInput {
  params: { recordId: string; setIndex: number };
  data: {
    lineup: Lineup;
    options: Set["options"];
  };
}

export interface ICreateSetOutput extends Record {}

export class CreateSetUseCase {
  private userRepository: IUserRepository;
  private teamRepository: ITeamRepository;
  private recordRepository: IRecordRepository;

  constructor(
    userRepository: IUserRepository,
    teamRepository: ITeamRepository,
    recordRepository: IRecordRepository
  ) {
    this.userRepository = userRepository;
    this.teamRepository = teamRepository;
    this.recordRepository = recordRepository;
  }

  async execute(input: ICreateSetInput): Promise<ICreateSetOutput | undefined> {
    const { params, data } = input;
    const authenticationService = new AuthenticationService(
      this.userRepository
    );
    const user = await authenticationService.verifySession();

    const record = await this.recordRepository.findOne({
      _id: params.recordId,
    });
    if (!record) throw new Error("Record not found");

    const authorizationService = new AuthorizationService(this.teamRepository);
    await authorizationService.verifyTeamRole(
      record.team_id.toString(),
      user._id.toString(),
      Role.MEMBER
    );

    // 新增上場選手(在 lineups 中)對應局數的 stats 物件（在開新局、換人時）
    const startingPlayers = data.lineup.starting.map((player) => player._id);
    const liberoPlayers = data.lineup.liberos.map((player) => player._id);
    const activePlayerIds = new Set([...startingPlayers, ...liberoPlayers]);

    record.teams.home.players.forEach((player) => {
      if (activePlayerIds.has(player._id.toString())) {
        player.stats[params.setIndex] = new PlayerStatsClass();
      }
    });
    record.teams.home.stats[params.setIndex] = new TeamStatsClass();
    record.teams.away.stats[params.setIndex] = new TeamStatsClass();

    if (params.setIndex === 0) delete record.teams.home.lineup;

    record.sets[params.setIndex] = {
      win: null,
      lineups: { home: data.lineup },
      options: data.options,
      rallies: [],
    };

    const updatedRecord = await this.recordRepository.update(
      { _id: params.recordId },
      record
    );

    return updatedRecord;
  }
}
