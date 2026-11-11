import type { User } from "@/entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;

  /**
   * `email` must already be normalized; it matches the stored (lowercase)
   * address exactly.
   */
  findByEmail(email: string): Promise<User | null>;
}
