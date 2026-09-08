import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CompanyProfile, CustomerRecord, QuoteData } from '../../types/logistics';
import { RateMasterItem } from '../../types/masterRate';

export type SSOTEventType = 
  | 'COMPANY_PROFILE_SYNC'
  | 'QUOTATION_SYNC'
  | 'CUSTOMER_SYNC'
  | 'MASTER_RATE_SYNC'
  | 'FORCE_SYSTEM_SYNC';

export interface SSOTPayload<T = any> {
  type: SSOTEventType;
  timestamp: number;
  senderTabId: string;
  data?: T;
}

// Generate unique tab ID for session
const CURRENT_TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('logistics_ssot_channel');
  }
} catch (err) {
  console.warn('[SSOT Sync] BroadcastChannel not supported in this environment:', err);
}

type SSOTListener = (payload: SSOTPayload) => void;
const listeners = new Set<SSOTListener>();

// Wire incoming broadcast messages
if (channel) {
  channel.onmessage = (event: MessageEvent<SSOTPayload>) => {
    if (!event.data || event.data.senderTabId === CURRENT_TAB_ID) return;
    listeners.forEach((listener) => {
      try {
        listener(event.data);
      } catch (e) {
        console.error('[SSOT Sync] Error running listener:', e);
      }
    });
  };
}

/**
 * Broadcast an SSOT event to all other open browser tabs
 */
export function broadcastSSOTEvent<T = any>(type: SSOTEventType, data?: T): void {
  const payload: SSOTPayload<T> = {
    type,
    timestamp: Date.now(),
    senderTabId: CURRENT_TAB_ID,
    data,
  };

  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (err) {
      console.warn('[SSOT Sync] Error posting broadcast message:', err);
    }
  }

  // Also trigger local listeners for same-tab reactive updates
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (e) {
      console.error('[SSOT Sync] Error dispatching to local listener:', e);
    }
  });
}

/**
 * Subscribe to SSOT cross-tab and cross-component broadcast events
 */
export function subscribeToSSOTEvents(listener: SSOTListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Real-time Firestore Listener for Company Profile (Single Source of Truth)
 * Emits live updates whenever the document in Firestore changes.
 */
export function listenToSSOTCompanyProfile(
  onUpdate: (profile: CompanyProfile | null) => void,
  onError?: (err: any) => void
): () => void {
  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'settings', 'company_profile');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const profile = snap.data() as CompanyProfile;
          onUpdate(profile);
        } else {
          onUpdate(null);
        }
      },
      (error) => {
        console.warn('[SSOT Sync] Firestore company_profile live listener notice:', error);
        onError?.(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('[SSOT Sync] Could not bind onSnapshot to company_profile:', err);
    return () => {};
  }
}
