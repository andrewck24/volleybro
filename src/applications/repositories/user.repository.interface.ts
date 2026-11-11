import type { User } from "@/entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(normalizedEmail: string): Promise<User | null>;
}
