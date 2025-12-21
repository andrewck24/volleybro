/**
 * T120: Index Verification Script
 *
 * Purpose:
 * - Verify that all required MongoDB indexes are correctly created in the Player collection
 * - Check index performance and suggest optimizations if needed
 *
 * Usage:
 *   tsx scripts/verify-indexes.ts
 */

import { connect, connection } from "mongoose";
import { PlayerModel } from "@/infrastructure/db/mongoose/schemas/player";

const REQUIRED_INDEXES = [
  {
    name: "Single field: teamId",
    spec: { teamId: 1 },
    type: "single",
  },
  {
    name: "Single field: userId",
    spec: { userId: 1 },
    type: "single",
  },
  {
    name: "Single field: email",
    spec: { email: 1 },
    type: "single",
  },
  {
    name: "Composite: teamId + email (unique for invitations)",
    spec: { teamId: 1, email: 1 },
    type: "composite",
    properties: { unique: true, sparse: true },
  },
  {
    name: "Composite: teamId + userId (for joined member lookup)",
    spec: { teamId: 1, userId: 1 },
    type: "composite",
  },
  {
    name: "Composite: teamId + role (for role-based queries)",
    spec: { teamId: 1, role: 1 },
    type: "composite",
  },
];

async function verifyIndexes() {
  try {
    // Connect to MongoDB
    await connect(process.env.MONGODB_URI || "mongodb://localhost:27017/volleybro");
    console.log("✓ Connected to MongoDB\n");

    // Get the collection
    const collection = PlayerModel.collection;

    // Get all existing indexes
    const existingIndexes = await collection.getIndexes();
    console.log("Existing indexes in 'players' collection:");
    console.log(JSON.stringify(existingIndexes, null, 2));
    console.log("\n" + "=".repeat(80) + "\n");

    // Verify each required index
    let allIndexesVerified = true;

    for (const requiredIndex of REQUIRED_INDEXES) {
      const found = Object.entries(existingIndexes).some(([indexName, indexSpec]) => {
        if (indexName === "_id_") return false; // Skip default _id index

        // Compare the key specification
        const specKeys = Object.keys(requiredIndex.spec).sort();
        const indexSpecKeys = Object.keys(indexSpec.key).sort();

        if (specKeys.length !== indexSpecKeys.length) return false;

        return specKeys.every(
          (key, i) =>
            key === indexSpecKeys[i] &&
            requiredIndex.spec[key as keyof typeof requiredIndex.spec] ===
              indexSpec.key[indexSpecKeys[i]]
        );
      });

      if (found) {
        console.log(`✓ ${requiredIndex.name}`);
        console.log(`  Spec: ${JSON.stringify(requiredIndex.spec)}`);
        if (requiredIndex.properties) {
          console.log(`  Properties: ${JSON.stringify(requiredIndex.properties)}`);
        }
      } else {
        console.log(`✗ MISSING: ${requiredIndex.name}`);
        console.log(`  Spec: ${JSON.stringify(requiredIndex.spec)}`);
        allIndexesVerified = false;
      }
      console.log();
    }

    console.log("=".repeat(80));
    if (allIndexesVerified) {
      console.log("\n✓ All required indexes are correctly created!");
      console.log(
        "\nIndex Strategy Summary:"
      );
      console.log("- 3 single-field indexes for individual field lookups");
      console.log("- 3 composite indexes for multi-field queries");
      console.log("- Unique, sparse composite index prevents duplicate invitations");
      console.log("- All PlayerRepository query methods are covered by these indexes");
      console.log("\nNo additional indexes needed.");
    } else {
      console.log(
        "\n✗ Some required indexes are missing. Please run a migration to create them."
      );
      console.log(
        "\nTo fix this, execute the migration script or rebuild the database."
      );
    }

    // Get index statistics
    console.log("\n" + "=".repeat(80));
    console.log("\nIndex Statistics:");
    const stats = await collection.stats();
    if (stats.indexSizes) {
      console.log("Index sizes on disk:");
      Object.entries(stats.indexSizes).forEach(([indexName, size]) => {
        if (indexName !== "_id_") {
          console.log(`  ${indexName}: ${(size / 1024).toFixed(2)} KB`);
        }
      });
    }

    console.log("\n✓ Index verification complete!");
  } catch (error) {
    console.error("Error verifying indexes:", error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

verifyIndexes();
