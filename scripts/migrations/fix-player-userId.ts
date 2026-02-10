/**
 * Fix Script: Normalize Player userId to ObjectId
 *
 * Problem: After migration, some userId fields were stored as strings
 * instead of ObjectId, causing query mismatches since the Player schema
 * now defines userId as Schema.Types.ObjectId.
 *
 * Fix: Convert all string userId values to ObjectId in the players collection.
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = MONGODB_URI?.match(/\/([^/?]+)(\?|$)/)?.[1] || 'test';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

async function fixPlayerUserId() {
  const client = new MongoClient(MONGODB_URI!);
  let fixed = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  try {
    await client.connect();
    const db = client.db(DATABASE_NAME);
    const playersCollection = db.collection('players');

    console.log(`🔧 Fixing Player userId types in database: ${DATABASE_NAME}\n`);

    const players = await playersCollection.find({ userId: { $exists: true } }).toArray();
    console.log(`Found ${players.length} players with userId\n`);

    for (const player of players) {
      try {
        if (typeof player.userId === 'string') {
          await playersCollection.updateOne(
            { _id: player._id },
            { $set: { userId: new ObjectId(player.userId) } }
          );
          fixed++;
          console.log(`  ✓ Fixed ${player.name}: string → ObjectId`);
        } else {
          alreadyCorrect++;
        }
      } catch (error) {
        errors++;
        console.error(`  ⚠️ Failed to fix ${player.name} (${player._id}): ${error}`);
      }
    }

    console.log(`\n✅ Done!`);
    console.log(`  - Fixed: ${fixed}`);
    console.log(`  - Already correct: ${alreadyCorrect}`);
    console.log(`  - Errors: ${errors}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixPlayerUserId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
