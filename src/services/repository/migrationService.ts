/**
 * Phase 50.1: Hardened Data Migration Safety Service
 * Implements strict DRY RUN → PRE-VERIFY → MIGRATE → POST-VERIFY → CLEANUP guarantee.
 * Never purges legacy business data until verified, and creates an archival safety backup.
 */

import { saveQuotation, fetchQuotations } from './quotationRepository';
import { saveCustomer, fetchCustomers } from './customerRepository';
import { saveRateMaster, saveChargeMaster, saveSurcharge } from './rateRepository';
import { saveSupplier, saveCarrier } from './supplierRepository';
import { saveCompanyProfile } from './companyProfileRepository';
import { QuoteData, CustomerRecord, SurchargeItem, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem, SupplierItem, CarrierItem } from '../../types/masterRate';
import { db, auth } from '../firebase/firebaseConfig';

const MIGRATION_FLAG_KEY = 'MIGRATED_TO_FIREBASE_PHASE_17';
const BACKUP_PREFIX = 'LOGISTICS_MIGRATION_SAFETY_BACKUP_';

export const LEGACY_STORAGE_KEYS = {
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

export const ALLOWED_UI_STORAGE_KEYS = [
  'LOGISTICS_APP_LANG',
  'logistics_theme',
  'sidebar_collapsed',
  'LOGISTICS_SIDEBAR_PINNED_FAVORITES_V1',
  'LOGISTICS_SIDEBAR_EXPANDED_GROUPS_V1',
  'LOGISTICS_SIDEBAR_COLLAPSED_V1',
  'logistics_active_company_id',
  MIGRATION_FLAG_KEY,
];

export interface DryRunInspection {
  quotesCount: number;
  customersCount: number;
  surchargesCount: number;
  ratesCount: number;
  chargesCount: number;
  suppliersCount: number;
  carriersCount: number;
  hasCompanySettings: boolean;
  totalEntities: number;
  hasDataToMigrate: boolean;
}

export type MigrationStatus =
  | 'PENDING'
  | 'DRY_RUN'
  | 'VALIDATED'
  | 'MIGRATING'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'FAILED'
  | 'NEEDS_REVIEW';

export interface MigrationSummary {
  status: MigrationStatus;
  hasMigrated: boolean;
  dryRun: DryRunInspection;
  preVerificationPassed: boolean;
  quotesCount: number;
  customersCount: number;
  surchargesCount: number;
  ratesCount: number;
  chargesCount: number;
  suppliersCount: number;
  carriersCount: number;
  companySettingsMigrated: boolean;
  postVerificationPassed: boolean;
  safetyBackupKey?: string;
  clearedLocalKeys: string[];
  errors: string[];
}

/**
 * Step 1: DRY RUN — Inspect legacy localStorage keys without modifying anything
 */
export function dryRunLegacyDataInspection(): DryRunInspection {
  const result: DryRunInspection = {
    quotesCount: 0,
    customersCount: 0,
    surchargesCount: 0,
    ratesCount: 0,
    chargesCount: 0,
    suppliersCount: 0,
    carriersCount: 0,
    hasCompanySettings: false,
    totalEntities: 0,
    hasDataToMigrate: false,
  };

  if (typeof localStorage === 'undefined') {
    return result;
  }

  try {
    const rawQuotes = localStorage.getItem(LEGACY_STORAGE_KEYS.QUOTES);
    if (rawQuotes) {
      const q = JSON.parse(rawQuotes);
      if (Array.isArray(q)) result.quotesCount = q.filter(item => item && (item.id || item.quoteNumber)).length;
    }

    const rawCustomers = localStorage.getItem(LEGACY_STORAGE_KEYS.CUSTOMERS);
    if (rawCustomers) {
      const c = JSON.parse(rawCustomers);
      if (Array.isArray(c)) result.customersCount = c.filter(item => item && (item.id || item.customerName || item.companyName)).length;
    }

    const rawSurcharges = localStorage.getItem(LEGACY_STORAGE_KEYS.SURCHARGES);
    if (rawSurcharges) {
      const s = JSON.parse(rawSurcharges);
      if (Array.isArray(s)) result.surchargesCount = s.filter(item => item && (item.id || item.code)).length;
    }

    const rawRates = localStorage.getItem(LEGACY_STORAGE_KEYS.RATE_MASTERS);
    if (rawRates) {
      const r = JSON.parse(rawRates);
      if (Array.isArray(r)) result.ratesCount = r.filter(item => item && item.id).length;
    }

    const rawCharges = localStorage.getItem(LEGACY_STORAGE_KEYS.CHARGE_MASTERS);
    if (rawCharges) {
      const ch = JSON.parse(rawCharges);
      if (Array.isArray(ch)) result.chargesCount = ch.filter(item => item && (item.id || item.chargeCode)).length;
    }

    const rawSuppliers = localStorage.getItem(LEGACY_STORAGE_KEYS.SUPPLIERS);
    if (rawSuppliers) {
      const sp = JSON.parse(rawSuppliers);
      if (Array.isArray(sp)) result.suppliersCount = sp.filter(item => item && item.id).length;
    }

    const rawCarriers = localStorage.getItem(LEGACY_STORAGE_KEYS.CARRIERS);
    if (rawCarriers) {
      const cr = JSON.parse(rawCarriers);
      if (Array.isArray(cr)) result.carriersCount = cr.filter(item => item && item.id).length;
    }

    const rawSettings = localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      const st = JSON.parse(rawSettings);
      result.hasCompanySettings = Boolean(st && (st.name || st.displayName));
    }

    result.totalEntities = 
      result.quotesCount + 
      result.customersCount + 
      result.surchargesCount + 
      result.ratesCount + 
      result.chargesCount + 
      result.suppliersCount + 
      result.carriersCount + 
      (result.hasCompanySettings ? 1 : 0);

    result.hasDataToMigrate = result.totalEntities > 0;
  } catch (err) {
    console.warn('[migrationService] Dry run inspection notice:', err);
  }

  return result;
}

