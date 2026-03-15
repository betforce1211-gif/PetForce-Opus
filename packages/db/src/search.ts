/**
 * Full-text search helpers for PostgreSQL tsvector/tsquery.
 * These use sql`` because FTS operations have no Drizzle ORM equivalent.
 */
import { sql } from "drizzle-orm";
import { db } from "./client.js";

export type SearchEntityType = "pet" | "activity" | "note";

export type SearchResultRow = {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  snippet: string | null;
  rank: number;
  created_at: string;
};

type SearchParams = {
  householdId: string;
  query: string;
  entityTypes: SearchEntityType[];
  limit: number;
  offset: number;
};

// eslint-disable-next-line no-restricted-syntax -- FTS requires sql template literals; no Drizzle ORM equivalent for tsvector/tsquery
const petSearchFragment = (householdId: string, tsquery: ReturnType<typeof sql>) => sql`
  SELECT
    id,
    'pet' AS entity_type,
    name AS title,
    coalesce(breed, '') AS snippet,
    ts_rank(search_tsv, ${tsquery}) AS rank,
    created_at
  FROM pets
  WHERE household_id = ${householdId}
    AND search_tsv @@ ${tsquery}
`;

// eslint-disable-next-line no-restricted-syntax -- FTS requires sql template literals; no Drizzle ORM equivalent for tsvector/tsquery
const activitySearchFragment = (householdId: string, tsquery: ReturnType<typeof sql>) => sql`
  SELECT
    id,
    'activity' AS entity_type,
    title,
    coalesce(notes, '') AS snippet,
    ts_rank(search_tsv, ${tsquery}) AS rank,
    created_at
  FROM activities
  WHERE household_id = ${householdId}
    AND search_tsv @@ ${tsquery}
`;

// eslint-disable-next-line no-restricted-syntax -- FTS requires sql template literals; no Drizzle ORM equivalent for tsvector/tsquery
const noteSearchFragment = (householdId: string, tsquery: ReturnType<typeof sql>) => sql`
  SELECT
    id,
    'note' AS entity_type,
    title,
    substring(content for 200) AS snippet,
    ts_rank(search_tsv, ${tsquery}) AS rank,
    created_at
  FROM pet_notes
  WHERE household_id = ${householdId}
    AND search_tsv @@ ${tsquery}
`;

const fragmentBuilders: Record<SearchEntityType, typeof petSearchFragment> = {
  pet: petSearchFragment,
  activity: activitySearchFragment,
  note: noteSearchFragment,
};

export async function fullTextSearch(params: SearchParams): Promise<{
  items: SearchResultRow[];
  totalCount: number;
}> {
  const { householdId, query, entityTypes, limit, offset } = params;

  if (entityTypes.length === 0) {
    return { items: [], totalCount: 0 };
  }

  // eslint-disable-next-line no-restricted-syntax -- FTS requires sql template literals; no Drizzle ORM equivalent for plainto_tsquery
  const tsquery = sql`plainto_tsquery('english', ${query})`;

  const unions = entityTypes.map((type) => fragmentBuilders[type](householdId, tsquery));

  const unionQuery = unions.reduce((acc, part, i) =>
    // eslint-disable-next-line no-restricted-syntax -- combining UNION ALL fragments
    i === 0 ? part : sql`${acc} UNION ALL ${part}`
  );

  // eslint-disable-next-line no-restricted-syntax -- wrapping union for ORDER BY / LIMIT
  const dataQuery = sql`
    SELECT * FROM (${unionQuery}) AS search_results
    ORDER BY rank DESC, created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // eslint-disable-next-line no-restricted-syntax -- wrapping union for COUNT
  const countQuery = sql`SELECT count(*)::int AS count FROM (${unionQuery}) AS search_results`;

  const [dataRows, countRows] = await Promise.all([
    db.execute(dataQuery),
    db.execute(countQuery),
  ]);

  const items = (dataRows as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    entity_type: row.entity_type as SearchEntityType,
    title: row.title as string,
    snippet: (row.snippet as string) || null,
    rank: row.rank as number,
    created_at: row.created_at as string,
  }));

  const totalCount = (countRows as Record<string, unknown>[])[0]!.count as number;

  return { items, totalCount };
}
