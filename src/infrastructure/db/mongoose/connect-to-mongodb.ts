import mongoose, { type Mongoose } from "mongoose";

declare global {
  var _mongooseInstance: Mongoose | undefined;
}

const options = {};

export const connectToMongoDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    if (!global._mongooseInstance) {
      global._mongooseInstance = await mongoose.connect(uri, options);
    }
    return global._mongooseInstance.connection;
  }

  // In production mode, it's best to not use a global variable.
  await mongoose.connect(uri, options);
  return mongoose.connection;
};
