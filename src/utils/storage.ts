import { QuoteData, CustomerRecord, SurchargeItem } from '../types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem } from '../types/masterRate';
import { generateQuoteNumber } from './formatters';
import { 
  saveQuotation as repoSaveQuotation, 
  deleteQuotation as repoDeleteQuotation,
  saveActiveQuotationDraft as repoSaveDraft,
  clearActiveQuotationDraft as repoClearDraft
} from '../services/repository/quotationRepository';
import { 
  saveCustomer as repoSaveCustomer, 
  deleteCustomer as repoDeleteCustomer 
} from '../services/repository/customerRepository';
import { 
  saveSurcharge as repoSaveSurcharge, 
  deleteSurcharge as repoDeleteSurcharge,
  saveRateMaster as repoSaveRateMaster,
  deleteRateMaster as repoDeleteRateMaster,
  saveChargeMaster as repoSaveChargeMaster,
  addRateHistory as repoAddRateHistory
} from '../services/repository/rateRepository';
import { saveCompanyProfile as repoSaveCompanyProfile } from '../services/repository/companyProfileRepository';

/**
 * ============================================================================
 * PHASE 17 CLOUD-FIRST IN-MEMORY DATA LAYER
 * NO BUSINESS DATA IN LOCAL STORAGE. FIREBASE IS SINGLE SOURCE OF TRUTH.
 * ============================================================================
 */

// In-Memory Business State (Populated exclusively from Firebase Cloud)
let memoryQuotes: QuoteData[] = [];
let memoryCompanySettings: any = null;
let memoryCustomers: CustomerRecord[] = [];
let memorySurcharges: SurchargeItem[] = [];
let memoryRateMasters: RateMasterItem[] = [];
let memoryChargeMasters: ChargeMasterItem[] = [];
let memoryRateHistories: RateHistoryItem[] = [];
let memoryActiveDraft: { quote: QuoteData | null; savedAt: string | null } = { quote: null, savedAt: null };

// ================= QUOTES STORAGE (IN-MEMORY + ASYNC CLOUD) =================
export function getSavedQuotes(): QuoteData[] {
  return memoryQuotes;
}

export function saveQuote(quote: QuoteData): QuoteData[] {
  const index = memoryQuotes.findIndex((q) => q.id === quote.id);
  const updatedQuote: QuoteData = {
    ...quote,
    version: (quote.version || 1) + 1,
    updatedDate: new Date().toISOString().slice(0, 10),
  };

  if (index >= 0) {
    memoryQuotes[index] = updatedQuote;
  } else {
    memoryQuotes.unshift(updatedQuote);
  }

  // Persist directly to Firebase Cloud in background
  repoSaveQuotation(updatedQuote).catch((err) => {
    console.warn('[Cloud Sync] Background save quotation notice:', err);
  });

  return memoryQuotes;
}

export function deleteQuote(id: string): QuoteData[] {
  memoryQuotes = memoryQuotes.filter((q) => q.id !== id);
  repoDeleteQuotation(id).catch((err) => {
    console.warn('[Cloud Sync] Background delete quotation notice:', err);
  });
  return memoryQuotes;
}

export function cloneQuote(id: string): QuoteData | null {
  const target = memoryQuotes.find((q) => q.id === id);
  if (!target) return null;

  const newQuote: QuoteData = {
    ...JSON.parse(JSON.stringify(target)),
    id: `quote-${Date.now()}`,
    quoteNumber: generateQuoteNumber(),
    version: 1,
    createdDate: new Date().toISOString().slice(0, 10),
    updatedDate: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
  };

  saveQuote(newQuote);
  return newQuote;
}

export function updateQuoteStatus(id: string, status: QuoteData['status']): QuoteData[] {
  const target = memoryQuotes.find((q) => q.id === id);
  if (target) {
    target.status = status;
    target.updatedDate = new Date().toISOString().slice(0, 10);
    repoSaveQuotation(target).catch((err) => {
      console.warn('[Cloud Sync] Background update quote status notice:', err);
    });
  }
  return memoryQuotes;
}

export function getCompanySettings() {
  return memoryCompanySettings;
}

export function saveCompanySettings(settings: any) {
  memoryCompanySettings = settings;
  if (settings) {
    repoSaveCompanyProfile(settings).catch((err) => {
      console.warn('[Cloud Sync] Background save company profile notice:', err);
    });
  }
}

// ================= CUSTOMERS STORAGE =================
export function getSavedCustomers(): CustomerRecord[] {
  return memoryCustomers;
}

export function saveCustomerRecord(customer: CustomerRecord): CustomerRecord[] {
  const index = memoryCustomers.findIndex((c) => c.id === customer.id);
  if (index >= 0) {
    memoryCustomers[index] = customer;
  } else {
    memoryCustomers.unshift(customer);
  }
  repoSaveCustomer(customer).catch((err) => {
    console.warn('[Cloud Sync] Background save customer notice:', err);
  });
  return memoryCustomers;
}

