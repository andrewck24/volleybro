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

  async findAllByEmailInsensitive(email: string): Promise<User[]> {
    try {
      // A collation compares the whole address; a case-insensitive $regex would
      // let `.` in an address match any character and reach another account.
      // Two rows are enough to tell "exactly one" from "more than one".
      const docs = await UserModel.find({ email })
        .collation({ locale: "en", strength: 2 })
        .limit(2)
        .exec();
      return docs.map((doc) => this.toUser(doc));
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
