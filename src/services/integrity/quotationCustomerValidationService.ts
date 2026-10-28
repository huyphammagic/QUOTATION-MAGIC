/**
 * LOGISTICS PLATFORM - PHASE 84 / INTEGRITY CORE
 * Quotation-to-Customer Validation & Automated Orphaned Records Audit Engine
 * 
 * Validates every customer ID in the 'Quotations' collection against the 'Customers' CRM collection.
 * Identifies orphaned records (missing ID, non-existent ID, mismatch with Tax/Name, unregistered).
 * Offers intelligent 1-Click Auto-Repair with automatic re-linking, CRM customer provisioning,
 * and Firestore cloud synchronization.
 */

import { QuoteData, CustomerRecord } from '../../types/logistics';
import { sanitizeCustomerRecord, saveCustomer } from '../repository/customerRepository';
import { saveQuotation } from '../repository/quotationRepository';
import { recordHealthAudit } from '../audit/systemHealthAuditService';
import { updateIssueStatus } from './dataIntegrityEngine';

export type OrphanRootCause =
  | 'MISSING_CUSTOMER_ID'         // Báo giá hoàn toàn thiếu trường customer.id hoặc rỗng
  | 'NON_EXISTENT_CUSTOMER_ID'    // customer.id có giá trị nhưng không tồn tại trong danh mục Khách hàng CRM
  | 'MISMATCHED_NAME_OR_TAX'      // customer.id không tìm thấy, nhưng MST hoặc Tên công ty trùng khớp với 1 khách hàng CRM khác
  | 'UNREGISTERED_CUSTOMER_INFO'; // Có thông tin công ty trong báo giá nhưng chưa từng được đăng ký vào CRM

export type RepairStrategy =
  | 'RE_LINK_EXISTING_CRM_CUSTOMER' // Tái liên kết với khách hàng CRM tương ứng (theo MST / Tên)
  | 'AUTO_CREATE_CRM_CUSTOMER'      // Tự động tạo hồ sơ khách hàng mới vào CRM và liên kết
  | 'ASSIGN_FALLBACK_CRM_CUSTOMER'; // Gán vào khách hàng mặc định trong CRM

export interface OrphanedQuotationItem {
  quoteId: string;
  quoteNumber: string;
  quoteStatus: string;
  createdDate: string;
  grandTotalUsd: number;
  grandTotalVnd: number;
  quotedCustomerId?: string;
  quotedCompanyName: string;
  quotedTaxId?: string;
  quotedContactPerson?: string;
  quotedEmail?: string;
  quotedPhone?: string;
  quotedAddress?: string;
  orphanReason: OrphanRootCause;
  orphanReasonLabelVi: string;
  suggestedAction: RepairStrategy;
  suggestedActionLabelVi: string;
  matchCandidate?: CustomerRecord;
  isRepaired?: boolean;
  repairedAt?: string;
  repairDetails?: string;
}

export interface QuotationCustomerValidationReport {
  reportId: string;
  generatedAt: string;
  totalQuotationsChecked: number;
  totalCustomersInCrm: number;
  validLinkedCount: number;
  orphanedCount: number;
  integrityScore: number; // 0 - 100%
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  summaryByReason: {
    missingCustomerId: number;
    nonExistentCustomerId: number;
    mismatchedNameOrTax: number;
    unregisteredCustomerInfo: number;
  };
  orphanedRecords: OrphanedQuotationItem[];
  repairableCount: number;
  reportSummaryVi: string;
}

export interface OneClickRepairResult {
  repairedCount: number;
  fixedQuotes: QuoteData[];
  newCustomersCreated: CustomerRecord[];
  auditId: string;
  message: string;
  details: {
    quoteNumber: string;
    actionTaken: string;
    targetCustomerName: string;
  }[];
}

/**
 * Normalizes string for fuzzy/loose matching (removes accents and common Vietnamese company prefixes)
 */
function normalizeCompanyName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(cong ty|công ty|tnhh|cp|co|ltd|corp|corporation|group|jsc)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Generates an automated, comprehensive audit report validating every customer ID in Quotations
 * against the CRM Customers collection.
 */
