/**
 * Logistics Quotation Management Platform - Phase 57 (Lựa Chọn 1)
 * Smart Competitor Intelligence & Dynamic Win/Loss Price Benchmark Engine
 * Radar So Sánh Giá Thị Trường, Bản Đồ Đối Thủ & Dự Báo Xác Suất Trúng Thầu Tối Ưu
 */

import { TransportMode, ContainerType, Currency } from './logistics';

export type MarketPriceTrend = 'RISING' | 'STABLE' | 'FALLING';

export type PriceCompetitivenessRating = 
  | 'AGGRESSIVE_HIGH_WIN'     // Giá rất thấp, khả năng thắng 85-95%, biên lợi nhuận mỏng
  | 'OPTIMAL_SWEET_SPOT'       // Điểm ngọt cân bằng, xác suất thắng 70-85%, lợi nhuận tối ưu
  | 'MODERATE_CHANCE'          // Giá thị trường bình thường, xác suất 50-69%
  | 'OVERPRICED_HIGH_RISK';    // Giá cao hơn thị trường, xác suất thắng < 50%, nguy cơ mất khách

export interface LaneMarketBenchmark {
  id: string;
  pol: string;
  pod: string;
  mode: TransportMode;
  containerType: ContainerType;
  currency: Currency;
  
  // Percentile distribution
  p10LowPrice: number;        // Mức giá thấp (10% thị trường) - thường là giá hãng tàu chào sỉ hoặc đối thủ phá giá
  p50MedianPrice: number;     // Mức giá trung bình thị trường (Median)
  p90HighPrice: number;       // Mức giá cao cấp (Dịch vụ cao cấp, tàu chạy thẳng nhanh, free time dài)
  
  carrierAverages: Record<string, number>; // Ví dụ: { "ONE": 1780, "Maersk": 1850, "Evergreen": 1720 }
  trend: MarketPriceTrend;
  sampleQuotesCount: number;
  lastUpdated: string;
  notesVi?: string;
}

export type CompetitorTier = 
  | 'TIER_1_GLOBAL'       // Hãng giao nhận đa quốc gia (Kuehne+Nagel, DHL, DSV, Schenker, Expeditors)
  | 'TOP_LOCAL_FORWARDER' // Top forwarder nội địa (Bee Logistics, Sotrans, ITL, Gemadept, Dolphin)
  | 'NICHE_SPECIALIST'    // Doanh nghiệp ngách chuyên tuyến (Vantage, Real Logistics, Glotrans)
  | 'BUDGET_FORWARDER'    // Đơn vị giá rẻ, cạnh tranh về giá gắt gao
  | 'DIRECT_CARRIER';     // Hãng tàu bán trực tiếp (Spot web Maersk, Hapag, ONE, CMA CGM)

export type PricePositioning = 'PREMIUM' | 'STANDARD' | 'BUDGET_AGGRESSIVE';
export type LocalChargesRating = 'EXPENSIVE' | 'MODERATE' | 'COMPETITIVE';

export interface CompetitorSwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CompetitorProfile {
  id: string;
  name: string;
  code: string;
  tier: CompetitorTier;
  legalName?: string;
  brandName?: string;
  headquarters?: string;
  establishedYear?: number;
  employeeCount?: string;
  website?: string;
  marketShareEstimate?: string;
  strongLanes: string[]; // VD: ["Hồ Chí Minh -> Long Beach", "Hải Phòng -> Hamburg"]
  typicalDiscountPercent: number; // Thường thấp hơn hoặc cao hơn thị trường bao nhiêu % (-5% đến +10%)
  pricePositioning?: PricePositioning;
  localChargesRating?: LocalChargesRating;
  strengths: string[];
  weaknesses: string[];
  swotAnalysis?: CompetitorSwot;
  carrierAlliances?: string[]; // VD: ["MSC", "Maersk", "Cosco", "Vietnam Airlines"]
  winningCounterTactics: string[];
  killPitchVi?: string; // Lời thoại phản công trực tiếp của Sales BOGI Logistics
  zaloScriptVi?: string; // Mẫu tin nhắn Zalo gửi khách hàng
  trapQuestionsVi?: string[]; // Câu hỏi bẫy để khách tự nhận ra nhược điểm đối thủ
  isCustomAdded?: boolean;
  isAiGenerated?: boolean;
  lastScannedAt?: string;
}

export interface CompetitorScanResult {
  competitor: CompetitorProfile;
  marketIntelligenceSummaryVi: string;
  keyVulnerabilitiesVi: string[];
  immediateSalesActionVi: string;
}

export interface LaneCompetitorAnalysis {
  lane: string;
  mode: TransportMode;
  marketLeader: string;
  keyCompetitors: {
    name: string;
    tier: CompetitorTier;
    estimatedShare: string;
    typicalRateUsd: number;
    pros: string;
    cons: string;
  }[];
  bogiStrategyRecommendation: string;
  priceSweetSpotUsd: number;
}

export interface QuoteTearDownResult {
  competitorName?: string;
  totalCostDetected?: string;
  hiddenFeeAlerts: {
    feeName: string;
    estimatedCost: string;
    descriptionVi: string;
  }[];
  weaknessPoints: string[];
  bogiAdvantages: string[];
  counterPitchVi: string;
  zaloMessageTemplateVi: string;
  suggestedDiscountStrategy: string;
}

export interface WinProbabilityResult {
  proposedPrice: number;
  currency: Currency;
  p10Low: number;
  p50Median: number;
  p90High: number;
  
  winProbabilityPercent: number; // 0 - 100%
  rating: PriceCompetitivenessRating;
  
  // Sweet spot recommendation
  sweetSpotPrice: number;
  sweetSpotWinProbability: number;
  marginPercentAtProposed: number;
  marginPercentAtSweetSpot: number;
  expectedProfitProposed: number;
  expectedProfitSweetSpot: number;
  
  analysisSummaryVi: string;
  suggestedActionVi: string;
}

export interface WinLossFeedbackRecord {
  id: string;
  companyId: string;
  quotationId: string;
  quoteNumber: string;
  customerName: string;
  lane: string;
  outcome: 'WON' | 'LOST';
  quotedPrice: number;
  winningPrice?: number;
  competitorWon?: string;
  primaryReason: 
    | 'PRICE' 
    | 'TRANSIT_TIME' 
    | 'FREE_TIME' 
    | 'PAYMENT_TERMS' 
    | 'SPACE_AVAILABILITY' 
    | 'CUSTOMER_RELATIONSHIP' 
    | 'OTHER';
  feedbackNotes?: string;
  recordedBy: string;
  recordedAt: string;
}
