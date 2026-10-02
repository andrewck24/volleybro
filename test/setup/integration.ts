import { randomUUID } from "node:crypto";

import mongoose from "mongoose";

// The DI container eagerly imports the real AuthenticationService, which pulls in
// Better Auth (ESM, untransformed by Jest) and next/headers. Integration tests
// swap the auth services via DI (see test/integration/support/auth.ts), so the
// real implementations only need to be importable, never executed.
jest.mock("@/lib/auth", () => ({
  auth: { api: { getSession: jest.fn() } },
}));
jest.mock("next/headers", () => ({
  headers: jest.fn(async () => new Headers()),
}));

// Modules imported by the DI container (Better Auth's Mongo adapter) read
// MONGODB_URI at import time; give them a placeholder before connecting. The
// placeholder client is lazy and never connects — auth is stubbed.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/integration-placeholder";

beforeAll(async () => {
  const name = `itest-${randomUUID()}`;
  // appName lets a failpoint target this file's connection alone.
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
