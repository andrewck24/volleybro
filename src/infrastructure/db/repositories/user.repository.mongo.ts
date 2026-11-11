import { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { User } from "@/entities/user";
import {
  UserDocument,
  User as UserModel,
} from "@/infrastructure/db/mongoose/schemas/user";
import { translateRepositoryError } from "@/infrastructure/db/repositories/error-translation.mongo";

export class UserRepositoryImpl implements IUserRepository {
  private toUser(doc: UserDocument): User {
    const obj = doc.toObject();
    return {
      ...obj,
      id: obj._id.toString(),
    };
  }

  async findById(id: string): Promise<User | null> {
    try {
      const doc = await UserModel.findById(id).exec();
      return doc ? this.toUser(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ email }).exec();
      return doc ? this.toUser(doc) : null;
    } catch (error) {
      throw translateRepositoryError(error);
    }
  }
}
