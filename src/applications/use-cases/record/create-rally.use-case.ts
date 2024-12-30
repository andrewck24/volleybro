import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { IRecordRepository } from "@/applications/repositories/record.repository.interface";
import { AuthenticationService } from "@/infrastructure/service/auth/authentication.service";
import { AuthorizationService } from "@/infrastructure/service/auth/authorization.service";
import { type Entry, type Rally, EntryType } from "@/entities/record";
import { Role } from "@/entities/team";

export interface ICreateRallyInput {
  params: { recordId: string; setIndex: number; rallyIndex: number };
  data: Rally;
}

export type ICreateRallyOutput = Entry[];

/**
 * Use case for creating a rally in a volleyball match record.
 *
 * @class CreateRallyUseCase
 *
 * @param {IUserRepository} userRepository - Repository for user data.
 * @param {ITeamRepository} teamRepository - Repository for team data.
 * @param {IRecordRepository} recordRepository - Repository for record data.
 *
 * @method execute
 * @async
 * @param {ICreateRallyInput} input - Input data for creating a rally.
 * @returns {Promise<ICreateRallyOutput | undefined>} - The updated list of rallies for the specified set.
 *
 * @throws {Error} If the record or set is not found.
 *
 * @description
 * This use case handles the creation of a rally within a specific set of a volleyball match record.
 * It verifies the user's session and team role before updating the record. If the specified set or
 * record is not found, it throws an error. The method also includes a TODO to handle potential race
 * conditions when multiple users attempt to update the same rally simultaneously.
 */
export class CreateRallyUseCase {
  constructor(
    private userRepository: IUserRepository,
    private teamRepository: ITeamRepository,
    private recordRepository: IRecordRepository
  ) {}

  async execute(
    input: ICreateRallyInput
  ): Promise<ICreateRallyOutput | undefined> {
    const { params, data: rally } = input;
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

    // TODO: handle race condition
    // 若傳入的 setIndex, (rallyIndex), scores, type, num 一致時，則視為同筆資料不新增
    // 若 setIndex, score 等資料不同時，通知後傳入之使用者，令其選擇合適之紀錄，或新增於前者紀錄之後（如何更新前者之資料？）

    const set = record.sets[params.setIndex];
    if (!set) throw new Error("Set not found");

    // same logic as createRallyOptimistic (src/lib/features/record/helpers/create-rally.helper.ts)
    const isServing = params.rallyIndex
      ? record.sets[params.setIndex].rallies[params.rallyIndex - 1]?.win
      : record.sets[params.setIndex].options.serve === "home";
    if (rally.win && !isServing)
      record.teams.home.stats[params.setIndex].rotation += 1;

    const homePlayerIndex = record.teams.home.players.findIndex(
      (player) => player._id.toString() === rally.home.player._id.toString()
    );
    const homePlayer = record.teams.home.players[homePlayerIndex];
    const homeTeam = record.teams.home;
    const awayTeam = record.teams.away;

    if (rally.win) {
      if (homePlayerIndex !== -1) {
        homePlayer.stats[params.setIndex][rally.home.type].success += 1;
        record.teams.home.players[homePlayerIndex] = homePlayer;
      }
      homeTeam.stats[params.setIndex][rally.home.type].success += 1;
      awayTeam.stats[params.setIndex][rally.away.type].error += 1;
    } else {
      if (homePlayerIndex !== -1) {
        homePlayer.stats[params.setIndex][rally.home.type].error += 1;
        record.teams.home.players[homePlayerIndex] = homePlayer;
      }
      homeTeam.stats[params.setIndex][rally.home.type].error += 1;
      awayTeam.stats[params.setIndex][rally.away.type].success += 1;
    }

    record.teams.home = homeTeam;
    record.teams.away = awayTeam;
    record.sets[params.setIndex].rallies[params.rallyIndex] = {
      type: EntryType.RALLY,
      data: rally,
    };

    await this.recordRepository.update({ _id: params.recordId }, record);

    return record.sets[params.setIndex].rallies;
  }
}
