import { useState, useCallback, useEffect } from "react";
import { type TileId, DEFAULT_TILE_ORDER } from "./dashboard-tiles";

const STORAGE_KEY = "petforce_dashboard_layout";

export interface DashboardLayout {
  order: TileId[];
  hidden: TileId[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
  order: DEFAULT_TILE_ORDER,
  hidden: [],
};

function loadLayout(): DashboardLayout {
  if (typeof window === "undefined") return DEFAULT_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as DashboardLayout;
    // Ensure any new tiles added later are included
    const knownIds = new Set(parsed.order);
    for (const id of DEFAULT_TILE_ORDER) {
      if (!knownIds.has(id)) {
        parsed.order.push(id);
      }
    }
    // Remove tiles that no longer exist
    const validIds = new Set<TileId>(DEFAULT_TILE_ORDER);
    parsed.order = parsed.order.filter((id) => validIds.has(id));
    parsed.hidden = parsed.hidden.filter((id) => validIds.has(id));
    return parsed;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  const persist = useCallback((next: DashboardLayout) => {
    setLayout(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const visibleTiles = layout.order.filter((id) => !layout.hidden.includes(id));

  const moveTile = useCallback(
    (fromIndex: number, toIndex: number) => {
      const next = [...layout.order];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persist({ ...layout, order: next });
    },
    [layout, persist]
  );

  const toggleTile = useCallback(
    (tileId: TileId) => {
      const hidden = layout.hidden.includes(tileId)
        ? layout.hidden.filter((id) => id !== tileId)
        : [...layout.hidden, tileId];
      persist({ ...layout, hidden });
    },
    [layout, persist]
  );

  const resetLayout = useCallback(() => {
    persist(DEFAULT_LAYOUT);
  }, [persist]);

  return { layout, visibleTiles, moveTile, toggleTile, resetLayout };
}
