import { 
  saveUserPreferencesToFirestore, 
  getUserPreferencesFromFirestore,
  subscribeToUserPreferences 
} from '../services/firebase/firestoreService';

export const DEFAULT_PINNED_NAV_IDS: string[] = [
  'quotations_all',
  'pricing_rates',
  'master_customers',
  'pricing_contracts',
];

export const STORAGE_KEY_PINNED_FAVORITES = 'LOGISTICS_SIDEBAR_PINNED_FAVORITES_V1';
export const STORAGE_KEY_EXPANDED_GROUPS = 'LOGISTICS_SIDEBAR_EXPANDED_GROUPS_V1';
export const STORAGE_KEY_SIDEBAR_COLLAPSED = 'LOGISTICS_SIDEBAR_COLLAPSED_V1';

/**
 * Loads the user's pinned favorite navigation items.
 * 100% resilient across page reloads (load lại trang) via browser localStorage,
 * with real-time background Cloud synchronization via Firestore.
 */
export function loadSavedPinnedFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PINNED_FAVORITES);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[userPreferences] Error reading saved pinned favorites:', err);
  }
  return [...DEFAULT_PINNED_NAV_IDS];
}

/**
 * Persists the pinned favorites list both to localStorage immediately (0ms delay)
 * and syncs to Firestore in the background.
 */
export function persistPinnedFavorites(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PINNED_FAVORITES, JSON.stringify(ids));
    // Dispatch custom event for cross-component awareness
    window.dispatchEvent(new CustomEvent('logistics_pinned_favorites_changed', { detail: ids }));
  } catch (err) {
    console.warn('[userPreferences] Error saving pinned favorites to localStorage:', err);
  }

  // Asynchronously sync to Firestore so preferences persist across different computers
  saveUserPreferencesToFirestore({ pinnedNavIds: ids }).catch((e) => {
    console.warn('[userPreferences] Cloud sync pinned favorites notice:', e);
  });
}

export const DEFAULT_EXPANDED_GROUPS: Record<string, boolean> = {
  main: false,
  quotation: false,
  pricing: false,
  masterData: false,
  operations: false,
  analytics: false,
  system: false,
};

/**
 * Loads expanded group states.
 * Defaults to all false so that whenever accessing the app,
 * all navigation categories/groups are in the collapsed state (thu gọn).
 */
export function loadSavedExpandedGroups(): Record<string, boolean> {
  return { ...DEFAULT_EXPANDED_GROUPS };
}

/**
 * Persists expanded groups to localStorage
 */
export function persistExpandedGroups(groups: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXPANDED_GROUPS, JSON.stringify(groups));
  } catch (err) {
    console.warn('[userPreferences] Error saving expanded groups to localStorage:', err);
  }
  saveUserPreferencesToFirestore({ expandedGroups: groups }).catch(() => {});
}

/**
 * Loads sidebar collapsed preference.
 * Defaults to true (collapsed) so that whenever the user accesses the app,
 * the sidebar is always in the collapsed state (trạng thái thu gọn).
 */
export function loadSavedSidebarCollapsed(): boolean {
  return true;
}

/**
 * Persists sidebar collapsed preference for temporary session/cloud logging
 */
export function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, collapsed ? 'true' : 'false');
  } catch {}
  saveUserPreferencesToFirestore({ sidebarCollapsed: collapsed }).catch(() => {});
}
