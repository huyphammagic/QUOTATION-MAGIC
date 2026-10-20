import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { RoutePreset, PresetApplyMode, TradeLane } from '../../types/routePreset';
import { DEFAULT_ROUTE_PRESETS } from '../../data/defaultRoutePresets';
import { QuoteData, LineItem, CompanyProfile } from '../../types/logistics';
import { calculateQuote } from '../pricing';
import { generateQuoteNumber } from '../../utils/formatters';

const STORAGE_KEY_CUSTOM_PRESETS = 'bogi_custom_route_presets_v1';
const STORAGE_KEY_FAVORITES = 'bogi_route_preset_favorites_v1';
const FIRESTORE_COLLECTION = 'routePresets';

// In-memory cache
let memoryCustomPresets: RoutePreset[] = [];
let memoryFavorites: string[] = [];
let isLoaded = false;

function getStoredCustomPresets(): RoutePreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_PRESETS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredCustomPresets(presets: RoutePreset[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_PRESETS, JSON.stringify(presets));
  } catch {}
}

function getStoredFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveStoredFavorites(favs: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(favs));
  } catch {}
}

/**
 * Get all Route Presets (Built-in + Custom from Firestore & LocalStorage)
 */
export async function getAllRoutePresets(): Promise<RoutePreset[]> {
  const localCustom = getStoredCustomPresets();
  const favorites = new Set<string>(getStoredFavorites());

  // Attempt to load from Firestore
  let cloudCustom: RoutePreset[] = [];
  try {
    const snap = await getDocs(collection(db, FIRESTORE_COLLECTION));
    cloudCustom = snap.docs.map(d => ({
      ...d.data(),
      id: d.id,
      isCustom: true,
    } as RoutePreset));
  } catch (err) {
    console.warn('Could not fetch route presets from Firestore, using local cache:', err);
  }

  // Merge cloud & local custom presets
  const mergedMap = new Map<string, RoutePreset>();
  for (const p of localCustom) {
    mergedMap.set(p.id, p);
  }
  for (const p of cloudCustom) {
    mergedMap.set(p.id, p);
  }
  const customPresets = Array.from(mergedMap.values());
  saveStoredCustomPresets(customPresets);

  // Combine default + custom, apply favorites
  const all = [...DEFAULT_ROUTE_PRESETS, ...customPresets].map(p => ({
    ...p,
    isFavorite: favorites.has(p.id) || p.isFavorite || false,
  }));

  return all;
}

/**
 * Save or update a Custom Route Preset to Firestore + LocalStorage
 */
