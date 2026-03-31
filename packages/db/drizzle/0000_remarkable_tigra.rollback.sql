-- Rollback: 0000_remarkable_tigra.sql
-- Reverses: Initial schema — core tables, foreign keys
-- WARNING: This will DROP all core tables and their data. Use with extreme caution.

-- Drop foreign key constraints first (reverse order of creation)
ALTER TABLE "pets" DROP CONSTRAINT IF EXISTS "pets_household_id_households_id_fk";
ALTER TABLE "members" DROP CONSTRAINT IF EXISTS "members_household_id_households_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_invited_by_members_id_fk";
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "invitations_household_id_households_id_fk";
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_member_id_members_id_fk";
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_pet_id_pets_id_fk";
ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "activities_household_id_households_id_fk";
ALTER TABLE "access_requests" DROP CONSTRAINT IF EXISTS "access_requests_reviewed_by_members_id_fk";
ALTER TABLE "access_requests" DROP CONSTRAINT IF EXISTS "access_requests_household_id_households_id_fk";

-- Drop tables (reverse order — dependents first)
DROP TABLE IF EXISTS "access_requests";
DROP TABLE IF EXISTS "invitations";
DROP TABLE IF EXISTS "activities";
DROP TABLE IF EXISTS "pets";
DROP TABLE IF EXISTS "members";
DROP TABLE IF EXISTS "households";
