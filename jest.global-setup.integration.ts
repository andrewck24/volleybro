import { MongoBinary } from "mongodb-memory-server";

// Resolved once here rather than left to each file's beforeAll: Jest runs test
// files in parallel workers, and mongodb-memory-server's own lockfile does not
// serialize concurrent first-time downloads of the same binary version, so
// several beforeAll hooks racing the download can crash with "not locked by
// this process". Resolving (and downloading if needed) before any worker
// starts leaves every beforeAll finding the binary already cached.
export default async function globalSetup() {
  await MongoBinary.getPath({});
}
