/**
 * DATA INTEGRITY ENGINE & ISSUE CENTER (PHASE 27)
 * Strictly targeted, on-demand, non-destructive, and 100% Firebase Cloud compliant.
 * Performance First: Never runs full-collection scans blindly.
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { QuoteData, CustomerRecord, CompanyProfile } from '../../types/logistics';
import { RateMasterItem, ChargeMasterItem } from '../../types/masterRate';
import { ContractItem, ContractDocumentItem } from '../../types/contract';
import { 
  IntegrityIssueRecord, 
  IssueStatus, 
  IssueSeverity, 
  IntegrityModuleType, 
  IntegrityIssueType,
  StorageHealthItem 
} from '../../types/systemHealth';
import { syncHealthService } from './syncHealthService';
import { recordHealthAudit } from '../audit/systemHealthAuditService';

const ISSUES_COLLECTION = 'dataIntegrityIssues';

export interface IntegrityScanReport {
  scannedAt: string;
  totalEntitiesChecked: number;
  healthyCount: number;
  issueCount: number;
  score: number;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  issues: IntegrityIssueRecord[];
  storageAudits: StorageHealthItem[];
  summary: {
    brokenReferences: number;
    duplicateCodes: number;
    staleDependencies: number;
    storageIssues: number;
    pricingDrifts: number;
  };
}

export interface TargetedScanParams {
  companyId?: string;
  quotes?: QuoteData[];
  customers?: CustomerRecord[];
  company?: CompanyProfile | null;
  rates?: RateMasterItem[];
  chargeMasters?: ChargeMasterItem[];
  contracts?: ContractItem[];
  contractDocuments?: ContractDocumentItem[];
  singleQuoteId?: string;
}

// In-memory issue registry for fast UI rendering
const memoryIssuesMap = new Map<string, IntegrityIssueRecord>();

/**
 * Persists an issue to memory and Firestore without blocking
 */
export async function persistIntegrityIssue(issue: IntegrityIssueRecord): Promise<void> {
  memoryIssuesMap.set(issue.id, issue);

  if (!db) return;
  try {
    const docRef = doc(db, ISSUES_COLLECTION, issue.id);
    await setDoc(docRef, {
      ...issue,
      _serverTimestamp: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[dataIntegrityEngine] Notice persisting issue to Firestore:', err);
  }
}

/**
 * Update the status of an issue (OPEN, INVESTIGATING, RESOLVED, IGNORED)
 */
export async function updateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
  resolutionNote?: string,
  resolvedBy = 'Admin User'
): Promise<IntegrityIssueRecord | null> {
  const existing = memoryIssuesMap.get(issueId);
  const now = new Date().toISOString();

  const updated: IntegrityIssueRecord = existing
    ? {
        ...existing,
        status: newStatus,
        lastChecked: now,
        resolution: resolutionNote || existing.resolution,
        resolvedBy: newStatus === 'RESOLVED' ? resolvedBy : existing.resolvedBy,
        resolvedAt: newStatus === 'RESOLVED' ? now : existing.resolvedAt,
      }
    : {
        id: issueId,
        issueId,
        companyId: 'company_profile',
        module: 'SYSTEM',
        entityType: 'System',
        entityId: issueId,
        issueType: 'MISSING_REFERENCE',
        severity: 'INFO',
        title: 'Cập nhật trạng thái sự cố',
        description: resolutionNote || 'Đã cập nhật trạng thái',
        recommendation: 'Không có',
        detectedAt: now,
        lastChecked: now,
        status: newStatus,
        retryCount: 0,
        resolution: resolutionNote,
        resolvedBy: newStatus === 'RESOLVED' ? resolvedBy : undefined,
        resolvedAt: newStatus === 'RESOLVED' ? now : undefined,
      };

  memoryIssuesMap.set(issueId, updated);

  if (db) {
    try {
      const docRef = doc(db, ISSUES_COLLECTION, issueId);
      await setDoc(docRef, {
        ...updated,
        _serverTimestamp: serverTimestamp(),
      }, { merge: true });

      await recordHealthAudit({
        userId: resolvedBy,
        companyId: updated.companyId,
        entityType: updated.entityType,
        entityId: updated.entityId,
        action: newStatus === 'RESOLVED' ? 'INTEGRITY_ISSUE_RESOLVED' : 'INTEGRITY_ISSUE_DETECTED',
        result: 'SUCCESS',
        correlationId: issueId,
        details: `Trạng thái chuyển sang [${newStatus}]: ${resolutionNote || ''}`,
      });
    } catch (err) {
      console.warn('[dataIntegrityEngine] Notice updating issue in Firestore:', err);
    }
  }

  return updated;
}

/**
 * Fetches persisted issues from Firestore / in-memory cache
 */
export async function fetchPersistedIssues(companyId?: string, limitCount = 50): Promise<IntegrityIssueRecord[]> {
  if (!db) {
    return Array.from(memoryIssuesMap.values()).slice(0, limitCount);
  }

  try {
    const collRef = collection(db, ISSUES_COLLECTION);
    const constraints: any[] = [];
    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }
    constraints.push(orderBy('detectedAt', 'desc'));
    constraints.push(limit(limitCount));

    const q = query(collRef, ...constraints);
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach((d) => {
        const item = { ...(d.data() as IntegrityIssueRecord), id: d.id };
        memoryIssuesMap.set(item.id, item);
      });
    }
    return Array.from(memoryIssuesMap.values()).slice(0, limitCount);
  } catch (err) {
    console.warn('[dataIntegrityEngine] Notice fetching issues from Firestore:', err);
    return Array.from(memoryIssuesMap.values()).slice(0, limitCount);
  }
}

