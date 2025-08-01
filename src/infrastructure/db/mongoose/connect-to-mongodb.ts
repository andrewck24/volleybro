import mongoose, { Connection } from "mongoose";

// Create Connection
let dbConnection: Connection;
const options = {};

export const connectToMongoDB = async () => {
  // Check URI
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to env");

  if (mongoose.connection.readyState === 1) {
    // If there's already a connection, use it
    dbConnection = mongoose.connection;
  } else {
    if (process.env.NODE_ENV === "development") {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      if (!global._mongooseConnect) {
        global._mongooseConnect = await mongoose.connect(uri, options);
      }
      dbConnection = global._mongooseConnect;
    } else {
      // In production mode, it's best to not use a global variable.
      await mongoose.connect(uri, options);
      dbConnection = mongoose.connection;
    }
  }

  return dbConnection;
};
