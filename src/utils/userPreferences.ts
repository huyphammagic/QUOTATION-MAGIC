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

/**
 * Loads expanded group states from localStorage
 */
export function loadSavedExpandedGroups(): Record<string, boolean> {
  const defaults = {
    main: true,
    quotation: true,
    pricing: true,
    masterData: false,
    operations: false,
    analytics: false,
    system: false,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPANDED_GROUPS);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...defaults, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[userPreferences] Error reading expanded groups:', err);
  }
  return defaults;
}

/**
 * Persists expanded groups to localStorage and Firestore
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
 * Loads sidebar collapsed preference
 */
export function loadSavedSidebarCollapsed(): boolean {
  try {
    const val = localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Persists sidebar collapsed preference
 */
export function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, collapsed ? 'true' : 'false');
  } catch {}
  saveUserPreferencesToFirestore({ sidebarCollapsed: collapsed }).catch(() => {});
}
