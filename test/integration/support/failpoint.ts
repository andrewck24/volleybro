import mongoose from "mongoose";

// failCommand is one server-wide setting: configuring it replaces whatever
// another test file set, whatever appName that file named, so files take turns.
export async function withFailPoint<T>(
  mode: "alwaysOn" | { times: number },
  data: { failCommands: string[]; errorCode: number; errorLabels?: string[] },
  run: () => Promise<T>,
): Promise<T> {
  const client = mongoose.connection.getClient();
  const admin = mongoose.connection.db!.admin();
  const locks = client
    .db("itest-locks")
    .collection<{ _id: string }>("failpoints");
  // Under Jest's 5s test timeout, so a stuck lock fails with its own reason.
  const deadline = Date.now() + 4_000;
  for (;;) {
    try {
      await locks.insertOne({ _id: "failCommand" });
      break;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
      if (Date.now() > deadline)
        throw new Error("Another test file never released the failpoint lock");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  try {
    await admin.command({
      configureFailPoint: "failCommand",
      mode,
      data: { ...data, appName: client.options.appName },
    });
    return await run();
  } finally {
    try {
      await admin.command({ configureFailPoint: "failCommand", mode: "off" });
    } finally {
      await locks.deleteOne({ _id: "failCommand" });
    }
  }
}
