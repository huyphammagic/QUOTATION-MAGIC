import { CompanyProfile, QuoteData, CustomerRecord } from '../../types/logistics';
import { calculateQuote } from '../pricing';

export type DriftSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface DataDriftItem {
  id: string;
  field: string;
  category: 'COMPANY' | 'SALES' | 'BANK' | 'CUSTOMER';
  canonicalSource: string;
  canonicalValue: string;
  quoteSnapshotValue: string;
  isDrifted: boolean;
  severity: DriftSeverity;
  description: string;
}

export interface DataDriftReport {
  overallStatus: 'IN_SYNC' | 'DRIFT_DETECTED' | 'COMPANY_UNCONFIGURED';
  isCompanyConfigured: boolean;
  driftCount: number;
  criticalCount: number;
  items: DataDriftItem[];
  canonicalCompany: CompanyProfile;
  activeQuoteNumber: string;
  auditedAt: string;
}

/**
 * Audit active working quotation against the canonical Firebase Company Profile
 * and Customer master data to detect any data drift or state divergence.
 */
export function auditDataDrift(
  canonicalCompany: CompanyProfile,
  activeQuote: QuoteData,
  customers: CustomerRecord[] = []
): DataDriftReport {
  const isCompanyConfigured = Boolean(canonicalCompany && canonicalCompany.name.trim().length > 0);
  const items: DataDriftItem[] = [];

  const quoteComp = activeQuote.company || ({} as Partial<CompanyProfile>);

  // 1. Company Name Check
  const isCompanyNameDrifted = isCompanyConfigured && (quoteComp.name || '').trim() !== canonicalCompany.name.trim();
  items.push({
    id: 'drift-company-name',
    field: 'Tên Doanh Nghiệp (Forwarder Name)',
    category: 'COMPANY',
    canonicalSource: 'Firebase /settings/company_profile',
    canonicalValue: canonicalCompany.name || 'Chưa cấu hình',
    quoteSnapshotValue: quoteComp.name || 'Trống',
    isDrifted: isCompanyNameDrifted,
    severity: isCompanyNameDrifted ? 'CRITICAL' : 'INFO',
    description: isCompanyNameDrifted
      ? `Báo giá đang mang tên "${quoteComp.name}", trong khi Forwarder Profile là "${canonicalCompany.name}".`
      : 'Tên doanh nghiệp trên báo giá khớp 100% với Hồ sơ Doanh nghiệp.',
  });

  // 2. Company Tax ID Check
  const isTaxIdDrifted = isCompanyConfigured && (quoteComp.taxId || '').trim() !== (canonicalCompany.taxId || '').trim();
  items.push({
    id: 'drift-tax-id',
    field: 'Mã Số Thuế (Tax ID)',
    category: 'COMPANY',
    canonicalSource: 'Firebase /settings/company_profile',
    canonicalValue: canonicalCompany.taxId || 'Chưa cấu hình',
    quoteSnapshotValue: quoteComp.taxId || 'Trống',
    isDrifted: isTaxIdDrifted,
    severity: isTaxIdDrifted ? 'CRITICAL' : 'INFO',
    description: isTaxIdDrifted
      ? `Mã số thuế trên báo giá (${quoteComp.taxId}) không khớp với hồ sơ (${canonicalCompany.taxId}).`
      : 'Mã số thuế đồng bộ chính xác.',
  });

  // 3. Company Address Check
  const isAddressDrifted = isCompanyConfigured && (quoteComp.address || '').trim() !== (canonicalCompany.address || '').trim();
  items.push({
    id: 'drift-address',
    field: 'Địa Chỉ Trụ Sở (Address)',
    category: 'COMPANY',
    canonicalSource: 'Firebase /settings/company_profile',
    canonicalValue: canonicalCompany.address || 'Chưa cấu hình',
    quoteSnapshotValue: quoteComp.address || 'Trống',
    isDrifted: isAddressDrifted,
    severity: isAddressDrifted ? 'WARNING' : 'INFO',
    description: isAddressDrifted
      ? 'Địa chỉ trụ sở pháp lý trên báo giá khác với hồ sơ công ty hiện tại.'
      : 'Địa chỉ trụ sở đồng bộ chính xác.',
  });

  // 4. Sales Representative Check
  const isSalesDrifted = Boolean(
    canonicalCompany.salesRepName &&
    (quoteComp.salesRepName || '').trim() !== canonicalCompany.salesRepName.trim()
  );
  items.push({
    id: 'drift-sales-rep',
    field: 'Người Lập Báo Giá (Sales Representative)',
    category: 'SALES',
    canonicalSource: 'Firebase /settings/company_profile (Sales)',
    canonicalValue: canonicalCompany.salesRepName || 'Chưa thiết lập',
    quoteSnapshotValue: quoteComp.salesRepName || 'Trống',
    isDrifted: isSalesDrifted,
    severity: isSalesDrifted ? 'CRITICAL' : 'INFO',
    description: isSalesDrifted
      ? `Người phụ trách trên báo giá là "${quoteComp.salesRepName || 'Trống'}", trong khi Sales đang hoạt động là "${canonicalCompany.salesRepName}".`
      : 'Chuyên viên phụ trách đồng bộ chính xác.',
  });

  // 5. Bank Account Information Check
  const canonicalBankPart = (canonicalCompany.bankAccountNo || '').trim();
  const quoteTermsBank = (activeQuote.terms?.bankAccountInfo || '');
  const isBankDrifted = Boolean(
    canonicalBankPart.length > 0 &&
    !quoteTermsBank.includes(canonicalBankPart)
  );
  items.push({
    id: 'drift-bank-info',
    field: 'Thông Tin Tài Khoản Chuyển Khoản (Bank Info)',
    category: 'BANK',
    canonicalSource: 'Firebase /settings/company_profile (Bank)',
    canonicalValue: canonicalCompany.bankName ? `${canonicalCompany.bankName} - ${canonicalCompany.bankAccountNo}` : 'Chưa cấu hình',
    quoteSnapshotValue: quoteTermsBank || 'Trống',
    isDrifted: isBankDrifted,
    severity: isBankDrifted ? 'CRITICAL' : 'INFO',
    description: isBankDrifted
      ? 'Số tài khoản ngân hàng trong Điều khoản thanh toán của báo giá không chứa số tài khoản trong Hồ sơ Doanh nghiệp.'
      : 'Thông tin tài khoản ngân hàng đồng bộ chính xác.',
  });

  // 6. Customer Catalog Check (if customer ID is linked)
  if (activeQuote.customer && activeQuote.customer.id) {
    const matchedCustomer = customers.find(c => c.id === activeQuote.customer.id || c.code === activeQuote.customer.code);
    if (matchedCustomer) {
      const isCustNameDrifted = (activeQuote.customer.companyName || '').trim() !== (matchedCustomer.companyName || '').trim();
      items.push({
        id: 'drift-customer-catalog',
        field: 'Khách Hàng (Customer Catalog)',
        category: 'CUSTOMER',
        canonicalSource: `Firebase /customers/${matchedCustomer.id}`,
        canonicalValue: matchedCustomer.companyName,
        quoteSnapshotValue: activeQuote.customer.companyName,
        isDrifted: isCustNameDrifted,
        severity: isCustNameDrifted ? 'WARNING' : 'INFO',
        description: isCustNameDrifted
          ? `Tên công ty khách hàng trên báo giá khác với danh bạ khách hàng [${matchedCustomer.code}].`
          : 'Thông tin khách hàng khớp hoàn toàn với danh mục khách hàng.',
      });
    }
  }

  const driftedItems = items.filter(i => i.isDrifted);
  const criticalItems = driftedItems.filter(i => i.severity === 'CRITICAL');

  let overallStatus: DataDriftReport['overallStatus'] = 'IN_SYNC';
  if (!isCompanyConfigured) {
    overallStatus = 'COMPANY_UNCONFIGURED';
  } else if (driftedItems.length > 0) {
    overallStatus = 'DRIFT_DETECTED';
  }

  return {
    overallStatus,
    isCompanyConfigured,
    driftCount: driftedItems.length,
    criticalCount: criticalItems.length,
    items,
    canonicalCompany,
    activeQuoteNumber: activeQuote.quoteNumber,
    auditedAt: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
  };
}

