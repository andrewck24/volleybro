import { MongoMemoryServer } from "mongodb-memory-server";
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

// Real in-memory MongoDB per Jest worker file: each file gets its own server on
// a random port, so parallel workers never share state. This is the seam the
// mongoose-mocked `backend` project cannot exercise (route -> usecase -> repo -> DB).
let mongod: MongoMemoryServer;

// Modules imported by the DI container (Better Auth's Mongo adapter) read
// MONGODB_URI at import time; give them a placeholder before the real server
// starts. The placeholder client is lazy and never connects — auth is stubbed.
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/integration-placeholder";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGODB_URI);
}, 60_000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