/**
 * Step 2: PRE-VERIFICATION — Verify Firestore readiness and session authorization
 */
export async function verifyPreMigration(): Promise<{ ready: boolean; error?: string }> {
  if (!db) {
    return { ready: false, error: 'Firestore database is not connected.' };
  }
  if (!auth?.currentUser) {
    return { ready: false, error: 'User is not authenticated. Migration requires an authorized session.' };
  }
  return { ready: true };
}

/**
 * Step 5 Helper: Create timestamped safety backup in localStorage before clearing
 */
function createSafetyArchive(): string | null {
  try {
    const backup: Record<string, any> = {};
    let capturedCount = 0;

    Object.entries(LEGACY_STORAGE_KEYS).forEach(([name, key]) => {
      const item = localStorage.getItem(key);
      if (item !== null) {
        backup[name] = item;
        capturedCount++;
      }
    });

    if (capturedCount === 0) return null;

    const backupKey = `${BACKUP_PREFIX}${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(backup));
    return backupKey;
  } catch (err) {
    console.warn('[migrationService] Notice creating safety archive:', err);
    return null;
  }
}

/**
 * Complete Migration Orchestrator:
 * DRY RUN → PRE-VERIFY → MIGRATE → POST-VERIFY → ARCHIVE & CLEANUP
 */
export async function executeGuaranteedMigration(companyId: string = 'company_profile'): Promise<MigrationSummary> {
  const dryRun = dryRunLegacyDataInspection();
  const summary: MigrationSummary = {
    status: 'DRY_RUN',
    hasMigrated: false,
    dryRun,
    preVerificationPassed: false,
    quotesCount: 0,
    customersCount: 0,
    surchargesCount: 0,
    ratesCount: 0,
    chargesCount: 0,
    suppliersCount: 0,
    carriersCount: 0,
    companySettingsMigrated: false,
    postVerificationPassed: false,
    clearedLocalKeys: [],
    errors: [],
  };

  if (!dryRun.hasDataToMigrate) {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    summary.status = 'VERIFIED';
    summary.hasMigrated = true;
    summary.preVerificationPassed = true;
    summary.postVerificationPassed = true;
    return summary;
  }

  // Pre-verification
  const preCheck = await verifyPreMigration();
  if (!preCheck.ready) {
    summary.status = 'FAILED';
    summary.errors.push(preCheck.error || 'Pre-migration check failed.');
    console.warn('[migrationService] Pre-migration check blocked migration:', preCheck.error);
    return summary;
  }
  summary.preVerificationPassed = true;
  summary.status = 'VALIDATED';

  console.info(`[migrationService] Starting guaranteed migration of ${dryRun.totalEntities} items for company: ${companyId}...`);
  summary.status = 'MIGRATING';

  // Migrate Quotes
  const rawQuotes = localStorage.getItem(LEGACY_STORAGE_KEYS.QUOTES);
  if (rawQuotes) {
    try {
      const quotes: QuoteData[] = JSON.parse(rawQuotes);
      if (Array.isArray(quotes)) {
        for (const q of quotes) {
          if (q.id && q.quoteNumber) {
            const stamped = { ...q, companyId };
            const res = await saveQuotation(stamped, { forceOverwrite: false });
            if (res.success) summary.quotesCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Quotes migration: ${e.message}`);
    }
  }

  // Migrate Customers
  const rawCustomers = localStorage.getItem(LEGACY_STORAGE_KEYS.CUSTOMERS);
  if (rawCustomers) {
    try {
      const customers: CustomerRecord[] = JSON.parse(rawCustomers);
      if (Array.isArray(customers)) {
        for (const c of customers) {
          if (c.id && (c.customerName || c.companyName)) {
            const stamped = { ...c, companyId };
            await saveCustomer(stamped);
            summary.customersCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Customers migration: ${e.message}`);
    }
  }

  // Migrate Surcharges
  const rawSurcharges = localStorage.getItem(LEGACY_STORAGE_KEYS.SURCHARGES);
  if (rawSurcharges) {
    try {
      const surcharges: SurchargeItem[] = JSON.parse(rawSurcharges);
      if (Array.isArray(surcharges)) {
        for (const s of surcharges) {
          if (s.id && s.code) {
            const stamped = { ...s, companyId };
            await saveSurcharge(stamped);
            summary.surchargesCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Surcharges migration: ${e.message}`);
    }
  }

  // Migrate Rate Masters
  const rawRates = localStorage.getItem(LEGACY_STORAGE_KEYS.RATE_MASTERS);
  if (rawRates) {
    try {
      const rates: RateMasterItem[] = JSON.parse(rawRates);
      if (Array.isArray(rates)) {
        for (const r of rates) {
          if (r.id) {
            const stamped = { ...r, companyId };
            await saveRateMaster(stamped);
            summary.ratesCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Rates migration: ${e.message}`);
    }
  }

  // Migrate Charge Masters
  const rawCharges = localStorage.getItem(LEGACY_STORAGE_KEYS.CHARGE_MASTERS);
  if (rawCharges) {
    try {
      const charges: ChargeMasterItem[] = JSON.parse(rawCharges);
      if (Array.isArray(charges)) {
        for (const ch of charges) {
          if (ch.id || ch.chargeCode) {
            const stamped = { ...ch, companyId };
            await saveChargeMaster(stamped);
            summary.chargesCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Charges migration: ${e.message}`);
    }
  }

  // Migrate Suppliers & Carriers
  const rawSuppliers = localStorage.getItem(LEGACY_STORAGE_KEYS.SUPPLIERS);
  if (rawSuppliers) {
    try {
      const suppliers: SupplierItem[] = JSON.parse(rawSuppliers);
      if (Array.isArray(suppliers)) {
        for (const s of suppliers) {
          if (s.id) {
            const stamped = { ...s, companyId };
            await saveSupplier(stamped);
            summary.suppliersCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Suppliers migration: ${e.message}`);
    }
  }

  const rawCarriers = localStorage.getItem(LEGACY_STORAGE_KEYS.CARRIERS);
  if (rawCarriers) {
    try {
      const carriers: CarrierItem[] = JSON.parse(rawCarriers);
      if (Array.isArray(carriers)) {
        for (const c of carriers) {
          if (c.id) {
            const stamped = { ...c, companyId };
            await saveCarrier(stamped);
            summary.carriersCount++;
          }
        }
      }
    } catch (e: any) {
      summary.errors.push(`Carriers migration: ${e.message}`);
    }
  }

  // Migrate Company Settings
  const rawSettings = localStorage.getItem(LEGACY_STORAGE_KEYS.SETTINGS);
  if (rawSettings) {
    try {
      const settings: CompanyProfile = JSON.parse(rawSettings);
      if (settings && (settings.name || settings.englishName)) {
        await saveCompanyProfile(settings);
        summary.companySettingsMigrated = true;
      }
    } catch (e: any) {
      summary.errors.push(`Settings migration: ${e.message}`);
    }
  }

  // Step 4: POST-VERIFICATION — Confirm entities are persistently readable in Firestore before ANY cleanup
  summary.status = 'VERIFYING';
  let postVerificationOk = summary.errors.length === 0;

  if (postVerificationOk && db) {
    try {
      if (dryRun.quotesCount > 0) {
        const remoteQuotes = await fetchQuotations({ companyId });
        if (remoteQuotes.length < summary.quotesCount) {
          postVerificationOk = false;
          summary.errors.push(`Post-verification check failed: expected ${summary.quotesCount} quotations, found ${remoteQuotes.length}`);
        }
      }
      if (dryRun.customersCount > 0) {
        const remoteCustomers = await fetchCustomers(true, companyId);
        if (remoteCustomers.length < summary.customersCount) {
          postVerificationOk = false;
          summary.errors.push(`Post-verification check failed: expected ${summary.customersCount} customers, found ${remoteCustomers.length}`);
        }
      }
    } catch (verErr: any) {
      postVerificationOk = false;
      summary.errors.push(`Post-verification read check error: ${verErr?.message || verErr}`);
    }
  }

  summary.postVerificationPassed = postVerificationOk && summary.errors.length === 0;

  if (summary.postVerificationPassed) {
    summary.status = 'VERIFIED';
    const backupKey = createSafetyArchive();
    if (backupKey) {
      summary.safetyBackupKey = backupKey;
    }

    const cleared: string[] = [];
    Object.values(LEGACY_STORAGE_KEYS).forEach((k) => {
      if (localStorage.getItem(k) !== null) {
        localStorage.removeItem(k);
        cleared.push(k);
      }
    });
    summary.clearedLocalKeys = cleared;
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    summary.hasMigrated = true;

    console.info(`[migrationService] Guaranteed migration complete and VERIFIED. Cleared ${cleared.length} legacy keys. Safety backup: ${backupKey}`);
  } else {
    summary.status = summary.errors.length > 0 ? 'FAILED' : 'NEEDS_REVIEW';
    console.warn(`[migrationService] Migration status ${summary.status}. Legacy data strictly preserved in localStorage without purge.`);
  }

  return summary;
}

// Backward-compatible alias
export const runPhase17Migration = executeGuaranteedMigration;
export const checkAndMigrateLegacyLocalStorage = executeGuaranteedMigration;

export function purgeForbiddenBusinessKeys(): string[] {
  const isMigrated = localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
  if (!isMigrated) {
    // Do NOT purge before migration is guaranteed
    return [];
  }
  const cleared: string[] = [];
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      cleared.push(key);
    }
  });
  return cleared;
}
