import type { Profile } from "@/entities/profile";
import { ProfileRepositoryImpl } from "@/infrastructure/db/repositories/profile.repository.mongo";
import type { ProfileDocument } from "@/infrastructure/db/mongoose/schemas/profile";
import { Types } from "mongoose";

describe("ProfileRepositoryImpl", () => {
  it("omits undefined fields from the profile", () => {
    const document = {
      toObject: () => ({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        activeTeamId: undefined,
      }),
    } as unknown as ProfileDocument;
    const repository = new ProfileRepositoryImpl() as unknown as {
      toProfile(document: ProfileDocument): Profile;
    };

    expect(repository.toProfile(document)).not.toHaveProperty("activeTeamId");
  });
});
