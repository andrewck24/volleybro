import { User } from "@/entities/user";

export interface IAuthenticationService {
  verifySession(): Promise<User>;
}
