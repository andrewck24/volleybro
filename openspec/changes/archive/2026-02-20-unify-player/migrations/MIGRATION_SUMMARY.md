# Migration Summary: Unified Player Entity

**Date**: 2026-02-08
**Branch**: 001-unify-player
**Status**: ✅ Completed

## Overview

Successfully migrated from old Member/Team.members structure to the new unified Player entity model.

## What Was Migrated

### Source Data
1. **Team.members array** (27 members)
   - Joined members with `user_id`
   - Invited members with email only
   - Role stored as number (0=MEMBER, 1=OWNER, 2=ADMIN)

2. **Members collection** (27 documents)
   - Pure players without userId
   - Contained: name, number, position, team_id

### Target Structure
- **Players collection** (54 documents total)
  - Unified entity for all player types
  - State inferred from fields:
    - JOINED: has userId
    - INVITED: has email but no userId
    - PURE_PLAYER: neither email nor userId

## Migration Steps Executed

1. **Step 1**: Migrated 27 Team.members → Player documents
   - Converted numeric roles to string enum (OWNER, ADMIN, MEMBER)
   - Preserved email and userId where available
   - Generated fallback names from email

2. **Step 2**: Migrated 27 Members collection → Player documents
   - Transferred pure players with team_id, name, number, position
   - All set to MEMBER role

3. **Step 3**: Cleaned up 0 existing Players (none existed before migration)

4. **Step 4**: Removed Team.members array from 4 teams
   - Also removed deprecated Team.matches field

5. **Step 5**: Dropped old Members collection

6. **Step 6**: Removed Profile.teams object from 8 profiles

## Results

- ✅ **54 Player documents created**
- ✅ **4 Team documents updated** (members array removed)
- ✅ **8 Profile documents updated** (teams object removed)
- ✅ **Members collection dropped**
- ✅ **0 errors encountered**

## Verification

Run validation script to verify migration:
```bash
npx tsx scripts/migrations/validate-migration.ts
```

## Rollback Plan

⚠️ **No automated rollback available**

If rollback is needed:
1. Restore database from backup before migration
2. Or manually reconstruct Team.members from Player documents

## Files Modified

- `scripts/migrations/migrate-to-unified-player.ts` - Enhanced with full migration logic
- `scripts/migrations/check-existing-data.ts` - Added for data inspection

## Breaking Changes

- ❌ `Team.members` array no longer exists
- ❌ `Members` collection no longer exists
- ❌ `Profile.teams` object no longer exists
- ✅ All member/player data now in `Players` collection
- ✅ Access via `PlayerRepository.findByTeamId(teamId)`

## Post-Migration Fix: userId Type Normalization

**Date**: 2026-02-10
**Script**: `scripts/migrations/fix-player-userId.ts`

### Problem
The migration script stored `userId` with its original type from `Team.members.user_id`.
The Player schema was updated to define `userId` as `Schema.Types.ObjectId` (ref: "User")
to be consistent with the User collection's `_id` type.

### Schema Change
```typescript
// Before (String)
userId: { type: String }

// After (ObjectId)
userId: { type: Schema.Types.ObjectId, ref: "User" }
```

### Fix Result
- 6 players with userId found
- 0 needed fixing (all were already ObjectId from the migration)
- PlayerRepository updated with `userId: obj.userId?.toString()` in `toPlayer()` for Entity layer conversion

## Notes

- Migration script automatically detects database name from MONGODB_URI
- Handles both joined members (with userId) and invited members (email only)
- Preserves all existing player data (name, number, position, role)
- Creates proper timestamps for all new Player documents
- `userId` is stored as ObjectId in MongoDB, converted to string at the repository layer