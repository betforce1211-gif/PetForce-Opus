-- Add full-text search support using PostgreSQL tsvector generated columns + GIN indexes
-- Targets: pets (name, breed, color, medical_notes), activities (title, notes), pet_notes (title, content)

-- Pets: searchable on name, breed, color, medical_notes
ALTER TABLE "pets"
  ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("name", '') || ' ' ||
      coalesce("breed", '') || ' ' ||
      coalesce("color", '') || ' ' ||
      coalesce("medical_notes", '')
    )
  ) STORED;

CREATE INDEX "pets_search_idx" ON "pets" USING gin ("search_tsv");

-- Activities: searchable on title, notes
ALTER TABLE "activities"
  ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("title", '') || ' ' ||
      coalesce("notes", '')
    )
  ) STORED;

CREATE INDEX "activities_search_idx" ON "activities" USING gin ("search_tsv");

-- Pet Notes: searchable on title, content
ALTER TABLE "pet_notes"
  ADD COLUMN "search_tsv" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce("title", '') || ' ' ||
      coalesce("content", '')
    )
  ) STORED;

CREATE INDEX "pet_notes_search_idx" ON "pet_notes" USING gin ("search_tsv");
