/**
 * Logistics Quotation Management Platform - Phase 59 (Lựa Chọn 3)
 * Smart Validity Countdown & Surcharge (GRI/PSS/ETS) Expiry Alert Engine
 * Radar Hiệu Lực Báo Giá, Biến Động Phụ Phí Thị Trường & Gia Hạn/Cập Nhật Giá 1-Click
 */

export type RateValidityStatus = 'HEALTHY' | 'EXPIRING_SOON' | 'CRITICAL_48H' | 'EXPIRED';

export type SurchargeType =
  | 'GRI'          // General Rate Increase (Tăng cước chung)
  | 'PSS'          // Peak Season Surcharge (Phụ phí mùa cao điểm)
  | 'ETS'          // EU Emissions Trading System (Phụ phí hạn ngạch khí thải carbon EU)
  | 'WRS'          // War Risk Surcharge (Phụ phí vùng rủi ro chiến tranh / Kênh Suez)
  | 'BAF_LSS'      // Bunker Adjustment / Low Sulphur Fuel (Phụ phí biến động nhiên liệu)
  | 'THC_INCREASE' // Terminal Handling Charge (Phụ phí bốc xếp cảng điều chỉnh);

export interface SurchargeMarketAlert {
  id: string;
  carrierCode: string;
  carrierName: string;
  lanePol: string;
  lanePod: string;
  surchargeType: SurchargeType;
  surchargeNameVi: string;
  amountUsd: number;
  containerUnit: '20GP' | '40HC' | 'TEU' | 'CBM' | 'CONTAINER';
  effectiveDate: string; // ISO date string YYYY-MM-DD
  announcementDate: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  impactMarginEstimateUsd: number;
  affectedActiveQuotesCount: number;
  summaryVi: string;
  urgencyPitchTemplateVi: string;
  officialCircularRef?: string;
}

export interface QuotationValidityAudit {
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  pol: string;
  pod: string;
  carrier: string;
  validTo: string; // ISO YYYY-MM-DD
  daysRemaining: number;
  status: RateValidityStatus;
  currentFreightSellUsd: number;
  currentFreightCostUsd: number;
  currentProfitMarginPercent: number;
  projectedGRIImpactUsd: number;
  marginAtRiskPercent: number;
  recommendedActionVi: string;
  isRepriceEligible: boolean;
}

export interface BulkValidityExtensionPayload {
  quoteIds: string[];
  daysToAdd: number; // e.g., 14 or 30 days
  applySurchargeBufferUsd?: number;
  newValidToDate: string;
}

export interface BulkRepriceResult {
  quotationId: string;
  quoteNumber: string;
  oldValidTo: string;
  newValidTo: string;
  oldFreightSellUsd: number;
  newFreightSellUsd: number;
  oldMarginPercent: number;
  newMarginPercent: number;
  status: 'SUCCESS' | 'SKIPPED' | 'FAILED';
}
