import { QuoteData, LineItem, Currency } from '../../types/logistics';
import { 
  HistoricalRateAnalysisResult, 
  HistoricalRateMatch, 
  CompetitiveRateTier 
} from '../../types/historicalRate';
import { calculateQuote } from '../pricing';
import { calculateLineItem } from '../../utils/formatters';

/**
 * Remove Vietnamese accents and normalize port string for fuzzy matching
 */
function normalizePortName(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/cang\s+|port\s+|vietnam|vn|usa|us|de|nl|jp|kr|cn|sg|\(.*?\)/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Check if two port descriptions refer to the same port / terminal
 */
function isPortMatch(portA?: string, portB?: string): boolean {
  if (!portA || !portB) return false;
  const normA = normalizePortName(portA);
  const normB = normalizePortName(portB);

  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;

  // Key logistics hub token sets
  const hubKeywords = [
    ['cat lai', 'vnsgn', 'ho chi minh', 'hcm', 'sai gon'],
    ['hai phong', 'vnhph', 'dinh vu', 'lach huyen', 'tan vu'],
    ['cai mep', 'vncmp', 'vung tau', 'thi vai'],
    ['da nang', 'vndan'],
    ['los angeles', 'long beach', 'uslax', 'lax', 'lgb'],
    ['new york', 'new jersey', 'usnyc', 'nyc'],
    ['hamburg', 'deham'],
    ['rotterdam', 'nlrtm'],
    ['shanghai', 'cnsha'],
    ['ningbo', 'cnngb'],
    ['shenzhen', 'cnszx', 'yantian', 'shekou'],
    ['singapore', 'sgsin'],
    ['tokyo', 'jptyo', 'yokohama'],
    ['busan', 'krpus'],
    ['bangkok', 'thbkk', 'laem chabang'],
    ['tan son nhat', 'sgn'],
    ['noi bai', 'han']
  ];

  for (const group of hubKeywords) {
    const matchA = group.some(k => normA.includes(k));
    const matchB = group.some(k => normB.includes(k));
    if (matchA && matchB) return true;
  }

  return false;
}

/**
 * Find the primary freight line item from a quotation
 */
export function getPrimaryFreightItem(quote: QuoteData): LineItem | undefined {
  if (!quote.items || quote.items.length === 0) return undefined;
  
  // 1. Explicit Freight Category / Location
  const freightCat = quote.items.find(
    i => i.category === 'FREIGHT' || i.location === 'FREIGHT'
  );
  if (freightCat) return freightCat;

  // 2. By Code or Description keyword
  const byCode = quote.items.find(i => {
    const code = (i.code || '').toUpperCase();
    const desc = (i.description || '').toUpperCase();
    return (
      code.includes('OCEAN') || 
      code.includes('FREIGHT') || 
      code.includes('AIR') || 
      code === 'O/F' ||
      desc.includes('CƯỚC') ||
      desc.includes('OCEAN FREIGHT') ||
      desc.includes('AIR FREIGHT')
    );
  });

  return byCode || quote.items[0];
}

/**
 * Analyze Historical Quotes for POL-POD in the last 3 months (90 days)
 */
export function analyzeHistoricalRatesForPortPair(
  pol: string,
  pod: string,
  savedQuotes: QuoteData[],
  currentQuoteId?: string,
  targetContainerType?: string,
  targetCurrency: Currency = 'USD'
): HistoricalRateAnalysisResult {
  const defaultEmptyResult: HistoricalRateAnalysisResult = {
    hasMatches: false,
    polQuery: pol,
    podQuery: pod,
    timeframeDays: 90,
    totalQuotesCount: 0,
    acceptedCount: 0,
    currency: targetCurrency,
    minRate: 0,
    maxRate: 0,
    avgRate: 0,
    latestRate: 0,
    wonRate: null,
    avgMarginPercent: 0,
    trend: 'STABLE',
    trendPercent: 0,
    tiers: [],
    matches: []
  };

  if (!pol || !pod || !savedQuotes || savedQuotes.length === 0) {
    return defaultEmptyResult;
  }

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

  // Filter quotes by port pair, within 90 days, excluding current quote
  const matchedQuotes = savedQuotes.filter(q => {
    if (currentQuoteId && q.id === currentQuoteId) return false;
    
    // Check Date within 90 days (fallback to current date if missing)
    const quoteDate = q.createdDate ? new Date(q.createdDate).getTime() : now;
    if (quoteDate < ninetyDaysAgo) return false;

    // Check Port of Loading and Discharge
    const polMatch = isPortMatch(q.shipment?.pol, pol);
    const podMatch = isPortMatch(q.shipment?.pod, pod);
    return polMatch && podMatch;
  });

  if (matchedQuotes.length === 0) {
    return defaultEmptyResult;
  }

  // Extract freight item for each matched quote
  const matches: HistoricalRateMatch[] = [];
  for (const q of matchedQuotes) {
    const freight = getPrimaryFreightItem(q);
    if (!freight || freight.unitPrice <= 0) continue;

    const qDate = q.createdDate ? new Date(q.createdDate) : new Date();
    const daysAgo = Math.max(0, Math.floor((now - qDate.getTime()) / (24 * 60 * 60 * 1000)));

    matches.push({
      quoteId: q.id,
      quoteNumber: q.quoteNumber,
      createdDate: q.createdDate || new Date().toISOString().slice(0, 10),
      daysAgo,
      customerName: q.customer?.companyName || q.customer?.customerName || 'Khách hàng',
      status: q.status || 'DRAFT',
      mode: q.shipment?.mode || 'SEA_FCL',
      pol: q.shipment?.pol || pol,
      pod: q.shipment?.pod || pod,
      containerType: q.shipment?.containerType || (targetContainerType as any) || "40'HC",
      quantity: q.shipment?.quantity || 1,
      freightItem: {
        code: freight.code || 'OCEAN_FREIGHT',
        description: freight.description || 'Cước vận tải chính',
        unitPrice: freight.unitPrice,
        costPrice: freight.costPrice,
        currency: freight.currency || 'USD',
        unit: freight.unit || 'Container',
        profitUsd: freight.profitUsd,
        marginPercent: freight.marginPercent,
      }
    });
  }

  if (matches.length === 0) {
    return defaultEmptyResult;
  }

  // Sort matches by newest first
  matches.sort((a, b) => a.daysAgo - b.daysAgo);

  // Collect unit prices normalized to target currency if needed
  const prices = matches.map(m => m.freightItem.unitPrice);
  const minRate = Math.min(...prices);
  const maxRate = Math.max(...prices);
  const sum = prices.reduce((acc, p) => acc + p, 0);
  const avgRate = Math.round((sum / prices.length) * 100) / 100;
  const latestRate = matches[0].freightItem.unitPrice;

  // Find recently accepted (Won) rate
  const acceptedMatches = matches.filter(m => m.status === 'ACCEPTED' || m.status === 'APPROVED');
  const wonRate = acceptedMatches.length > 0 ? acceptedMatches[0].freightItem.unitPrice : null;

  // Average cost and margin
  const costs = matches.map(m => m.freightItem.costPrice || m.freightItem.unitPrice * 0.85);
  const avgCostPrice = Math.round((costs.reduce((a, b) => a + b, 0) / costs.length) * 100) / 100;
  const margins = matches
    .map(m => m.freightItem.marginPercent)
    .filter((m): m is number => typeof m === 'number');
  const avgMarginPercent = margins.length > 0 
    ? Math.round((margins.reduce((a, b) => a + b, 0) / margins.length) * 10) / 10
    : Math.round(((avgRate - avgCostPrice) / (avgRate || 1)) * 1000) / 10;

  // Calculate Price Trend (Recent half vs Older half)
  let trend: 'UPWARD' | 'DOWNWARD' | 'STABLE' = 'STABLE';
  let trendPercent = 0;
  if (matches.length >= 2) {
    const half = Math.ceil(matches.length / 2);
    const recentHalf = matches.slice(0, half).map(m => m.freightItem.unitPrice);
    const olderHalf = matches.slice(half).map(m => m.freightItem.unitPrice);
    const avgRecent = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const avgOlder = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
    
    if (avgOlder > 0) {
      trendPercent = Math.round(((avgRecent - avgOlder) / avgOlder) * 1000) / 10;
      if (trendPercent > 2) trend = 'UPWARD';
      else if (trendPercent < -2) trend = 'DOWNWARD';
      else trend = 'STABLE';
    }
  }

  // Generate 3 Strategic Competitive Tiers
  // 1. Aggressive / Win Rate Boost (Thấp hơn trung bình ~4.5% nhưng vẫn lãi đảm bảo > avgCostPrice)
  const aggressiveCandidate = Math.round(avgRate * 0.955);
  const safeAggressiveRate = Math.max(aggressiveCandidate, Math.round(avgCostPrice * 1.06));
  const aggressiveMargin = avgCostPrice > 0 
    ? Math.round(((safeAggressiveRate - avgCostPrice) / safeAggressiveRate) * 1000) / 10 
    : 10.5;

  // 2. Market Balanced (Bằng mức giá đã chốt thành công gần nhất hoặc bằng giá trung bình)
  const balancedRate = wonRate !== null ? wonRate : avgRate;
  const balancedMargin = avgCostPrice > 0 
    ? Math.round(((balancedRate - avgCostPrice) / balancedRate) * 1000) / 10 
    : 14.5;

  // 3. Premium Margin (Cao hơn trung bình ~5.5% cho dịch vụ nhanh/chất lượng cao)
  const premiumRate = Math.round(avgRate * 1.055);
  const premiumMargin = avgCostPrice > 0 
    ? Math.round(((premiumRate - avgCostPrice) / premiumRate) * 1000) / 10 
    : 19.5;

  const tiers: CompetitiveRateTier[] = [
    {
      id: 'AGGRESSIVE_WIN',
      title: 'Chiến Lược Thắng Thầu (Cạnh Tranh Cao)',
      subtitle: 'Thấp hơn giá trung bình lịch sử 4.5% để tối đa tỷ lệ chốt đơn',
      rate: safeAggressiveRate,
      currency: targetCurrency,
      estimatedMarginPercent: aggressiveMargin,
      badge: '🎯 Tối Đa Tỷ Lệ Thắng (Win Rate)',
      badgeColor: 'emerald',
      recommendationReason: 'Khuyên dùng khi khách hàng đang so sánh giá với nhiều đối thủ hoặc lô hàng cần chốt gấp.',
      savingsVsAvgPercent: Math.round(((safeAggressiveRate - avgRate) / avgRate) * 1000) / 10,
    },
    {
      id: 'MARKET_BALANCED',
      title: 'Mức Cân Bằng Thị Trường (Khuyên Dùng)',
      subtitle: wonRate ? `Bằng giá đơn chốt thành công gần nhất ($${wonRate})` : 'Bằng mức giá trung bình của các báo giá trước',
      rate: balancedRate,
      currency: targetCurrency,
      estimatedMarginPercent: balancedMargin,
      badge: '⚖️ Cân Bằng Chuẩn Thị Trường',
      badgeColor: 'blue',
      recommendationReason: 'Tỷ lệ chốt thành công cao, an toàn về lợi nhuận và phù hợp cho khách hàng quen.',
      savingsVsAvgPercent: Math.round(((balancedRate - avgRate) / avgRate) * 1000) / 10,
    },
    {
      id: 'PREMIUM_MARGIN',
      title: 'Tối Ưu Hóa Biên Lợi Nhuận (Premium)',
      subtitle: 'Cao hơn trung bình +5.5% cho dịch vụ chất lượng cao / tàu direct',
      rate: premiumRate,
      currency: targetCurrency,
      estimatedMarginPercent: premiumMargin,
      badge: '💎 Tối Đa Hóa Lãi (Max Profit)',
      badgeColor: 'purple',
      recommendationReason: 'Thích hợp khi có cam kết chỗ (space guarantee), lịch tàu direct nhanh hoặc dịch vụ VIP.',
      savingsVsAvgPercent: Math.round(((premiumRate - avgRate) / avgRate) * 1000) / 10,
    }
  ];

  return {
    hasMatches: true,
    polQuery: pol,
    podQuery: pod,
    timeframeDays: 90,
    totalQuotesCount: matches.length,
    acceptedCount: acceptedMatches.length,
    currency: targetCurrency,
    minRate,
    maxRate,
    avgRate,
    latestRate,
    wonRate,
    avgCostPrice,
    avgMarginPercent,
    trend,
    trendPercent,
    tiers,
    matches,
  };
}

/**
 * 1-Click Apply Suggested Rate to Quote's Primary Freight Line Item
 */
export function applyHistoricalSuggestedRateToQuote(
  quote: QuoteData,
  suggestedRate: number,
  currency: Currency = 'USD',
  strategyTitle?: string
): QuoteData {
  const newItems = [...(quote.items || [])];
  const freightIndex = newItems.findIndex(
    i => i.category === 'FREIGHT' || i.location === 'FREIGHT' || (i.code || '').toUpperCase().includes('FREIGHT') || (i.code || '').toUpperCase().includes('OCEAN')
  );

  const exchangeRate = quote.exchangeRate || 25400;

  if (freightIndex >= 0) {
    const existing = newItems[freightIndex];
    const updatedItem: LineItem = {
      ...existing,
      unitPrice: suggestedRate,
      currency,
      note: strategyTitle 
        ? `${existing.note ? existing.note + ' • ' : ''}Gợi ý lịch sử POL-POD: ${strategyTitle}`
        : existing.note,
    };
    newItems[freightIndex] = calculateLineItem(updatedItem, exchangeRate);
  } else {
    // If quote doesn't have a freight line item yet, add one!
    const isAir = quote.shipment?.mode === 'AIR_FREIGHT';
    const isLcl = quote.shipment?.mode === 'SEA_LCL';
    const unit = isAir ? 'Kg CW' : isLcl ? 'CBM' : `Container ${quote.shipment?.containerType || "40'HC"}`;
    const costPrice = Math.round(suggestedRate * 0.85);

    const newItem: LineItem = {
      id: `item-${Date.now()}-freight`,
      category: 'FREIGHT',
      location: 'FREIGHT',
      code: isAir ? 'AIR_FREIGHT' : 'OCEAN_FREIGHT',
      description: isAir ? 'Cước vận chuyển hàng không (Air Freight)' : 'Cước vận tải biển quốc tế (Ocean Freight)',
      basis: isAir ? 'PER_CHARGEABLE_KG' : isLcl ? 'PER_CBM' : 'PER_CONTAINER',
      quantity: quote.shipment?.quantity || 1,
      unit,
      unitPrice: suggestedRate,
      costPrice,
      currency,
      vatRate: 0,
      amountUsd: 0,
      amountVnd: 0,
      note: strategyTitle ? `Áp dụng từ gợi ý lịch sử POL-POD: ${strategyTitle}` : 'Cước chính tuyến',
    };
    newItems.unshift(calculateLineItem(newItem, exchangeRate));
  }

  const updatedQuote: QuoteData = {
    ...quote,
    items: newItems,
    updatedDate: new Date().toISOString().slice(0, 10),
  };

  const { calculatedQuote } = calculateQuote(updatedQuote);
  return calculatedQuote;
}
