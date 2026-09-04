/**
 * Logistics Quotation Management Platform - Phase 9 Analytics & Dashboard Types
 * Enterprise Business Intelligence & Performance Metrics
 */

export type AnalyticsLanguage = 'vi' | 'en';

export type UserRole = 
  | 'ADMIN' 
  | 'SALES_MANAGER' 
  | 'SALES_REP' 
  | 'PRICING_SPECIALIST' 
  | 'VIEWER';

export type AnalyticsPermission = 
  | 'dashboard.view'
  | 'analytics.view'
  | 'analytics.export'
  | 'sales.analytics.view'
  | 'customer.analytics.view'
  | 'lane.analytics.view'
  | 'profitability.view'
  | 'profitability.export'
  | 'team.analytics.view';

export const ROLE_PERMISSIONS: Record<UserRole, AnalyticsPermission[]> = {
  ADMIN: [
    'dashboard.view',
    'analytics.view',
    'analytics.export',
    'sales.analytics.view',
    'customer.analytics.view',
    'lane.analytics.view',
    'profitability.view',
    'profitability.export',
    'team.analytics.view',
  ],
  SALES_MANAGER: [
    'dashboard.view',
    'analytics.view',
    'analytics.export',
    'sales.analytics.view',
    'customer.analytics.view',
    'lane.analytics.view',
    'profitability.view',
    'profitability.export',
    'team.analytics.view',
  ],
  PRICING_SPECIALIST: [
    'dashboard.view',
    'analytics.view',
    'analytics.export',
    'customer.analytics.view',
    'lane.analytics.view',
    'profitability.view',
    'profitability.export',
  ],
  SALES_REP: [
    'dashboard.view',
    'analytics.view',
    'analytics.export',
    'customer.analytics.view',
    'lane.analytics.view',
    // NO profitability permissions by default
  ],
  VIEWER: [
    'dashboard.view',
    'analytics.view',
  ],
};

export type DashboardTab = 
  | 'overview' 
  | 'quotation' 
  | 'sales' 
  | 'customer' 
  | 'profitability' 
  | 'lane' 
  | 'service' 
  | 'followup' 
  | 'data-quality';

export type DateRangePreset = 
  | 'all'
  | 'today' 
  | 'yesterday' 
  | 'this_week' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'this_quarter' 
  | 'last_quarter' 
  | 'this_year' 
  | 'last_year' 
  | 'custom';

export interface AnalyticsFilterState {
  dateRange: DateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  salesRep?: string;
  customerName?: string;
  serviceType?: string;
  transportMode?: string;
  origin?: string;
  destination?: string;
  incoterm?: string;
  currency?: string; // 'ALL' | 'USD' | 'VND' | etc.
  status?: string;
}

export type CurrencyAmountMap = Record<string, number>;

export interface DashboardKpis {
  totalQuotes: number;
  totalValueByCurrency: CurrencyAmountMap;
  wonQuotesCount: number;
  wonValueByCurrency: CurrencyAmountMap;
  lostQuotesCount: number;
  lostValueByCurrency: CurrencyAmountMap;
  pendingQuotesCount: number;
  expiredQuotesCount: number;
  cancelledQuotesCount: number;
  draftQuotesCount: number;
  winRatePercent: number; // Won / (Won + Lost) * 100
  avgQuoteValueByCurrency: CurrencyAmountMap;
  avgResponseTimeHours: number | null; // From communication logs
  avgSalesCycleDays: number | null; // From creation to acceptance
}

export interface QuotationFunnelStage {
  id: string;
  labelVi: string;
  labelEn: string;
  count: number;
  conversionRateFromPrev: number;
  conversionRateFromTotal: number;
  dropOffCount: number;
}

export interface WinLossDimensionItem {
  key: string;
  label: string;
  totalQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  pendingQuotes: number;
  winRate: number;
  wonValueByCurrency: CurrencyAmountMap;
  lostValueByCurrency: CurrencyAmountMap;
}

