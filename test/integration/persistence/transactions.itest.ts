import mongoose from "mongoose";

// Each test uses collections of its own: the cleanup between tests empties
// only the models' collections.
describe("transactions", () => {
  it("commits two writes together and reads both back", async () => {
    const db = mongoose.connection.db!;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await db.collection("tx_commit_a").insertOne({ n: 1 }, { session });
        await db.collection("tx_commit_b").insertOne({ n: 2 }, { session });
      });
    } finally {
      await session.endSession();
    }

    expect(await db.collection("tx_commit_a").countDocuments()).toBe(1);
    expect(await db.collection("tx_commit_b").countDocuments()).toBe(1);
  });

  it("keeps nothing a transaction wrote before it aborted", async () => {
    const db = mongoose.connection.db!;
    const session = await mongoose.startSession();
    await expect(
      session.withTransaction(async () => {
        await db.collection("tx_abort").insertOne({ n: 1 }, { session });
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");
    await session.endSession();

    expect(await db.collection("tx_abort").countDocuments()).toBe(0);
  });
});
