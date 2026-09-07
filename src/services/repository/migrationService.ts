import { saveQuotation } from './quotationRepository';
import { saveCustomer } from './customerRepository';
import { saveRateMaster, saveChargeMaster, saveSurcharge, addRateHistory } from './rateRepository';
import { saveSupplier, saveCarrier } from './supplierRepository';
import { saveCompanyProfile } from './companyProfileRepository';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem, RateHistoryItem, SupplierItem, CarrierItem } from '../../types/masterRate';

const MIGRATION_FLAG_KEY = 'MIGRATED_TO_FIREBASE_PHASE_17';

// Business keys in localStorage that must NOT be used anymore
const LEGACY_STORAGE_KEYS = {
  QUOTES: 'LOGISTICS_SAVED_QUOTES_V1',
  SETTINGS: 'LOGISTICS_COMPANY_SETTINGS_V1',
  CUSTOMERS: 'LOGISTICS_CUSTOMERS_V1',
  SURCHARGES: 'LOGISTICS_SURCHARGES_CATALOG_V1',
  RATE_MASTERS: 'LOGISTICS_RATE_MASTERS_V1',
  CHARGE_MASTERS: 'LOGISTICS_CHARGE_MASTERS_V1',
  RATE_HISTORIES: 'LOGISTICS_RATE_HISTORIES_V1',
  DRAFT: 'LOGISTICS_ACTIVE_QUOTE_DRAFT_V1',
  SUPPLIERS: 'LOGIQUOTE_SUPPLIERS_V1',
  CARRIERS: 'LOGIQUOTE_CARRIERS_V1',
  SECURE_LINKS: 'logiquote_secure_links_v1',
  CUSTOMER_RESPONSES: 'logiquote_customer_responses_v1',
  COMMUNICATIONS: 'logiquote_communications_v1',
  FOLLOW_UPS: 'logiquote_follow_ups_v1',
  EMAIL_TEMPLATES: 'logiquote_email_templates_v1',
  DOCUMENTS: 'logiquote_documents_v1',
  TEMPLATES: 'logiquote_templates_v1',
  TERMS: 'logiquote_terms_v1',
  AUDIT_LOGS: 'logiquote_audit_logs_v1',
  RATE_APPROVALS: 'LOGIQUOTE_RATE_APPROVALS_V1',
  RATE_REQUESTS: 'LOGIQUOTE_RATE_REQUESTS_V1',
  IMPORT_JOBS: 'LOGISTICS_IMPORT_JOBS_V1',
};

// Keys that are explicitly ALLOWED to remain in localStorage (UI preferences only)
export const ALLOWED_UI_STORAGE_KEYS = [
  'LOGISTICS_APP_LANG',
  'logistics_theme',
  'sidebar_collapsed',
  MIGRATION_FLAG_KEY,
];

export interface MigrationSummary {
  hasMigrated: boolean;
  quotesCount: number;
  customersCount: number;
  surchargesCount: number;
  ratesCount: number;
  chargesCount: number;
  suppliersCount: number;
  carriersCount: number;
  companySettingsMigrated: boolean;
  clearedLocalKeys: string[];
}

/**
 * Detects legacy local business data in browser localStorage, migrates to Firebase Cloud,
 * and clears them from localStorage to ensure 100% cloud-first consistency.
 */
