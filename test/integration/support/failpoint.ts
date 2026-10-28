import mongoose from "mongoose";

// failCommand is one server-wide setting: configuring it replaces whatever
// another test file set, whatever appName that file named. Files take turns
// through a lock document; appName still keeps the failure off other files'
// connections while one file holds it.
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
  for (;;) {
    try {
      await locks.insertOne({ _id: "failCommand" });
      break;
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
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
    await admin.command({ configureFailPoint: "failCommand", mode: "off" });
    await locks.deleteOne({ _id: "failCommand" });
  }
}
