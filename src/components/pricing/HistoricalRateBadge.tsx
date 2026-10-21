import React, { useMemo } from 'react';
import { Sparkles, TrendingUp, TrendingDown, Minus, History, Zap, BarChart2 } from 'lucide-react';
import { QuoteData } from '../../types/logistics';
import { analyzeHistoricalRatesForPortPair } from '../../services/pricing/historicalRateService';
import { formatUSD } from '../../utils/formatters';

interface HistoricalRateBadgeProps {
  pol?: string;
  pod?: string;
  savedQuotes: QuoteData[];
  currentQuoteId?: string;
  onOpenAdvisor: () => void;
  className?: string;
}

export const HistoricalRateBadge: React.FC<HistoricalRateBadgeProps> = ({
  pol,
  pod,
  savedQuotes,
  currentQuoteId,
  onOpenAdvisor,
  className = '',
}) => {
  const analysis = useMemo(() => {
    if (!pol || !pod) return null;
    return analyzeHistoricalRatesForPortPair(pol, pod, savedQuotes, currentQuoteId);
  }, [pol, pod, savedQuotes, currentQuoteId]);

  if (!analysis || !analysis.hasMatches) {
    return null;
  }

  const { totalQuotesCount, avgRate, minRate, wonRate, trend } = analysis;

  return (
    <div 
      className={`inline-flex items-center flex-wrap gap-2 px-3 py-1.5 bg-linear-to-r from-blue-50/90 via-indigo-50/80 to-emerald-50/90 border border-indigo-200/90 rounded-xl shadow-2xs text-xs ${className}`}
    >
      <div className="flex items-center gap-1.5 text-indigo-900 font-bold shrink-0">
        <History className="w-3.5 h-3.5 text-indigo-600" />
        <span>Lịch sử 3 tháng ({totalQuotesCount} báo giá):</span>
      </div>

      <div className="flex items-center gap-2 text-slate-700 shrink-0">
        <span>
          Cước TB: <strong className="text-slate-900 font-mono">{formatUSD(avgRate)}</strong>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          Thấp nhất: <strong className="text-emerald-700 font-mono">{formatUSD(minRate)}</strong>
        </span>
        {wonRate && (
          <>
            <span className="text-slate-300">|</span>
            <span className="text-blue-800">
              Đã chốt: <strong className="font-mono">{formatUSD(wonRate)}</strong>
            </span>
          </>
        )}
      </div>

      {trend !== 'STABLE' && (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
          trend === 'UPWARD' 
            ? 'bg-rose-100 text-rose-700' 
            : 'bg-emerald-100 text-emerald-700'
        }`}>
          {trend === 'UPWARD' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{trend === 'UPWARD' ? 'Cước tăng' : 'Cước giảm'}</span>
        </span>
      )}

      <button
        type="button"
        onClick={onOpenAdvisor}
        className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
        title="Xem phân tích chi tiết và chọn mức giá cước cạnh tranh nhất để áp dụng"
      >
        <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
        <span>Gợi Ý Giá Cạnh Tranh</span>
      </button>
    </div>
  );
};