export async function saveCustomRoutePreset(preset: RoutePreset): Promise<void> {
  const customPreset: RoutePreset = {
    ...preset,
    isCustom: true,
    updatedAt: new Date().toISOString(),
    createdAt: preset.createdAt || new Date().toISOString(),
  };

  // 1. Update LocalStorage
  const existing = getStoredCustomPresets();
  const idx = existing.findIndex(p => p.id === customPreset.id);
  if (idx >= 0) {
    existing[idx] = customPreset;
  } else {
    existing.unshift(customPreset);
  }
  saveStoredCustomPresets(existing);

  // 2. Persist to Firestore
  try {
    await setDoc(doc(db, FIRESTORE_COLLECTION, customPreset.id), {
      ...customPreset,
      updatedAtFirestore: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Failed to save route preset to Firestore:', err);
  }
}

/**
 * Delete a custom route preset
 */
export async function deleteCustomRoutePreset(presetId: string): Promise<void> {
  // 1. LocalStorage
  const existing = getStoredCustomPresets().filter(p => p.id !== presetId);
  saveStoredCustomPresets(existing);

  // 2. Firestore
  try {
    await deleteDoc(doc(db, FIRESTORE_COLLECTION, presetId));
  } catch (err) {
    console.warn('Failed to delete route preset from Firestore:', err);
  }
}

/**
 * Toggle favorite status of a preset
 */
export function toggleRoutePresetFavorite(presetId: string): boolean {
  const favs = new Set<string>(getStoredFavorites());
  let nowFavorite = false;
  if (favs.has(presetId)) {
    favs.delete(presetId);
    nowFavorite = false;
  } else {
    favs.add(presetId);
    nowFavorite = true;
  }
  saveStoredFavorites(Array.from(favs));
  return nowFavorite;
}

/**
 * Convert any active Quote into a reusable Route Preset
 */
export function convertQuoteToRoutePreset(
  quote: QuoteData, 
  meta: {
    name: string;
    shortName: string;
    tradeLane: TradeLane;
    badge?: string;
    carrier?: string;
    description?: string;
  }
): RoutePreset {
  const presetId = `preset-custom-${Date.now()}`;
  
  const items = (quote.items || []).map((it, idx) => ({
    id: `item-${Date.now()}-${idx + 1}`,
    category: it.category,
    location: it.location || 'FREIGHT',
    code: it.code || `FEE_${idx + 1}`,
    description: it.description,
    basis: it.basis || 'PER_CONTAINER',
    quantity: it.quantity || 1,
    unit: it.unit || 'Container',
    unitPrice: it.unitPrice || 0,
    costPrice: it.costPrice || 0,
    currency: it.currency || 'USD',
    vatRate: it.vatRate || 0,
    note: it.note || '',
  }));

  const profitUsd = quote.totalProfitUsd || (quote.grandTotalUsd - quote.totalCostUsd) || 0;
  const marginPct = quote.overallMarginPercent || (quote.grandTotalUsd > 0 ? (profitUsd / quote.grandTotalUsd) * 100 : 0);

  return {
    id: presetId,
    name: meta.name.trim() || `Tuyến mẫu ${quote.shipment.pol} ➔ ${quote.shipment.pod}`,
    shortName: meta.shortName.trim() || `${quote.shipment.containerType} ${quote.shipment.pod.split(',')[0]}`,
    serviceMode: quote.shipment.mode || 'SEA_FCL',
    tradeLane: meta.tradeLane || 'TRANSPACIFIC_US',
    badge: meta.badge || 'Gói Tùy Chỉnh Doanh Nghiệp',
    badgeColor: 'emerald',
    carrier: meta.carrier || 'Chỉ định theo hợp đồng',
    description: meta.description || `Mẫu báo giá được lưu tự động từ báo giá ${quote.quoteNumber}`,
    incoterm: quote.terms.incoterm || 'FOB',
    pol: quote.shipment.pol || '',
    pod: quote.shipment.pod || '',
    containerType: quote.shipment.containerType || "40'HC",
    defaultQuantity: quote.shipment.quantity || 1,
    transitTime: quote.shipment.transitTime || '14 - 16 ngày',
    freeTime: quote.shipment.freeTime || '7 days Dem/Det',
    estimatedTotalUsd: quote.grandTotalUsd || quote.subtotalUsd || 0,
    estimatedTotalVnd: quote.grandTotalVnd || quote.subtotalVnd || 0,
    estimatedProfitUsd: profitUsd,
    estimatedMarginPercent: Math.round(marginPct * 10) / 10,
    items,
    defaultTerms: {
      incoterm: quote.terms.incoterm || 'FOB',
      validityDays: 14,
      paymentTerm: quote.terms.paymentTerm || 'Thanh toán 100% trước khi phát hành B/L.',
      exclusionsNotes: quote.terms.exclusionsNotes || '',
    },
    isCustom: true,
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 1-Click Apply Route Preset to a Quote
 */
export function applyRoutePresetToQuote(
  currentQuote: QuoteData,
  preset: RoutePreset,
  mode: PresetApplyMode,
  exchangeRate: number,
  companyProfile?: CompanyProfile
): QuoteData {
  const rate = exchangeRate || currentQuote.exchangeRate || 25400;

  // Convert preset items to Quote LineItem[] with fresh IDs
  const convertedItems: LineItem[] = preset.items.map((it, idx) => ({
    id: `item-${Date.now()}-${idx + 1}-${Math.floor(Math.random() * 1000)}`,
    category: it.category,
    location: it.location,
    code: it.code,
    description: it.description,
    basis: (it.basis as any) || 'PER_CONTAINER',
    quantity: it.quantity || 1,
    unit: it.unit,
    unitPrice: it.unitPrice,
    costPrice: it.costPrice,
    currency: it.currency,
    vatRate: it.vatRate,
    amountUsd: 0,
    amountVnd: 0,
    note: it.note || '',
  }));

  if (mode === 'NEW_QUOTE') {
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newRef = `LOG-${currentYear}-${randomSuffix}`;
    const activeComp = companyProfile || currentQuote.company;

    const freshQuote: QuoteData = {
      ...currentQuote,
      id: `quote-${Date.now()}`,
      quoteNumber: newRef,
      createdDate: new Date().toISOString().slice(0, 10),
      updatedDate: new Date().toISOString().slice(0, 10),
      status: 'DRAFT',
      exchangeRate: rate,
      company: activeComp,
      customer: {
        customerName: '',
        companyName: '',
        taxId: '',
        address: '',
        email: '',
        phone: '',
        contactPerson: '',
      },
      shipment: {
        mode: preset.serviceMode,
        pol: preset.pol,
        pod: preset.pod,
        commodity: 'General Cargo (Hàng thông thường)',
        containerType: preset.containerType,
        quantity: preset.defaultQuantity || 1,
        grossWeightKg: preset.serviceMode === 'AIR_FREIGHT' ? 300 : 15000,
        volumeCbm: preset.serviceMode === 'SEA_LCL' ? 3 : 40,
        chargeableWeight: preset.serviceMode === 'AIR_FREIGHT' ? 300 : 40,
        transitTime: preset.transitTime,
        freeTime: preset.freeTime,
      },
      items: convertedItems,
      terms: {
        incoterm: preset.defaultTerms.incoterm || preset.incoterm || 'FOB',
        validityDate: new Date(Date.now() + (preset.defaultTerms.validityDays || 14) * 86400000).toISOString().slice(0, 10),
        paymentTerm: preset.defaultTerms.paymentTerm,
        exclusionsNotes: preset.defaultTerms.exclusionsNotes,
        bankAccountInfo: currentQuote.terms?.bankAccountInfo || '',
      },
    };

    const { calculatedQuote } = calculateQuote(freshQuote);
    return calculatedQuote;
  }

  if (mode === 'OVERWRITE_CURRENT') {
    const updatedQuote: QuoteData = {
      ...currentQuote,
      updatedDate: new Date().toISOString().slice(0, 10),
      exchangeRate: rate,
      shipment: {
        ...currentQuote.shipment,
        mode: preset.serviceMode,
        pol: preset.pol || currentQuote.shipment.pol,
        pod: preset.pod || currentQuote.shipment.pod,
        containerType: preset.containerType || currentQuote.shipment.containerType,
        quantity: preset.defaultQuantity || currentQuote.shipment.quantity || 1,
        transitTime: preset.transitTime || currentQuote.shipment.transitTime,
        freeTime: preset.freeTime || currentQuote.shipment.freeTime,
      },
      items: convertedItems,
      terms: {
        ...currentQuote.terms,
        incoterm: preset.defaultTerms.incoterm || preset.incoterm || currentQuote.terms.incoterm,
        paymentTerm: preset.defaultTerms.paymentTerm || currentQuote.terms.paymentTerm,
        exclusionsNotes: preset.defaultTerms.exclusionsNotes || currentQuote.terms.exclusionsNotes,
      },
    };

    const { calculatedQuote } = calculateQuote(updatedQuote);
    return calculatedQuote;
  }

  // APPEND_ITEMS_ONLY
  const mergedItems = [...(currentQuote.items || []), ...convertedItems];
  const appendedQuote: QuoteData = {
    ...currentQuote,
    updatedDate: new Date().toISOString().slice(0, 10),
    items: mergedItems,
  };

  const { calculatedQuote } = calculateQuote(appendedQuote);
  return calculatedQuote;
}
