import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { CompanyProfile } from '../../types/logistics';
import { INITIAL_SAMPLE_QUOTE } from '../../data/presets';

const COLLECTION_NAME = 'settings';
const DOC_ID = 'company_profile';

let memoryCompanyProfileCache: { data: CompanyProfile; cachedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateCompanyProfileCache(): void {
  memoryCompanyProfileCache = null;
}

/**
 * Fetch Company Profile from Firestore (with memory cache fallback)
 */
export async function fetchCompanyProfile(forceRefresh = false): Promise<CompanyProfile> {
  const now = Date.now();
  if (!forceRefresh && memoryCompanyProfileCache && (now - memoryCompanyProfileCache.cachedAt < CACHE_TTL_MS)) {
    return memoryCompanyProfileCache.data;
  }

  const defaultProfile = INITIAL_SAMPLE_QUOTE.company;

  if (!db) return defaultProfile;

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as CompanyProfile;
      memoryCompanyProfileCache = { data, cachedAt: now };
      return data;
    } else {
      // Seed default company profile to Firestore
      await setDoc(docRef, {
        ...defaultProfile,
        _updatedAt: serverTimestamp(),
      });
      memoryCompanyProfileCache = { data: defaultProfile, cachedAt: now };
      return defaultProfile;
    }
  } catch (err) {
    console.error('[companyProfileRepository] Error fetching company profile from Firestore:', err);
    return memoryCompanyProfileCache ? memoryCompanyProfileCache.data : defaultProfile;
  }
}

/**
 * Save Company Profile to Firestore
 */
export async function saveCompanyProfile(profile: CompanyProfile): Promise<CompanyProfile> {
  if (!db) {
    memoryCompanyProfileCache = { data: profile, cachedAt: Date.now() };
    return profile;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOC_ID);
    await setDoc(docRef, {
      ...profile,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    memoryCompanyProfileCache = { data: profile, cachedAt: Date.now() };
    return profile;
  } catch (err) {
    console.error('[companyProfileRepository] Error saving company profile to Firestore:', err);
    throw err;
  }
}
