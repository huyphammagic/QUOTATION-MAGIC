/**
 * Logistics Quotation Management Platform - Phase 9 Analytics Service
 * High-performance Firestore aggregation, multi-currency accounting,
 * revision deduplication, and role-based data analytics.
 */

import { QuoteData, QuoteStatus } from '../../types/logistics';
import { 
  QuotationCommunication, 
  QuotationCustomerResponse, 
  QuotationFollowUp,
  QuotationSecureLink 
} from '../../types/quotationCommunication';
import { 
  AnalyticsFilterState, 
  DashboardKpis, 
  QuotationFunnelStage,
  WinLossDimensionItem,
  CustomerAnalyticsItem,
  SalesPerformanceItem,
  ProfitabilityItem,
  LaneAnalyticsItem,
  ServiceAnalyticsItem,
  AgingBucketItem,
  ExpiringQuoteItem,
  FollowUpAnalyticsSummary,
  DataQualityReport,
  DataQualityIssue,
  CurrencyAmountMap,
  UserRole,
  ROLE_PERMISSIONS
} from '../../types/analytics';
import { getQuotesFromFirestore } from '../firebase/firestoreService';
import { recordAuditLog } from './quotationDocumentService';

// ==========================================
// 1. REVISION DEDUPLICATION & NORMALIZATION
// ==========================================

export interface DeduplicatedQuote {
  activeQuote: QuoteData;
  allRevisions: QuoteData[];
  revisionCount: number;
  isWon: boolean;
  isLost: boolean;
  isPending: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  isDraft: boolean;
}

/**
 * Normalizes quote number to root base (stripping -R1, -REV1, /R1, etc.)
 */
export function getRootQuoteNumber(quoteNumber: string): string {
  if (!quoteNumber) return '';
  return quoteNumber
    .replace(/[-_ ](?:REV|R|VER)[\d]+$/i, '')
    .replace(/\.R[\d]+$/i, '')
    .trim();
}

/**
 * Groups quotes by root quotation reference and determines the active revision
 */
export function deduplicateQuotationRevisions(
  quotes: QuoteData[],
  customerResponses: QuotationCustomerResponse[] = []
): DeduplicatedQuote[] {
  const groups = new Map<string, QuoteData[]>();

  quotes.forEach(q => {
    const root = getRootQuoteNumber(q.quoteNumber) || q.id;
    const list = groups.get(root) || [];
    list.push(q);
    groups.set(root, list);
  });

  const responseMap = new Map<string, QuotationCustomerResponse[]>();
  customerResponses.forEach(r => {
    const list = responseMap.get(r.quotationId) || [];
    list.push(r);
    responseMap.set(r.quotationId, list);
  });

  const results: DeduplicatedQuote[] = [];

  groups.forEach((groupQuotes) => {
    // Sort revisions: newest updated/created date first
    groupQuotes.sort((a, b) => {
      const dateA = a.updatedDate || a.createdDate || '';
      const dateB = b.updatedDate || b.createdDate || '';
      return dateB.localeCompare(dateA);
    });

    // Priority for active revision:
    // 1. Check if any revision was ACCEPTED by customer or marked ACCEPTED
    const acceptedRevision = groupQuotes.find(q => {
      if (q.status === 'ACCEPTED') return true;
      const resps = responseMap.get(q.id) || [];
      return resps.some(r => r.responseType === 'ACCEPTED');
    });

    // 2. Or latest valid approved/sent/issued version
    const active = acceptedRevision || groupQuotes[0];

    // Status evaluation
    const resps = responseMap.get(active.id) || [];
    const hasAcceptedResp = resps.some(r => r.responseType === 'ACCEPTED');
    const hasRejectedResp = resps.some(r => r.responseType === 'REJECTED');

    const isWon = active.status === 'ACCEPTED' || hasAcceptedResp;
    const isLost = !isWon && (active.status === 'REJECTED' || hasRejectedResp);
    const isCancelled = active.status === 'CANCELLED';
    const isDraft = active.status === 'DRAFT';

    // Check expiry
    let isExpired = active.status === 'EXPIRED';
    if (!isWon && !isLost && !isCancelled && !isDraft && active.terms?.validityDate) {
      const valDate = new Date(active.terms.validityDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (valDate < today) {
        isExpired = true;
      }
    }

    const isPending = !isWon && !isLost && !isCancelled && !isDraft && !isExpired;

    results.push({
      activeQuote: active,
      allRevisions: groupQuotes,
      revisionCount: groupQuotes.length,
      isWon,
      isLost,
      isPending,
      isExpired,
      isCancelled,
      isDraft,
    });
  });

  return results;
}

// ==========================================
// 2. LOCATION & SERVICE NORMALIZATION
// ==========================================

export function normalizePortName(rawPort: string): string {
  if (!rawPort) return 'Chưa xác định';
  const clean = rawPort.trim();
  
  if (/cat lai|hcm|ho chi minh|saigon/i.test(clean)) return 'Cát Lái (SGN)';
  if (/hai phong|dinh vu|lach huyen/i.test(clean)) return 'Hải Phòng (HPH)';
  if (/cai mep|thi vai|vung tau/i.test(clean)) return 'Cái Mép (TCIT)';
  if (/da nang/i.test(clean)) return 'Đà Nẵng (DAD)';
  if (/los angeles|la port/i.test(clean)) return 'Los Angeles (LAX/LGB)';
  if (/long beach/i.test(clean)) return 'Long Beach (LGB)';
  if (/new york|nj|newark/i.test(clean)) return 'New York (NYC)';
  if (/shanghai/i.test(clean)) return 'Shanghai (SHA)';
  if (/ningbo/i.test(clean)) return 'Ningbo (NGB)';
  if (/singapore/i.test(clean)) return 'Singapore (SIN)';
  if (/busan/i.test(clean)) return 'Busan (PUS)';
  if (/tokyo|yokohama/i.test(clean)) return 'Tokyo/Yokohama (TYO)';
  if (/rotterdam/i.test(clean)) return 'Rotterdam (RTM)';
  if (/hamburg/i.test(clean)) return 'Hamburg (HAM)';

  // Shorten generic long names (take before first comma)
  const parts = clean.split(',');
  return parts[0].trim();
}

export function getServiceCategory(mode?: string): string {
  switch (mode) {
    case 'SEA_FCL': return 'Đường Biển Nguyên Cont (FCL)';
    case 'SEA_LCL': return 'Đường Biển Hàng Lẻ (LCL)';
    case 'AIR': return 'Đường Hàng Không (AIR)';
    case 'TRUCKING': return 'Vận Tải Đường Bộ (TRUCK)';
    case 'CUSTOMS': return 'Khai Thuê Hải Quan';
    default: return 'Đa Phương Thức / Khác';
  }
}

// ==========================================
// 3. DATE RANGE FILTERING
// ==========================================

export function isDateWithinFilter(dateStr: string, filter: AnalyticsFilterState): boolean {
  if (!dateStr || filter.dateRange === 'all') return true;

  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return false;

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (filter.dateRange) {
    case 'today': {
      const s = startOfDay(now);
      const e = endOfDay(now);
      return target >= s && target <= e;
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = startOfDay(y);
      const e = endOfDay(y);
      return target >= s && target <= e;
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      const s = startOfDay(monday);
      const e = endOfDay(now);
      return target >= s && target <= e;
    }
    case 'last_week': {
      const day = now.getDay();
      const diffToLastMonday = (day === 0 ? -6 : 1 - day) - 7;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() + diffToLastMonday);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      const s = startOfDay(lastMonday);
      const e = endOfDay(lastSunday);
      return target >= s && target <= e;
    }
    case 'this_month': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = endOfDay(now);
      return target >= s && target <= e;
    }
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return target >= s && target <= e;
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), quarter * 3, 1);
      const e = endOfDay(now);
      return target >= s && target <= e;
    }
    case 'last_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const prevQuarter = quarter === 0 ? 3 : quarter - 1;
      const year = quarter === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const s = new Date(year, prevQuarter * 3, 1);
      const e = new Date(year, (prevQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return target >= s && target <= e;
    }
    case 'this_year': {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = endOfDay(now);
      return target >= s && target <= e;
    }
    case 'last_year': {
      const s = new Date(now.getFullYear() - 1, 0, 1);
      const e = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return target >= s && target <= e;
    }
    case 'custom': {
      if (!filter.customStartDate) return true;
      const s = startOfDay(new Date(filter.customStartDate));
      const e = filter.customEndDate ? endOfDay(new Date(filter.customEndDate)) : endOfDay(now);
      return target >= s && target <= e;
    }
    default:
      return true;
  }
}

