import { SupplierItem, CarrierItem } from '../../types/masterRate';
import { 
  getSuppliersFromFirestore, 
  saveSupplierToFirestore, 
  deleteSupplierFromFirestore,
  getCarriersFromFirestore,
  saveCarrierToFirestore,
  deleteCarrierFromFirestore
} from '../firebase/firestoreService';

const LOCAL_SUPPLIERS_KEY = 'LOGIQUOTE_SUPPLIERS_V1';
const LOCAL_CARRIERS_KEY = 'LOGIQUOTE_CARRIERS_V1';

export function getLocalSuppliers(): SupplierItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_SUPPLIERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local suppliers:', err);
    return [];
  }
}

export function saveLocalSuppliers(items: SupplierItem[]): void {
  try {
    localStorage.setItem(LOCAL_SUPPLIERS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving local suppliers:', err);
  }
}

export function getLocalCarriers(): CarrierItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CARRIERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local carriers:', err);
    return [];
  }
}

export function saveLocalCarriers(items: CarrierItem[]): void {
  try {
    localStorage.setItem(LOCAL_CARRIERS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving local carriers:', err);
  }
}

/**
 * Load all Suppliers (Firestore with Local Cache fallback)
 */
export async function loadSuppliers(): Promise<SupplierItem[]> {
  try {
    const remote = await getSuppliersFromFirestore();
    if (remote && remote.length > 0) {
      saveLocalSuppliers(remote);
      return remote;
    }
  } catch (err) {
    console.warn('Fallback to local suppliers:', err);
  }
  return getLocalSuppliers();
}

/**
 * Save single Supplier
 */
export async function saveSupplier(supplier: SupplierItem): Promise<void> {
  const current = getLocalSuppliers();
  const idx = current.findIndex(s => s.id === supplier.id);
  const updated = idx >= 0 ? current.map((s, i) => i === idx ? supplier : s) : [supplier, ...current];
  saveLocalSuppliers(updated);
  await saveSupplierToFirestore(supplier);
}

/**
 * Delete Supplier (soft delete preferred)
 */
export async function removeSupplier(id: string): Promise<void> {
  const current = getLocalSuppliers().filter(s => s.id !== id);
  saveLocalSuppliers(current);
  await deleteSupplierFromFirestore(id);
}

/**
 * Load all Carriers
 */
export async function loadCarriers(): Promise<CarrierItem[]> {
  try {
    const remote = await getCarriersFromFirestore();
    if (remote && remote.length > 0) {
      saveLocalCarriers(remote);
      return remote;
    }
  } catch (err) {
    console.warn('Fallback to local carriers:', err);
  }
  return getLocalCarriers();
}

/**
 * Save single Carrier
 */
export async function saveCarrier(carrier: CarrierItem): Promise<void> {
  const current = getLocalCarriers();
  const idx = current.findIndex(c => c.id === carrier.id);
  const updated = idx >= 0 ? current.map((c, i) => i === idx ? carrier : c) : [carrier, ...current];
  saveLocalCarriers(updated);
  await saveCarrierToFirestore(carrier);
}

/**
 * Delete Carrier
 */
export async function removeCarrier(id: string): Promise<void> {
  const current = getLocalCarriers().filter(c => c.id !== id);
  saveLocalCarriers(current);
  await deleteCarrierFromFirestore(id);
}
