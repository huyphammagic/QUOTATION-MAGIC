import { SurchargeItem, Currency, QuoteStatus } from './logistics';

export type SeasonalityVolatility = 'STABLE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export type CompetitivenessRating = 
  | 'HIGHLY_COMPETITIVE' 
  | 'MARKET_AVERAGE' 
  | 'OVERPRICED_RISK' 
  | 'UNDERPRICED_MARGIN_RISK';

export interface SurchargeSeasonalityMonthData {
  month: number;               // 1 - 12
  monthLabel: string;          // Th1, Th2, ... Th12
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  seasonPhase: 
    | 'PRE_TET_PEAK' 
    | 'POST_TET_DIP' 
    | 'NORMAL' 
    | 'SUMMER_SURGE' 
    | 'PRE_HOLIDAY_PEAK' 
    | 'YEAR_END_RUSH';
  seasonPhaseLabelVi: string;
  seasonalityIndex: number;    // 100 = baseline average, 125 = +25% peak
  averagePriceUsd: number;
  averagePriceVnd: number;
  historicalCostUsd: number;
  historicalCostVnd: number;
  sampleCount: number;
  volatility: SeasonalityVolatility;
}

export interface SurchargeHistoricalCostPoint {
  id: string;
  quoteId: string;
  quoteNumber: string;
  date: string;
  customerName: string;
  route: string;
  unitPrice: number;
  costPrice: number;
  currency: Currency;
  unit: string;
  marginPercent: number;
  status: QuoteStatus;
  carrierOrSupplier?: string;
}

export interface SurchargePricingTier {
  id: 'AGGRESSIVE_WIN' | 'MARKET_BALANCED' | 'PREMIUM_MARGIN';
  title: string;
  subtitle: string;
  priceUsd: number;
  priceVnd: number;
  estimatedMarginPercent: number;
  badge: string;
  badgeColor: 'emerald' | 'blue' | 'purple' | 'amber';
  rationaleVi: string;
  savingsVsCurrentPercent: number;
}

export interface SurchargeSeasonalityAnalysis {
  surcharge: SurchargeItem;
  currentPriceUsd: number;
  currentPriceVnd: number;
  competitivenessScore: number; // 0 - 100
  rating: CompetitivenessRating;
  ratingBadgeVi: string;
  ratingDescriptionVi: string;
  ratingColor: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';

  // Market Corridor benchmarks
  marketCorridor: {
    minPriceUsd: number;
    maxPriceUsd: number;
    avgPriceUsd: number;
    recommendedSweetSpotUsd: number;
    minPriceVnd: number;
    maxPriceVnd: number;
    avgPriceVnd: number;
    recommendedSweetSpotVnd: number;
  };

  // Historical Cost Metrics
  historicalCostMetrics: {
    avgCostUsd: number;
    avgCostVnd: number;
    estimatedMarginPercent: number;
    costTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
    costTrendPercent: number;
    totalHistoricalQuotationsUsed: number;
    winRatePercent: number;
  };

  // Current Seasonal Context
  currentSeasonality: {
    currentMonth: number;
    seasonNameVi: string;
    seasonalityFactor: number; // e.g. 1.20 (+20%)
    seasonAdviceVi: string;
    isPeakActive: boolean;
    volatility: SeasonalityVolatility;
    forecastNextQuarterVi: string;
  };

  // Recommended Actionable Strategies
  recommendedTiers: SurchargePricingTier[];

  // Historical Quote Sample Points
  historicalQuotePoints: SurchargeHistoricalCostPoint[];

  // 12-Month Curve
  monthlySeasonalityCurve: SurchargeSeasonalityMonthData[];
}
