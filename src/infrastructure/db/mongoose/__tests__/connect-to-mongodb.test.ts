import mongoose from "mongoose";
import { deferred } from "@test/support/gates";

jest.unmock("@/infrastructure/db/mongoose/connect-to-mongodb");

import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

describe("connectToMongoDB", () => {
  beforeEach(() => {
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1/test";
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("connects once for concurrent calls while the first is in flight", async () => {
    const connect = jest
      .spyOn(mongoose, "connect")
      .mockImplementation(async () => mongoose);

    await Promise.all([connectToMongoDB(), connectToMongoDB()]);

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it("shares one in-flight connect with a reloaded copy of the module", async () => {
    const loadCopy = () => {
      let copy!: { connect: typeof connectToMongoDB; spy: jest.SpyInstance };
      jest.isolateModules(() => {
        const isolatedMongoose =
          jest.requireActual<typeof mongoose>("mongoose");
        const spy = jest
          .spyOn(isolatedMongoose, "connect")
          .mockImplementation(async () => isolatedMongoose);
        const loaded = jest.requireActual<{
          connectToMongoDB: typeof connectToMongoDB;
        }>("@/infrastructure/db/mongoose/connect-to-mongodb");
        copy = { connect: loaded.connectToMongoDB, spy };
      });
      return copy;
    };
    const first = loadCopy();
    const second = loadCopy();

    await Promise.all([first.connect(), second.connect()]);

    expect(first.spy.mock.calls.length + second.spy.mock.calls.length).toBe(1);
  });

  it("holds every concurrent caller until the shared connect settles", async () => {
    const gate = deferred();
    jest.spyOn(mongoose, "connect").mockImplementation(async () => {
      await gate.promise;
      return mongoose;
    });
    const settled: string[] = [];

    const calls = [connectToMongoDB(), connectToMongoDB()].map((call, i) =>
      call.then(() => settled.push(`caller ${i}`)),
    );
    await Promise.resolve();
    expect(settled).toEqual([]);

    gate.release();
    await Promise.all(calls);

    expect(settled).toHaveLength(2);
  });

  it("retries on the next call after a failed connect", async () => {
    const connect = jest
      .spyOn(mongoose, "connect")
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(mongoose);

    await expect(connectToMongoDB()).rejects.toThrow("down");
    await connectToMongoDB();

    expect(connect).toHaveBeenCalledTimes(2);
  });
});
