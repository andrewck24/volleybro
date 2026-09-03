import { MongoBinary } from "mongodb-memory-server";

// Before any worker starts, because the library's own lockfile does not
// serialize a first-time download across parallel workers -- several
// beforeAll hooks racing it crash with "not locked by this process".
export default async function globalSetup() {
  await MongoBinary.getPath({});
}