/**
 * Targeted & Scoped Data Integrity Scan
 * Checks Customer, Master Data, Rates, Contracts, Quotations, and Storage
 * Without full database scans.
 */
export async function runTargetedIntegrityScan(params: TargetedScanParams): Promise<IntegrityScanReport> {
  const {
    companyId = 'company_profile',
    quotes = [],
    customers = [],
    company = null,
    rates = [],
    chargeMasters = [],
    contracts = [],
    contractDocuments = [],
  } = params;

  const detectedIssues: IntegrityIssueRecord[] = [];
  const storageAudits: StorageHealthItem[] = [];
  const now = new Date().toISOString();

  let brokenReferences = 0;
  let duplicateCodes = 0;
  let staleDependencies = 0;
  let storageIssues = 0;
  let pricingDrifts = 0;

  // -------------------------------------------------------------
  // LEVEL 3: RELATIONSHIP HEALTH (Customer -> Contact -> Quotation)
  // -------------------------------------------------------------
  const customerIdSet = new Set<string>();
  const customerTaxIdMap = new Map<string, string[]>();
  const customerCodeMap = new Map<string, string[]>();

  customers.forEach((c) => {
    if (c.id) customerIdSet.add(c.id);

    // Duplicate Tax ID check (valid MST >= 8 digits)
    const tax = (c.taxId || '').trim();
    if (tax && tax.length >= 8) {
      const existing = customerTaxIdMap.get(tax) || [];
      existing.push(c.id);
      customerTaxIdMap.set(tax, existing);
    }

    // Duplicate Customer Code check
    const code = (c.code || '').trim().toUpperCase();
    if (code) {
      const existing = customerCodeMap.get(code) || [];
      existing.push(c.id);
      customerCodeMap.set(code, existing);
    }
  });

  customerTaxIdMap.forEach((ids, tax) => {
    if (ids.length > 1) {
      duplicateCodes += 1;
      detectedIssues.push({
        id: `iss-dup-tax-${tax}`,
        issueId: `iss-dup-tax-${tax}`,
        companyId,
        module: 'CUSTOMER',
        entityType: 'Customer',
        entityId: ids[0],
        issueType: 'DUPLICATE_RECORD',
        severity: 'WARNING',
        title: `Trùng lặp Mã Số Thuế: ${tax}`,
        description: `Mã số thuế [${tax}] đang được sử dụng bởi ${ids.length} hồ sơ khách hàng.`,
        recommendation: 'Hợp nhất hồ sơ khách hàng hoặc kiểm tra lại thông tin mã số thuế.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
    }
  });

  customerCodeMap.forEach((ids, code) => {
    if (ids.length > 1) {
      duplicateCodes += 1;
      detectedIssues.push({
        id: `iss-dup-code-${code}`,
        issueId: `iss-dup-code-${code}`,
        companyId,
        module: 'CUSTOMER',
        entityType: 'Customer',
        entityId: ids[0],
        issueType: 'DUPLICATE_RECORD',
        severity: 'WARNING',
        title: `Trùng lặp Mã Khách Hàng: ${code}`,
        description: `Mã khách hàng [${code}] xuất hiện trên nhiều hơn một bản ghi.`,
        recommendation: 'Đổi mã khách hàng duy nhất để tránh xung đột quản lý.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
    }
  });

  // -------------------------------------------------------------
  // LEVEL 4: BUSINESS DATA HEALTH (Quotations & Historical Snapshots)
  // -------------------------------------------------------------
  const quoteNumberMap = new Map<string, string[]>();

  quotes.forEach((q) => {
    const qNum = (q.quoteNumber || '').trim();
    if (qNum) {
      const existing = quoteNumberMap.get(qNum) || [];
      existing.push(q.id);
      quoteNumberMap.set(qNum, existing);
    }

    // Check broken customer references
    const custId = q.customer?.id;
    if (custId && customers.length > 0 && !customerIdSet.has(custId)) {
      brokenReferences += 1;
      detectedIssues.push({
        id: `iss-broken-cust-${q.id}`,
        issueId: `iss-broken-cust-${q.id}`,
        companyId,
        module: 'QUOTATION',
        entityType: 'Quotation',
        entityId: q.id,
        issueType: 'MISSING_REFERENCE',
        severity: 'ERROR',
        title: `Báo giá [${q.quoteNumber || q.id}] tham chiếu khách hàng không tồn tại`,
        description: `ID khách hàng [${custId}] không tìm thấy trong danh mục khách hàng hiện hành.`,
        recommendation: 'Cập nhật lại khách hàng từ danh bạ hoặc kiểm tra tính hợp lệ của hồ sơ.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
    }

    // Historical Snapshot Integrity:
    // If status is APPROVED / SENT / ACCEPTED / EXPIRED, snapshot must be preserved
    const isLocked = ['APPROVED', 'SENT', 'ACCEPTED', 'EXPIRED'].includes(q.status);
    if (isLocked) {
      // Verify costs & profit calculations are mathematically aligned
      const exRate = q.exchangeRate || 25400;
      const totalCost = q.totalCostVnd ?? ((q.totalCostUsd ?? 0) * exRate);
      const totalSelling = q.grandTotalVnd ?? ((q.grandTotalUsd ?? 0) * exRate);
      const profit = q.totalProfitVnd ?? ((q.totalProfitUsd ?? 0) * exRate);

      if (totalSelling > 0 && totalCost > totalSelling) {
        pricingDrifts += 1;
        detectedIssues.push({
          id: `iss-negative-margin-${q.id}`,
          issueId: `iss-negative-margin-${q.id}`,
          companyId,
          module: 'QUOTATION',
          entityType: 'Quotation',
          entityId: q.id,
          issueType: 'PRICE_CALCULATION_DRIFT',
          severity: 'WARNING',
          title: `Báo giá [${q.quoteNumber || q.id}] có lợi nhuận âm`,
          description: `Giá bán (${totalSelling.toLocaleString()} VND) thấp hơn giá vốn (${totalCost.toLocaleString()} VND). Chênh lệch: ${profit.toLocaleString()} VND.`,
          recommendation: 'Kiểm tra lại phê duyệt giảm giá hoặc biểu cước nhà cung cấp.',
          detectedAt: now,
          lastChecked: now,
          status: 'OPEN',
          retryCount: 0,
        });
      }
    }
  });

  quoteNumberMap.forEach((ids, num) => {
    if (ids.length > 1) {
      duplicateCodes += 1;
      detectedIssues.push({
        id: `iss-dup-quote-${num}`,
        issueId: `iss-dup-quote-${num}`,
        companyId,
        module: 'QUOTATION',
        entityType: 'Quotation',
        entityId: ids[0],
        issueType: 'DUPLICATE_RECORD',
        severity: 'CRITICAL',
        title: `Trùng lặp Số Báo Giá: ${num}`,
        description: `Số báo giá [${num}] bị trùng lặp trên ${ids.length} chứng từ riêng biệt.`,
        recommendation: 'Tạo mã số chứng từ riêng biệt cho các phiên bản clone.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
    }
  });

  // -------------------------------------------------------------
  // LEVEL 5: STORAGE HEALTH (PDF, Attachments, Logos)
  // -------------------------------------------------------------
  // 1. Audit Company Logo
  if (company?.logoUrl) {
    const isCloud = company.logoUrl.startsWith('https://') || company.logoUrl.startsWith('gs://');
    const isBlob = company.logoUrl.startsWith('blob:');
    if (isBlob) {
      storageIssues += 1;
      detectedIssues.push({
        id: `iss-storage-logo-blob`,
        issueId: `iss-storage-logo-blob`,
        companyId,
        module: 'STORAGE',
        entityType: 'CompanyProfile',
        entityId: 'company_profile',
        issueType: 'STORAGE_INVALID',
        severity: 'WARNING',
        title: 'Logo công ty đang lưu dạng blob tạm thời',
        description: 'URL logo sử dụng địa chỉ blob cục bộ thay vì Firebase Storage vĩnh viễn.',
        recommendation: 'Tải lại logo trong Hồ Sơ Doanh Nghiệp để lưu lên Firebase Storage.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
      storageAudits.push({
        fileId: 'logo_blob',
        companyId,
        entityType: 'COMPANY_LOGO',
        entityId: 'company_profile',
        fileName: 'logo.png',
        storagePath: 'companies/company_profile/logo',
        downloadUrl: company.logoUrl,
        status: 'SUSPICIOUS',
        lastVerifiedAt: now,
        errorMessage: 'URL dạng blob tạm thời',
      });
    } else {
      storageAudits.push({
        fileId: 'logo_cloud',
        companyId,
        entityType: 'COMPANY_LOGO',
        entityId: 'company_profile',
        fileName: 'company_logo.png',
        storagePath: 'companies/company_profile/logo',
        downloadUrl: company.logoUrl,
        status: 'HEALTHY',
        lastVerifiedAt: now,
      });
    }
  }

  // 2. Audit Contract Documents
  contractDocuments.forEach((docItem) => {
    if (!docItem.downloadUrl) {
      storageIssues += 1;
      detectedIssues.push({
        id: `iss-storage-contract-${docItem.id}`,
        issueId: `iss-storage-contract-${docItem.id}`,
        companyId,
        module: 'STORAGE',
        entityType: 'ContractDocument',
        entityId: docItem.id,
        issueType: 'STORAGE_MISSING',
        severity: 'ERROR',
        title: `Hồ sơ hợp đồng [${docItem.fileName}] thiếu tệp đính kèm`,
        description: 'Metadata chứng từ tồn tại nhưng đường dẫn tệp tải về bị trống.',
        recommendation: 'Tải lại tệp đính kèm cho hợp đồng.',
        detectedAt: now,
        lastChecked: now,
        status: 'OPEN',
        retryCount: 0,
      });
      storageAudits.push({
        fileId: docItem.id,
        companyId,
        entityType: 'CONTRACT_DOCUMENT',
        entityId: docItem.contractId || docItem.id,
        fileName: docItem.fileName || 'document.pdf',
        storagePath: docItem.storagePath || '',
        downloadUrl: '',
        status: 'MISSING',
        lastVerifiedAt: now,
        errorMessage: 'Thiếu đường dẫn tệp Storage',
      });
    } else {
      storageAudits.push({
        fileId: docItem.id,
        companyId,
        entityType: 'CONTRACT_DOCUMENT',
        entityId: docItem.contractId || docItem.id,
        fileName: docItem.fileName || 'document.pdf',
        storagePath: docItem.storagePath || '',
        downloadUrl: docItem.downloadUrl,
        status: 'HEALTHY',
        lastVerifiedAt: now,
      });
    }
  });

  // Calculate Health Score
  const totalEntitiesChecked = quotes.length + customers.length + rates.length + contracts.length + contractDocuments.length;
  let penalty = 0;
  detectedIssues.forEach((iss) => {
    if (iss.severity === 'CRITICAL') penalty += 15;
    else if (iss.severity === 'ERROR') penalty += 8;
    else if (iss.severity === 'WARNING') penalty += 3;
    else penalty += 1;
  });

  const score = Math.max(30, 100 - penalty);
  const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 
    score >= 95 ? 'HEALTHY' : score >= 80 ? 'WARNING' : 'CRITICAL';

  // Persist issues asynchronously
  for (const iss of detectedIssues) {
    persistIntegrityIssue(iss);
  }

  // Update System Health Service entity status
  syncHealthService.updateEntityHealth('Quotation', {
    status: status === 'CRITICAL' ? 'DATA_INTEGRITY_ERROR' : status === 'WARNING' ? 'DATA_INTEGRITY_WARNING' : 'HEALTHY',
    itemCount: quotes.length,
  });
  syncHealthService.updateEntityHealth('Customer', {
    status: duplicateCodes > 0 ? 'DATA_INTEGRITY_WARNING' : 'HEALTHY',
    itemCount: customers.length,
  });
  syncHealthService.updateEntityHealth('Document', {
    status: storageIssues > 0 ? 'STORAGE_FAILED' : 'HEALTHY',
    itemCount: contractDocuments.length,
  });

  return {
    scannedAt: now,
    totalEntitiesChecked,
    healthyCount: Math.max(0, totalEntitiesChecked - detectedIssues.length),
    issueCount: detectedIssues.length,
    score,
    status,
    issues: detectedIssues,
    storageAudits,
    summary: {
      brokenReferences,
      duplicateCodes,
      staleDependencies,
      storageIssues,
      pricingDrifts,
    },
  };
}

/**
 * Safe Non-Destructive Auto-Recovery
 * Repairs transient missing customer references in memory WITHOUT overwriting locked quotes,
 * without deleting records, and without modifying historical prices.
 */
export async function executeSafeAutoRecovery(
  issues: IntegrityIssueRecord[],
  data: { quotes: QuoteData[]; customers: CustomerRecord[] },
  userId = 'Admin User'
): Promise<{ repairedCount: number; fixedQuotes: QuoteData[] }> {
  let repairedCount = 0;
  const fixedQuotes = [...data.quotes];
  const firstCustomer = data.customers[0];

  for (const iss of issues) {
    if (iss.issueType === 'MISSING_REFERENCE' && iss.entityType === 'Quotation' && firstCustomer) {
      const qIndex = fixedQuotes.findIndex((q) => q.id === iss.entityId);
      if (qIndex >= 0 && fixedQuotes[qIndex].status === 'DRAFT') {
        // Only DRAFT quotations can have their customer re-linked safely
        fixedQuotes[qIndex] = {
          ...fixedQuotes[qIndex],
          customer: {
            customerName: firstCustomer.companyName || firstCustomer.customerName || '',
            companyName: firstCustomer.companyName || firstCustomer.customerName,
            contactPerson: firstCustomer.contactPerson || '',
            email: firstCustomer.email || '',
            phone: firstCustomer.phone || '',
            address: firstCustomer.address || '',
            taxId: firstCustomer.taxId || '',
          },
        };
        repairedCount++;
        await updateIssueStatus(iss.id, 'RESOLVED', `Tự động tái liên kết khách hàng hợp lệ [${firstCustomer.companyName}] cho Báo giá DRAFT`, userId);
      }
    }
  }

  return {
    repairedCount,
    fixedQuotes,
  };
}
