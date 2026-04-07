import type { Profile } from "@/entities/profile";

export interface IProfileRepository {
  findByUserId(userId: string): Promise<Profile | null>;
  create(
    data: Omit<Profile, "id" | "createdAt" | "updatedAt">,
  ): Promise<Profile>;
  update(id: string, updates: Partial<Profile>): Promise<Profile | null>;
  updateActiveTeamId(
    userId: string,
    activeTeamId: string | null,
  ): Promise<Profile | null>;
}
