import type { User } from "@/entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;

  /**
   * Every account whose email matches exactly, ignoring case. More than one
   * means accounts whose addresses differ only in case, and the caller must not
   * guess which one was meant.
   */
  findAllByEmailInsensitive(email: string): Promise<User[]>;
}