export function deleteCustomerRecord(id: string): CustomerRecord[] {
  memoryCustomers = memoryCustomers.filter((c) => c.id !== id);
  repoDeleteCustomer(id).catch((err) => {
    console.warn('[Cloud Sync] Background delete customer notice:', err);
  });
  return memoryCustomers;
}

// ================= SURCHARGE CATALOG STORAGE =================
export function getSavedSurcharges(): SurchargeItem[] {
  return memorySurcharges;
}

export function saveSurchargeItem(item: SurchargeItem): SurchargeItem[] {
  const index = memorySurcharges.findIndex((s) => s.id === item.id);
  if (index >= 0) {
    memorySurcharges[index] = item;
  } else {
    memorySurcharges.unshift(item);
  }
  repoSaveSurcharge(item).catch((err) => {
    console.warn('[Cloud Sync] Background save surcharge notice:', err);
  });
  return memorySurcharges;
}

export function deleteSurchargeItem(id: string): SurchargeItem[] {
  memorySurcharges = memorySurcharges.filter((s) => s.id !== id);
  repoDeleteSurcharge(id).catch((err) => {
    console.warn('[Cloud Sync] Background delete surcharge notice:', err);
  });
  return memorySurcharges;
}

// ================= MASTER RATES STORAGE =================
export function getSavedRateMasters(): RateMasterItem[] {
  return memoryRateMasters;
}

