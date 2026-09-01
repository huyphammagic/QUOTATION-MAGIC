import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from '../../types/masterRate';
import { 
  loadSavedQuotes, 
  saveQuotesList, 
  loadSavedCustomers, 
  saveCustomersList, 
  loadSavedSurcharges, 
  saveSurchargesList, 
  loadCompanyProfile, 
  saveCompanyProfile,
  getSavedRateMasters,
  saveRateMasterItem,
  deleteRateMasterItem,
  getSavedChargeMasters,
  saveChargeMasterItem,
  deleteChargeMasterItem,
  getSavedRateHistories,
  addRateHistoryItem
} from '../../utils/storage';

const COLLECTIONS = {
  QUOTES: 'quotes',
  CUSTOMERS: 'customers',
  SURCHARGES: 'surcharges',
  RATE_MASTERS: 'rateMasters',
  CHARGE_MASTERS: 'chargeMasters',
  RATE_HISTORIES: 'rateHistories',
  SETTINGS: 'system_settings',
};

/**
 * =========================================================================
 * 1. QUOTES CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveQuoteToFirestore(quote: QuoteData): Promise<void> {
  // Always update local cache first
  const localQuotes = loadSavedQuotes();
  const index = localQuotes.findIndex(q => q.id === quote.id);
  let updatedList: QuoteData[];
  if (index >= 0) {
    updatedList = [...localQuotes];
    updatedList[index] = quote;
  } else {
    updatedList = [quote, ...localQuotes];
  }
  saveQuotesList(updatedList);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.QUOTES, quote.id);
    await setDoc(docRef, {
      ...quote,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore quote save sync notice (saved locally):', error);
  }
}

export async function getQuotesFromFirestore(): Promise<QuoteData[]> {
  if (!db) {
    return loadSavedQuotes();
  }

  try {
    const q = query(collection(db, COLLECTIONS.QUOTES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: QuoteData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as QuoteData;
        items.push({ ...data, id: docSnap.id });
      });
      // Sort by updatedDate or createdDate desc
      items.sort((a, b) => (b.updatedDate || b.createdDate || '').localeCompare(a.updatedDate || a.createdDate || ''));
      saveQuotesList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load quotes fallback to local storage:', error);
  }

  return loadSavedQuotes();
}

export async function deleteQuoteFromFirestore(id: string): Promise<void> {
  const localQuotes = loadSavedQuotes().filter(q => q.id !== id);
  saveQuotesList(localQuotes);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.QUOTES, id));
  } catch (error) {
    console.warn('Firestore delete quote error:', error);
  }
}

/**
 * =========================================================================
 * 2. CUSTOMERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveCustomerToFirestore(customer: CustomerRecord): Promise<void> {
  const local = loadSavedCustomers();
  const idx = local.findIndex(c => c.id === customer.id);
  const updated = idx >= 0 ? local.map((c, i) => i === idx ? customer : c) : [customer, ...local];
  saveCustomersList(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CUSTOMERS, customer.id);
    await setDoc(docRef, {
      ...customer,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore customer save notice:', error);
  }
}

export async function getCustomersFromFirestore(): Promise<CustomerRecord[]> {
  if (!db) {
    return loadSavedCustomers();
  }

  try {
    const q = query(collection(db, COLLECTIONS.CUSTOMERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: CustomerRecord[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as CustomerRecord, id: docSnap.id });
      });
      saveCustomersList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load customers fallback to local:', error);
  }

  return loadSavedCustomers();
}

export async function deleteCustomerFromFirestore(id: string): Promise<void> {
  const local = loadSavedCustomers().filter(c => c.id !== id);
  saveCustomersList(local);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, id));
  } catch (error) {
    console.warn('Firestore delete customer error:', error);
  }
}

/**
 * =========================================================================
 * 3. SURCHARGES CATALOG CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveSurchargeToFirestore(item: SurchargeItem): Promise<void> {
  const local = loadSavedSurcharges();
  const idx = local.findIndex(s => s.id === item.id);
  const updated = idx >= 0 ? local.map((s, i) => i === idx ? item : s) : [item, ...local];
  saveSurchargesList(updated);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.SURCHARGES, item.id);
    await setDoc(docRef, {
      ...item,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore surcharge save notice:', error);
  }
}

export async function getSurchargesFromFirestore(): Promise<SurchargeItem[]> {
  if (!db) {
    return loadSavedSurcharges();
  }

  try {
    const q = query(collection(db, COLLECTIONS.SURCHARGES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: SurchargeItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as SurchargeItem, id: docSnap.id });
      });
      saveSurchargesList(items);
      return items;
    }
  } catch (error) {
    console.warn('Firestore load surcharges fallback to local:', error);
  }

  return loadSavedSurcharges();
}

export async function deleteSurchargeFromFirestore(id: string): Promise<void> {
  const local = loadSavedSurcharges().filter(s => s.id !== id);
  saveSurchargesList(local);

  if (!db) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.SURCHARGES, id));
  } catch (error) {
    console.warn('Firestore delete surcharge error:', error);
  }
}

/**
 * =========================================================================
 * 4. COMPANY PROFILE SETTINGS WITH FIRESTORE
 * =========================================================================
 */

