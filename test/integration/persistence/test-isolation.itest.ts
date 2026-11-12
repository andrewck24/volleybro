import mongoose from "mongoose";

import { useFakeAuth } from "../support/auth";
import { seedGame } from "../support/seed";

describe("each test starts from empty collections", () => {
  beforeEach(() => useFakeAuth());

  it("writes a game", async () => {
    await seedGame();
    expect(await mongoose.connection.collection("games").countDocuments()).toBe(
      1,
    );
  });

  it("finds nothing the previous test wrote", async () => {
    expect(await mongoose.connection.collection("games").countDocuments()).toBe(
      0,
    );
  });
});
