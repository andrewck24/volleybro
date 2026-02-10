/**
 * Migration Script: Unified Player Entity
 *
 * Purpose: Migrate from old Member/Player structure to unified Player entity
 *
 * Migration Steps:
 * 1. Migrate Team.members array to Player documents (JOINED players with userId)
 * 2. Migrate Members collection to Player documents (PURE_PLAYER without userId)
 * 3. Clean up existing Players collection (remove old fields)
 * 4. Remove Team.members array
 * 5. Drop old Members collection
 * 6. Remove Profile.teams object
 */

import { MongoClient, Db, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
// Extract database name from URI (e.g., mongodb://host/test?... → "test")
const DATABASE_NAME = MONGODB_URI?.match(/\/([^/?]+)(\?|$)/)?.[1] || 'test';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

interface MigrationResult {
  teamMembersToPlayers: number;
  oldMembersToPlayers: number;
  playersProcessed: number;
  teamsUpdated: number;
  profilesUpdated: number;
  errors: string[];
}

// Role mapping: old numeric role to new string enum
const ROLE_MAP: Record<number, string> = {
  0: 'MEMBER',
  1: 'OWNER',
  2: 'ADMIN',
};

async function runMigration(): Promise<MigrationResult> {
  const client = new MongoClient(MONGODB_URI!);
  const result: MigrationResult = {
    teamMembersToPlayers: 0,
    oldMembersToPlayers: 0,
    playersProcessed: 0,
    teamsUpdated: 0,
    profilesUpdated: 0,
    errors: [],
  };

  try {
    await client.connect();
    const db: Db = client.db(DATABASE_NAME);

    console.log(`🚀 Starting migration to unified Player entity...`);
    console.log(`📊 Database: ${DATABASE_NAME}\n`);

    const teamsCollection = db.collection('teams');
    const membersCollection = db.collection('members');
    const playersCollection = db.collection('players');
    const profilesCollection = db.collection('profiles');

    // Step 1: Migrate Team.members to Player documents
    console.log('Step 1/6: Migrating Team.members to Players...');
    const teams = await teamsCollection.find({ members: { $exists: true } }).toArray();

    for (const team of teams) {
      if (!team.members || !Array.isArray(team.members)) continue;

      for (const member of team.members) {
        try {
          // Create Player document from Team.member
          const playerDoc: Record<string, unknown> = {
            teamId: new ObjectId(team._id),
            email: member.email,
            name: member.email?.split('@')[0] || 'Unknown', // Extract name from email as fallback
            role: ROLE_MAP[member.role] || 'MEMBER',
            createdAt: team.createdAt || new Date(),
            updatedAt: new Date(),
          };

          // Add userId if member has joined (user_id exists)
          if (member.user_id) {
            playerDoc.userId = member.user_id;
          }

          await playersCollection.insertOne(playerDoc);
          result.teamMembersToPlayers++;
        } catch (error) {
          const errorMsg = `Failed to migrate team member ${member._id}: ${error}`;
          console.error(`   ⚠️  ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    }
    console.log(`   ✓ Migrated ${result.teamMembersToPlayers} team members to Players\n`);

    // Step 2: Migrate old Members collection to Player documents
    console.log('Step 2/6: Migrating Members collection to Players...');
    const collections = await db.listCollections({ name: 'members' }).toArray();
    const hasMembersCollection = collections.length > 0;

    if (hasMembersCollection) {
      const members = await membersCollection.find({}).toArray();

      for (const member of members) {
        try {
          // Create Player document from old Member (pure player without userId)
          const playerDoc: Record<string, unknown> = {
            teamId: new ObjectId(member.team_id),
            name: member.name,
            role: 'MEMBER', // Pure players are always members
            createdAt: member.createdAt || new Date(),
            updatedAt: new Date(),
          };

          // Add optional fields if they exist
          if (member.number !== undefined) playerDoc.number = member.number;
          if (member.position) playerDoc.position = member.position;

          await playersCollection.insertOne(playerDoc);
          result.oldMembersToPlayers++;
        } catch (error) {
          const errorMsg = `Failed to migrate member ${member._id}: ${error}`;
          console.error(`   ⚠️  ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
      console.log(`   ✓ Migrated ${result.oldMembersToPlayers} old members to Players\n`);
    } else {
      console.log(`   ℹ️  Members collection does not exist, skipping\n`);
    }

    // Step 3: Clean up existing Players collection
    console.log('Step 3/6: Cleaning up existing Players...');
    const playersResult = await playersCollection.updateMany(
      {},
      {
        $unset: {
          // Remove old fields if they exist
          status: '',
          joinedAt: '',
        },
      }
    );
    result.playersProcessed = playersResult.modifiedCount || 0;
    console.log(`   ✓ Processed ${result.playersProcessed} players\n`);

    // Step 4: Remove Team.members array and deprecated fields
    console.log('Step 4/6: Cleaning up Team.members array...');
    const teamsResult = await teamsCollection.updateMany(
      { members: { $exists: true } },
      {
        $unset: {
          members: '',
          matches: '', // Also remove deprecated matches field
        },
      }
    );
    result.teamsUpdated = teamsResult.modifiedCount || 0;
    console.log(`   ✓ Updated ${result.teamsUpdated} teams\n`);

    // Step 5: Drop old Members collection
    console.log('Step 5/6: Dropping old Members collection...');
    if (hasMembersCollection) {
      try {
        await membersCollection.drop();
        console.log(`   ✓ Dropped Members collection\n`);
      } catch (error) {
        console.log(`   ⚠️  Failed to drop Members collection: ${error}\n`);
      }
    } else {
      console.log(`   ℹ️  Members collection does not exist, skipping\n`);
    }

    // Step 6: Remove Profile.teams object
    console.log('Step 6/6: Cleaning up Profile.teams object...');
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
    console.log(`  - Team members → Players: ${result.teamMembersToPlayers}`);
    console.log(`  - Old members → Players: ${result.oldMembersToPlayers}`);
    console.log(`  - Total Players created: ${result.teamMembersToPlayers + result.oldMembersToPlayers}`);
    console.log(`  - Players cleaned up: ${result.playersProcessed}`);
    console.log(`  - Teams updated: ${result.teamsUpdated}`);
    console.log(`  - Profiles updated: ${result.profilesUpdated}`);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
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
