/**
 * Dashboard tile registry — single source of truth for all available tiles.
 */

export type TileId =
  | "stats"
  | "pets"
  | "health"
  | "gamification"
  | "feeding"
  | "finance"
  | "reporting"
  | "calendar"
  | "notes";

export interface TileDefinition {
  id: TileId;
  label: string;
  emoji: string;
  accent: string;
}

export const TILE_DEFINITIONS: TileDefinition[] = [
  { id: "stats", label: "Quick Stats", emoji: "\uD83D\uDCCA", accent: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)" },
  { id: "pets", label: "Pets", emoji: "\uD83D\uDC3E", accent: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)" },
  { id: "health", label: "Health", emoji: "\uD83C\uDFE5", accent: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" },
  { id: "gamification", label: "Gamification", emoji: "\uD83C\uDFC6", accent: "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)" },
  { id: "feeding", label: "Feeding", emoji: "\uD83C\uDF7D\uFE0F", accent: "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)" },
  { id: "finance", label: "Finance", emoji: "\uD83D\uDCB0", accent: "linear-gradient(135deg, #10B981 0%, #059669 100%)" },
  { id: "reporting", label: "Reporting", emoji: "\uD83D\uDCCA", accent: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)" },
  { id: "calendar", label: "Calendar", emoji: "\uD83D\uDCC5", accent: "linear-gradient(135deg, #10B981 0%, #34D399 100%)" },
  { id: "notes", label: "Notes", emoji: "\uD83D\uDCDD", accent: "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)" },
];

export const DEFAULT_TILE_ORDER: TileId[] = [
  "stats", "pets", "health",
  "gamification", "feeding", "finance",
  "reporting", "calendar", "notes",
];

export const TILE_MAP = Object.fromEntries(
  TILE_DEFINITIONS.map((t) => [t.id, t])
) as Record<TileId, TileDefinition>;