export async function checkAndMigrateLegacyLocalStorage(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    hasMigrated: false,
    quotesCount: 0,
    customersCount: 0,
    surchargesCount: 0,
    ratesCount: 0,
    chargesCount: 0,
    suppliersCount: 0,
    carriersCount: 0,
    companySettingsMigrated: false,
    clearedLocalKeys: [],
  };

  try {
    const isAlreadyMigrated = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (isAlreadyMigrated === 'true') {
      // Still clean up any accidentally re-created business keys
      purgeForbiddenBusinessKeys();
      return summary;
    }

    console.log('[Phase 17 Migration] Scanning browser localStorage for legacy business data...');

    // 1. Migrate Saved Quotes
    const rawQuotes = localStorage.getItem(LEGACY_STORAGE_KEYS.QUOTES);
    if (rawQuotes) {
      try {
        const quotes: QuoteData[] = JSON.parse(rawQuotes);
        if (Array.isArray(quotes)) {
          for (const q of quotes) {
            if (q.id && q.quoteNumber) {
              await saveQuotation(q, { forceOverwrite: true });
              summary.quotesCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy quotes during migration:', e);
      }
    }

    // 2. Migrate Customers
    const rawCustomers = localStorage.getItem(LEGACY_STORAGE_KEYS.CUSTOMERS);
    if (rawCustomers) {
      try {
        const customers: CustomerRecord[] = JSON.parse(rawCustomers);
        if (Array.isArray(customers)) {
          for (const c of customers) {
            if (c.id && c.customerName) {
              await saveCustomer(c);
              summary.customersCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy customers during migration:', e);
      }
    }

    // 3. Migrate Surcharges
    const rawSurcharges = localStorage.getItem(LEGACY_STORAGE_KEYS.SURCHARGES);
    if (rawSurcharges) {
      try {
        const surcharges: SurchargeItem[] = JSON.parse(rawSurcharges);
        if (Array.isArray(surcharges)) {
          for (const s of surcharges) {
            if (s.id && s.code) {
              await saveSurcharge(s);
              summary.surchargesCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy surcharges during migration:', e);
      }
    }

    // 4. Migrate Company Settings
    const rawSettings = localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      try {
        const settings: CompanyProfile = JSON.parse(rawSettings);
        if (settings && settings.name) {
          await saveCompanyProfile(settings);
          summary.companySettingsMigrated = true;
        }
      } catch (e) {
        console.warn('Error parsing legacy settings during migration:', e);
      }
    }

    // 5. Migrate Rate Masters
    const rawRates = localStorage.getItem(LEGACY_STORAGE_KEYS.RATE_MASTERS);
    if (rawRates) {
      try {
        const rates: RateMasterItem[] = JSON.parse(rawRates);
        if (Array.isArray(rates)) {
          for (const r of rates) {
            if (r.id) {
              await saveRateMaster(r);
              summary.ratesCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy rates during migration:', e);
      }
    }

    // 6. Migrate Charge Masters
    const rawCharges = localStorage.getItem(LEGACY_STORAGE_KEYS.CHARGE_MASTERS);
    if (rawCharges) {
      try {
        const charges: ChargeMasterItem[] = JSON.parse(rawCharges);
        if (Array.isArray(charges)) {
          for (const ch of charges) {
            if (ch.id || ch.chargeCode) {
              await saveChargeMaster(ch);
              summary.chargesCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy charges during migration:', e);
      }
    }

    // 7. Migrate Suppliers & Carriers
    const rawSuppliers = localStorage.getItem(LEGACY_STORAGE_KEYS.SUPPLIERS);
    if (rawSuppliers) {
      try {
        const suppliers: SupplierItem[] = JSON.parse(rawSuppliers);
        if (Array.isArray(suppliers)) {
          for (const s of suppliers) {
            if (s.id) {
              await saveSupplier(s);
              summary.suppliersCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy suppliers during migration:', e);
      }
    }

    const rawCarriers = localStorage.getItem(LEGACY_STORAGE_KEYS.CARRIERS);
    if (rawCarriers) {
      try {
        const carriers: CarrierItem[] = JSON.parse(rawCarriers);
        if (Array.isArray(carriers)) {
          for (const c of carriers) {
            if (c.id) {
              await saveCarrier(c);
              summary.carriersCount++;
            }
          }
        }
      } catch (e) {
        console.warn('Error parsing legacy carriers during migration:', e);
      }
    }

    // Purge legacy business items from localStorage
    summary.clearedLocalKeys = purgeForbiddenBusinessKeys();
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    summary.hasMigrated = true;

    console.log('[Phase 17 Migration] Migration completed successfully:', summary);
    return summary;
  } catch (globalErr) {
    console.error('[Phase 17 Migration] Unexpected error during migration:', globalErr);
    return summary;
  }
}

/**
 * Remove all forbidden business keys from localStorage, leaving ONLY allowed UI preferences
 */
export function purgeForbiddenBusinessKeys(): string[] {
  const cleared: string[] = [];
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      cleared.push(key);
    }
  });
  return cleared;
}

// Alias for convenience
export const runPhase17Migration = checkAndMigrateLegacyLocalStorage;