export async function saveCompanyProfileToFirestore(profile: CompanyProfile): Promise<void> {
  saveCompanyProfile(profile);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_profile');
    await setDoc(docRef, {
      ...profile,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save company profile notice:', error);
  }
}

export async function getCompanyProfileFromFirestore(): Promise<CompanyProfile> {
  if (!db) {
    return loadCompanyProfile();
  }

  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, 'company_profile');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as CompanyProfile;
      saveCompanyProfile(data);
      return data;
    }
  } catch (error) {
    console.warn('Firestore load company profile fallback:', error);
  }

  return loadCompanyProfile();
}

/**
 * =========================================================================
 * 5. MASTER RATES CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveRateMasterToFirestore(rate: RateMasterItem, actor: string = 'admin'): Promise<void> {
  // Update local storage first
  saveRateMasterItem(rate);

  // Record audit history
  const historyItem: RateHistoryItem = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    rateId: rate.id,
    rateCode: rate.rateCode,
    action: rate.version > 1 ? 'UPDATE' : 'CREATE',
    timestamp: new Date().toISOString(),
    actor: actor,
    snapshot: rate,
    note: `Saved rate ${rate.rateCode} (${rate.status})`,
  };
  addRateHistoryItem(historyItem);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.RATE_MASTERS, rate.id);
    await setDoc(docRef, {
      ...rate,
      _updatedAt: serverTimestamp(),
    }, { merge: true });

    // Also persist audit log to Firestore
    const histDocRef = doc(db, COLLECTIONS.RATE_HISTORIES, historyItem.id);
    await setDoc(histDocRef, {
      ...historyItem,
      _createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save rate master notice:', error);
  }
}

export async function getRateMastersFromFirestore(): Promise<RateMasterItem[]> {
  if (!db) {
    return getSavedRateMasters();
  }

  try {
    const q = query(collection(db, COLLECTIONS.RATE_MASTERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateMasterItem, id: docSnap.id });
      });
      // Save to local cache
      localStorage.setItem('LOGISTICS_RATE_MASTERS_V1', JSON.stringify(items));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate masters fallback to local:', error);
  }

  return getSavedRateMasters();
}

export async function deleteRateMasterFromFirestore(id: string, softDelete: boolean = true): Promise<void> {
  deleteRateMasterItem(id, softDelete);

  if (!db) return;

  try {
    if (softDelete) {
      const docRef = doc(db, COLLECTIONS.RATE_MASTERS, id);
      await setDoc(docRef, {
        status: 'INACTIVE',
        _updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      await deleteDoc(doc(db, COLLECTIONS.RATE_MASTERS, id));
    }
  } catch (error) {
    console.warn('Firestore delete rate master error:', error);
  }
}

/**
 * =========================================================================
 * 6. CHARGE MASTERS CRUD WITH FIRESTORE
 * =========================================================================
 */

export async function saveChargeMasterToFirestore(charge: ChargeMasterItem): Promise<void> {
  saveChargeMasterItem(charge);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CHARGE_MASTERS, charge.id);
    await setDoc(docRef, {
      ...charge,
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore save charge master notice:', error);
  }
}

export async function getChargeMastersFromFirestore(): Promise<ChargeMasterItem[]> {
  if (!db) {
    return getSavedChargeMasters();
  }

  try {
    const q = query(collection(db, COLLECTIONS.CHARGE_MASTERS));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: ChargeMasterItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as ChargeMasterItem, id: docSnap.id });
      });
      localStorage.setItem('LOGISTICS_CHARGE_MASTERS_V1', JSON.stringify(items));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load charge masters fallback:', error);
  }

  return getSavedChargeMasters();
}

export async function deleteChargeMasterFromFirestore(id: string): Promise<void> {
  deleteChargeMasterItem(id);

  if (!db) return;

  try {
    const docRef = doc(db, COLLECTIONS.CHARGE_MASTERS, id);
    await setDoc(docRef, {
      status: 'INACTIVE',
      _updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.warn('Firestore delete charge master error:', error);
  }
}

/**
 * =========================================================================
 * 7. RATE HISTORIES & AUDIT TRAIL
 * =========================================================================
 */

export async function getRateHistoriesFromFirestore(): Promise<RateHistoryItem[]> {
  if (!db) {
    return getSavedRateHistories();
  }

  try {
    const q = query(collection(db, COLLECTIONS.RATE_HISTORIES));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const items: RateHistoryItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ ...docSnap.data() as RateHistoryItem, id: docSnap.id });
      });
      items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      localStorage.setItem('LOGISTICS_RATE_HISTORIES_V1', JSON.stringify(items));
      return items;
    }
  } catch (error) {
    console.warn('Firestore load rate histories fallback:', error);
  }

  return getSavedRateHistories();
}

