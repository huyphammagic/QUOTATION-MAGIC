import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CompanyProfile } from '../../types/logistics';
import { EMPTY_COMPANY_PROFILE } from '../../data/presets';
import { broadcastSSOTEvent } from '../sync/singleSourceOfTruthSync';

const COLLECTION_NAME = 'settings';
const DOC_ID = 'company_profile';

let memoryCompanyProfileCache: { data: CompanyProfile; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateCompanyProfileCache(): void {
  memoryCompanyProfileCache = null;
}

/**
 * Fetch Company Profile from Firestore (Single Source of Truth).
 * Does NOT seed or inject mock data if the collection/document is missing.
 */
export async function fetchCompanyProfile(forceRefresh = false): Promise<CompanyProfile> {
  const now = Date.now();
  if (!forceRefresh && memoryCompanyProfileCache && (now - memoryCompanyProfileCache.cachedAt < CACHE_TTL_MS)) {
    return memoryCompanyProfileCache.data;
  }

  if (!db) {
    return memoryCompanyProfileCache ? memoryCompanyProfileCache.data : EMPTY_COMPANY_PROFILE;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as CompanyProfile;
      memoryCompanyProfileCache = { data, cachedAt: now };
      return data;
    } else {
      // Document does NOT exist in Firestore yet: return EMPTY profile.
      // ZERO AUTOMATIC SEEDING of fake company profile as mandated by Phase 21.
      memoryCompanyProfileCache = { data: EMPTY_COMPANY_PROFILE, cachedAt: now };
      return EMPTY_COMPANY_PROFILE;
    }
  } catch (err) {
    console.error('[companyProfileRepository] Error fetching company profile from Firestore:', err);
    return memoryCompanyProfileCache ? memoryCompanyProfileCache.data : EMPTY_COMPANY_PROFILE;
  }
}

/**
 * Save Company Profile to Firestore (Single Source of Truth)
 * and broadcast real-time update to all open tabs and active states.
 */
export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  if (!db) {
    memoryCompanyProfileCache = { data: profile, cachedAt: Date.now() };
    broadcastSSOTEvent('COMPANY_PROFILE_SYNC', profile);
    return profile;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, {
      ...profile,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    memoryCompanyProfileCache = { data: profile, cachedAt: Date.now() };
    broadcastSSOTEvent('COMPANY_PROFILE_SYNC', profile);
    return profile;
  } catch (err) {
    console.error('[companyProfileRepository] Error saving company profile to Firestore:', err);
    throw err;
  }
}

/**
 * Real-time Firestore snapshot listener for company profile changes
 */
export function listenToCompanyProfile(
  onUpdate: (profile: CompanyProfile) => void
): () => void {
  if (!db) return () => {};

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as CompanyProfile;
        memoryCompanyProfileCache = { data, cachedAt: Date.now() };
        onUpdate(data);
      } else {
        memoryCompanyProfileCache = { data: EMPTY_COMPANY_PROFILE, cachedAt: Date.now() };
        onUpdate(EMPTY_COMPANY_PROFILE);
      }
    }, (err) => {
      console.warn('[companyProfileRepository] Live snapshot notice:', err);
    });

    return unsubscribe;
  } catch (e) {
    console.warn('[companyProfileRepository] Failed to bind live snapshot:', e);
    return () => {};
  }
}
