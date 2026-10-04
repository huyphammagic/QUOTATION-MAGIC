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
  | 'TIER_1_GLOBAL'       // Hãng giao nhận đa quốc gia (Kuehne+Nagel, DHL, DSV, Schenker)
  | 'TOP_LOCAL_FORWARDER' // Top forwarder nội địa (Sotrans, Indo-Trans, Vinafreight, Bee Logistics)
  | 'BUDGET_FORWARDER'    // Đơn vị giá rẻ, cạnh tranh về giá gắt gao
  | 'DIRECT_CARRIER';     // Hãng tàu bán trực tiếp (Spot web Maersk, Hapag, ONE)

export interface CompetitorProfile {
  id: string;
  name: string;
  code: string;
  tier: CompetitorTier;
  strongLanes: string[]; // VD: ["Ho Chi Minh -> Long Beach", "Hai Phong -> Hamburg"]
  typicalDiscountPercent: number; // Thường thấp hơn thị trường bao nhiêu % (-5% đến +10%)
  strengths: string[];
  weaknesses: string[];
  winningCounterTactics: string[];
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
