import { MongoMemoryReplSet } from "mongodb-memory-server";

// One replica set for the whole run (ADR-0087), started here in Jest's own
// process: inside a test environment the driver that initiates it cannot
// complete its handshake. Workers inherit its URI; each test file then works
// in a database of its own.
export default async function globalSetup() {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  (globalThis as { __replSet?: MongoMemoryReplSet }).__replSet = replSet;
  process.env.INTEGRATION_MONGODB_URI = replSet.getUri();
}
