/**
 * Phase 38: Multi-Company Financial & Commercial Configuration Engine
 * Domain Types, Interfaces, Enums and Snapshot Models.
 * 
 * Complies strictly with Logistics Industry Real-World Financial Standards:
 * - Isolated company scopes (companyId)
 * - Multi-currency & rounding policies (USD cents, VND integer, buffer %, etc.)
 * - VAT & Tax rules (International freight 0%, Inland services 8%/10%, Contractor FCT 2%-5%)
 * - Commercial terms & Payment schedules (Prepaid, Net 15/30/45/60, Deposit %, Credit limit)
 * - Multi-bank accounts (USD account, VND account, SWIFT, multi-currency routing)
 * - Immutable snapshots for approved/sent quotations
 */

import { Currency, FeeCategory, ChargeLocation, IncotermCode, QuoteCurrency } from './logistics';

export type CurrencyCode = 'USD' | 'VND' | 'EUR' | 'JPY' | 'SGD' | 'CNY' | 'KRW' | 'GBP';

export type RoundingMethod = 
  | 'HALF_UP'            // Chuẩn kế toán (0.5 làm tròn lên)
  | 'FLOOR'              // Làm tròn xuống
  | 'CEIL'               // Làm tròn lên
  | 'ROUND_NEAREST_100'  // Làm tròn tới 100 VND gần nhất
  | 'ROUND_NEAREST_1000'; // Làm tròn tới 1,000 VND gần nhất

export type ExchangeRateMode = 'MANUAL' | 'SYSTEM_FIXED' | 'EXTERNAL_API';

export type SaveOperationStatus = 'UNSAVED' | 'SAVING' | 'SAVED' | 'SAVE_FAILED' | 'CONFLICT';

export interface CompanyRoundingRules {
  usdDecimals: number;             // Mặc định: 2
  vndDecimals: number;             // Mặc định: 0
  eurDecimals?: number;            // Mặc định: 2
  otherDecimals?: number;          // Mặc định: 2
  method: RoundingMethod;
  enableNearestHundredVnd?: boolean; // Tự động làm tròn 100 VND
}

export interface CompanyFinancialSettings {
  companyId: string;
  baseCurrency: Currency;           // 'USD' hoặc 'VND'
  secondaryCurrency: Currency;      // 'VND' hoặc 'USD'
  allowedCurrencies: Currency[];    // Danh sách tiền tệ cho phép
  exchangeRateMode: ExchangeRateMode;
  defaultExchangeRate: number;      // Tỷ giá quy đổi (VD: 25,400)
  exchangeRateMarginBufferPercent: number; // Tỷ lệ phòng vệ rủi ro tỷ giá (VD: 0.5% - 1%)
  roundingRules: CompanyRoundingRules;
  version: number;
  updatedAt: string;
  updatedBy: string;
}

export type TaxVatPolicy = 
  | 'EXCLUSIVE'      // Giá báo chưa bao gồm thuế VAT (Phổ biến nhất B2B Logistics)
  | 'INCLUSIVE'      // Giá báo đã bao gồm thuế VAT
  | 'REVERSE_CHARGE' // Khấu trừ ngược / Người nhận kê khai
  | 'EXEMPT'         // Không chịu thuế / Miễn thuế GTGT
  | 'OUT_OF_SCOPE';  // Ngoài đối tượng áp dụng

export interface CompanyTaxRule {
  id: string;
  companyId: string;
  code: string;               // VD: 'VAT-0-INTL', 'VAT-8-LOCAL', 'VAT-10-SVC', 'FCT-2-FRT'
  nameVi: string;             // VD: 'Cước vận chuyển quốc tế (0% VAT)'
  nameEn: string;             // VD: 'International Freight (0% VAT)'
  rate: number;               // 0, 5, 8, 10, 2...
  categoryMatch?: FeeCategory | 'ALL';
  locationMatch?: ChargeLocation | 'ALL';
  isDefault?: boolean;
  description?: string;
  isActive: boolean;
}

export interface CompanyTaxConfiguration {
  companyId: string;
  taxCode: string;                  // Mã số thuế doanh nghiệp
  defaultPolicy: TaxVatPolicy;      // Mặc định: EXCLUSIVE
  defaultVatRate: number;           // Mặc định: 8 hoặc 10
  enableFctForeignTax: boolean;     // Bật thuế nhà thầu FCT cho cước hãng tàu nước ngoài
  defaultFctRate: number;           // Mặc định: 2%
  rules: CompanyTaxRule[];
  version: number;
  updatedAt: string;
}

export interface CompanyPaymentTerm {
  id: string;
  companyId: string;
  code: string;                    // e.g. 'PREPAID_BEFORE_BL', 'NET_15', 'NET_30', 'NET_45', 'COD'
  nameVi: string;                  // VD: 'Thanh toán trước khi phát hành B/L'
  nameEn: string;                  // VD: 'Prepayment before B/L release'
  dueDays: number;                 // Số ngày được nợ (0 cho trả trước, 15, 30...)
  depositRequiredPercent: number;  // Tỷ lệ tiền cọc yêu cầu (0 - 100%)
  creditLimitAmount?: number;      // Hạn mức công nợ tối đa (nếu có)
  latePaymentInterestPercent?: number; // Lãi suất quá hạn (% / ngày hoặc % / tháng)
  isDefault: boolean;
  isActive: boolean;
  termsNotesVi?: string;
  termsNotesEn?: string;
}

