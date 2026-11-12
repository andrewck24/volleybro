import { execFileSync } from "node:child_process";
import mongoose from "mongoose";

describe("transactions", () => {
  it("loads transaction context before Next captures AsyncLocalStorage", () => {
    expect(() =>
      execFileSync(
        process.execPath,
        [
          "--import",
          new URL("../../setup/integration.preload.js", import.meta.url).href,
          "--input-type=module",
          "--eval",
          `import { AsyncLocalStorage } from "node:async_hooks";
import { workAsyncStorage } from "next/dist/server/app-render/work-async-storage.external.js";
if (!(workAsyncStorage instanceof AsyncLocalStorage)) process.exitCode = 1;`,
        ],
        { cwd: process.cwd(), env: { ...process.env, NODE_OPTIONS: "" } },
      ),
    ).not.toThrow();
  });

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
