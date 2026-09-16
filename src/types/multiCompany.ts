/**
 * Phase 37: Multi-Company / Multi-Entity Management & Quotation Branding Engine
 * Domain Types, Enums, and Interfaces.
 */

import { CompanyProfile } from './logistics';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export type CompanyMemberRole = 
  | 'COMPANY_ADMIN' 
  | 'LOGISTICS_MANAGER' 
  | 'SALES_REP' 
  | 'PRICING_SPECIALIST' 
  | 'OPERATOR' 
  | 'VIEWER';

export interface CompanyMemberPermission {
  canCreateQuotes: boolean;
  canApproveQuotes: boolean;
  canEditCompanyProfile: boolean;
  canManageMembers: boolean;
  canManageRates: boolean;
  canViewProfitability: boolean;
}

export interface CompanyMemberRecord {
  membershipId: string;
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  role: CompanyMemberRole;
  permissions: CompanyMemberPermission;
  status: 'ACTIVE' | 'SUSPENDED' | 'INVITED';
  createdAt: string;
  updatedAt: string;
}

export interface CompanyBrandingSettings {
  logoUrl?: string;
  logoStoragePath?: string;
  primaryColor?: string;     // Hex e.g. #0f172a
  secondaryColor?: string;   // Hex e.g. #2563eb
  faviconUrl?: string;
  documentFooterNote?: string;
  defaultQuotationValidityDays?: number;
  quotationPrefix?: string;  // e.g. 'LOG', 'ABC', 'VTL'
  quotationNumberFormat?: string; // e.g. '[PREFIX]-[YYYYMMDD]-[SEQ]'
  customTermsVi?: string;
  customTermsEn?: string;
  defaultCurrency?: 'USD' | 'VND';
  invoiceHeader?: string;
}

export interface CompanyRecord {
  companyId: string;
  companyCode: string;       // e.g. 'ABC-LOG', 'VTL-GLO'
  legalName: string;         // Tên pháp nhân đầy đủ
  displayName: string;       // Tên thương hiệu hiển thị
  shortName: string;         // Tên viết tắt
  taxCode: string;           // Mã số thuế
  registrationNumber?: string;
  address: string;
  country: string;
  city: string;
  district?: string;
  phone: string;
  email: string;
  website: string;
  
  // Banking & Financial
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  bankSwiftCode: string;
  bankBranch?: string;

  // Default Signer / Sales Rep
  defaultSalesRepName?: string;
  defaultSalesRepTitle?: string;
  defaultSalesRepPhone?: string;
  defaultSalesRepEmail?: string;

  // Branding & Configuration
  branding: CompanyBrandingSettings;
  
  // Operational Status
  status: CompanyStatus;
  
  // Sequence counter for atomic/isolated quotation numbering
  quotationCounter?: number;

  // Metadata & Audit
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

/**
 * Immutable Company Snapshot embedded directly in QuoteData and PDF models.
 * Ensures historical quotations will NEVER mutate when the Company Master changes.
 */
export interface QuotationCompanySnapshot {
  companyId: string;
  companyCode: string;
  legalName: string;
  displayName: string;
  shortName: string;
  taxCode: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  logoStoragePath?: string;
  bankName: string;
  bankAccountNo: string;
  bankAccountHolder: string;
  bankSwiftCode: string;
  bankBranch?: string;
  salesRepName: string;
  salesRepTitle: string;
  salesRepPhone: string;
  salesRepEmail: string;
  quotationPrefix?: string;
  termsAndConditions?: string;
  snapshotTimestamp: string;
}

/**
 * Compact company item for switchers & lightweight dropdowns
 */
export interface CompanyMetadataItem {
  companyId: string;
  companyCode: string;
  displayName: string;
  legalName: string;
  logoUrl?: string;
  status: CompanyStatus;
  taxCode: string;
  quotationPrefix: string;
  defaultCurrency: 'USD' | 'VND';
}

/**
 * Converts a full CompanyRecord to an active CompanyProfile compatible with existing codebase
 */
export function mapCompanyRecordToProfile(company: CompanyRecord): CompanyProfile {
  return {
    name: company.displayName || company.legalName,
    englishName: company.legalName,
    shortName: company.shortName,
    taxId: company.taxCode,
    address: company.address,
    phone: company.phone,
    email: company.email,
    website: company.website,
    logoUrl: company.branding?.logoUrl || '',
    bankName: company.bankName,
    bankAccountNo: company.bankAccountNo,
    bankAccountHolder: company.bankAccountHolder,
    bankSwiftCode: company.bankSwiftCode,
    salesRepName: company.defaultSalesRepName || '',
    salesRepTitle: company.defaultSalesRepTitle || 'Sales Executive',
    salesRepPhone: company.defaultSalesRepPhone || company.phone,
    salesRepEmail: company.defaultSalesRepEmail || company.email,
    version: company.version,
    updatedAt: company.updatedAt,
  };
}

/**
 * Generates an immutable QuotationCompanySnapshot from CompanyRecord or CompanyProfile
 */
export function createQuotationCompanySnapshot(
  company: CompanyRecord | CompanyProfile,
  salesRepOverride?: { name?: string; title?: string; phone?: string; email?: string }
): QuotationCompanySnapshot {
  const isRecord = 'companyId' in company;
  const cRecord = isRecord ? (company as CompanyRecord) : null;
  const cProfile = !isRecord ? (company as CompanyProfile) : null;

  return {
    companyId: cRecord?.companyId || 'company_profile',
    companyCode: cRecord?.companyCode || 'DEFAULT',
    legalName: cRecord?.legalName || cProfile?.englishName || cProfile?.name || '',
    displayName: cRecord?.displayName || cProfile?.name || '',
    shortName: cRecord?.shortName || cProfile?.shortName || '',
    taxCode: cRecord?.taxCode || cProfile?.taxId || '',
    address: cRecord?.address || cProfile?.address || '',
    phone: cRecord?.phone || cProfile?.phone || '',
    email: cRecord?.email || cProfile?.email || '',
    website: cRecord?.website || cProfile?.website || '',
    logoUrl: cRecord?.branding?.logoUrl || cProfile?.logoUrl || '',
    logoStoragePath: cRecord?.branding?.logoStoragePath || '',
    bankName: cRecord?.bankName || cProfile?.bankName || '',
    bankAccountNo: cRecord?.bankAccountNo || cProfile?.bankAccountNo || '',
    bankAccountHolder: cRecord?.bankAccountHolder || cProfile?.bankAccountHolder || '',
    bankSwiftCode: cRecord?.bankSwiftCode || cProfile?.bankSwiftCode || '',
    bankBranch: cRecord?.bankBranch || '',
    salesRepName: salesRepOverride?.name || cRecord?.defaultSalesRepName || cProfile?.salesRepName || '',
    salesRepTitle: salesRepOverride?.title || cRecord?.defaultSalesRepTitle || cProfile?.salesRepTitle || '',
    salesRepPhone: salesRepOverride?.phone || cRecord?.defaultSalesRepPhone || cProfile?.salesRepPhone || '',
    salesRepEmail: salesRepOverride?.email || cRecord?.defaultSalesRepEmail || cProfile?.salesRepEmail || '',
    quotationPrefix: cRecord?.branding?.quotationPrefix || 'LOG',
    termsAndConditions: cRecord?.branding?.customTermsVi || '',
    snapshotTimestamp: new Date().toISOString(),
  };
}
