-- Rollback: 0007_add-full-text-search.sql
-- Reverses: Full-text search tsvector columns and GIN indexes

-- Drop GIN indexes
DROP INDEX IF EXISTS "pet_notes_search_idx";
DROP INDEX IF EXISTS "activities_search_idx";
DROP INDEX IF EXISTS "pets_search_idx";

-- Drop generated tsvector columns
ALTER TABLE "pet_notes" DROP COLUMN IF EXISTS "search_tsv";
ALTER TABLE "activities" DROP COLUMN IF EXISTS "search_tsv";
ALTER TABLE "pets" DROP COLUMN IF EXISTS "search_tsv";
