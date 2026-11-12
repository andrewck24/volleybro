import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let betterAuthMongoClient: MongoClient;

if (process.env.NODE_ENV === "development") {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
  }
  betterAuthMongoClient = globalWithMongo._mongoClient;
} else {
  betterAuthMongoClient = new MongoClient(uri, options);
}

export default betterAuthMongoClient;
