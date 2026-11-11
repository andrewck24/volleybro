import type { IUserRepository } from "@/applications/repositories/user.repository.interface";
import { normalizeEmail, type NormalizedEmail } from "@/entities/user";
import { User as UserModel } from "@/infrastructure/db/mongoose/schemas/user";
import { DUPLICATE_KEY_CODE } from "@/infrastructure/db/repositories/error-translation.mongo";
import { container } from "@/infrastructure/di/inversify.config";
import { TYPES } from "@/infrastructure/di/types";
import { oid } from "../support/seed";

const users = () => container.get<IUserRepository>(TYPES.UserRepository);

describe("user lookups", () => {
  it("reads a stored user with its id as a string", async () => {
    await UserModel.create({ name: "Alice", email: "alice@example.com" });
    const stored = await UserModel.create({
      name: "Bob",
      email: "bob@example.com",
    });

    const found = await users().findById(stored._id.toString());

    expect(found).toMatchObject({
      id: stored._id.toString(),
      name: "Bob",
      email: "bob@example.com",
    });
  });

  it("finds no user for an id nobody holds", async () => {
    expect(await users().findById(oid())).toBeNull();
  });

  it("finds the user holding an address exactly, and none for another", async () => {
    await UserModel.create({ name: "Alice", email: "alice@example.com" });
    await UserModel.create({ name: "Bob", email: "bob@example.com" });

    expect(
      await users().findByEmail(normalizeEmail("bob@example.com")),
    ).toMatchObject({
      name: "Bob",
    });
    expect(
      await users().findByEmail(normalizeEmail("carol@example.com")),
    ).toBeNull();
  });

  it("does not match an address that differs in case", async () => {
    await UserModel.create({ name: "Alice", email: "alice@example.com" });

    expect(
      await users().findByEmail("Alice@example.com" as NormalizedEmail),
    ).toBeNull();
  });

  it("rejects a second account holding the same address", async () => {
    await UserModel.init();
    await UserModel.create({ name: "Alice", email: "alice@example.com" });

    await expect(
      UserModel.create({ name: "Twin", email: "alice@example.com" }),
    ).rejects.toMatchObject({ code: DUPLICATE_KEY_CODE });
  });
});