export function generateQuotationCustomerValidationReport(
  quotes: QuoteData[] = [],
  customers: CustomerRecord[] = []
): QuotationCustomerValidationReport {
  const reportId = `rep-orphan-${Date.now()}`;
  const generatedAt = new Date().toISOString();

  // Index CRM Customers for fast lookup
  const customerById = new Map<string, CustomerRecord>();
  const customerByCode = new Map<string, CustomerRecord>();
  const customerByTaxId = new Map<string, CustomerRecord>();
  const customerByNameNorm = new Map<string, CustomerRecord>();

  customers.forEach(c => {
    if (c.id && c.id.trim()) {
      customerById.set(c.id.trim(), c);
    }
    if (c.code && c.code.trim()) {
      customerByCode.set(c.code.trim().toUpperCase(), c);
    }
    if (c.taxId && c.taxId.trim()) {
      customerByTaxId.set(c.taxId.trim(), c);
    }
    const norm = normalizeCompanyName(c.companyName || c.customerName || '');
    if (norm) {
      customerByNameNorm.set(norm, c);
    }
  });

  const orphanedRecords: OrphanedQuotationItem[] = [];
  let validLinkedCount = 0;

  const summaryByReason = {
    missingCustomerId: 0,
    nonExistentCustomerId: 0,
    mismatchedNameOrTax: 0,
    unregisteredCustomerInfo: 0,
  };

  quotes.forEach(quote => {
    const cust = quote.customer;
    const rawId = cust?.id ? String(cust.id).trim() : '';
    const rawCode = cust?.code ? String(cust.code).trim().toUpperCase() : '';
    const rawTaxId = cust?.taxId ? String(cust.taxId).trim() : '';
    const rawName = (cust?.companyName || cust?.customerName || '').trim();

    // Check if customer ID directly exists in CRM
    const directMatch = (rawId && customerById.get(rawId)) || (rawCode && customerByCode.get(rawCode));

    if (directMatch) {
      validLinkedCount++;
      return;
    }

    // If no direct match, check if there's a match by Tax ID or normalized Company Name
    let matchCandidate: CustomerRecord | undefined;
    if (rawTaxId && customerByTaxId.has(rawTaxId)) {
      matchCandidate = customerByTaxId.get(rawTaxId);
    } else if (rawName) {
      const norm = normalizeCompanyName(rawName);
      if (norm && customerByNameNorm.has(norm)) {
        matchCandidate = customerByNameNorm.get(norm);
      }
    }

    let orphanReason: OrphanRootCause;
    let orphanReasonLabelVi: string;
    let suggestedAction: RepairStrategy;
    let suggestedActionLabelVi: string;

    if (matchCandidate) {
      orphanReason = 'MISMATCHED_NAME_OR_TAX';
      orphanReasonLabelVi = `ID [${rawId || 'Trống'}] không khớp CRM nhưng tìm thấy khách hàng [${matchCandidate.companyName}] qua ${rawTaxId ? `MST (${rawTaxId})` : 'Tên công ty'}`;
      suggestedAction = 'RE_LINK_EXISTING_CRM_CUSTOMER';
      suggestedActionLabelVi = `Tái liên kết với khách hàng CRM: ${matchCandidate.companyName} (${matchCandidate.id})`;
      summaryByReason.mismatchedNameOrTax++;
    } else if (!rawId) {
      if (rawName && rawName.length > 2) {
        orphanReason = 'UNREGISTERED_CUSTOMER_INFO';
        orphanReasonLabelVi = `Báo giá có thông tin đối tác [${rawName}] nhưng chưa được cấp mã và đăng ký vào CRM`;
        suggestedAction = 'AUTO_CREATE_CRM_CUSTOMER';
        suggestedActionLabelVi = `Tự động tạo hồ sơ khách hàng mới vào CRM và cấp mã liên kết`;
        summaryByReason.unregisteredCustomerInfo++;
      } else {
        orphanReason = 'MISSING_CUSTOMER_ID';
        orphanReasonLabelVi = 'Báo giá hoàn toàn trống ID và thông tin khách hàng';
        suggestedAction = 'ASSIGN_FALLBACK_CRM_CUSTOMER';
        suggestedActionLabelVi = 'Gán vào khách hàng CRM mặc định hoặc cập nhật thông tin';
        summaryByReason.missingCustomerId++;
      }
    } else {
      // rawId is present, but doesn't exist in CRM Customers collection
      if (rawName && rawName.length > 2) {
        orphanReason = 'NON_EXISTENT_CUSTOMER_ID';
        orphanReasonLabelVi = `ID khách hàng [${rawId}] đã bị xóa hoặc không tồn tại trong bộ sưu tập CRM`;
        suggestedAction = 'AUTO_CREATE_CRM_CUSTOMER';
        suggestedActionLabelVi = `Khôi phục/Tạo mới hồ sơ khách hàng [${rawName}] vào CRM`;
        summaryByReason.nonExistentCustomerId++;
      } else {
        orphanReason = 'NON_EXISTENT_CUSTOMER_ID';
        orphanReasonLabelVi = `ID khách hàng [${rawId}] không tồn tại trong CRM và thiếu dữ liệu công ty`;
        suggestedAction = 'ASSIGN_FALLBACK_CRM_CUSTOMER';
        suggestedActionLabelVi = 'Gán vào khách hàng CRM mặc định';
        summaryByReason.nonExistentCustomerId++;
      }
    }

    orphanedRecords.push({
      quoteId: quote.id,
      quoteNumber: quote.quoteNumber || quote.id,
      quoteStatus: quote.status || 'DRAFT',
      createdDate: quote.createdDate || quote.updatedDate || '',
      grandTotalUsd: quote.grandTotalUsd || 0,
      grandTotalVnd: quote.grandTotalVnd || 0,
      quotedCustomerId: rawId || undefined,
      quotedCompanyName: rawName || 'Chưa đặt tên khách hàng',
      quotedTaxId: rawTaxId || undefined,
      quotedContactPerson: cust?.contactPerson,
      quotedEmail: cust?.email,
      quotedPhone: cust?.phone,
      quotedAddress: cust?.address,
      orphanReason,
      orphanReasonLabelVi,
      suggestedAction,
      suggestedActionLabelVi,
      matchCandidate,
      isRepaired: false,
    });
  });

  const totalQuotationsChecked = quotes.length;
  const orphanedCount = orphanedRecords.length;
  const integrityScore = totalQuotationsChecked > 0
    ? Math.round((validLinkedCount / totalQuotationsChecked) * 100)
    : 100;

  const status: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 
    orphanedCount === 0 
      ? 'HEALTHY' 
      : (integrityScore >= 80 ? 'WARNING' : 'CRITICAL');

  const reportSummaryVi = orphanedCount === 0
    ? `Hoàn hảo: 100% Customer ID trong ${totalQuotationsChecked} báo giá đều liên kết chính xác với danh bạ CRM (${customers.length} khách hàng). Không có bản ghi mồ côi.`
    : `Phát hiện ${orphanedCount}/${totalQuotationsChecked} báo giá chứa Customer ID mồ côi hoặc chưa đồng bộ với CRM. Độ toàn vẹn dữ liệu: ${integrityScore}%. Sẵn sàng sửa chữa 1-chạm.`;

  return {
    reportId,
    generatedAt,
    totalQuotationsChecked,
    totalCustomersInCrm: customers.length,
    validLinkedCount,
    orphanedCount,
    integrityScore,
    status,
    summaryByReason,
    orphanedRecords,
    repairableCount: orphanedRecords.length,
    reportSummaryVi,
  };
}