// ==========================================
// 4. MULTI-CURRENCY COMPUTATION ENGINE
// ==========================================

export function computeQuoteCurrencyTotals(quote: QuoteData): {
  sellingByCurrency: CurrencyAmountMap;
  costByCurrency: CurrencyAmountMap;
  profitByCurrency: CurrencyAmountMap;
} {
  const selling: CurrencyAmountMap = { USD: 0, VND: 0 };
  const cost: CurrencyAmountMap = { USD: 0, VND: 0 };
  const profit: CurrencyAmountMap = { USD: 0, VND: 0 };

  if (quote.items && quote.items.length > 0) {
    quote.items.forEach(item => {
      const curr = item.currency || 'USD';
      if (!selling[curr]) selling[curr] = 0;
      if (!cost[curr]) cost[curr] = 0;
      if (!profit[curr]) profit[curr] = 0;

      const qty = item.quantity || 1;
      const itemSell = (item.unitPrice || 0) * qty;
      const itemCost = (item.costPrice || 0) * qty;
      const itemProfit = itemSell - itemCost;

      selling[curr] += itemSell;
      cost[curr] += itemCost;
      profit[curr] += itemProfit;
    });
  } else {
    if (quote.grandTotalUsd) selling['USD'] = quote.grandTotalUsd;
    if (quote.grandTotalVnd) selling['VND'] = quote.grandTotalVnd;
  }

  return {
    sellingByCurrency: selling,
    costByCurrency: cost,
    profitByCurrency: profit,
  };
}

export function sumCurrencyMaps(mapA: CurrencyAmountMap, mapB: CurrencyAmountMap): CurrencyAmountMap {
  const res: CurrencyAmountMap = { ...mapA };
  Object.keys(mapB).forEach(curr => {
    res[curr] = (res[curr] || 0) + (mapB[curr] || 0);
  });
  return res;
}

// ==========================================
// 5. CORE ANALYTICS AGGREGATION
// ==========================================

export interface AggregatedAnalyticsResult {
  filteredDeduplicatedQuotes: DeduplicatedQuote[];
  kpis: DashboardKpis;
  funnelStages: QuotationFunnelStage[];
  winLossByDimension: {
    bySales: WinLossDimensionItem[];
    byCustomer: WinLossDimensionItem[];
    byService: WinLossDimensionItem[];
    byLane: WinLossDimensionItem[];
  };
  customerAnalytics: CustomerAnalyticsItem[];
  salesPerformance: SalesPerformanceItem[];
  profitabilityItems: ProfitabilityItem[];
  laneAnalytics: LaneAnalyticsItem[];
  serviceAnalytics: ServiceAnalyticsItem[];
  agingBuckets: AgingBucketItem[];
  expiringQuotes: ExpiringQuoteItem[];
  followUpAnalytics: FollowUpAnalyticsSummary;
  dataQualityReport: DataQualityReport;
}

