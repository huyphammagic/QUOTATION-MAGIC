import { QuoteData, LineItem, ContainerType, Currency, QuoteStatus } from './logistics';

export interface HistoricalRateMatch {
  quoteId: string;
  quoteNumber: string;
  createdDate: string;
  daysAgo: number;
  customerName: string;
  status: QuoteStatus;
  mode: string;
  pol: string;
  pod: string;
  containerType: ContainerType;
  quantity: number;
  freightItem: {
    code: string;
    description: string;
    unitPrice: number;
    costPrice?: number;
    currency: Currency;
    unit: string;
    profitUsd?: number;
    marginPercent?: number;
  };
}

export interface CompetitiveRateTier {
  id: 'AGGRESSIVE_WIN' | 'MARKET_BALANCED' | 'PREMIUM_MARGIN';
  title: string;
  subtitle: string;
  rate: number;
  currency: Currency;
  estimatedMarginPercent: number;
  badge: string;
  badgeColor: 'emerald' | 'blue' | 'purple' | 'amber';
  recommendationReason: string;
  savingsVsAvgPercent: number; // e.g. -4.5% or +5.0%
}

export interface HistoricalRateAnalysisResult {
  hasMatches: boolean;
  polQuery: string;
  podQuery: string;
  timeframeDays: number; // 90 days (3 months)
  totalQuotesCount: number;
  acceptedCount: number;
  
  // Rate Statistics
  currency: Currency;
  minRate: number;
  maxRate: number;
  avgRate: number;
  latestRate: number;
  wonRate: number | null; // Rate of recently accepted quote if exists
  avgCostPrice?: number;
  avgMarginPercent: number;
  
  // Trend
  trend: 'UPWARD' | 'DOWNWARD' | 'STABLE';
  trendPercent: number;
  
  // Competitive Strategy Tiers
  tiers: CompetitiveRateTier[];
  
  // All matched quote items in the last 3 months
  matches: HistoricalRateMatch[];
}