export interface CustomerAnalyticsItem {
  customerId: string;
  customerName: string;
  customerCode?: string;
  totalQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  pendingQuotes: number;
  winRate: number;
  totalValueByCurrency: CurrencyAmountMap;
  wonValueByCurrency: CurrencyAmountMap;
  potentialValueByCurrency: CurrencyAmountMap;
  lostValueByCurrency: CurrencyAmountMap;
  lastQuoteDate: string;
  quotesPerMonthAvg: number;
  // Interaction response analytics
  sentCount: number;
  openedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  revisionCount: number;
  engagementScore: number; // 0 - 100
}

export interface SalesPerformanceItem {
  salesRep: string;
  totalQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  pendingQuotes: number;
  winRate: number;
  totalValueByCurrency: CurrencyAmountMap;
  wonValueByCurrency: CurrencyAmountMap;
  avgQuoteValueByCurrency: CurrencyAmountMap;
  customerCount: number;
  avgResponseTimeHours: number | null;
  targetQuotationCount?: number;
  targetWonValueUsd?: number;
  targetWonValueVnd?: number;
}

export interface ProfitabilityItem {
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  salesRep: string;
  createdDate: string;
  status: string;
  mode: string;
  origin: string;
  destination: string;
  sellingByCurrency: CurrencyAmountMap;
  costByCurrency: CurrencyAmountMap;
  grossProfitByCurrency: CurrencyAmountMap;
  marginPercent: number;
  isLowMargin: boolean;
}

export interface LaneAnalyticsItem {
  laneKey: string;
  origin: string;
  destination: string;
  mode: string;
  totalQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  winRate: number;
  avgValueByCurrency: CurrencyAmountMap;
  totalValueByCurrency: CurrencyAmountMap;
  containerCount: number;
  grossWeightKg: number;
  volumeCbm: number;
}

export interface ServiceAnalyticsItem {
  serviceKey: string;
  serviceLabel: string;
  transportMode: string;
  totalQuotes: number;
  wonQuotes: number;
  lostQuotes: number;
  winRate: number;
  totalValueByCurrency: CurrencyAmountMap;
  percentOfTotalQuotes: number;
}

export interface AgingBucketItem {
  bucketId: string;
  labelVi: string;
  labelEn: string;
  minDays: number;
  maxDays: number;
  count: number;
  percentOfTotal: number;
  quotes: {
    id: string;
    quoteNumber: string;
    customerName: string;
    createdDate: string;
    daysOpen: number;
    status: string;
    grandTotalUsd: number;
    grandTotalVnd: number;
    salesRep: string;
  }[];
}

export interface ExpiringQuoteItem {
  id: string;
  quoteNumber: string;
  customerName: string;
  validityDate: string;
  daysRemaining: number;
  isExpired: boolean;
  status: string;
  grandTotalUsd: number;
  grandTotalVnd: number;
  salesRep: string;
}

export interface FollowUpAnalyticsSummary {
  totalFollowUps: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  completionRatePercent: number;
  avgCompletionTimeDays: number | null;
}

export interface DataQualityIssue {
  id: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
  type: 
    | 'MISSING_CUSTOMER' 
    | 'MISSING_SALES_REP' 
    | 'MISSING_CURRENCY' 
    | 'MISSING_COST' 
    | 'INVALID_DATE' 
    | 'MISSING_PORT' 
    | 'ZERO_VALUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  descriptionVi: string;
  descriptionEn: string;
  field: string;
}

export interface DataQualityReport {
  totalQuotesChecked: number;
  cleanQuotesCount: number;
  quotesWithIssuesCount: number;
  healthScorePercent: number;
  issues: DataQualityIssue[];
}

export interface AnalyticsExportConfig {
  format: 'CSV' | 'PRINT_REPORT';
  tab: DashboardTab;
  language: AnalyticsLanguage;
  includeProfitability: boolean;
  filterSummary: string;
}
