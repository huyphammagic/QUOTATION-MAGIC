import React, { useState, useMemo, useEffect } from 'react';
import { QuoteData, LineItem, SurchargeItem } from '../../types/logistics';
import { SmartSurchargeEngine } from '../../services/surcharge/smartSurchargeEngine';
import { SmartSurchargeSuggestion } from '../../types/smartSurcharge';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';
import { 
  Sparkles, 
  Plus, 
  Check, 
  X, 
  Fuel, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  Anchor, 
  Plane, 
  Truck, 
  Box, 
  Zap, 
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  BookOpen
} from 'lucide-react';

interface SmartSurchargeAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  onApplySuggestions: (suggestions: SmartSurchargeSuggestion[]) => void;
  customSurcharges?: SurchargeItem[];
}

export const SmartSurchargeAssistantModal: React.FC<SmartSurchargeAssistantModalProps> = ({
  isOpen,
  onClose,
  quote,
  onApplySuggestions,
  customSurcharges = [],
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const analysis = useMemo(() => {
    return SmartSurchargeEngine.analyzeQuote(quote, customSurcharges);
  }, [quote, customSurcharges]);

  // Default select all unapplied suggestions when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialIds = new Set(
        analysis.suggestions.filter(s => !s.isAlreadyAdded).map(s => s.id)
      );
      setSelectedIds(initialIds);
    }
  }, [isOpen, analysis]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApplySelected = () => {
    const toApply = analysis.suggestions.filter(s => selectedIds.has(s.id));
    if (toApply.length > 0) {
      onApplySuggestions(toApply);
    }
    onClose();
  };

  const filteredSuggestions = analysis.suggestions.filter(s => {
    if (filterCategory === 'ALL') return true;
    return s.categoryTag === filterCategory;
  });

  const isVnd = quote.quoteCurrency === 'VND';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200/90 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Động Cơ Smart Surcharge - Phân Tích & Gợi Ý Phụ Phí Tuyến Đường
                </h3>
                <span className="text-slate-300">·</span>
                <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                  {quote.shipment.mode}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hải trình: <strong className="text-slate-700">{quote.shipment.pol}</strong> → <strong className="text-slate-700">{quote.shipment.pod}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="press-physics-subtle p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Route & Seasonality Insights Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-50/60 to-sky-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-600">
            <div>
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Trade Lane:</span>
              <strong className="text-slate-900 font-semibold">{analysis.routeAnalysis.tradeLane}</strong>
            </div>
            <span className="text-slate-300">·</span>
            <div>
              <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Quy cách tải:</span>
              <span className="font-mono text-slate-900 font-semibold">
                {quote.shipment.quantity} {quote.shipment.mode === 'SEA_FCL' ? 'cont' : 'kiện'} ({quote.shipment.containerType})
              </span>
            </div>
            {analysis.routeAnalysis.isPeakSeasonActive && (
              <>
                <span className="text-slate-300">·</span>
                <div className="text-amber-800 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{analysis.routeAnalysis.peakSeasonName}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 bg-white/80 border border-indigo-200/80 px-3 py-1 rounded-xl text-xs font-mono">
            <span className="text-slate-500">Ước tính doanh thu bổ sung:</span>
            <strong className="text-emerald-700 font-bold tabular-nums">
              +{formatUSD(analysis.totalPotentialRevenueUsd)}
            </strong>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">Lọc theo:</span>
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'FUEL', label: 'Nhiên liệu (BAF/FSC/LSS)' },
            { id: 'PEAK_SEASON', label: 'Mùa cao điểm (PSS)' },
            { id: 'REGULATORY', label: 'Quy định quốc tế (AMS/ETS)' },
            { id: 'SECURITY', label: 'An ninh & Soi chiếu' },
            { id: 'WAR_RISK', label: 'Vùng rủi ro (WRS)' },
            { id: 'EQUIPMENT', label: 'Vỏ container (CIC)' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterCategory(f.id)}
              className={`press-physics-subtle px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                filterCategory === f.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Scrollable Surcharges List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Không có phụ phí nào trong danh mục này</p>
              <p className="text-xs text-slate-500 mt-1">Toàn bộ phụ phí đã được rà soát hoặc không áp dụng cho cấu hình vận tải hiện tại.</p>
            </div>
          ) : (
            filteredSuggestions.map(sug => {
              const isSelected = selectedIds.has(sug.id);
              const isAlreadyAdded = sug.isAlreadyAdded;
              const isMandatory = sug.confidence === 'MANDATORY';

              return (
                <div
                  key={sug.id}
                  onClick={() => !isAlreadyAdded && toggleSelect(sug.id)}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isAlreadyAdded
                      ? 'bg-slate-50/70 border-slate-200/60 opacity-65 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200 cursor-pointer shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  {/* Left: Checkbox & Info */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isSelected || isAlreadyAdded}
                      disabled={isAlreadyAdded}
                      onChange={() => {}}
                      className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                          {sug.code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {sug.nameVi}
                        </h4>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {sug.location}
                        </span>
                        {isAlreadyAdded && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> Đã có trong báo giá
                          </span>
                        )}
                        {isMandatory && !isAlreadyAdded && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                            Bắt buộc theo luật
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {sug.reasonVi}
                      </p>

                      {sug.regulatoryRef && (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-700 mt-1 font-mono">
                          <BookOpen className="w-3 h-3 text-indigo-500" />
                          <span>Căn cứ pháp lý: {sug.regulatoryRef}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Pricing & Basis */}
                  <div className="text-left sm:text-right shrink-0 min-w-32">
                    <div className="font-mono font-bold text-sm text-slate-900">
                      {sug.currency === 'USD' ? formatUSD(sug.suggestedUnitPrice) : formatVND(sug.suggestedUnitPrice)}
                      <span className="text-xs text-slate-400 font-normal"> / {sug.unit}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Đơn vị tính: {sug.basis}
                    </div>
                    <div className="text-xs font-mono font-bold text-emerald-600 mt-1">
                      Tổng: +{isVnd ? formatVND(sug.estimatedTotalVnd) : formatUSD(sug.estimatedTotalUsd)}
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Đã chọn <strong className="text-indigo-900 font-bold">{selectedIds.size}</strong> phụ phí khuyến nghị
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="press-physics-subtle px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="button"
              onClick={handleApplySelected}
              disabled={selectedIds.size === 0}
              className="press-physics inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm {selectedIds.size} Phụ Phí Đã Chọn</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
