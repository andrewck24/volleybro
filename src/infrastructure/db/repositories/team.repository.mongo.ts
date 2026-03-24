import { ITeamRepository } from "@/applications/repositories/team.repository.interface";
import {
  Team as TeamModel,
  TeamDocument,
} from "@/infrastructure/db/mongoose/schemas/team";
import { Team } from "@/entities/team";
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
    playerId: string
  ): Promise<void> {
    const objectId = new Types.ObjectId(playerId);
    await TeamModel.updateOne(
      { _id: teamId },
      {
        $pull: {
          "lineups.$[].starting": { _id: objectId },
          "lineups.$[].liberos": { _id: objectId },
          "lineups.$[].substitutes": { _id: objectId },
        },
      }
    );
  }
}