export function saveRateMasterItem(rate: RateMasterItem): RateMasterItem[] {
  const index = memoryRateMasters.findIndex((r) => r.id === rate.id);
  const updatedRate = {
    ...rate,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  if (index >= 0) {
    memoryRateMasters[index] = updatedRate;
  } else {
    memoryRateMasters.unshift(updatedRate);
  }
  repoSaveRateMaster(updatedRate).catch((err) => {
    console.warn('[Cloud Sync] Background save rate master notice:', err);
  });
  return memoryRateMasters;
}

export function deleteRateMasterItem(id: string, softDelete: boolean = true): RateMasterItem[] {
  if (softDelete) {
    const target = memoryRateMasters.find(r => r.id === id);
    if (target) {
      target.status = 'INACTIVE';
      target.updatedAt = new Date().toISOString().slice(0, 10);
      repoSaveRateMaster(target).catch(() => {});
    }
  } else {
    memoryRateMasters = memoryRateMasters.filter((r) => r.id !== id);
    repoDeleteRateMaster(id, false).catch(() => {});
  }
  return memoryRateMasters;
}

// ================= CHARGE MASTERS STORAGE =================
export function getSavedChargeMasters(): ChargeMasterItem[] {
  return memoryChargeMasters;
}

export function saveChargeMasterItem(charge: ChargeMasterItem): ChargeMasterItem[] {
  const index = memoryChargeMasters.findIndex((c) => c.id === charge.id || c.chargeCode === charge.chargeCode);
  const updatedCharge = {
    ...charge,
    updatedAt: new Date().toISOString().slice(0, 10),
  };

  if (index >= 0) {
    memoryChargeMasters[index] = updatedCharge;
  } else {
    memoryChargeMasters.unshift(updatedCharge);
  }
  repoSaveChargeMaster(updatedCharge).catch(() => {});
  return memoryChargeMasters;
}

export function deleteChargeMasterItem(id: string): ChargeMasterItem[] {
  const target = memoryChargeMasters.find(c => c.id === id);
  if (target) {
    target.status = 'INACTIVE';
    target.updatedAt = new Date().toISOString().slice(0, 10);
    repoSaveChargeMaster(target).catch(() => {});
  }
  return memoryChargeMasters;
}

// ================= RATE HISTORIES / AUDIT STORAGE =================
export function getSavedRateHistories(): RateHistoryItem[] {
  return memoryRateHistories;
}

export function addRateHistoryItem(history: RateHistoryItem): RateHistoryItem[] {
  memoryRateHistories.unshift(history);
  memoryRateHistories = memoryRateHistories.slice(0, 500);
  repoAddRateHistory(history).catch(() => {});
  return memoryRateHistories;
}

// ================= ACTIVE DRAFT CLOUD STORAGE =================
export function saveActiveQuoteDraft(quote: QuoteData): string {
  const now = new Date();
  const timeString = now.toLocaleTimeString('vi-VN', { hour12: false });
  memoryActiveDraft = { quote, savedAt: timeString };
  repoSaveDraft('current_user', quote).catch(() => {});
  return timeString;
}

export function getActiveQuoteDraft(): { quote: QuoteData | null; savedAt: string | null } {
  return memoryActiveDraft;
}

export function clearActiveQuoteDraft() {
  memoryActiveDraft = { quote: null, savedAt: null };
  repoClearDraft('current_user').catch(() => {});
}

// ================= SYNC UPDATE HELPER (WHEN CLOUD DATA ARRIVES) =================
export const loadSavedQuotes = getSavedQuotes;
export const saveQuotesList = (quotes: QuoteData[]) => { memoryQuotes = quotes; };
export const loadSavedCustomers = getSavedCustomers;
export const saveCustomersList = (customers: CustomerRecord[]) => { memoryCustomers = customers; };
export const loadSavedSurcharges = getSavedSurcharges;
export const saveSurchargesList = (surcharges: SurchargeItem[]) => { memorySurcharges = surcharges; };
export const loadCompanyProfile = getCompanySettings;
export const saveCompanyProfile = (p: any) => { memoryCompanySettings = p; };

// ================= BACKUP & EXPORT/IMPORT (CLOUD INTEGRATED) =================
export interface SystemBackupData {
  version: string;
  exportDate: string;
  quotes: QuoteData[];
  companySettings: any;
  customers: CustomerRecord[];
  surcharges: SurchargeItem[];
  rateMasters?: RateMasterItem[];
  chargeMasters?: ChargeMasterItem[];
  rateHistories?: RateHistoryItem[];
}

export function exportAllSystemData(): SystemBackupData {
  return {
    version: '17.0-Cloud',
    exportDate: new Date().toISOString(),
    quotes: getSavedQuotes(),
    companySettings: getCompanySettings(),
    customers: getSavedCustomers(),
    surcharges: getSavedSurcharges(),
    rateMasters: getSavedRateMasters(),
    chargeMasters: getSavedChargeMasters(),
    rateHistories: getSavedRateHistories(),
  };
}

export function downloadBackupJsonFile() {
  const data = exportAllSystemData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_logistics_cloud_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importSystemData(jsonData: any, mode: 'overwrite' | 'merge' = 'merge'): {
  quotes: QuoteData[];
  companySettings: any;
  customers: CustomerRecord[];
  surcharges: SurchargeItem[];
} {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('File dữ liệu không hợp lệ!');
  }

  let finalQuotes: QuoteData[] = [];
  let finalCompany: any = null;
  let finalCustomers: CustomerRecord[] = [];
  let finalSurcharges: SurchargeItem[] = [];

  if (mode === 'overwrite') {
    if (Array.isArray(jsonData.quotes)) {
      finalQuotes = jsonData.quotes;
      saveQuotesList(finalQuotes);
      finalQuotes.forEach((q) => repoSaveQuotation(q, { forceOverwrite: true }).catch(() => {}));
    }
    if (jsonData.companySettings) {
      finalCompany = jsonData.companySettings;
      saveCompanyProfile(finalCompany);
      repoSaveCompanyProfile(finalCompany).catch(() => {});
    }
    if (Array.isArray(jsonData.customers)) {
      finalCustomers = jsonData.customers;
      saveCustomersList(finalCustomers);
      finalCustomers.forEach((c) => repoSaveCustomer(c).catch(() => {}));
    }
    if (Array.isArray(jsonData.surcharges)) {
      finalSurcharges = jsonData.surcharges;
      saveSurchargesList(finalSurcharges);
      finalSurcharges.forEach((s) => repoSaveSurcharge(s).catch(() => {}));
    }
  } else {
    // MERGE mode
    const existingQuotes = getSavedQuotes();
    const importedQuotes = Array.isArray(jsonData.quotes) ? jsonData.quotes : [];
    const quoteMap = new Map<string, QuoteData>();
    existingQuotes.forEach(q => quoteMap.set(q.id, q));
    importedQuotes.forEach((q: QuoteData) => quoteMap.set(q.id, q));
    finalQuotes = Array.from(quoteMap.values());
    saveQuotesList(finalQuotes);
    importedQuotes.forEach((q: QuoteData) => repoSaveQuotation(q, { forceOverwrite: true }).catch(() => {}));

    if (jsonData.companySettings) {
      finalCompany = jsonData.companySettings;
      saveCompanyProfile(finalCompany);
      repoSaveCompanyProfile(finalCompany).catch(() => {});
    } else {
      finalCompany = getCompanySettings();
    }

    const existingCustomers = getSavedCustomers();
    const importedCustomers = Array.isArray(jsonData.customers) ? jsonData.customers : [];
    const customerMap = new Map<string, CustomerRecord>();
    existingCustomers.forEach(c => customerMap.set(c.id, c));
    importedCustomers.forEach((c: CustomerRecord) => customerMap.set(c.id, c));
    finalCustomers = Array.from(customerMap.values());
    saveCustomersList(finalCustomers);
    importedCustomers.forEach((c: CustomerRecord) => repoSaveCustomer(c).catch(() => {}));

    const existingSurcharges = getSavedSurcharges();
    const importedSurcharges = Array.isArray(jsonData.surcharges) ? jsonData.surcharges : [];
    const surchargeMap = new Map<string, SurchargeItem>();
    existingSurcharges.forEach(s => surchargeMap.set(s.id, s));
    importedSurcharges.forEach((s: SurchargeItem) => surchargeMap.set(s.id, s));
    finalSurcharges = Array.from(surchargeMap.values());
    saveSurchargesList(finalSurcharges);
    importedSurcharges.forEach((s: SurchargeItem) => repoSaveSurcharge(s).catch(() => {}));
  }

  return {
    quotes: finalQuotes,
    companySettings: finalCompany,
    customers: finalCustomers,
    surcharges: finalSurcharges,
  };
}
