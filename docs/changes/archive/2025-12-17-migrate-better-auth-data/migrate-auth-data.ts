/**
 * Migration script: Auth.js to Better Auth
 *
 * This script:
 * 1. Creates Profile records for each existing user
 * 2. Moves teams, info, preferences from User to Profile
 * 3. Converts emailVerified from Date to boolean
 * 4. Removes old fields from User
 */

import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectToMongoDB } from "@/infrastructure/db/mongoose/connect-to-mongodb";

// Load environment variables from .env.local and .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

interface OldUserDocument {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  teams?: {
    joined: mongoose.Types.ObjectId[];
    inviting: mongoose.Types.ObjectId[];
  };
  info?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ProfileDocument {
  userId: string;
  teams: {
    joined: string[];
    inviting: string[];
  };
  info?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

async function migrateAuthData() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set");
  }

  console.log("🚀 Starting migration: Auth.js → Better Auth");

  try {
    // Connect to MongoDB
    await connectToMongoDB();
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Failed to get database connection");
    }

    const usersCollection = db.collection("users");
    const profilesCollection = db.collection("profiles");

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📦 Found ${users.length} users to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        const userId = user._id.toString();

        // Create profile record
        const profileData: ProfileDocument = {
          userId,
          teams: {
            joined: (user.teams?.joined || []).map((id: any) => id.toString()),
            inviting: (user.teams?.inviting || []).map((id: any) =>
              id.toString()
            ),
          },
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        };

        // Move optional fields if they exist
        if (user.info) {
          profileData.info = user.info;
        }
        if (user.preferences) {
          profileData.preferences = user.preferences;
        }

        // Insert or update profile
        await profilesCollection.updateOne(
          { userId },
          { $set: profileData },
          { upsert: true }
        );

        // Update user: remove old fields, convert emailVerified to boolean
        const updateData: any = {
          $unset: {
            teams: "",
            info: "",
            preferences: "",
            password: "", // Remove password field (not used)
          },
        };

        // Convert emailVerified from Date to boolean
        if (user.emailVerified) {
          updateData.$set = {
            emailVerified: true,
          };
        } else {
          updateData.$set = {
            emailVerified: false,
          };
        }

        await usersCollection.updateOne({ _id: user._id }, updateData);

        successCount++;
        console.log(`✓ Migrated user: ${user.email}`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to migrate user ${user._id}: ${error}`);
      }
    }

    console.log(`\n📊 Migration complete:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log(`\n✨ All users successfully migrated!`);
    } else {
      console.warn(`\n⚠️  ${errorCount} users failed to migrate`);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrateAuthData();
