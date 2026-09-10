import { 
  QuoteData, 
  LineItem, 
  CustomerInfo, 
  ShipmentDetails, 
  TermsAndConditions, 
  CompanyProfile, 
  QuoteCurrency 
} from './logistics';

export type QuotationDocumentType = 
  | 'CUSTOMER_QUOTATION'      // Official quotation for customer (all internal costs stripped)
  | 'INTERNAL_QUOTATION'      // Internal commercial costing sheet (includes cost, profit, margin)
  | 'CONFIRMATION_NOTICE';    // Booking confirmation / Acceptance notice

export type QuotationDocumentLanguage = 'vi' | 'en' | 'bilingual';

export type QuotationDocumentStatus = 'GENERATED' | 'ARCHIVED' | 'SUPERSEDED';

export interface TemplateStyleConfig {
  primaryColor: string;       // E.g. '#164e63'
  secondaryColor: string;     // E.g. '#475569'
  accentColor: string;        // E.g. '#0284c7'
  lightBgColor: string;       // E.g. '#f8fafc'
  fontFamily: 'Roboto' | 'helvetica' | 'times' | 'courier';
  fontSizeScale: 'compact' | 'standard' | 'spacious';
  tableTheme: 'grid' | 'striped' | 'plain';
  showBorders: boolean;
  headerHeightMm?: number;
}

export interface TemplateSectionSettings {
  header: {
    showLogo: boolean;
    showTaxId: boolean;
    showContact: boolean;
    showEnglishName: boolean;
    titleVi: string;
    titleEn: string;
  };
  customer: {
    showTaxId: boolean;
    showContactPerson: boolean;
    showPhoneEmail: boolean;
    showAddress: boolean;
  };
  shipment: {
    showGrossWeight: boolean;
    showVolumeCbm: boolean;
    showChargeableWeight: boolean;
    showTransitTime: boolean;
    showFreeTime: boolean;
  };
  charges: {
    groupBy: 'LOCATION' | 'CATEGORY' | 'NONE';
    showVatColumn: boolean;
    showUnitColumn: boolean;
    showCurrencyColumn: boolean;
    showNotes: boolean;
  };
  totals: {
    showSubtotal: boolean;
    showVat: boolean;
    showGrandTotal: boolean;
    showEquivalent: boolean;
    showExchangeRateNote: boolean;
  };
  terms: {
    showIncoterm: boolean;
    showPaymentTerm: boolean;
    showExclusions: boolean;
    showBankInfo: boolean;
  };
  signature: {
    showCustomerSignature: boolean;
    showCompanySignature: boolean;
    stampPlaceholder: boolean;
  };
  footer: {
    showPageNumbers: boolean;
    customFooterText?: string;
  };
}

export interface QuotationTemplate {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description: string;
  version: number;
  isDefault: boolean;
  isActive: boolean;
  supportedLanguages: QuotationDocumentLanguage[];
  sections: TemplateSectionSettings;
  styles: TemplateStyleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SanitizedLineItem {
  id: string;
  category: string;
  location?: string;
  code: string;
  description: string;
  basis?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  currency: 'USD' | 'VND';
  vatRate: number;
  vatAmountUsd?: number;
  vatAmountVnd?: number;
  amountUsd: number;
  amountVnd: number;
  totalWithVatUsd?: number;
  totalWithVatVnd?: number;
  note?: string;
  // Internal costing fields (ONLY populated if documentType === 'INTERNAL_QUOTATION')
  costPrice?: number;
  costTotalUsd?: number;
  costTotalVnd?: number;
  profitUsd?: number;
  profitVnd?: number;
  marginPercent?: number;
}

export interface QuotationDocumentSnapshot {
  quotationId: string;
  quoteNumber: string;
  revision: number;
  createdDate: string;
  approvalDate?: string;
  approvedBy?: string;
  documentType: QuotationDocumentType;
  language: QuotationDocumentLanguage;
  currency: QuoteCurrency;
  exchangeRate: number;
  customer: CustomerInfo;
  shipment: ShipmentDetails;
  items: SanitizedLineItem[];
  terms: TermsAndConditions;
  company: CompanyProfile;
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  // Internal metrics (ONLY if documentType === 'INTERNAL_QUOTATION')
  totalCostUsd?: number;
  totalCostVnd?: number;
  totalProfitUsd?: number;
  totalProfitVnd?: number;
  overallMarginPercent?: number;
}

export interface QuotationDocumentRecord {
  id: string;
  companyId: string;
  quotationId: string;
  quotationNumber: string;
  revision: number;
  documentType: QuotationDocumentType;
  language: QuotationDocumentLanguage;
  templateId: string;
  templateVersion: number;
  templateName: string;
  currency: QuoteCurrency;
  fileName: string;
  storagePath: string;
  downloadUrl?: string;
  fileSizeBytes: number;
  pageCount: number;
  status: QuotationDocumentStatus;
  generatedBy: string;
  generatedAt: string;
  snapshot: QuotationDocumentSnapshot;
  checksum?: string;
  notes?: string;
}

export interface QuotationTermsTemplate {
  id: string;
  companyId: string;
  title: string;
  code: string;
  incoterm: string;
  transportMode: string;
  paymentTerm: string;
  exclusionsNotes: string;
  bankAccountInfo?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationAuditLog {
  id: string;
  companyId: string;
  quotationId?: string;
  entityType: 
    | 'QUOTATION_DOCUMENT' 
    | 'QUOTATION_TEMPLATE' 
    | 'TERMS_TEMPLATE'
    | 'QUOTATION_COMMUNICATION'
    | 'QUOTATION_SECURE_LINK'
    | 'QUOTATION_FOLLOW_UP'
    | 'QUOTATION_CUSTOMER_RESPONSE';
  entityId: string;
  action: 
    | 'PDF_GENERATION_STARTED'
    | 'PDF_GENERATED'
    | 'PDF_GENERATION_FAILED'
    | 'PDF_UPLOADED'
    | 'PDF_DOWNLOADED'
    | 'PDF_ARCHIVED'
    | 'TEMPLATE_CREATED'
    | 'TEMPLATE_UPDATED'
    | 'TEMPLATE_PUBLISHED'
    | 'TEMPLATE_ARCHIVED'
    | 'DOCUMENT_SNAPSHOT_CREATED'
    | 'QUOTATION_SEND_STARTED'
    | 'QUOTATION_SENT'
    | 'QUOTATION_SEND_FAILED'
    | 'QUOTATION_EMAIL_DELIVERED'
    | 'QUOTATION_EMAIL_OPENED'
    | 'QUOTATION_LINK_CREATED'
    | 'QUOTATION_LINK_VIEWED'
    | 'QUOTATION_LINK_REVOKED'
    | 'QUOTATION_ACCEPTED'
    | 'QUOTATION_REJECTED'
    | 'QUOTATION_REVISION_REQUESTED'
    | 'FOLLOW_UP_CREATED'
    | 'FOLLOW_UP_COMPLETED';
  performedBy: string;
  timestamp: string;
  details?: Record<string, any>;
}
