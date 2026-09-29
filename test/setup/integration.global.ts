import { MongoMemoryReplSet } from "mongodb-memory-server";

// Started in Jest's own process: inside a test environment the driver that
// initiates a replica set cannot complete its handshake. verify:all runs this
// beside the app build, where mongod can outlast the default launch timeout.
export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [
      {
        launchTimeout: 60_000,
        // configureFailPoint, for tests that make one database command fail.
        args: ["--setParameter", "enableTestCommands=1"],
      },
    ],
  });
  (globalThis as { __replSet?: MongoMemoryReplSet }).__replSet = replSet;
  process.env.INTEGRATION_MONGODB_URI = replSet.getUri();
}