export function computeAggregatedAnalytics(params: {
  quotes: QuoteData[];
  communications?: QuotationCommunication[];
  responses?: QuotationCustomerResponse[];
  followUps?: QuotationFollowUp[];
  links?: QuotationSecureLink[];
  filters: AnalyticsFilterState;
  userRole: UserRole;
}): AggregatedAnalyticsResult {
  const { 
    quotes, 
    communications = [], 
    responses = [], 
    followUps = [], 
    links = [], 
    filters,
    userRole
  } = params;

  // 1. Deduplicate revisions
  const allDeduplicated = deduplicateQuotationRevisions(quotes, responses);

  // 2. Apply Filters
  const filtered = allDeduplicated.filter(d => {
    const q = d.activeQuote;

    // Date range filter
    if (!isDateWithinFilter(q.createdDate, filters)) return false;

    // Sales Rep filter
    if (filters.salesRep && filters.salesRep !== 'ALL') {
      const rep = q.company?.salesRepName || 'Unassigned';
      if (rep !== filters.salesRep) return false;
    }

    // Customer filter
    if (filters.customerName && filters.customerName !== 'ALL') {
      const cust = q.customer?.companyName || q.customer?.customerName || '';
      if (!cust.toLowerCase().includes(filters.customerName.toLowerCase())) return false;
    }

    // Service Mode filter
    if (filters.transportMode && filters.transportMode !== 'ALL') {
      if (q.shipment?.mode !== filters.transportMode) return false;
    }

    // Origin filter
    if (filters.origin && filters.origin !== 'ALL') {
      if (!q.shipment?.pol?.toLowerCase().includes(filters.origin.toLowerCase())) return false;
    }

    // Destination filter
    if (filters.destination && filters.destination !== 'ALL') {
      if (!q.shipment?.pod?.toLowerCase().includes(filters.destination.toLowerCase())) return false;
    }

    // Incoterm filter
    if (filters.incoterm && filters.incoterm !== 'ALL') {
      if (q.terms?.incoterm !== filters.incoterm) return false;
    }

    // Currency filter
    if (filters.currency && filters.currency !== 'ALL') {
      const hasCurr = q.items?.some(i => i.currency === filters.currency) || q.quoteCurrency === filters.currency;
      if (!hasCurr) return false;
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'WON' && !d.isWon) return false;
      if (filters.status === 'LOST' && !d.isLost) return false;
      if (filters.status === 'PENDING' && !d.isPending) return false;
      if (filters.status === 'EXPIRED' && !d.isExpired) return false;
      if (filters.status === 'DRAFT' && !d.isDraft) return false;
      if (filters.status === 'CANCELLED' && !d.isCancelled) return false;
      if (!['WON', 'LOST', 'PENDING', 'EXPIRED', 'DRAFT', 'CANCELLED'].includes(filters.status)) {
        if (q.status !== filters.status) return false;
      }
    }

    return true;
  });

  // 3. KPI Aggregation
  let totalQuotes = filtered.length;
  let wonQuotesCount = 0;
  let lostQuotesCount = 0;
  let pendingQuotesCount = 0;
  let expiredQuotesCount = 0;
  let cancelledQuotesCount = 0;
  let draftQuotesCount = 0;

  const totalValueByCurrency: CurrencyAmountMap = { USD: 0, VND: 0 };
  const wonValueByCurrency: CurrencyAmountMap = { USD: 0, VND: 0 };
  const lostValueByCurrency: CurrencyAmountMap = { USD: 0, VND: 0 };

  const salesCycleDaysList: number[] = [];

  filtered.forEach(d => {
    const q = d.activeQuote;
    const { sellingByCurrency } = computeQuoteCurrencyTotals(q);

    // Sum overall total
    Object.keys(sellingByCurrency).forEach(curr => {
      totalValueByCurrency[curr] = (totalValueByCurrency[curr] || 0) + sellingByCurrency[curr];
    });

    if (d.isWon) {
      wonQuotesCount++;
      Object.keys(sellingByCurrency).forEach(curr => {
        wonValueByCurrency[curr] = (wonValueByCurrency[curr] || 0) + sellingByCurrency[curr];
      });

      // Calculate sales cycle
      if (q.createdDate && q.updatedDate) {
        const cDate = new Date(q.createdDate).getTime();
        const uDate = new Date(q.updatedDate).getTime();
        const diffDays = Math.max(0, Math.round((uDate - cDate) / (1000 * 3600 * 24)));
        salesCycleDaysList.push(diffDays);
      }
    } else if (d.isLost) {
      lostQuotesCount++;
      Object.keys(sellingByCurrency).forEach(curr => {
        lostValueByCurrency[curr] = (lostValueByCurrency[curr] || 0) + sellingByCurrency[curr];
      });
    } else if (d.isDraft) {
      draftQuotesCount++;
    } else if (d.isCancelled) {
      cancelledQuotesCount++;
    } else if (d.isExpired) {
      expiredQuotesCount++;
    } else {
      pendingQuotesCount++;
    }
  });

  // Strict Win Rate formula = Won / (Won + Lost)
  const decisiveQuotes = wonQuotesCount + lostQuotesCount;
  const winRatePercent = decisiveQuotes > 0 ? Math.round((wonQuotesCount / decisiveQuotes) * 1000) / 10 : 0;

  const avgQuoteValueByCurrency: CurrencyAmountMap = {};
  Object.keys(totalValueByCurrency).forEach(curr => {
    avgQuoteValueByCurrency[curr] = totalQuotes > 0 ? Math.round(totalValueByCurrency[curr] / totalQuotes) : 0;
  });

  // Calculate Average Response Time from communication events
  let responseTimesHours: number[] = [];
  communications.forEach(comm => {
    if (comm.sentAt) {
      const resps = responses.filter(r => r.quotationId === comm.quotationId);
      if (resps.length > 0) {
        const sentTime = new Date(comm.sentAt).getTime();
        const firstRespTime = new Date(resps[resps.length - 1].respondedAt).getTime();
        if (firstRespTime > sentTime) {
          responseTimesHours.push((firstRespTime - sentTime) / (1000 * 3600));
        }
      }
    }
  });

  const avgResponseTimeHours = responseTimesHours.length > 0
    ? Math.round((responseTimesHours.reduce((a, b) => a + b, 0) / responseTimesHours.length) * 10) / 10
    : null;

  const avgSalesCycleDays = salesCycleDaysList.length > 0
    ? Math.round((salesCycleDaysList.reduce((a, b) => a + b, 0) / salesCycleDaysList.length) * 10) / 10
    : null;

  const kpis: DashboardKpis = {
    totalQuotes,
    totalValueByCurrency,
    wonQuotesCount,
    wonValueByCurrency,
    lostQuotesCount,
    lostValueByCurrency,
    pendingQuotesCount,
    expiredQuotesCount,
    cancelledQuotesCount,
    draftQuotesCount,
    winRatePercent,
    avgQuoteValueByCurrency,
    avgResponseTimeHours,
    avgSalesCycleDays,
  };

  // 4. Quotation Funnel Calculation
  const commQuoteIds = new Set(communications.map(c => c.quotationId));
  const viewedQuoteIds = new Set(
    links.filter(l => l.viewCount > 0).map(l => l.quotationId)
  );

  let stageCreated = filtered.length;
  let stagePending = 0;
  let stageApproved = 0;
  let stageIssued = 0;
  let stageSent = 0;
  let stageViewed = 0;
  let stageAccepted = 0;

  filtered.forEach(d => {
    const s = d.activeQuote.status;
    const isAccepted = d.isWon;

    // Progressive stage check:
    if (s !== 'DRAFT') stagePending++;
    if (['APPROVED', 'ISSUED', 'SENT', 'ACCEPTED'].includes(s) || isAccepted) stageApproved++;
    if (['ISSUED', 'SENT', 'ACCEPTED'].includes(s) || isAccepted) stageIssued++;
    if (['SENT', 'ACCEPTED'].includes(s) || commQuoteIds.has(d.activeQuote.id) || isAccepted) stageSent++;
    if (viewedQuoteIds.has(d.activeQuote.id) || isAccepted) stageViewed++;
    if (isAccepted) stageAccepted++;
  });

  const funnelStages: QuotationFunnelStage[] = [
    {
      id: 'STAGE_CREATED',
      labelVi: '1. Khởi Tạo (Created)',
      labelEn: '1. Draft Created',
      count: stageCreated,
      conversionRateFromPrev: 100,
      conversionRateFromTotal: 100,
      dropOffCount: Math.max(0, stageCreated - stagePending),
    },
    {
      id: 'STAGE_PENDING',
      labelVi: '2. Chờ Duyệt (Pending)',
      labelEn: '2. Pending Review',
      count: stagePending,
      conversionRateFromPrev: stageCreated > 0 ? Math.round((stagePending / stageCreated) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stagePending / stageCreated) * 100) : 0,
      dropOffCount: Math.max(0, stagePending - stageApproved),
    },
    {
      id: 'STAGE_APPROVED',
      labelVi: '3. Đã Phê Duyệt (Approved)',
      labelEn: '3. Approved',
      count: stageApproved,
      conversionRateFromPrev: stagePending > 0 ? Math.round((stageApproved / stagePending) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stageApproved / stageCreated) * 100) : 0,
      dropOffCount: Math.max(0, stageApproved - stageIssued),
    },
    {
      id: 'STAGE_ISSUED',
      labelVi: '4. Phát Hành PDF (Issued)',
      labelEn: '4. Document Issued',
      count: stageIssued,
      conversionRateFromPrev: stageApproved > 0 ? Math.round((stageIssued / stageApproved) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stageIssued / stageCreated) * 100) : 0,
      dropOffCount: Math.max(0, stageIssued - stageSent),
    },
    {
      id: 'STAGE_SENT',
      labelVi: '5. Đã Gửi Email (Sent)',
      labelEn: '5. Dispatched',
      count: stageSent,
      conversionRateFromPrev: stageIssued > 0 ? Math.round((stageSent / stageIssued) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stageSent / stageCreated) * 100) : 0,
      dropOffCount: Math.max(0, stageSent - stageViewed),
    },
    {
      id: 'STAGE_VIEWED',
      labelVi: '6. Khách Đã Mở (Viewed)',
      labelEn: '6. Opened by Customer',
      count: stageViewed,
      conversionRateFromPrev: stageSent > 0 ? Math.round((stageViewed / stageSent) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stageViewed / stageCreated) * 100) : 0,
      dropOffCount: Math.max(0, stageViewed - stageAccepted),
    },
    {
      id: 'STAGE_ACCEPTED',
      labelVi: '7. Chốt Thắng (Accepted / Won)',
      labelEn: '7. Won / Contract Awarded',
      count: stageAccepted,
      conversionRateFromPrev: stageViewed > 0 ? Math.round((stageAccepted / stageViewed) * 100) : 0,
      conversionRateFromTotal: stageCreated > 0 ? Math.round((stageAccepted / stageCreated) * 100) : 0,
      dropOffCount: 0,
    },
  ];

  // 5. Win / Loss by Dimensions (Sales, Customer, Service, Lane)
  const buildDimensionAggregator = (keyExtractor: (d: DeduplicatedQuote) => { key: string; label: string }) => {
    const dimMap = new Map<string, {
      key: string;
      label: string;
      total: number;
      won: number;
      lost: number;
      pending: number;
      wonVal: CurrencyAmountMap;
      lostVal: CurrencyAmountMap;
    }>();

    filtered.forEach(d => {
      const { key, label } = keyExtractor(d);
      const currEntry = dimMap.get(key) || {
        key,
        label,
        total: 0,
        won: 0,
        lost: 0,
        pending: 0,
        wonVal: { USD: 0, VND: 0 },
        lostVal: { USD: 0, VND: 0 },
      };

      currEntry.total++;
      const { sellingByCurrency } = computeQuoteCurrencyTotals(d.activeQuote);

      if (d.isWon) {
        currEntry.won++;
        currEntry.wonVal = sumCurrencyMaps(currEntry.wonVal, sellingByCurrency);
      } else if (d.isLost) {
        currEntry.lost++;
        currEntry.lostVal = sumCurrencyMaps(currEntry.lostVal, sellingByCurrency);
      } else {
        currEntry.pending++;
      }

      dimMap.set(key, currEntry);
    });

    const items: WinLossDimensionItem[] = [];
    dimMap.forEach(v => {
      const dec = v.won + v.lost;
      const rate = dec > 0 ? Math.round((v.won / dec) * 1000) / 10 : 0;
      items.push({
        key: v.key,
        label: v.label,
        totalQuotes: v.total,
        wonQuotes: v.won,
        lostQuotes: v.lost,
        pendingQuotes: v.pending,
        winRate: rate,
        wonValueByCurrency: v.wonVal,
        lostValueByCurrency: v.lostVal,
      });
    });

    // Sort by won value USD or total quotes
    items.sort((a, b) => (b.wonValueByCurrency['USD'] || 0) - (a.wonValueByCurrency['USD'] || 0));
    return items;
  };

  const winLossBySales = buildDimensionAggregator(d => {
    const rep = d.activeQuote.company?.salesRepName || 'Chưa phân bổ';
    return { key: rep, label: rep };
  });

  const winLossByCustomer = buildDimensionAggregator(d => {
    const cust = d.activeQuote.customer?.companyName || d.activeQuote.customer?.customerName || 'Khách vãng lai';
    return { key: cust, label: cust };
  });

  const winLossByService = buildDimensionAggregator(d => {
    const mode = d.activeQuote.shipment?.mode || 'OTHER';
    return { key: mode, label: getServiceCategory(mode) };
  });

  const winLossByLane = buildDimensionAggregator(d => {
    const pol = normalizePortName(d.activeQuote.shipment?.pol || '');
    const pod = normalizePortName(d.activeQuote.shipment?.pod || '');
    const lane = `${pol} → ${pod}`;
    return { key: lane, label: lane };
  });

  // 6. Customer Analytics & Engagement Scoring
  const customerMap = new Map<string, {
    name: string;
    quotes: DeduplicatedQuote[];
  }>();

  filtered.forEach(d => {
    const name = d.activeQuote.customer?.companyName || d.activeQuote.customer?.customerName || 'Khách lẻ';
    const entry = customerMap.get(name) || { name, quotes: [] };
    entry.quotes.push(d);
    customerMap.set(name, entry);
  });

  const customerAnalytics: CustomerAnalyticsItem[] = [];
  customerMap.forEach(({ name, quotes: cQuotes }) => {
    let won = 0;
    let lost = 0;
    let pending = 0;
    let totalVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let wonVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let potentialVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let lostVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let lastDate = '';

    cQuotes.forEach(d => {
      const q = d.activeQuote;
      if (!lastDate || (q.createdDate && q.createdDate > lastDate)) {
        lastDate = q.createdDate || '';
      }
      const { sellingByCurrency } = computeQuoteCurrencyTotals(q);
      totalVal = sumCurrencyMaps(totalVal, sellingByCurrency);

      if (d.isWon) {
        won++;
        wonVal = sumCurrencyMaps(wonVal, sellingByCurrency);
      } else if (d.isLost) {
        lost++;
        lostVal = sumCurrencyMaps(lostVal, sellingByCurrency);
      } else {
        pending++;
        potentialVal = sumCurrencyMaps(potentialVal, sellingByCurrency);
      }
    });

    const dec = won + lost;
    const rate = dec > 0 ? Math.round((won / dec) * 1000) / 10 : 0;

    // Interaction response counts
    const quoteIds = new Set(cQuotes.map(q => q.activeQuote.id));
    const cComms = communications.filter(c => quoteIds.has(c.quotationId));
    const cResps = responses.filter(r => quoteIds.has(r.quotationId));
    const cLinks = links.filter(l => quoteIds.has(l.quotationId));

    const sentCount = cComms.length;
    const openedCount = cLinks.filter(l => l.viewCount > 0).length;
    const acceptedCount = cResps.filter(r => r.responseType === 'ACCEPTED').length;
    const rejectedCount = cResps.filter(r => r.responseType === 'REJECTED').length;
    const revisionCount = cResps.filter(r => r.responseType === 'REVISION_REQUESTED').length;

    // Engagement scoring formula (0 - 100)
    let engagementScore = 0;
    engagementScore += Math.round(rate * 0.4); // 40 pts max for win rate
    const respRate = sentCount > 0 ? Math.min(1, (openedCount + acceptedCount + revisionCount) / sentCount) : 0.5;
    engagementScore += Math.round(respRate * 30); // 30 pts for response
    if (cQuotes.length >= 3) engagementScore += 15; else if (cQuotes.length >= 1) engagementScore += 8;
    if (lastDate) {
      const diffDays = (Date.now() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 30) engagementScore += 15;
      else if (diffDays <= 60) engagementScore += 8;
    }
    engagementScore = Math.min(100, Math.max(0, engagementScore));

    customerAnalytics.push({
      customerId: `cust_${name.replace(/\s+/g, '_')}`,
      customerName: name,
      totalQuotes: cQuotes.length,
      wonQuotes: won,
      lostQuotes: lost,
      pendingQuotes: pending,
      winRate: rate,
      totalValueByCurrency: totalVal,
      wonValueByCurrency: wonVal,
      potentialValueByCurrency: potentialVal,
      lostValueByCurrency: lostVal,
      lastQuoteDate: lastDate,
      quotesPerMonthAvg: Math.round((cQuotes.length / 3) * 10) / 10,
      sentCount,
      openedCount,
      acceptedCount,
      rejectedCount,
      revisionCount,
      engagementScore,
    });
  });

  customerAnalytics.sort((a, b) => (b.wonValueByCurrency['USD'] || 0) - (a.wonValueByCurrency['USD'] || 0));

  // 7. Sales Performance & Leaderboard
  const salesMap = new Map<string, DeduplicatedQuote[]>();
  filtered.forEach(d => {
    const rep = d.activeQuote.company?.salesRepName || 'Chưa phân bổ';
    const list = salesMap.get(rep) || [];
    list.push(d);
    salesMap.set(rep, list);
  });

  const salesPerformance: SalesPerformanceItem[] = [];
  salesMap.forEach((sQuotes, rep) => {
    let won = 0;
    let lost = 0;
    let pending = 0;
    let totalVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let wonVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    const custSet = new Set<string>();

    sQuotes.forEach(d => {
      const q = d.activeQuote;
      if (q.customer?.companyName) custSet.add(q.customer.companyName);
      const { sellingByCurrency } = computeQuoteCurrencyTotals(q);
      totalVal = sumCurrencyMaps(totalVal, sellingByCurrency);

      if (d.isWon) {
        won++;
        wonVal = sumCurrencyMaps(wonVal, sellingByCurrency);
      } else if (d.isLost) {
        lost++;
      } else {
        pending++;
      }
    });

    const dec = won + lost;
    const rate = dec > 0 ? Math.round((won / dec) * 1000) / 10 : 0;
    const avgVal: CurrencyAmountMap = {};
    Object.keys(totalVal).forEach(c => {
      avgVal[c] = sQuotes.length > 0 ? Math.round(totalVal[c] / sQuotes.length) : 0;
    });

    salesPerformance.push({
      salesRep: rep,
      totalQuotes: sQuotes.length,
      wonQuotes: won,
      lostQuotes: lost,
      pendingQuotes: pending,
      winRate: rate,
      totalValueByCurrency: totalVal,
      wonValueByCurrency: wonVal,
      avgQuoteValueByCurrency: avgVal,
      customerCount: custSet.size,
      avgResponseTimeHours: null, // Configurable per sales if log records user
      targetQuotationCount: undefined, // Real data foundation: undefined -> "Target not configured"
      targetWonValueUsd: undefined,
    });
  });

  salesPerformance.sort((a, b) => (b.wonValueByCurrency['USD'] || 0) - (a.wonValueByCurrency['USD'] || 0));

  // 8. Profitability Analytics (Protected by Permission)
  const userPerms = ROLE_PERMISSIONS[userRole] || [];
  const canViewProfit = userPerms.includes('profitability.view');

  const profitabilityItems: ProfitabilityItem[] = [];
  filtered.forEach(d => {
    const q = d.activeQuote;
    const { sellingByCurrency, costByCurrency, profitByCurrency } = computeQuoteCurrencyTotals(q);

    // Margin computation (weighted on USD if present, otherwise main)
    let margin = q.overallMarginPercent || 0;
    if (!margin && sellingByCurrency['USD'] > 0) {
      margin = Math.round((profitByCurrency['USD'] / sellingByCurrency['USD']) * 1000) / 10;
    }

    const isLowMargin = margin > 0 && margin < 10; // Under 10% alert threshold

    if (canViewProfit) {
      profitabilityItems.push({
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || q.customer?.customerName || 'Khách vãng lai',
        salesRep: q.company?.salesRepName || 'N/A',
        createdDate: q.createdDate || '',
        status: q.status,
        mode: q.shipment?.mode || 'OTHER',
        origin: normalizePortName(q.shipment?.pol || ''),
        destination: normalizePortName(q.shipment?.pod || ''),
        sellingByCurrency,
        costByCurrency,
        grossProfitByCurrency: profitByCurrency,
        marginPercent: margin,
        isLowMargin,
      });
    }
  });

  profitabilityItems.sort((a, b) => b.marginPercent - a.marginPercent);

  // 9. Lane Analytics
  const laneMap = new Map<string, {
    pol: string;
    pod: string;
    mode: string;
    quotes: DeduplicatedQuote[];
  }>();

  filtered.forEach(d => {
    const pol = normalizePortName(d.activeQuote.shipment?.pol || '');
    const pod = normalizePortName(d.activeQuote.shipment?.pod || '');
    const mode = d.activeQuote.shipment?.mode || 'SEA_FCL';
    const key = `${pol}__${pod}__${mode}`;
    const entry = laneMap.get(key) || { pol, pod, mode, quotes: [] };
    entry.quotes.push(d);
    laneMap.set(key, entry);
  });

  const laneAnalytics: LaneAnalyticsItem[] = [];
  laneMap.forEach(({ pol, pod, mode, quotes: lQuotes }, key) => {
    let won = 0;
    let lost = 0;
    let totalVal: CurrencyAmountMap = { USD: 0, VND: 0 };
    let containers = 0;
    let weight = 0;
    let cbm = 0;

    lQuotes.forEach(d => {
      const q = d.activeQuote;
      const { sellingByCurrency } = computeQuoteCurrencyTotals(q);
      totalVal = sumCurrencyMaps(totalVal, sellingByCurrency);
      if (d.isWon) won++;
      else if (d.isLost) lost++;

      containers += q.shipment?.quantity || 1;
      weight += q.shipment?.grossWeightKg || 0;
      cbm += q.shipment?.volumeCbm || 0;
    });

    const dec = won + lost;
    const rate = dec > 0 ? Math.round((won / dec) * 1000) / 10 : 0;
    const avgVal: CurrencyAmountMap = {};
    Object.keys(totalVal).forEach(c => {
      avgVal[c] = lQuotes.length > 0 ? Math.round(totalVal[c] / lQuotes.length) : 0;
    });

    laneAnalytics.push({
      laneKey: key,
      origin: pol,
      destination: pod,
      mode,
      totalQuotes: lQuotes.length,
      wonQuotes: won,
      lostQuotes: lost,
      winRate: rate,
      avgValueByCurrency: avgVal,
      totalValueByCurrency: totalVal,
      containerCount: containers,
      grossWeightKg: weight,
      volumeCbm: cbm,
    });
  });

  laneAnalytics.sort((a, b) => b.totalQuotes - a.totalQuotes);

  // 10. Service Analytics
  const serviceMap = new Map<string, DeduplicatedQuote[]>();
  filtered.forEach(d => {
    const mode = d.activeQuote.shipment?.mode || 'OTHER';
    const list = serviceMap.get(mode) || [];
    list.push(d);
    serviceMap.set(mode, list);
  });

  const serviceAnalytics: ServiceAnalyticsItem[] = [];
  serviceMap.forEach((sQuotes, mode) => {
    let won = 0;
    let lost = 0;
    let totalVal: CurrencyAmountMap = { USD: 0, VND: 0 };

    sQuotes.forEach(d => {
      const { sellingByCurrency } = computeQuoteCurrencyTotals(d.activeQuote);
      totalVal = sumCurrencyMaps(totalVal, sellingByCurrency);
      if (d.isWon) won++;
      else if (d.isLost) lost++;
    });

    const dec = won + lost;
    const rate = dec > 0 ? Math.round((won / dec) * 1000) / 10 : 0;
    const pct = filtered.length > 0 ? Math.round((sQuotes.length / filtered.length) * 100) : 0;

    serviceAnalytics.push({
      serviceKey: mode,
      serviceLabel: getServiceCategory(mode),
      transportMode: mode,
      totalQuotes: sQuotes.length,
      wonQuotes: won,
      lostQuotes: lost,
      winRate: rate,
      totalValueByCurrency: totalVal,
      percentOfTotalQuotes: pct,
    });
  });

  serviceAnalytics.sort((a, b) => b.totalQuotes - a.totalQuotes);

  // 11. Aging Buckets (Only Open/Pending Quotes)
  const openQuotes = filtered.filter(d => d.isPending || d.isDraft);
  const buckets: {
    id: string;
    vi: string;
    en: string;
    min: number;
    max: number;
    quotes: DeduplicatedQuote[];
  }[] = [
    { id: '0_3', vi: '0 - 3 Ngày', en: '0 - 3 Days', min: 0, max: 3, quotes: [] },
    { id: '4_7', vi: '4 - 7 Ngày', en: '4 - 7 Days', min: 4, max: 7, quotes: [] },
    { id: '8_14', vi: '8 - 14 Ngày', en: '8 - 14 Days', min: 8, max: 14, quotes: [] },
    { id: '15_30', vi: '15 - 30 Ngày', en: '15 - 30 Days', min: 15, max: 30, quotes: [] },
    { id: '31_60', vi: '31 - 60 Ngày', en: '31 - 60 Days', min: 31, max: 60, quotes: [] },
    { id: '60_plus', vi: 'Trên 60 Ngày', en: '60+ Days', min: 61, max: 99999, quotes: [] },
  ];

  const nowTime = Date.now();
  openQuotes.forEach(d => {
    const q = d.activeQuote;
    const createTime = q.createdDate ? new Date(q.createdDate).getTime() : nowTime;
    const daysOpen = Math.max(0, Math.floor((nowTime - createTime) / (1000 * 3600 * 24)));

    const b = buckets.find(b => daysOpen >= b.min && daysOpen <= b.max) || buckets[buckets.length - 1];
    b.quotes.push(d);
  });

  const agingBuckets: AgingBucketItem[] = buckets.map(b => ({
    bucketId: b.id,
    labelVi: b.vi,
    labelEn: b.en,
    minDays: b.min,
    maxDays: b.max,
    count: b.quotes.length,
    percentOfTotal: openQuotes.length > 0 ? Math.round((b.quotes.length / openQuotes.length) * 100) : 0,
    quotes: b.quotes.map(d => ({
      id: d.activeQuote.id,
      quoteNumber: d.activeQuote.quoteNumber,
      customerName: d.activeQuote.customer?.companyName || d.activeQuote.customer?.customerName || 'Khách vãng lai',
      createdDate: d.activeQuote.createdDate || '',
      daysOpen: Math.max(0, Math.floor((nowTime - new Date(d.activeQuote.createdDate || nowTime).getTime()) / (1000 * 3600 * 24))),
      status: d.activeQuote.status,
      grandTotalUsd: d.activeQuote.grandTotalUsd || 0,
      grandTotalVnd: d.activeQuote.grandTotalVnd || 0,
      salesRep: d.activeQuote.company?.salesRepName || 'N/A',
    })),
  }));

  // 12. Expiring Quotations Alert Analysis
  const expiringQuotes: ExpiringQuoteItem[] = [];
  filtered.forEach(d => {
    const q = d.activeQuote;
    if (d.isWon || d.isLost || d.isCancelled) return;

    if (q.terms?.validityDate) {
      const vDate = new Date(q.terms.validityDate);
      const diffMs = vDate.getTime() - nowTime;
      const days = Math.ceil(diffMs / (1000 * 3600 * 24));

      // Show quotes that are expired or expiring within 7 days
      if (days <= 7) {
        expiringQuotes.push({
          id: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customer?.companyName || q.customer?.customerName || 'Khách vãng lai',
          validityDate: q.terms.validityDate,
          daysRemaining: days,
          isExpired: days < 0,
          status: q.status,
          grandTotalUsd: q.grandTotalUsd || 0,
          grandTotalVnd: q.grandTotalVnd || 0,
          salesRep: q.company?.salesRepName || 'N/A',
        });
      }
    }
  });

  expiringQuotes.sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 13. Follow-Up Analytics
  let totalFollowUps = followUps.length;
  let openFollowUps = 0;
  let inProgressFollowUps = 0;
  let completedFollowUps = 0;
  let overdueFollowUps = 0;
  let dueTodayFollowUps = 0;
  let upcomingFollowUps = 0;

  const todayStr = new Date().toISOString().slice(0, 10);
  followUps.forEach(f => {
    if (f.status === 'COMPLETED') {
      completedFollowUps++;
    } else if (f.status === 'CANCELLED') {
      // ignore
    } else {
      if (f.status === 'IN_PROGRESS') inProgressFollowUps++;
      else openFollowUps++;

      if (f.followUpDate < todayStr) overdueFollowUps++;
      else if (f.followUpDate === todayStr) dueTodayFollowUps++;
      else upcomingFollowUps++;
    }
  });

  const completionRatePercent = totalFollowUps > 0 ? Math.round((completedFollowUps / totalFollowUps) * 100) : 0;

  const followUpAnalytics: FollowUpAnalyticsSummary = {
    totalFollowUps,
    openCount: openFollowUps,
    inProgressCount: inProgressFollowUps,
    completedCount: completedFollowUps,
    overdueCount: overdueFollowUps,
    dueTodayCount: dueTodayFollowUps,
    upcomingCount: upcomingFollowUps,
    completionRatePercent,
    avgCompletionTimeDays: null,
  };

  // 14. Data Quality Audit Engine
  const dataQualityIssues: DataQualityIssue[] = [];
  let cleanQuotesCount = 0;

  filtered.forEach(d => {
    const q = d.activeQuote;
    const issuesForQuote: DataQualityIssue[] = [];

    // Missing Customer
    if (!q.customer?.companyName && !q.customer?.customerName) {
      issuesForQuote.push({
        id: `dq_${q.id}_cust`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: 'Trống',
        type: 'MISSING_CUSTOMER',
        severity: 'HIGH',
        descriptionVi: 'Chưa có thông tin tên công ty hoặc người liên hệ khách hàng.',
        descriptionEn: 'Missing customer company name or contact person.',
        field: 'customer.companyName',
      });
    }

    // Missing Sales Rep
    if (!q.company?.salesRepName) {
      issuesForQuote.push({
        id: `dq_${q.id}_sales`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || 'N/A',
        type: 'MISSING_SALES_REP',
        severity: 'MEDIUM',
        descriptionVi: 'Chưa phân bổ nhân viên kinh doanh phụ trách (Sales Rep).',
        descriptionEn: 'Missing assigned Sales Representative.',
        field: 'company.salesRepName',
      });
    }

    // Missing POL or POD
    if (!q.shipment?.pol || !q.shipment?.pod) {
      issuesForQuote.push({
        id: `dq_${q.id}_port`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || 'N/A',
        type: 'MISSING_PORT',
        severity: 'CRITICAL',
        descriptionVi: 'Thiếu thông tin Cảng đi (POL) hoặc Cảng đến (POD).',
        descriptionEn: 'Missing Port of Loading (POL) or Port of Discharge (POD).',
        field: 'shipment.pol/pod',
      });
    }

    // Missing Cost Price in Line Items
    const itemsWithoutCost = q.items?.filter(i => (i.costPrice === undefined || i.costPrice === 0) && (i.unitPrice || 0) > 0) || [];
    if (itemsWithoutCost.length > 0) {
      issuesForQuote.push({
        id: `dq_${q.id}_cost`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || 'N/A',
        type: 'MISSING_COST',
        severity: 'HIGH',
        descriptionVi: `Có ${itemsWithoutCost.length} dòng cước chưa nhập giá mua (Cost Price = 0), ảnh hưởng tính biên lợi nhuận.`,
        descriptionEn: `${itemsWithoutCost.length} line items have zero buy cost price.`,
        field: 'items.costPrice',
      });
    }

    // Missing Currency
    if (!q.quoteCurrency) {
      issuesForQuote.push({
        id: `dq_${q.id}_curr`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || 'N/A',
        type: 'MISSING_CURRENCY',
        severity: 'LOW',
        descriptionVi: 'Chưa thiết lập đơn vị tiền tệ định danh cho báo giá.',
        descriptionEn: 'Quote currency definition is missing.',
        field: 'quoteCurrency',
      });
    }

    // Missing Validity Date
    if (!q.terms?.validityDate) {
      issuesForQuote.push({
        id: `dq_${q.id}_val`,
        quoteId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customer?.companyName || 'N/A',
        type: 'INVALID_DATE',
        severity: 'MEDIUM',
        descriptionVi: 'Chưa cài đặt thời hạn hiệu lực của báo giá (Validity Date).',
        descriptionEn: 'Missing quotation validity date.',
        field: 'terms.validityDate',
      });
    }

    if (issuesForQuote.length === 0) {
      cleanQuotesCount++;
    } else {
      dataQualityIssues.push(...issuesForQuote);
    }
  });

  const quotesWithIssuesCount = filtered.length - cleanQuotesCount;
  const healthScorePercent = filtered.length > 0
    ? Math.round((cleanQuotesCount / filtered.length) * 100)
    : 100;

  const dataQualityReport: DataQualityReport = {
    totalQuotesChecked: filtered.length,
    cleanQuotesCount,
    quotesWithIssuesCount,
    healthScorePercent,
    issues: dataQualityIssues,
  };

  return {
    filteredDeduplicatedQuotes: filtered,
    kpis,
    funnelStages,
    winLossByDimension: {
      bySales: winLossBySales,
      byCustomer: winLossByCustomer,
      byService: winLossByService,
      byLane: winLossByLane,
    },
    customerAnalytics,
    salesPerformance,
    profitabilityItems,
    laneAnalytics,
    serviceAnalytics,
    agingBuckets,
    expiringQuotes,
    followUpAnalytics,
    dataQualityReport,
  };
}

// ==========================================
// 6. EXPORT ENGINE (CSV & AUDIT LOGGING)
// ==========================================

export function generateCsvExport(data: any[], headers: { key: string; label: string }[]): string {
  // UTF-8 BOM for Excel Vietnamese compatibility
  const BOM = '\uFEFF';
  const headerRow = headers.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',');
  
  const rows = data.map(item => {
    return headers.map(h => {
      const val = item[h.key] !== undefined && item[h.key] !== null ? String(item[h.key]) : '';
      return `"${val.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return BOM + [headerRow, ...rows].join('\r\n');
}

export function downloadCsvFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
