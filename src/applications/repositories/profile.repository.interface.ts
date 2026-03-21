import type { Profile } from "@/entities/profile";
import type { IBaseRepository } from "@/applications/repositories/base.repository.interface";

export interface IProfileRepository extends IBaseRepository<Profile> {
  findByUserId(userId: string): Promise<Profile | null>;
  updateActiveTeamId(
    userId: string,
    activeTeamId: string | null,
  ): Promise<Profile | null>;
}
