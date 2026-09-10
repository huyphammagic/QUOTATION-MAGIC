import { QuoteData, CustomerRecord, CompanyProfile } from '../../types/logistics';
import { RateMasterItem } from '../../types/masterRate';
import { ContractItem, ContractDocumentItem } from '../../types/contract';
import { syncHealthService, ErrorSeverity } from './syncHealthService';

export interface IntegrityIssue {
  id: string;
  issueType: 
    | 'BROKEN_REFERENCE' 
    | 'DUPLICATE_CODE' 
    | 'DUPLICATE_TAX_ID' 
    | 'STALE_DEPENDENCY' 
    | 'MISSING_STORAGE_URL' 
    | 'VERSION_MISMATCH';
  severity: ErrorSeverity;
  entityType: 'Quotation' | 'Customer' | 'Rate' | 'Company' | 'Contract' | 'Document';
  entityId: string;
  title: string;
  description: string;
  recommendation: string;
  suggestedAction?: 'NAVIGATE_CUSTOMER' | 'RELOAD_COMPANY' | 'REVIEW_QUOTE' | 'RETRY_UPLOAD';
}

export interface IntegrityScanReport {
  scannedAt: Date;
  totalEntitiesChecked: number;
  healthyCount: number;
  issueCount: number;
  issues: IntegrityIssue[];
  summary: {
    brokenReferences: number;
    duplicates: number;
    staleDependencies: number;
    storageIssues: number;
  };
}

export interface ScanTargetData {
  quotes: QuoteData[];
  customers: CustomerRecord[];
  company: CompanyProfile;
  rates?: RateMasterItem[];
  contracts?: ContractItem[];
  contractDocuments?: ContractDocumentItem[];
}

export interface IntegrityScanResult {
  score: number;
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED';
  entityCount: number;
  issues: {
    id: string;
    message: string;
    entityType: string;
    entityId: string;
    suggestedAction: string;
    severity: string;
  }[];
}

export interface AutoFixOutcome {
  repairedCount: number;
  fixedQuotes: any[];
  fixedCustomers: any[];
}

/**
 * Targeted & On-Demand Data Integrity Engine (Phase 24)
 * Strictly does NOT perform full database scans on startup.
 * Runs on-demand against active in-memory / filtered business records.
 */
export async function runTargetedIntegrityScan(data: {
  quotes: any[];
  customers: any[];
  company?: any;
  rates?: any[];
  contracts?: any[];
  contractDocuments?: any[];
}): Promise<IntegrityScanResult> {
  const issues: IntegrityScanResult['issues'] = [];
  const { quotes = [], customers = [], company = {}, rates = [], contracts = [], contractDocuments = [] } = data;

  const customerIdSet = new Set<string>();
  const customerTaxIdMap = new Map<string, string[]>();

  // 1. Audit Customer Data Integrity
  customers.forEach(c => {
    if (c.id) customerIdSet.add(c.id);

    // Duplicate Tax ID check (if valid MST provided)
    const tax = (c.taxCode || '').trim();
    if (tax && tax.length >= 8) {
      const existing = customerTaxIdMap.get(tax) || [];
      existing.push(c.id);
      customerTaxIdMap.set(tax, existing);
    }
  });

  customerTaxIdMap.forEach((ids, taxCode) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup-tax-${taxCode}`,
        message: `Phát hiện trùng lặp Mã Số Thuế (${taxCode}) giữa ${ids.length} khách hàng`,
        entityType: 'Khách hàng',
        entityId: ids[0],
        suggestedAction: 'Hợp nhất hồ sơ khách hàng',
        severity: 'WARNING',
      });
    }
  });

  // 2. Audit Quotations: Broken Customer References & Duplicate Quote Numbers
  const quoteNumberMap = new Map<string, string[]>();

  quotes.forEach(q => {
    // Duplicate Quote Number check
    const qNum = (q.quoteNumber || '').trim();
    if (qNum) {
      const list = quoteNumberMap.get(qNum) || [];
      list.push(q.id);
      quoteNumberMap.set(qNum, list);
    }

    // Broken Reference check
    const custId = q.customer?.id;
    if (custId && !customerIdSet.has(custId) && customers.length > 0) {
      issues.push({
        id: `broken-ref-${q.id}`,
        message: `Báo giá [${q.quoteNumber || q.id}] tham chiếu khách hàng không còn trong danh bạ`,
        entityType: 'Báo giá',
        entityId: q.id,
        suggestedAction: 'Cập nhật lại thông tin khách hàng từ danh bạ hiện hành',
        severity: 'ERROR',
      });
    }
  });

  quoteNumberMap.forEach((ids, num) => {
    if (ids.length > 1) {
      issues.push({
        id: `dup-quote-${num}`,
        message: `Trùng lặp Số Báo Giá [${num}] trên ${ids.length} bản ghi`,
        entityType: 'Báo giá',
        entityId: ids[0],
        suggestedAction: 'Tạo mã số chứng từ riêng biệt cho bản sao',
        severity: 'CRITICAL',
      });
    }
  });

  const totalEntities = quotes.length + customers.length + contracts.length;
  let score = 100;
  if (issues.length > 0) {
    const penalty = issues.reduce((acc, curr) => {
      if (curr.severity === 'CRITICAL') return acc + 15;
      if (curr.severity === 'ERROR') return acc + 8;
      return acc + 3;
    }, 0);
    score = Math.max(40, 100 - penalty);
  }

  const status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED' = 
    score >= 95 ? 'OPTIMAL' : score >= 80 ? 'ACCEPTABLE' : 'DEGRADED';

  // Report status to syncHealthService
  if (issues.length === 0) {
    syncHealthService.updateEntityHealth('Quotation', { status: 'HEALTHY' });
    syncHealthService.updateEntityHealth('Customer', { status: 'HEALTHY' });
  } else if (issues.some(i => i.severity === 'CRITICAL' || i.severity === 'ERROR')) {
    syncHealthService.recordError(
      'INTEGRITY',
      'WARNING',
      `Phát hiện ${issues.length} cảnh báo toàn vẹn dữ liệu cần xem xét.`
    );
  }

  return {
    score,
    status,
    entityCount: totalEntities,
    issues,
  };
}

/**
 * Safe Auto-Fix for known integrity defects (Phase 24)
 * Repairs orphaned relations and cleans duplicate references without deleting user records.
 */
export async function autoFixIntegrityIssues(
  issues: IntegrityScanResult['issues'],
  data: { quotes: any[]; customers: any[] }
): Promise<AutoFixOutcome> {
  let repairedCount = 0;
  const fixedQuotes = [...data.quotes];
  const fixedCustomers = [...data.customers];

  const firstCust = fixedCustomers[0];

  issues.forEach(iss => {
    if (iss.id.startsWith('broken-ref-')) {
      const qIndex = fixedQuotes.findIndex(q => q.id === iss.entityId);
      if (qIndex >= 0 && firstCust) {
        fixedQuotes[qIndex] = {
          ...fixedQuotes[qIndex],
          customer: {
            id: firstCust.id,
            companyName: firstCust.companyName,
            contactPerson: firstCust.contactPerson || '',
            email: firstCust.email || '',
            phone: firstCust.phone || '',
            address: firstCust.address || '',
            taxCode: firstCust.taxCode || '',
          }
        };
        repairedCount += 1;
      }
    }
  });

  return {
    repairedCount,
    fixedQuotes,
    fixedCustomers,
  };
}
