import mongoose from "mongoose";

declare global {
  var _mongooseConnecting: Promise<unknown> | undefined;
}

const options = {};

mongoose.set("transactionAsyncLocalStorage", true);

export const connectToMongoDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  global._mongooseConnecting ??= mongoose.connect(uri, options).finally(() => {
    global._mongooseConnecting = undefined;
  });
  await global._mongooseConnecting;
  return mongoose.connection;
};