export interface CompanyBankAccount {
  id: string;
  companyId: string;
  bankName: string;                // Tên ngân hàng (VD: Ngân hàng TMCP Ngoại Thương Việt Nam - Vietcombank)
  bankShortName?: string;          // VCB, TCB, BIDV, SCB
  bankBranch: string;              // Chi nhánh (VD: Chi nhánh Nam Sài Gòn)
  accountNumber: string;           // Số tài khoản
  accountHolder: string;           // Tên người thụ hưởng (Viết hoa không dấu)
  currency: 'USD' | 'VND' | 'MULTI'; // Loại tiền tài khoản
  swiftCode: string;               // Mã SWIFT quốc tế
  isDefaultUsd: boolean;           // Tài khoản mặc định cho nhận USD
  isDefaultVnd: boolean;           // Tài khoản mặc định cho nhận VND
  paymentInstructionsVi?: string;  // Cú pháp chuyển khoản (VD: [Mã Báo Giá] - [Tên Khách Hàng])
  paymentInstructionsEn?: string;
  isActive: boolean;
}

export interface CompanyCommercialSettings {
  companyId: string;
  defaultValidityDays: number;         // Hiệu lực báo giá mặc định (VD: 15 ngày)
  defaultIncoterm: IncotermCode;       // Mặc định: 'FOB' hoặc 'CIF'
  minimumFloorMarginPercent: number;   // Lợi nhuận gộp tối thiểu cho phép (VD: 8% hoặc 10%)
  targetProfitMarginPercent: number;   // Lợi nhuận gộp mục tiêu (VD: 18% hoặc 20%)
  maxSalesDiscountPercent: number;     // Hạn mức giảm giá tối đa Sales được tự quyết (VD: 5%)
  requireApprovalBelowMargin: boolean; // Bắt buộc phê duyệt nếu margin dưới sàn
  defaultExclusionsNotesVi: string;    // Các điều khoản loại trừ mặc định tiếng Việt
  defaultExclusionsNotesEn: string;    // Exclusions and limitations in English
  invoiceHeaderNote?: string;
  version: number;
  updatedAt: string;
}

/**
 * Historical Snapshots embedded inside approved/issued Quotations
 * Preserves absolute data integrity even when company masters are edited.
 */
export interface QuotationCurrencySnapshot {
  baseCurrency: Currency;
  secondaryCurrency: Currency;
  exchangeRate: number;
  exchangeRateMode: ExchangeRateMode;
  exchangeRateBufferPercent: number;
  effectiveExchangeRate: number; // exchangeRate * (1 + buffer)
  roundingMethod: RoundingMethod;
  usdDecimals: number;
  vndDecimals: number;
  snapshotAt: string;
}

export interface QuotationTaxSnapshot {
  taxCode: string;
  policy: TaxVatPolicy;
  defaultVatRate: number;
  enableFct: boolean;
  fctRate: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  rulesAppliedSummary: Array<{
    category: string;
    rate: number;
    taxableAmountUsd: number;
    vatAmountUsd: number;
  }>;
  snapshotAt: string;
}

export interface QuotationPaymentTermSnapshot {
  termId: string;
  termCode: string;
  termNameVi: string;
  termNameEn: string;
  dueDays: number;
  depositPercent: number;
  lateInterestRate?: number;
  fullTermsTextVi: string;
  fullTermsTextEn: string;
  snapshotAt: string;
}

export interface QuotationExchangeRateSnapshot {
  currencyPair: string; // 'USD/VND'
  rate: number;
  appliedBufferPercent: number;
  effectiveRate: number;
  source: string;
  snapshotAt: string;
}

export interface QuotationCommercialTermsSnapshot {
  validityDays: number;
  validityDate: string;
  incoterm: IncotermCode;
  exclusionsNotesVi: string;
  exclusionsNotesEn: string;
  minimumFloorMarginPercent?: number;
  targetMarginPercent?: number;
  snapshotAt: string;
}

export interface QuotationBankSnapshot {
  usdAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    swiftCode: string;
    branch: string;
  };
  vndAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    swiftCode: string;
    branch: string;
  };
  instructionsVi?: string;
  instructionsEn?: string;
  snapshotAt: string;
}

export interface QuotationCompleteFinancialSnapshot {
  companyId: string;
  companySnapshot?: any;
  currencySnapshot: QuotationCurrencySnapshot;
  taxSnapshot: QuotationTaxSnapshot;
  paymentTermSnapshot: QuotationPaymentTermSnapshot;
  exchangeRateSnapshot: QuotationExchangeRateSnapshot;
  commercialTermsSnapshot: QuotationCommercialTermsSnapshot;
  bankSnapshot: QuotationBankSnapshot;
  snapshotVersion: number;
  createdDate: string;
}
