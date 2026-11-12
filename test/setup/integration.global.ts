import { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1 },
    instanceOpts: [
      {
        launchTimeout: 60_000,
        args: ["--setParameter", "enableTestCommands=1"],
      },
    ],
  });
  (globalThis as { __replSet?: MongoMemoryReplSet }).__replSet = replSet;
  process.env.INTEGRATION_MONGODB_URI = replSet.getUri();
}
