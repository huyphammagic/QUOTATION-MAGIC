import { 
  saveUserPreferencesToFirestore, 
} from '../services/firebase/firestoreService';
import {
  getUiPreferences,
  updateUiPreferences,
} from '../services/firebase/cloudStorageVaultService';

export const DEFAULT_PINNED_NAV_IDS: string[] = [
  'main_dashboard',
  'quotations_all',
  'pricing_rates',
  'master_customers',
  'pricing_contracts',
];

export const STORAGE_KEY_PINNED_FAVORITES = 'LOGISTICS_SIDEBAR_PINNED_FAVORITES_V1';
export const STORAGE_KEY_EXPANDED_GROUPS = 'LOGISTICS_SIDEBAR_EXPANDED_GROUPS_V1';
export const STORAGE_KEY_SIDEBAR_COLLAPSED = 'LOGISTICS_SIDEBAR_COLLAPSED_V1';

/**
 * Loads the user's pinned favorite navigation items from Cloud Vault RAM cache (0ms, zero localStorage).
 */
export function loadSavedPinnedFavorites(): string[] {
  try {
    const prefs = getUiPreferences();
    if (Array.isArray(prefs.pinnedNavIds)) {
      return prefs.pinnedNavIds;
    }
  } catch (err) {
    console.warn('[userPreferences] Error reading saved pinned favorites:', err);
  }
  return [...DEFAULT_PINNED_NAV_IDS];
}

/**
 * Persists the pinned favorites list to Firebase Storage Vault (0ms RAM + Cloud upload)
 * and Firestore in the background.
 */
export function persistPinnedFavorites(ids: string[]): void {
  try {
    updateUiPreferences({ pinnedNavIds: ids });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('logistics_pinned_favorites_changed', { detail: ids }));
    }
  } catch (err) {
    console.warn('[userPreferences] Error saving pinned favorites to cloud vault:', err);
  }

  saveUserPreferencesToFirestore({ pinnedNavIds: ids }).catch((e) => {
    console.warn('[userPreferences] Cloud sync pinned favorites notice:', e);
  });
}

export const DEFAULT_EXPANDED_GROUPS: Record<string, boolean> = {
  commercial: true,
  pricing: true,
  operations: false,
  crm: false,
  system: false,
};

/**
 * Loads expanded group states from Cloud Vault RAM cache.
 */
export function loadSavedExpandedGroups(): Record<string, boolean> {
  try {
    const prefs = getUiPreferences();
    if (prefs.expandedGroups && typeof prefs.expandedGroups === 'object') {
      return {
        ...DEFAULT_EXPANDED_GROUPS,
        ...prefs.expandedGroups,
      };
    }
  } catch {}
  return { ...DEFAULT_EXPANDED_GROUPS };
}

/**
 * Persists expanded groups to Firebase Storage Vault + Firestore.
 */
export function persistExpandedGroups(groups: Record<string, boolean>): void {
  try {
    updateUiPreferences({ expandedGroups: groups });
  } catch (err) {
    console.warn('[userPreferences] Error saving expanded groups to cloud vault:', err);
  }
  saveUserPreferencesToFirestore({ expandedGroups: groups }).catch(() => {});
}

/**
 * Loads sidebar collapsed preference (defaults to true so sidebar starts clean & collapsed).
 */
export function loadSavedSidebarCollapsed(): boolean {
  return true;
}

/**
 * Persists sidebar collapsed preference to Cloud Vault + Firestore.
 */
export function persistSidebarCollapsed(collapsed: boolean): void {
  try {
    updateUiPreferences({ sidebarCollapsed: collapsed });
  } catch {}
  saveUserPreferencesToFirestore({ sidebarCollapsed: collapsed }).catch(() => {});
}

export function loadSavedSidebarMinimalMode(): boolean {
  const prefs = getUiPreferences();
  return prefs.sidebarMinimalMode !== undefined ? prefs.sidebarMinimalMode : true;
}

export function persistSidebarMinimalMode(minimal: boolean): void {
  try {
    updateUiPreferences({ sidebarMinimalMode: minimal });
  } catch {}
  saveUserPreferencesToFirestore({ sidebarMinimalMode: minimal }).catch(() => {});
}

export function loadSavedWorkbenchLayout(): 'SPLIT' | 'STACKED' {
  const prefs = getUiPreferences();
  if (prefs.workbenchLayout === 'SPLIT' || prefs.workbenchLayout === 'STACKED') {
    return prefs.workbenchLayout;
  }
  return 'STACKED';
}

export function persistWorkbenchLayout(mode: 'SPLIT' | 'STACKED'): void {
  try {
    updateUiPreferences({ workbenchLayout: mode });
  } catch {}
  saveUserPreferencesToFirestore({ workbenchLayout: mode }).catch(() => {});
}

export function loadSavedSalesHudCollapsed(): boolean {
  const prefs = getUiPreferences();
  return prefs.salesHudCollapsed !== undefined ? prefs.salesHudCollapsed : true;
}

export function persistSalesHudCollapsed(collapsed: boolean): void {
  try {
    updateUiPreferences({ salesHudCollapsed: collapsed });
  } catch {}
  saveUserPreferencesToFirestore({ salesHudCollapsed: collapsed }).catch(() => {});
}