/**
 * 1-Click Auto-Repair Engine:
 * Batch repairs orphaned quotation records by re-linking existing CRM matches or
 * auto-provisioning missing customer profiles into CRM collection.
 */
export async function executeOneClickRepair(
  orphanedItems: OrphanedQuotationItem[],
  quotes: QuoteData[],
  customers: CustomerRecord[],
  options: {
    userId?: string;
    targetSingleQuoteId?: string;
  } = {}
): Promise<OneClickRepairResult> {
  const userId = options.userId || 'Admin System (1-Click Repair)';
  const itemsToRepair = options.targetSingleQuoteId
    ? orphanedItems.filter(i => i.quoteId === options.targetSingleQuoteId)
    : orphanedItems.filter(i => !i.isRepaired);

  const updatedQuotesMap = new Map<string, QuoteData>(quotes.map(q => [q.id, { ...q }]));
  const currentCustomers = [...customers];
  const newCustomersCreated: CustomerRecord[] = [];
  const repairDetails: { quoteNumber: string; actionTaken: string; targetCustomerName: string }[] = [];

  let repairedCount = 0;
  const now = new Date().toISOString();
  const todayStr = now.slice(0, 10);

  // Fallback customer if needed
  const fallbackCustomer = currentCustomers[0] || null;

  for (const item of itemsToRepair) {
    const quote = updatedQuotesMap.get(item.quoteId);
    if (!quote) continue;

    let targetCustomer: CustomerRecord | null = null;
    let actionDesc = '';

    if (item.suggestedAction === 'RE_LINK_EXISTING_CRM_CUSTOMER' && item.matchCandidate) {
      targetCustomer = item.matchCandidate;
      actionDesc = `Tái liên kết thành công với khách hàng CRM [${targetCustomer.companyName}] (${targetCustomer.id}) qua khớp MST/Tên.`;
    } else if (item.suggestedAction === 'AUTO_CREATE_CRM_CUSTOMER') {
      // Create new Customer in CRM from the business quote data
      const newCustId = item.quotedCustomerId && item.quotedCustomerId.startsWith('cust-')
        ? item.quotedCustomerId
        : `cust-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

      const newCustomer: CustomerRecord = sanitizeCustomerRecord({
        id: newCustId,
        code: `KH-${Math.floor(1000 + Math.random() * 9000)}`,
        companyName: item.quotedCompanyName,
        customerName: item.quotedCompanyName,
        contactPerson: item.quotedContactPerson || 'Người phụ trách XNK',
        taxId: item.quotedTaxId || '',
        email: item.quotedEmail || '',
        phone: item.quotedPhone || '',
        address: item.quotedAddress || '',
        group: 'Khách Thương Mại',
        segment: 'STANDARD',
        isUserCreated: true,
        syncSource: '1-Click Integrity Repair',
        createdDate: item.createdDate || todayStr,
        updatedDate: todayStr,
        lastEvaluatedAt: todayStr,
      });

      // Persist customer to CRM collection
      await saveCustomer(newCustomer);
      currentCustomers.push(newCustomer);
      newCustomersCreated.push(newCustomer);
      targetCustomer = newCustomer;
      actionDesc = `Tự động tạo hồ sơ khách hàng mới [${newCustomer.companyName}] (Mã: ${newCustomer.code}) vào CRM và liên kết báo giá.`;
    } else {
      // Fallback
      if (fallbackCustomer) {
        targetCustomer = fallbackCustomer;
        actionDesc = `Gán vào khách hàng CRM mặc định [${fallbackCustomer.companyName}].`;
      }
    }

    if (targetCustomer) {
      // Re-link quote to targetCustomer
      const updatedQuote: QuoteData = {
        ...quote,
        updatedDate: todayStr,
        customer: {
          id: targetCustomer.id,
          code: targetCustomer.code,
          companyName: targetCustomer.companyName || targetCustomer.customerName,
          customerName: targetCustomer.customerName || targetCustomer.companyName,
          contactPerson: targetCustomer.contactPerson || quote.customer?.contactPerson || '',
          email: targetCustomer.email || quote.customer?.email || '',
          phone: targetCustomer.phone || quote.customer?.phone || '',
          address: targetCustomer.address || quote.customer?.address || '',
          taxId: targetCustomer.taxId || quote.customer?.taxId || '',
        },
      };

      // Persist quotation to Firestore
      await saveQuotation(updatedQuote, {
        userId,
        userName: userId,
        forceOverwrite: true,
      });

      updatedQuotesMap.set(quote.id, updatedQuote);
      item.isRepaired = true;
      item.repairedAt = now;
      item.repairDetails = actionDesc;
      repairedCount++;

      // Update related integrity issue if any
      await updateIssueStatus(`iss-broken-cust-${quote.id}`, 'RESOLVED', actionDesc, userId);

      repairDetails.push({
        quoteNumber: quote.quoteNumber || quote.id,
        actionTaken: actionDesc,
        targetCustomerName: targetCustomer.companyName || targetCustomer.customerName,
      });
    }
  }

  // Record audit log
  const auditId = `audit-repair-${Date.now()}`;
  if (repairedCount > 0) {
    await recordHealthAudit({
      userId,
      companyId: 'company_profile',
      entityType: 'Quotation',
      entityId: options.targetSingleQuoteId || 'BATCH_ORPHAN_REPAIR',
      action: 'DATA_REPAIR_APPLIED',
      result: 'SUCCESS',
      correlationId: auditId,
      details: `Sửa chữa 1-Chạm thành công ${repairedCount} báo giá mồ côi. Đã tạo ${newCustomersCreated.length} khách hàng mới vào CRM.`,
    });

    // Dispatch synchronizing DOM event so listeners refresh immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customers-synchronized', {
        detail: {
          timestamp: Date.now(),
          count: currentCustomers.length,
          source: 'OneClickRepairTool',
        }
      }));
      window.dispatchEvent(new CustomEvent('quotes-synchronized', {
        detail: {
          timestamp: Date.now(),
          repairedCount,
        }
      }));
    }
  }

  return {
    repairedCount,
    fixedQuotes: Array.from(updatedQuotesMap.values()),
    newCustomersCreated,
    auditId,
    message: `Đã hoàn tất sửa chữa 1-chạm: Tái liên kết và phục hồi thành công ${repairedCount} báo giá. Tạo mới ${newCustomersCreated.length} khách hàng CRM.`,
    details: repairDetails,
  };
}

/**
 * Exports validation report in text/markdown audit format
 */
export function exportValidationReportAsText(report: QuotationCustomerValidationReport): string {
  const lines: string[] = [
    '========================================================================',
    ' BÁO CÁO ĐỐI SOÁT TOÀN VẸN DỮ LIỆU: QUOTATIONS <-> CUSTOMERS CRM',
    '========================================================================',
    `Mã Báo Cáo   : ${report.reportId}`,
    `Thời Điểm    : ${report.generatedAt}`,
    `Trạng Thái   : ${report.status}`,
    `Điểm Toàn Vẹn: ${report.integrityScore}%`,
    '------------------------------------------------------------------------',
    'THỐNG KÊ TỔNG QUAN:',
    `- Tổng số Báo giá kiểm tra    : ${report.totalQuotationsChecked}`,
    `- Tổng khách hàng trong CRM    : ${report.totalCustomersInCrm}`,
    `- Báo giá liên kết hợp lệ      : ${report.validLinkedCount}`,
    `- Bản ghi mồ côi phát hiện     : ${report.orphanedCount}`,
    `  + Thiếu Customer ID          : ${report.summaryByReason.missingCustomerId}`,
    `  + Customer ID không tồn tại  : ${report.summaryByReason.nonExistentCustomerId}`,
    `  + Lệch ID nhưng khớp MST/Tên : ${report.summaryByReason.mismatchedNameOrTax}`,
    `  + Khách hàng chưa đăng ký    : ${report.summaryByReason.unregisteredCustomerInfo}`,
    '------------------------------------------------------------------------',
    'CHI TIẾT CÁC BẢN GHI MỒ CÔI & PHƯƠNG ÁN SỬA CHỮA 1-CHẠM:',
  ];

  if (report.orphanedRecords.length === 0) {
    lines.push('>> Tuyệt vời! Không phát hiện bản ghi mồ côi nào.');
  } else {
    report.orphanedRecords.forEach((item, idx) => {
      lines.push(`${idx + 1}. [${item.quoteNumber}] - Trạng thái: ${item.quoteStatus} - Trị giá: $${item.grandTotalUsd.toLocaleString()}`);
      lines.push(`   - Customer ID Báo Giá : ${item.quotedCustomerId || '(Trống)'}`);
      lines.push(`   - Tên Doanh Nghiệp    : ${item.quotedCompanyName} (MST: ${item.quotedTaxId || 'Không có'})`);
      lines.push(`   - Nguyên Nhân         : ${item.orphanReasonLabelVi}`);
      lines.push(`   - Đề Xuất Sửa Chữa    : ${item.suggestedActionLabelVi}`);
      if (item.isRepaired) {
        lines.push(`   - Trạng Thái Sửa Chữa : ĐÃ KHẮC PHỤC (${item.repairedAt}) - ${item.repairDetails}`);
      }
      lines.push('');
    });
  }

  lines.push('========================================================================');
  lines.push('Chứng chỉ xác thực bởi Hệ thống Kiểm Soát Toàn Vẹn Dữ Liệu Logistics Core.');
  return lines.join('\n');
}

/**
 * Exports validation report in CSV format
 */
export function exportValidationReportAsCsv(report: QuotationCustomerValidationReport): string {
  const header = [
    'STT',
    'Số Báo Giá',
    'Trạng Thái Báo Giá',
    'Trị Giá (USD)',
    'Customer ID Báo Giá',
    'Tên Công Ty Báo Giá',
    'Mã Số Thuế',
    'Nguyên Nhân Mồ Côi',
    'Phương Án Khắc Phục',
    'Ứng Viên Khách Hàng CRM',
    'Trạng Thái Đã Sửa',
  ];

  const rows = report.orphanedRecords.map((item, idx) => [
    idx + 1,
    `"${item.quoteNumber}"`,
    `"${item.quoteStatus}"`,
    item.grandTotalUsd,
    `"${item.quotedCustomerId || ''}"`,
    `"${item.quotedCompanyName.replace(/"/g, '""')}"`,
    `"${item.quotedTaxId || ''}"`,
    `"${item.orphanReasonLabelVi.replace(/"/g, '""')}"`,
    `"${item.suggestedActionLabelVi.replace(/"/g, '""')}"`,
    `"${(item.matchCandidate?.companyName || '').replace(/"/g, '""')}"`,
    item.isRepaired ? 'ĐÃ SỬA' : 'CHƯA SỬA',
  ]);

  return [header.join(','), ...rows.map(r => r.join(','))].join('\n');
}
