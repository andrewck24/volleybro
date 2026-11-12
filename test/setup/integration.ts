import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => new Headers()),
}));

process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/integration-placeholder";

mongoose.set("transactionAsyncLocalStorage", true);

beforeAll(async () => {
  const name = `itest-${randomUUID()}`;
  await mongoose.connect(process.env.INTEGRATION_MONGODB_URI!, {
    dbName: name,
    appName: name,
  });
}, 60_000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
