import type { MongoMemoryReplSet } from "mongodb-memory-server";

export default async function globalTeardown() {
  await (globalThis as { __replSet?: MongoMemoryReplSet }).__replSet?.stop();
}
