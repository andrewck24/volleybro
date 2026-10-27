import mongoose from "mongoose";

declare global {
  // On global so dev HMR module reloads share one in-flight connect.
  var _mongooseConnecting: Promise<unknown> | undefined;
}

const options = {};

// Writes inside connection.transaction() join its session without threading it through repositories.
mongoose.set("transactionAsyncLocalStorage", true);

export const connectToMongoDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // A second mongoose.connect while connecting returns before the connection
  // is ready, so concurrent cold-start requests share one in-flight connect.
  global._mongooseConnecting ??= mongoose.connect(uri, options).finally(() => {
    global._mongooseConnecting = undefined;
  });
  await global._mongooseConnecting;
  return mongoose.connection;
};
