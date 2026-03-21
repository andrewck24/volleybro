/**
 * Validation Script: Verify Unified Player Migration
 *
 * Checks:
 * 1. No Team documents have members array
 * 2. No Profile documents have teams array
 * 3. All players have required fields (name, teamId, role)
 * 4. No orphaned players (players without team)
 * 5. Data consistency checks
 */

import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'volleybro';

interface ValidationResult {
  isValid: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

async function validateMigration(): Promise<ValidationResult> {
  const client = new MongoClient(MONGODB_URI);
  const result: ValidationResult = {
    isValid: true,
    checks: [],
  };

  try {
    await client.connect();
    const db: Db = client.db(DATABASE_NAME);

    console.log('🔍 Validating unified Player migration...\n');

    // Check 1: Teams should not have members array
    console.log('Check 1/5: Verifying teams structure...');
    const teamsWithMembers = await db
      .collection('teams')
      .countDocuments({ members: { $exists: true } });

    const check1 = {
      name: 'Teams without members array',
      passed: teamsWithMembers === 0,
      message: `Found ${teamsWithMembers} teams with members array (should be 0)`,
    };
    result.checks.push(check1);
    if (!check1.passed) result.isValid = false;
    console.log(`   ${check1.passed ? '✓' : '✗'} ${check1.message}\n`);

    // Check 2: Profiles should not have teams array
    console.log('Check 2/5: Verifying profiles structure...');
    const profilesWithTeams = await db
      .collection('profiles')
      .countDocuments({ teams: { $exists: true } });

    const check2 = {
      name: 'Profiles without teams array',
      passed: profilesWithTeams === 0,
      message: `Found ${profilesWithTeams} profiles with teams array (should be 0)`,
    };
    result.checks.push(check2);
    if (!check2.passed) result.isValid = false;
    console.log(`   ${check2.passed ? '✓' : '✗'} ${check2.message}\n`);

    // Check 3: All players have required fields
    console.log('Check 3/5: Verifying player documents...');
    const playersCollection = db.collection('players');
    const playersWithoutRequired = await playersCollection.countDocuments({
      $or: [{ name: { $exists: false } }, { teamId: { $exists: false } }, { role: { $exists: false } }],
    });

    const check3 = {
      name: 'Players have required fields',
      passed: playersWithoutRequired === 0,
      message: `Found ${playersWithoutRequired} players missing required fields (should be 0)`,
    };
    result.checks.push(check3);
    if (!check3.passed) result.isValid = false;
    console.log(`   ${check3.passed ? '✓' : '✗'} ${check3.message}\n`);

    // Check 4: No orphaned players
    console.log('Check 4/5: Checking for orphaned players...');
    const teamsCollection = db.collection('teams');
    const teamIds = await teamsCollection.distinct('_id');
    const orphanedPlayers = await playersCollection.countDocuments({
      teamId: { $nin: teamIds },
    });

    const check4 = {
      name: 'No orphaned players',
      passed: orphanedPlayers === 0,
      message: `Found ${orphanedPlayers} orphaned players (should be 0)`,
    };
    result.checks.push(check4);
    if (!check4.passed) result.isValid = false;
    console.log(`   ${check4.passed ? '✓' : '✗'} ${check4.message}\n`);

    // Check 5: Valid role values
    console.log('Check 5/5: Verifying role values...');
    const validRoles = ['OWNER', 'ADMIN', 'MEMBER'];
    const invalidRoles = await playersCollection.countDocuments({
      role: { $nin: validRoles },
    });

    const check5 = {
      name: 'Valid role values',
      passed: invalidRoles === 0,
      message: `Found ${invalidRoles} players with invalid roles (should be 0)`,
    };
    result.checks.push(check5);
    if (!check5.passed) result.isValid = false;
    console.log(`   ${check5.passed ? '✓' : '✗'} ${check5.message}\n`);

    // Summary
    console.log('📋 Validation Summary:');
    console.log(`   Status: ${result.isValid ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Checks: ${result.checks.filter((c) => c.passed).length}/${result.checks.length} passed\n`);

    if (!result.isValid) {
      console.log('⚠️  Migration validation failed. Please review the errors above.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Validation failed:', errorMessage);
    result.isValid = false;
  } finally {
    await client.close();
  }

  return result;
}

// Run validation
validateMigration()
  .then((result) => {
    process.exit(result.isValid ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
