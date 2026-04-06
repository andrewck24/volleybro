import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import { Team } from "@/entities/team";
import {
  TeamDocument,
  Team as TeamModel,
} from "@/infrastructure/db/mongoose/schemas/team";
import { BaseMongoRepository } from "@/infrastructure/db/repositories/base.repository.mongo";
import { Types } from "mongoose";

export class TeamRepositoryImpl
  extends BaseMongoRepository<Team, TeamDocument>
  implements ITeamRepository
{
  constructor() {
    super(TeamModel);
  }

  async removePlayerFromLineups(
    teamId: string,
    playerId: string,
  ): Promise<void> {
    const objectId = new Types.ObjectId(playerId);
    await TeamModel.updateOne(
      { id: teamId },
      {
        $pull: {
          "lineups.$[].starting": { id: objectId },
          "lineups.$[].liberos": { id: objectId },
          "lineups.$[].substitutes": { id: objectId },
        },
      },
    );
  }
}