/**
 * Reconciles and synchronizes an active quotation snapshot with the canonical
 * single source of truth (Forwarder, Sales, and Bank profile), eliminating data drift.
 */
export function reconcileQuoteWithSSOT(
  quote: QuoteData,
  canonicalCompany: CompanyProfile
): QuoteData {
  // Format bank account info string from canonical company
  let formattedBank = quote.terms?.bankAccountInfo || '';
  if (canonicalCompany.bankName || canonicalCompany.bankAccountNo) {
    const parts: string[] = [];
    if (canonicalCompany.bankName) parts.push(`Ngân hàng: ${canonicalCompany.bankName}`);
    if (canonicalCompany.bankAccountNo) parts.push(`Số TK: ${canonicalCompany.bankAccountNo}`);
    if (canonicalCompany.bankAccountHolder) parts.push(`Chủ TK: ${canonicalCompany.bankAccountHolder}`);
    if (canonicalCompany.bankSwiftCode) parts.push(`SWIFT Code: ${canonicalCompany.bankSwiftCode}`);
    formattedBank = parts.join('\n');
  }

  const updated: QuoteData = {
    ...quote,
    company: { ...canonicalCompany },
    terms: {
      ...quote.terms,
      bankAccountInfo: formattedBank,
    },
    updatedDate: new Date().toISOString().slice(0, 10),
  };

  const { calculatedQuote } = calculateQuote(updated);
  return calculatedQuote;
}
