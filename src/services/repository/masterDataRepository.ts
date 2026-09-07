import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const COLLECTION_NAME = 'masterData';

const DEFAULT_PORT_PRESETS = [
  { name: 'Cat Lai Port, Ho Chi Minh', country: 'Vietnam' },
  { name: 'Hai Phong Port', country: 'Vietnam' },
  { name: 'Cai Mep Port, Vung Tau', country: 'Vietnam' },
  { name: 'Da Nang Port', country: 'Vietnam' },
  { name: 'Singapore Port', country: 'Singapore' },
  { name: 'Shanghai Port', country: 'China' },
  { name: 'Ningbo Port', country: 'China' },
  { name: 'Shenzhen Port', country: 'China' },
  { name: 'Busan Port', country: 'South Korea' },
  { name: 'Tokyo Port', country: 'Japan' },
  { name: 'Los Angeles Port, CA', country: 'USA' },
  { name: 'Long Beach Port, CA', country: 'USA' },
  { name: 'Rotterdam Port', country: 'Netherlands' },
  { name: 'Hamburg Port', country: 'Germany' },
];

const DEFAULT_CONTAINER_TYPES = [
  "20'GP",
  "40'GP",
  "40'HC",
  "45'HC",
  "20'RF",
  "40'RF",
  "20'OT",
  "40'OT",
  "LCL (CBM/KGS)",
  "AIR (KGS/CW)",
];

const DEFAULT_INCOTERMS = [
  { code: 'FOB', name: 'Free On Board', desc: 'Giao hàng lên tàu tại cảng bốc (POL)' },
  { code: 'CIF', name: 'Cost, Insurance and Freight', desc: 'Tiền hàng, bảo hiểm và cước phí tới cảng đến (POD)' },
  { code: 'EXW', name: 'Ex Works', desc: 'Giao tại xưởng của người bán' },
  { code: 'DDP', name: 'Delivered Duty Paid', desc: 'Giao hàng đã nộp thuế đến kho người mua' },
  { code: 'DAP', name: 'Delivered at Place', desc: 'Giao tại nơi đến quy định' },
  { code: 'CFR', name: 'Cost and Freight', desc: 'Tiền hàng và cước phí' },
  { code: 'FCA', name: 'Free Carrier', desc: 'Giao cho người chuyên chở' },
  { code: 'CPT', name: 'Carriage Paid To', desc: 'Cước phí trả tới' },
  { code: 'CIP', name: 'Carriage and Insurance Paid To', desc: 'Cước phí và bảo hiểm trả tới' },
];

const DEFAULT_PAYMENT_TERMS = [
  'Thanh toán 100% trước khi lấy D/O hoặc phát hành Surrendered B/L.',
  'Thanh toán 100% trong vòng 07 ngày làm việc sau khi phát hành B/L copy.',
  'Thanh toán trong vòng 30 ngày kể từ ngày tàu chạy (ATD).',
  'Công nợ 15 ngày kể từ ngày nhận đủ chứng từ thanh toán hợp lệ.',
];

export interface MasterDataItem {
  id: string;
  type: 'PORT' | 'CONTAINER_TYPE' | 'INCOTERM' | 'PAYMENT_TERM' | 'CURRENCY';
  code: string;
  name: string;
  country?: string;
  description?: string;
  isActive: boolean;
}

let memoryMasterDataCache: { data: Record<string, MasterDataItem[]>; cachedAt: number } | null = null;
const CACHE_TTL_MS = 120 * 1000; // 2 minutes

export function invalidateMasterDataCache(): void {
  memoryMasterDataCache = null;
}

/**
 * Fetch master data by type from Firestore
 */
export async function fetchMasterData(type: 'PORT' | 'CONTAINER_TYPE' | 'INCOTERM' | 'PAYMENT_TERM', forceRefresh = false): Promise<MasterDataItem[]> {
  const now = Date.now();
  if (!forceRefresh && memoryMasterDataCache && memoryMasterDataCache.data[type] && (now - memoryMasterDataCache.cachedAt < CACHE_TTL_MS)) {
    return memoryMasterDataCache.data[type];
  }

  if (!db) {
    return getFallbackMasterData(type);
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, type);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const list = snap.data().items as MasterDataItem[];
      if (!memoryMasterDataCache) memoryMasterDataCache = { data: {}, cachedAt: now };
      memoryMasterDataCache.data[type] = list;
      return list;
    } else {
      // Seed default master data
      const defaults = getFallbackMasterData(type);
      await setDoc(docRef, {
        type,
        items: defaults,
        _updatedAt: serverTimestamp(),
      });
      if (!memoryMasterDataCache) memoryMasterDataCache = { data: {}, cachedAt: now };
      memoryMasterDataCache.data[type] = defaults;
      return defaults;
    }
  } catch (err) {
    console.error(`[masterDataRepository] Error fetching master data ${type}:`, err);
    return getFallbackMasterData(type);
  }
}

function getFallbackMasterData(type: string): MasterDataItem[] {
  switch (type) {
    case 'PORT':
      return DEFAULT_PORT_PRESETS.map((p, idx) => ({
        id: `port-${idx}`,
        type: 'PORT',
        code: p.name.slice(0, 5).toUpperCase(),
        name: p.name,
        country: p.country,
        isActive: true,
      }));
    case 'CONTAINER_TYPE':
      return DEFAULT_CONTAINER_TYPES.map((c, idx) => ({
        id: `cnt-${idx}`,
        type: 'CONTAINER_TYPE',
        code: c,
        name: c,
        isActive: true,
      }));
    case 'INCOTERM':
      return DEFAULT_INCOTERMS.map((inc, idx) => ({
        id: `inc-${idx}`,
        type: 'INCOTERM',
        code: inc.code,
        name: `${inc.code} - ${inc.name}`,
        description: inc.desc,
        isActive: true,
      }));
    case 'PAYMENT_TERM':
      return DEFAULT_PAYMENT_TERMS.map((pt, idx) => ({
        id: `pay-${idx}`,
        type: 'PAYMENT_TERM',
        code: `PT-${idx + 1}`,
        name: pt,
        isActive: true,
      }));
    default:
      return [];
  }
}
