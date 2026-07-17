# Database Migrations

This directory contains database migration scripts for the VolleyBro project.

## Completed Migrations

### NextAuth.js to Better Auth Migration (2024-12-12)

**Script**: `migrate-auth-data.ts`

**Purpose**: Migrated authentication system from NextAuth.js v5 to Better Auth

**Changes**:

1. Created `Profile` collection to store user business data
2. Moved `teams`, `info`, and `preferences` from `User` to `Profile`
3. Converted `emailVerified` from Date to boolean in `User` collection
4. Removed `password` field from `User` (not used in OAuth-only setup)

**How to run** (if needed again):

```bash
npm run migrate:auth
```

**Status**: ✅ Completed - Do not run again unless restoring from backup

## Notes

- Migration scripts are kept for historical reference and documentation
- Do not run completed migrations on production data
- Always backup database before running any migration
