import { Currency, FeeCategory, ChargeLocation, TransportMode, ContainerType, IncotermCode, LineItem } from './logistics';
import { ChargeBasis } from './pricing';
import { PricingPolicyScope, MarginStatus, ApprovalLevel } from './pricingIntelligence';

export type SmartQuotationStep = 
  | 'SHIPMENT'    // Bước 1: Thông tin Lô hàng & Khách hàng
  | 'MATCHING'    // Bước 2: Khớp Cước & Phụ phí Thông minh
  | 'COSTING'     // Bước 3: Phân tích & Tính toán Giá vốn (Costing)
  | 'SELLING'     // Bước 4: Xác định Phương pháp & Giá bán (Selling)
  | 'PROFIT'      // Bước 5: Phân tích Lợi nhuận & Biên lãi (Profit/Margin)
  | 'VALIDATION'  // Bước 6: Kiểm tra Tính hợp lệ & Cảnh báo (Validation)
  | 'REVIEW'      // Bước 7: Xem trước Tổng thể Báo giá (Review)
  | 'SAVE'        // Bước 8: Lưu Báo giá & Tạo Snapshot Cố định (Save)
  | 'APPROVAL';   // Bước 9: Quy trình Phê duyệt & Khóa giá (Approval)

export type RateMatchSourceType = 
  | 'CUSTOMER_CONTRACT' 
  | 'CONTRACT' 
  | 'CARRIER' 
  | 'SUPPLIER' 
  | 'STANDARD' 
  | 'SPOT';

export interface MatchedRateCandidate {
  id: string;
  sourceType: RateMatchSourceType;
  sourceName: string;
  sourceReference: string; // E.g. "Hợp đồng KH: HD-2026-001 (V2)" hoặc "Biểu cước Spot: SPOT-ONE-2026"
  carrier?: string;
  transportMode: TransportMode;
  origin: string;
  destination: string;
  equipment?: string;
  chargeCode: string;
  chargeName: string;
  category: FeeCategory;
  location: ChargeLocation;
  basis: ChargeBasis;
  unit: string;
  currency: Currency;
  
  // Pricing
  buyRate: number;
  sellRate: number;
  vatRate: number;
  
  // Validity & Conditions
  validFrom: string;
  validTo: string;
  freeTime?: string;
  transitTime?: string;
  notes?: string;

  // Matching Intelligence
  matchScore: number; // 0 - 100
  isBestMatch: boolean;
  explanation: string; // Plain factual explanation from real records
}

export type MissingRateStatus = 'MISSING' | 'NOT_APPLICABLE' | 'ZERO_RATE';

export interface MissingRateDetectionItem {
  code: string;
  name: string;
  category: FeeCategory;
  location: ChargeLocation;
  status: MissingRateStatus;
  reason: string;
  isMandatory: boolean;
}

export interface SmartRateMatchingResult {
  isFound: boolean;
  bestMatches: MatchedRateCandidate[];
  alternativeMatches: MatchedRateCandidate[];
  missingRates: MissingRateDetectionItem[];
  warnings: string[];
}

export interface QuotationPricingSnapshotItem {
  id: string;
  code: string;
  description: string;
  category: FeeCategory;
  location: ChargeLocation;
  quantity: number;
  unit: string;
  basis: ChargeBasis;
  currency: Currency;
  costPrice: number;
  costTotalUsd: number;
  costTotalVnd: number;
  unitPrice: number;
  amountUsd: number;
  amountVnd: number;
  profitUsd: number;
  profitVnd: number;
  marginPercent: number;
  rateSource?: string;
  rateSourceReference?: string;
  validity?: string;
}

export interface QuotationPricingSnapshot {
  snapshotId: string;
  quoteId: string;
  quoteNumber: string;
  version: number;
  createdAt: string;
  createdBy: string;
  exchangeRate: number;
  quoteCurrency: Currency;
  
  // Captured Line Items
  items: QuotationPricingSnapshotItem[];
  
  // Totals at snapshot time
  subtotalUsd: number;
  subtotalVnd: number;
  vatTotalUsd: number;
  vatTotalVnd: number;
  grandTotalUsd: number;
  grandTotalVnd: number;
  totalCostUsd: number;
  totalCostVnd: number;
  totalProfitUsd: number;
  totalProfitVnd: number;
  overallMarginPercent: number;
  
  // Controls & Rules
  priceLocked: boolean;
  priceOverrideReason?: string;
  pricingPolicyId?: string;
  pricingPolicyCode?: string;
}

export type AutosaveStatus = 'UNSAVED' | 'SAVING' | 'SAVED' | 'SAVE_FAILED';

export interface PricingWarningItem {
  id: string;
  code: string;
  type: 
    | 'MISSING_RATE'
    | 'EXPIRED_RATE'
    | 'RATE_EXPIRING_SOON'
    | 'NO_CONTRACT_RATE'
    | 'LOW_MARGIN'
    | 'NEGATIVE_MARGIN'
    | 'PRICE_OVERRIDE'
    | 'RATE_OUTSIDE_VALIDITY'
    | 'MISSING_COST'
    | 'MISSING_SELL'
    | 'CURRENCY_MISMATCH'
    | 'MISSING_CUSTOMER'
    | 'MISSING_ROUTE'
    | 'MISSING_EQUIPMENT'
    | 'MISSING_QUANTITY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  titleVi: string;
  titleEn: string;
  detailVi: string;
  detailEn: string;
}
