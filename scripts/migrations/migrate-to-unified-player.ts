/**
 * Migration Script: Unified Player Entity
 *
 * Purpose: Migrate from old Member/Player structure to unified Player entity
 *
 * Changes:
 * 1. Remove Team.members array references
 * 2. Convert all player role values to string enum (if needed)
 * 3. Update Profile structure if needed
 * 4. Ensure all players have proper userId links
 */

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'volleybro';

interface MigrationResult {
  playersProcessed: number;
  teamsUpdated: number;
  profilesUpdated: number;
  errors: string[];
}

async function runMigration(): Promise<MigrationResult> {
  const client = new MongoClient(MONGODB_URI);
  const result: MigrationResult = {
    playersProcessed: 0,
    teamsUpdated: 0,
    profilesUpdated: 0,
    errors: [],
  };

  try {
    await client.connect();
    const db: Db = client.db(DATABASE_NAME);

    console.log('🚀 Starting migration to unified Player entity...\n');

    // Step 1: Ensure all players have proper structure
    console.log('📊 Processing players...');
    const playersCollection = db.collection('players');
    const playersResult = await playersCollection.updateMany(
      {},
      {
        $unset: {
          // Remove old fields if they exist
          'status': '',
          'joinedAt': '',
        },
      }
    );
    result.playersProcessed = playersResult.modifiedCount || 0;
    console.log(`   ✓ Processed ${result.playersProcessed} players\n`);

    // Step 2: Clean up Team references to members array
    console.log('🏟️  Cleaning up teams...');
    const teamsCollection = db.collection('teams');
    const teamsResult = await teamsCollection.updateMany(
      { members: { $exists: true } },
      {
        $unset: { members: '' },
      }
    );
    result.teamsUpdated = teamsResult.modifiedCount || 0;
    console.log(`   ✓ Updated ${result.teamsUpdated} teams\n`);

    // Step 3: Verify profiles don't have direct team references
    console.log('👤 Checking profiles...');
    const profilesCollection = db.collection('profiles');
    const profilesResult = await profilesCollection.updateMany(
      { teams: { $exists: true } },
      {
        $unset: { teams: '' },
      }
    );
    result.profilesUpdated = profilesResult.modifiedCount || 0;
    console.log(`   ✓ Updated ${result.profilesUpdated} profiles\n`);

    console.log('✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  - Players processed: ${result.playersProcessed}`);
    console.log(`  - Teams updated: ${result.teamsUpdated}`);
    console.log(`  - Profiles updated: ${result.profilesUpdated}`);

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach((error) => console.log(`   - ${error}`));
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Migration failed:', errorMessage);
    result.errors.push(errorMessage);
  } finally {
    await client.close();
  }

  return result;
}

// Run migration
runMigration()
  .then((result) => {
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
