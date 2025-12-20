import type { Profile } from "@/entities/profile";
import type { IBaseRepository } from "@/applications/repositories/base.repository.interface";

export interface IProfileRepository extends IBaseRepository<Profile> {
  findByUserId(userId: string): Promise<Profile | null>;
  updateTeams(
    userId: string,
    teams: Profile["teams"]
  ): Promise<Profile | null>;
  addTeamToJoined(userId: string, teamId: string): Promise<Profile | null>;
  addTeamToInviting(userId: string, teamId: string): Promise<Profile | null>;
  removeTeamFromJoined(userId: string, teamId: string): Promise<Profile | null>;
  removeTeamFromInviting(
    userId: string,
    teamId: string
  ): Promise<Profile | null>;
}
