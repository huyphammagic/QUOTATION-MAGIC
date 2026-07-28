import { QuoteData, CustomerRecord, SurchargeItem } from '../types/logistics';
import { INITIAL_SAMPLE_QUOTE, INITIAL_CUSTOMERS, INITIAL_SURCHARGE_CATALOG } from '../data/presets';
import { generateQuoteNumber } from './formatters';

const STORAGE_KEY = 'LOGISTICS_SAVED_QUOTES_V1';
const SETTINGS_KEY = 'LOGISTICS_COMPANY_SETTINGS_V1';
const CUSTOMERS_KEY = 'LOGISTICS_CUSTOMERS_V1';
const SURCHARGES_KEY = 'LOGISTICS_SURCHARGES_CATALOG_V1';

export function getSavedQuotes(): QuoteData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial sample quote if empty
      const initial = [INITIAL_SAMPLE_QUOTE];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading saved quotes:', err);
    return [INITIAL_SAMPLE_QUOTE];
  }
}

export function saveQuote(quote: QuoteData): QuoteData[] {
  const existing = getSavedQuotes();
  const index = existing.findIndex((q) => q.id === quote.id);

  const updatedQuote = {
    ...quote,
    updatedDate: new Date().toISOString().slice(0, 10),
  };

  if (index >= 0) {
    existing[index] = updatedQuote;
  } else {
    existing.unshift(updatedQuote);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return existing;
}

export function deleteQuote(id: string): QuoteData[] {
  const existing = getSavedQuotes();
  const filtered = existing.filter((q) => q.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}

export function cloneQuote(id: string): QuoteData | null {
  const existing = getSavedQuotes();
  const target = existing.find((q) => q.id === id);
  if (!target) return null;

  const newQuote: QuoteData = {
    ...JSON.parse(JSON.stringify(target)),
    id: `quote-${Date.now()}`,
    quoteNumber: generateQuoteNumber(),
    createdDate: new Date().toISOString().slice(0, 10),
    updatedDate: new Date().toISOString().slice(0, 10),
    status: 'DRAFT',
  };

  saveQuote(newQuote);
  return newQuote;
}

export function updateQuoteStatus(id: string, status: QuoteData['status']): QuoteData[] {
  const existing = getSavedQuotes();
  const target = existing.find((q) => q.id === id);
  if (target) {
    target.status = status;
    target.updatedDate = new Date().toISOString().slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }
  return existing;
}

export function getCompanySettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading settings', e);
  }
  return null;
}

export function saveCompanySettings(settings: any) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ================= CUSTOMERS STORAGE =================
export function getSavedCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (!raw) {
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(INITIAL_CUSTOMERS));
      return INITIAL_CUSTOMERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading customers', e);
    return INITIAL_CUSTOMERS;
  }
}

export function saveCustomerRecord(customer: CustomerRecord): CustomerRecord[] {
  const existing = getSavedCustomers();
  const index = existing.findIndex((c) => c.id === customer.id);
  if (index >= 0) {
    existing[index] = customer;
  } else {
    existing.unshift(customer);
  }
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(existing));
  return existing;
}

export function deleteCustomerRecord(id: string): CustomerRecord[] {
  const existing = getSavedCustomers();
  const filtered = existing.filter((c) => c.id !== id);
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(filtered));
  return filtered;
}

// ================= SURCHARGE CATALOG STORAGE =================
export function getSavedSurcharges(): SurchargeItem[] {
  try {
    const raw = localStorage.getItem(SURCHARGES_KEY);
    if (!raw) {
      localStorage.setItem(SURCHARGES_KEY, JSON.stringify(INITIAL_SURCHARGE_CATALOG));
      return INITIAL_SURCHARGE_CATALOG;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading surcharge catalog', e);
    return INITIAL_SURCHARGE_CATALOG;
  }
}

export function saveSurchargeItem(item: SurchargeItem): SurchargeItem[] {
  const existing = getSavedSurcharges();
  const index = existing.findIndex((s) => s.id === item.id);
  if (index >= 0) {
    existing[index] = item;
  } else {
    existing.unshift(item);
  }
  localStorage.setItem(SURCHARGES_KEY, JSON.stringify(existing));
  return existing;
}

export function deleteSurchargeItem(id: string): SurchargeItem[] {
  const existing = getSavedSurcharges();
  const filtered = existing.filter((s) => s.id !== id);
  localStorage.setItem(SURCHARGES_KEY, JSON.stringify(filtered));
  return filtered;
}

// ================= FULL BACKUP & RESTORE DATA =================
export interface SystemBackupData {
  version: string;
  exportDate: string;
  quotes: QuoteData[];
  companySettings: any;
  customers: CustomerRecord[];
  surcharges: SurchargeItem[];
}

export function exportAllSystemData(): SystemBackupData {
  return {
    version: '2.5',
    exportDate: new Date().toISOString(),
    quotes: getSavedQuotes(),
    companySettings: getCompanySettings(),
    customers: getSavedCustomers(),
    surcharges: getSavedSurcharges(),
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
  link.download = `backup_logistics_data_${dateStr}.json`;
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQuotes));
    }
    if (jsonData.companySettings) {
      finalCompany = jsonData.companySettings;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(finalCompany));
    }
    if (Array.isArray(jsonData.customers)) {
      finalCustomers = jsonData.customers;
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(finalCustomers));
    }
    if (Array.isArray(jsonData.surcharges)) {
      finalSurcharges = jsonData.surcharges;
      localStorage.setItem(SURCHARGES_KEY, JSON.stringify(finalSurcharges));
    }
  } else {
    // MERGE mode
    const existingQuotes = getSavedQuotes();
    const importedQuotes = Array.isArray(jsonData.quotes) ? jsonData.quotes : [];
    const quoteMap = new Map<string, QuoteData>();
    existingQuotes.forEach(q => quoteMap.set(q.id, q));
    importedQuotes.forEach((q: QuoteData) => quoteMap.set(q.id, q));
    finalQuotes = Array.from(quoteMap.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalQuotes));

    if (jsonData.companySettings) {
      finalCompany = jsonData.companySettings;
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(finalCompany));
    } else {
      finalCompany = getCompanySettings();
    }

    const existingCustomers = getSavedCustomers();
    const importedCustomers = Array.isArray(jsonData.customers) ? jsonData.customers : [];
    const customerMap = new Map<string, CustomerRecord>();
    existingCustomers.forEach(c => customerMap.set(c.id, c));
    importedCustomers.forEach((c: CustomerRecord) => customerMap.set(c.id, c));
    finalCustomers = Array.from(customerMap.values());
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(finalCustomers));

    const existingSurcharges = getSavedSurcharges();
    const importedSurcharges = Array.isArray(jsonData.surcharges) ? jsonData.surcharges : [];
    const surchargeMap = new Map<string, SurchargeItem>();
    existingSurcharges.forEach(s => surchargeMap.set(s.id, s));
    importedSurcharges.forEach((s: SurchargeItem) => surchargeMap.set(s.id, s));
    finalSurcharges = Array.from(surchargeMap.values());
    localStorage.setItem(SURCHARGES_KEY, JSON.stringify(finalSurcharges));
  }

  return {
    quotes: finalQuotes,
    companySettings: finalCompany,
    customers: finalCustomers,
    surcharges: finalSurcharges,
  };
}


