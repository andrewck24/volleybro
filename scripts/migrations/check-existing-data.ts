/**
 * Check Existing Data Script
 *
 * Purpose: Inspect current database structure to understand what needs to be migrated
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
// Extract database name from URI or use default
const DATABASE_NAME = MONGODB_URI?.match(/\/([^/?]+)(\?|$)/)?.[1] || "test";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in environment variables");
  process.exit(1);
}

async function checkExistingData() {
  const client = new MongoClient(MONGODB_URI!);

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);

    console.log(`🔍 Checking existing data structure in database: ${DATABASE_NAME}\n`);

    // Check teams collection
    console.log("📋 Teams Collection:");
    const teamsCollection = db.collection("teams");
    const sampleTeam = await teamsCollection.findOne({});
    console.log("Sample team:", JSON.stringify(sampleTeam, null, 2));

    const teamsWithMembers = await teamsCollection.countDocuments({
      members: { $exists: true },
    });
    console.log(`Teams with members array: ${teamsWithMembers}\n`);

    // Check players collection
    console.log("👥 Players Collection:");
    const playersCollection = db.collection("players");
    const playerCount = await playersCollection.countDocuments({});
    console.log(`Total players: ${playerCount}`);

    const samplePlayer = await playersCollection.findOne({});
    console.log("Sample player:", JSON.stringify(samplePlayer, null, 2));
    console.log();

    // Check members collection (if exists)
    console.log("🔍 Members Collection:");
    const collections = await db.listCollections().toArray();
    const hasMembersCollection = collections.some((c) => c.name === "members");

    if (hasMembersCollection) {
      const membersCollection = db.collection("members");
      const memberCount = await membersCollection.countDocuments({});
      console.log(`Total members: ${memberCount}`);

      const sampleMember = await membersCollection.findOne({});
      console.log("Sample member:", JSON.stringify(sampleMember, null, 2));
    } else {
      console.log("Members collection does not exist");
    }
    console.log();

    // Check profiles collection
    console.log("👤 Profiles Collection:");
    const profilesCollection = db.collection("profiles");
    const profileCount = await profilesCollection.countDocuments({});
    console.log(`Total profiles: ${profileCount}`);

    const sampleProfile = await profilesCollection.findOne({});
    console.log("Sample profile:", JSON.stringify(sampleProfile, null, 2));
    console.log();
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

checkExistingData()
  .then(() => {
    console.log("✅ Data check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
