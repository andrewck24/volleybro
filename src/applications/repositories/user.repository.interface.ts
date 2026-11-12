import type { NormalizedEmail, User } from "@/entities/user";

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: NormalizedEmail): Promise<User | null>;
}
