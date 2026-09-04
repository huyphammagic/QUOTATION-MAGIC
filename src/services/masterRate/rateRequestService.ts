import { RateRequestItem } from '../../types/masterRate';
import { 
  getRateRequestsFromFirestore, 
  saveRateRequestToFirestore, 
  deleteRateRequestFromFirestore 
} from '../firebase/firestoreService';

const LOCAL_RATE_REQUESTS_KEY = 'LOGIQUOTE_RATE_REQUESTS_V1';

export function getLocalRateRequests(): RateRequestItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_RATE_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn('Error reading local rate requests:', err);
    return [];
  }
}

export function saveLocalRateRequests(items: RateRequestItem[]): void {
  try {
    localStorage.setItem(LOCAL_RATE_REQUESTS_KEY, JSON.stringify(items));
  } catch (err) {
    console.warn('Error saving local rate requests:', err);
  }
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
