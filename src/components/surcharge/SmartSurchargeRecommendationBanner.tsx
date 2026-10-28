import React, { useState, useMemo } from 'react';
import { QuoteData, LineItem, SurchargeItem } from '../../types/logistics';
import { SmartSurchargeEngine } from '../../services/surcharge/smartSurchargeEngine';
import { SmartSurchargeSuggestion } from '../../types/smartSurcharge';
import { formatUSD, formatVND } from '../../utils/formatters';
import { 
  Sparkles, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Fuel, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  X,
  Anchor,
  Plane,
  Truck,
  Box,
  Zap,
  Info
} from 'lucide-react';

interface SmartSurchargeRecommendationBannerProps {
  quote: QuoteData;
  onApplySuggestion: (suggestion: SmartSurchargeSuggestion) => void;
  onApplyAllSuggestions: (suggestions: SmartSurchargeSuggestion[]) => void;
  customSurcharges?: SurchargeItem[];
}

export const SmartSurchargeRecommendationBanner: React.FC<SmartSurchargeRecommendationBannerProps> = ({
  quote,
  onApplySuggestion,
  onApplyAllSuggestions,
  customSurcharges = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Run the smart surcharge engine
  const analysis = useMemo(() => {
    return SmartSurchargeEngine.analyzeQuote(quote, customSurcharges);
  }, [quote.shipment.pol, quote.shipment.pod, quote.shipment.mode, quote.shipment.quantity, quote.shipment.grossWeightKg, quote.shipment.volumeCbm, quote.shipment.chargeableWeight, quote.items, quote.exchangeRate, customSurcharges]);

  // Filter out dismissed or already added items
  const activeSuggestions = useMemo(() => {
    return analysis.suggestions.filter(s => !s.isAlreadyAdded && !dismissedIds.has(s.id));
  }, [analysis.suggestions, dismissedIds]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  if (activeSuggestions.length === 0) {
    // If all are applied or none needed, show a quiet completion banner or nothing
    return null;
  }

  const modeIcon = () => {
    switch (quote.shipment.mode) {
      case 'AIR_FREIGHT': return <Plane className="w-3.5 h-3.5 text-sky-600" />;
      case 'INLAND_TRUCKING': return <Truck className="w-3.5 h-3.5 text-amber-600" />;
      case 'SEA_LCL': return <Box className="w-3.5 h-3.5 text-teal-600" />;
      default: return <Anchor className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const getCategoryIcon = (categoryTag: SmartSurchargeSuggestion['categoryTag']) => {
    switch (categoryTag) {
      case 'FUEL': return <Fuel className="w-3.5 h-3.5 text-amber-500" />;
      case 'PEAK_SEASON': return <Calendar className="w-3.5 h-3.5 text-rose-500" />;
      case 'SECURITY': return <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />;
      case 'WAR_RISK': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return <Zap className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const mandatoryCount = activeSuggestions.filter(s => s.confidence === 'MANDATORY').length;
  const isVnd = quote.quoteCurrency === 'VND';

  return (
    <div className="w-full bg-gradient-to-r from-indigo-50/90 via-sky-50/70 to-slate-50 border border-indigo-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all mb-4">
      
      {/* Top Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 tracking-tight uppercase tracking-wider flex items-center gap-1.5">
                Smart Surcharge Engine
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md font-semibold">
                {modeIcon()}
                <span>{quote.shipment.mode}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-xs">
                {quote.shipment.pol.split(',')[0]} → {quote.shipment.pod.split(',')[0]}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-600 mt-0.5">
              Phát hiện <strong className="font-bold text-indigo-900 font-mono">{activeSuggestions.length} phụ phí</strong> phù hợp với tuyến đường & mùa vận tải
              {mandatoryCount > 0 && (
                <span className="text-rose-600 font-semibold ml-1">
                  ({mandatoryCount} khoản bắt buộc theo luật hàng hải/hàng không)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={() => onApplyAllSuggestions(activeSuggestions)}
            className="press-physics inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Tự động thêm toàn bộ các phụ phí được khuyến nghị vào bảng chi phí"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Áp Dụng Tất Cả ({activeSuggestions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="press-physics-subtle p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            title={isExpanded ? "Thu gọn danh sách gợi ý" : "Mở rộng danh sách phụ phí"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Seasonality Context Badge */}
      {analysis.routeAnalysis.isPeakSeasonActive && (
        <div className="mt-3 px-3 py-1.5 rounded-xl bg-amber-100/70 border border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="font-medium text-[11px]">
              <strong>Mùa cao điểm đang diễn ra:</strong> {analysis.routeAnalysis.peakSeasonName}. Các hãng tàu & hãng bay áp dụng phụ phí PSS và BAF nhằm đảm bảo phân bổ tải trọng.
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-800 shrink-0 hidden md:inline">
            Tuyến: {analysis.routeAnalysis.tradeLane}
          </span>
        </div>
      )}

      {/* Expandable Suggestions Grid */}
      {isExpanded && (
        <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-150">
          {activeSuggestions.map((suggestion) => {
            const isMandatory = suggestion.confidence === 'MANDATORY';
            return (
              <div
                key={suggestion.id}
                className={`p-3.5 rounded-xl bg-white border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isMandatory 
                    ? 'border-indigo-300 ring-1 ring-indigo-200/50' 
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header: Code & Confidence */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getCategoryIcon(suggestion.categoryTag)}
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                        {suggestion.code}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {suggestion.location}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                        isMandatory 
                          ? 'text-rose-600' 
                          : suggestion.confidence === 'HIGH' 
                          ? 'text-amber-600' 
                          : 'text-indigo-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isMandatory ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                        }`} />
                        {isMandatory ? 'Bắt buộc' : 'Khuyến nghị'}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDismiss(suggestion.id, e)}
                        className="text-slate-300 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                        title="Bỏ qua gợi ý này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Rationale */}
                  <div className="mt-2">
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1" title={suggestion.nameVi}>
                      {suggestion.nameVi}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {suggestion.reasonVi}
                    </p>
                  </div>
                </div>

                {/* Footer: Price & Add Button */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {suggestion.currency === 'USD' ? formatUSD(suggestion.suggestedUnitPrice) : formatVND(suggestion.suggestedUnitPrice)}
                      <span className="text-[10px] text-slate-400 font-normal"> / {suggestion.unit}</span>
                    </div>
                    <div className="text-[10px] text-emerald-600 font-mono font-medium">
                      Ước tính: +{isVnd ? formatVND(suggestion.estimatedTotalVnd) : formatUSD(suggestion.estimatedTotalUsd)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onApplySuggestion(suggestion)}
                    className="press-physics-subtle inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title={`Thêm ${suggestion.code} vào báo giá`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
