import { RateRequestItem } from '../../types/masterRate';
import { 
  getRateRequestsFromFirestore, 
  saveRateRequestToFirestore, 
  deleteRateRequestFromFirestore 
} from '../firebase/firestoreService';

// In-memory cache (NO LOCAL STORAGE BUSINESS DATA - PHASE 17)
let memoryRateRequests: RateRequestItem[] = [];

export function getLocalRateRequests(): RateRequestItem[] {
  return memoryRateRequests;
}

export function saveLocalRateRequests(items: RateRequestItem[]): void {
  memoryRateRequests = items;
}

export async function loadRateRequests(): Promise<RateRequestItem[]> {
  try {
    const remote = await getRateRequestsFromFirestore();
    if (remote && remote.length > 0) {
      saveLocalRateRequests(remote);
      return remote;
    }
  } catch (err) {
    console.warn('Fallback to local rate requests:', err);
  }
  return getLocalRateRequests();
}

export async function saveRateRequest(item: RateRequestItem): Promise<void> {
  const current = getLocalRateRequests();
  const idx = current.findIndex(r => r.id === item.id);
  const updated = idx >= 0 ? current.map((r, i) => i === idx ? item : r) : [item, ...current];
  saveLocalRateRequests(updated);
  await saveRateRequestToFirestore(item);
}

export async function removeRateRequest(id: string): Promise<void> {
  const current = getLocalRateRequests().filter(r => r.id !== id);
  saveLocalRateRequests(current);
  await deleteRateRequestFromFirestore(id);
}
