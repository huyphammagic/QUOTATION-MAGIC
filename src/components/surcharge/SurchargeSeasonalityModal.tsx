import React, { useState, useMemo } from 'react';
import { SurchargeItem, QuoteData, Currency } from '../../types/logistics';
import { analyzeSurchargeSeasonality } from '../../services/surcharge/surchargeSeasonalityService';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  Check, 
  Sparkles, 
  Layers, 
  Info, 
  Award, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  BarChart3, 
  FileText, 
  MapPin, 
  Ship, 
  Plane, 
  Truck,
  Zap,
  Clock,
  Flame,
  CheckCheck,
  RotateCcw
} from 'lucide-react';

interface SurchargeSeasonalityModalProps {
  isOpen: boolean;
  onClose: () => void;
  surcharge: SurchargeItem | null;
  exchangeRate: number;
  savedQuotes?: QuoteData[];
  onUpdateSurchargePrice?: (surchargeId: string, newPriceUsd: number, newPriceVnd: number) => void;
  onAddSurchargeToQuote?: (surcharge: SurchargeItem, customizedPriceUsd?: number, customizedPriceVnd?: number) => void;
}

export const SurchargeSeasonalityModal: React.FC<SurchargeSeasonalityModalProps> = ({
  isOpen,
  onClose,
  surcharge,
  exchangeRate,
  savedQuotes = [],
  onUpdateSurchargePrice,
  onAddSurchargeToQuote,
}) => {
  const [activeTab, setActiveTab] = useState<'SEASONALITY' | 'HISTORICAL_COST' | 'PRICING_TIERS'>('SEASONALITY');
  const [customPriceUsd, setCustomPriceUsd] = useState<number>(0);
  const [customPriceVnd, setCustomPriceVnd] = useState<number>(0);
  const [hasPriceChanged, setHasPriceChanged] = useState<boolean>(false);
  const [savedSuccessNotice, setSavedSuccessNotice] = useState<string | null>(null);

  // Khởi tạo giá tùy chỉnh khi chọn surcharge mới
  React.useEffect(() => {
    if (surcharge) {
      setCustomPriceUsd(surcharge.priceUsd);
      setCustomPriceVnd(surcharge.priceVnd);
      setHasPriceChanged(false);
      setSavedSuccessNotice(null);
    }
  }, [surcharge]);

  // Phân tích xu hướng mùa vụ & chi phí lịch sử
  const analysis = useMemo(() => {
    if (!surcharge) return null;
    return analyzeSurchargeSeasonality(surcharge, exchangeRate, savedQuotes);
  }, [surcharge, exchangeRate, savedQuotes]);

  if (!isOpen || !surcharge || !analysis) return null;

  const handleApplyStrategyTier = (tierPriceUsd: number, tierPriceVnd: number, tierTitle: string) => {
    setCustomPriceUsd(tierPriceUsd);
    setCustomPriceVnd(tierPriceVnd);
    setHasPriceChanged(true);

    if (onUpdateSurchargePrice) {
      onUpdateSurchargePrice(surcharge.id, tierPriceUsd, tierPriceVnd);
      setSavedSuccessNotice(`Đã cập nhật giá niêm yết theo ${tierTitle}: $${tierPriceUsd} (${formatVND(tierPriceVnd)})`);
      setTimeout(() => setSavedSuccessNotice(null), 3000);
    }
  };

  const handleSaveCustomPriceToCatalog = () => {
    if (onUpdateSurchargePrice) {
      onUpdateSurchargePrice(surcharge.id, customPriceUsd, customPriceVnd);
      setHasPriceChanged(false);
      setSavedSuccessNotice(`Đã lưu thành công giá mới: $${customPriceUsd} (${formatVND(customPriceVnd)}) vào danh mục phụ phí!`);
      setTimeout(() => setSavedSuccessNotice(null), 3500);
    }
  };

  const handleApplyToActiveQuote = (priceUsd: number, priceVnd: number) => {
    if (onAddSurchargeToQuote) {
      const cloned = { ...surcharge, priceUsd, priceVnd };
      onAddSurchargeToQuote(cloned, priceUsd, priceVnd);
      onClose();
    }
  };

  const ratingColorClasses = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-300 ring-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-200',
    rose: 'bg-rose-50 text-rose-800 border-rose-300 ring-rose-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-300 ring-purple-200',
  }[analysis.ratingColor];

  // SVG Chart Dimensions & Calculations
  const chartHeight = 160;
  const chartWidth = 560;
  const paddingX = 35;
  const paddingY = 25;
  const graphWidth = chartWidth - paddingX * 2;
  const graphHeight = chartHeight - paddingY * 2;

  const minIndex = Math.min(...analysis.monthlySeasonalityCurve.map(m => m.seasonalityIndex), 70);
  const maxIndex = Math.max(...analysis.monthlySeasonalityCurve.map(m => m.seasonalityIndex), 140);
  const range = maxIndex - minIndex || 1;

  const points = analysis.monthlySeasonalityCurve.map((m, idx) => {
    const x = paddingX + (idx / 11) * graphWidth;
    const y = paddingY + graphHeight - ((m.seasonalityIndex - minIndex) / range) * graphHeight;
    return { x, y, month: m.month, index: m.seasonalityIndex, data: m };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx1 = prev.x + (curr.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (curr.x - prev.x) / 2;
    const cy2 = curr.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-500 to-sky-400 p-0.5 shadow-md shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-amber-300">
                <TrendingUp className="w-5 h-5 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {surcharge.code}
                </span>
                <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                  {surcharge.name}
                </h2>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-300 font-medium">
                  {surcharge.location || 'POL'} | {surcharge.unit}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>Phân tích xu hướng mùa vụ & cố vấn độ cạnh tranh giá phụ phí</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-semibold font-mono">Dữ liệu đối soát thời gian thực</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer shrink-0 ml-2"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Notice Banner */}
        {savedSuccessNotice && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-900 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{savedSuccessNotice}</span>
            </div>
            <button
              onClick={() => setSavedSuccessNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4 Primary Top KPI Cards */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          
          {/* Card 1: Giá Hiện Tại Trong Danh Mục */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Giá niêm yết hiện tại</span>
              <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{surcharge.currency}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
                {surcharge.currency === 'USD' ? `$${surcharge.priceUsd}` : formatVND(surcharge.priceVnd)}
              </span>
              <span className="text-[11px] text-slate-500 font-normal">/ {surcharge.unit}</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>≈ {surcharge.currency === 'USD' ? formatVND(surcharge.priceVnd) : `$${surcharge.priceUsd}`}</span>
            </div>
          </div>

          {/* Card 2: Điểm Đánh Giá Cạnh Tranh (Competitiveness Rating) */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Độ cạnh tranh giá</span>
              <span className="font-mono font-bold text-xs text-indigo-600">{analysis.competitivenessScore}/100</span>
            </div>
            <div className="pt-0.5">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${ratingColorClasses}`}>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{analysis.ratingBadgeVi}</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  analysis.competitivenessScore >= 80 ? 'bg-emerald-500' : analysis.competitivenessScore >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${analysis.competitivenessScore}%` }}
              />
            </div>
          </div>

          {/* Card 3: Giá Vốn & Biên Lãi Lịch Sử */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Giá vốn trung bình</span>
              <span className="text-[10px] text-emerald-600 font-bold font-mono">Lãi ~{analysis.historicalCostMetrics.estimatedMarginPercent}%</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-mono font-extrabold text-slate-900">
                ${analysis.historicalCostMetrics.avgCostUsd}
              </span>
              <span className="text-[11px] text-slate-500 font-normal">USD</span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Đối soát từ {analysis.historicalCostMetrics.totalHistoricalQuotationsUsed} báo giá</span>
              <span className="text-emerald-700 font-bold text-[10px]">Thắng {analysis.historicalCostMetrics.winRatePercent}%</span>
            </div>
          </div>

          {/* Card 4: Chu Kỳ Mùa Vụ Tháng Hiện Tại */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Tháng {analysis.currentSeasonality.currentMonth} (Mùa vụ)</span>
              {analysis.currentSeasonality.isPeakActive ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded animate-pulse">
                  <Flame className="w-2.5 h-2.5" />
                  <span>Cao điểm</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium">Bình ổn</span>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                x{analysis.currentSeasonality.seasonalityFactor}
              </span>
              <span className="text-xs text-slate-500">hệ số mùa</span>
            </div>
            <p className="text-[11px] text-slate-600 truncate" title={analysis.currentSeasonality.seasonNameVi}>
              {analysis.currentSeasonality.seasonNameVi}
            </p>
          </div>

        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 sm:px-6 bg-white border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('SEASONALITY')}
            className={`inline-flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SEASONALITY'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Xu Hướng Mùa Vụ (12 Tháng)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORICAL_COST')}
            className={`inline-flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'HISTORICAL_COST'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Đối Soát Chi Phí Báo Giá Lịch Sử ({analysis.historicalQuotePoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRICING_TIERS')}
            className={`inline-flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'PRICING_TIERS'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>3 Tầng Định Giá Chiến Lược Khuyến Nghị</span>
          </button>
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* TAB 1: SEASONALITY TRENDS */}
          {activeTab === 'SEASONALITY' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Seasonality Chart Container */}
              <div className="p-4 sm:p-5 rounded-3xl bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-400" />
                      <span>Đường Cong Biến Động Chỉ Số Mùa Vụ (Seasonality Index Curve)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Đo lường mức tăng/giảm nhu cầu & cước của phụ phí <strong className="text-indigo-300 font-mono">{surcharge.code}</strong> qua 12 tháng
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                      <span>Mức bình quân (100)</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block animate-ping" />
                      <span>Tháng hiện tại (Th{analysis.currentSeasonality.currentMonth})</span>
                    </span>
                  </div>
                </div>

                {/* SVG Visual Graph */}
                <div className="w-full overflow-x-auto py-2">
                  <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                    className="w-full h-44 sm:h-52 overflow-visible"
                  >
                    <defs>
                      <linearGradient id="seasonAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>

                    {/* Baseline 100 dash line */}
                    {(() => {
                      const baselineY = paddingY + graphHeight - ((100 - minIndex) / range) * graphHeight;
                      return (
                        <g>
                          <line
                            x1={paddingX}
                            y1={baselineY}
                            x2={chartWidth - paddingX}
                            y2={baselineY}
                            stroke="rgba(255, 255, 255, 0.2)"
                            strokeDasharray="4 4"
                          />
                          <text 
                            x={chartWidth - paddingX + 5} 
                            y={baselineY + 3} 
                            fill="rgba(255, 255, 255, 0.4)" 
                            fontSize="9" 
                            fontFamily="monospace"
                          >
                            100
                          </text>
                        </g>
                      );
                    })()}

                    {/* Area fill */}
                    <path d={areaD} fill="url(#seasonAreaGrad)" />

                    {/* Smooth curve line */}
                    <path 
                      d={pathD} 
                      fill="none" 
                      stroke="url(#lineGrad)" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />

                    {/* Month point markers */}
                    {points.map((pt) => {
                      const isCurrent = pt.month === analysis.currentSeasonality.currentMonth;
                      return (
                        <g key={pt.month} className="cursor-pointer group">
                          {isCurrent && (
                            <circle 
                              cx={pt.x} 
                              cy={pt.y} 
                              r="10" 
                              fill="rgba(245, 158, 11, 0.25)" 
                              className="animate-pulse" 
                            />
                          )}
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={isCurrent ? "5" : "3.5"} 
                            fill={isCurrent ? "#f59e0b" : "#c7d2fe"} 
                            stroke="#0f172a" 
                            strokeWidth="2" 
                          />
                          {/* Value above point */}
                          <text 
                            x={pt.x} 
                            y={pt.y - 8} 
                            textAnchor="middle" 
                            fill={isCurrent ? "#fbbf24" : "rgba(255, 255, 255, 0.75)"} 
                            fontSize={isCurrent ? "10" : "8"} 
                            fontWeight={isCurrent ? "bold" : "normal"}
                            fontFamily="monospace"
                          >
                            {pt.index}
                          </text>

                          {/* Month label on bottom */}
                          <text 
                            x={pt.x} 
                            y={chartHeight - 6} 
                            textAnchor="middle" 
                            fill={isCurrent ? "#fbbf24" : "rgba(255, 255, 255, 0.5)"} 
                            fontSize={isCurrent ? "10" : "9"} 
                            fontWeight={isCurrent ? "bold" : "normal"}
                            fontFamily="monospace"
                          >
                            T{pt.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Commentary Box Inside Dark Card */}
                <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-200 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="leading-relaxed">
                      <strong className="text-amber-300 font-semibold">Nhận định mùa vụ:</strong> {analysis.currentSeasonality.seasonAdviceVi}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {analysis.currentSeasonality.forecastNextQuarterVi}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4-Quarter Seasonality Breakdown Table */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Diễn Biến Theo 4 Quý Trong Năm</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { q: 'Q1 (Th1 - Th3)', name: 'Cao Điểm Cận Tết & Nghỉ Lễ', desc: 'Sản lượng đạt đỉnh vào tháng 1 trước Tết, sau đó chững lại vào tháng 2-3 khi các nhà máy mở lại.', badge: 'Biến động mạnh', color: 'rose' },
                    { q: 'Q2 (Th4 - Th6)', name: 'Giai Đoạn Bình Ổn Hợp Đồng', desc: 'Thị trường vận tải biển & hàng không ổn định nhất năm. Thích hợp chốt giá hợp đồng kỳ hạn dài.', badge: 'Ổn định', color: 'emerald' },
                    { q: 'Q3 (Th7 - Th9)', name: 'Khởi Động Mùa Xuất Khẩu Hè', desc: 'Hàng dệt may, giày da, đồ gỗ gia dụng bắt đầu dồn tải chuẩn bị cho mùa mua sắm phương Tây.', badge: 'Tăng nhiệt', color: 'amber' },
                    { q: 'Q4 (Th10 - Th12)', name: 'Đỉnh Điểm Mùa Mua Sắm Lễ Hội', desc: 'Black Friday, Noel & Tết Dương Lịch. Các hãng tàu thường áp dụng PSS và phụ phí nhiên liệu tối đa.', badge: 'Đỉnh điểm', color: 'rose' },
                  ].map((item) => (
                    <div key={item.q} className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-indigo-950 font-mono">{item.q}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                            item.color === 'rose' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            item.color === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 mt-1">
                          {item.name}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: HISTORICAL COST & QUOTE RECORDS */}
          {activeTab === 'HISTORICAL_COST' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* Corridor Summary Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-indigo-950 text-sm flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Hành Lang Chi Phí Lịch Sử: ${analysis.marketCorridor.minPriceUsd} ➔ ${analysis.marketCorridor.maxPriceUsd} USD</span>
                  </div>
                  <p className="text-indigo-800/80 text-[11px]">
                    Điểm ngọt bình quân thị trường: <strong>${analysis.marketCorridor.recommendedSweetSpotUsd} USD</strong> ({formatVND(analysis.marketCorridor.recommendedSweetSpotVnd)})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">Độ lệch giá hiện tại:</span>
                  <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                    analysis.currentPriceUsd > analysis.marketCorridor.avgPriceUsd 
                      ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  }`}>
                    {analysis.currentPriceUsd >= analysis.marketCorridor.avgPriceUsd ? '+' : ''}
                    {Math.round(((analysis.currentPriceUsd - analysis.marketCorridor.avgPriceUsd) / analysis.marketCorridor.avgPriceUsd) * 100)}% vs TB
                  </span>
                </div>
              </div>

              {/* Historical Quotes Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="p-3">Mã Báo Giá</th>
                      <th className="p-3">Ngày Lập</th>
                      <th className="p-3">Khách Hàng</th>
                      <th className="p-3">Chặng Tuyến</th>
                      <th className="p-3 text-right">Đơn Giá Chào</th>
                      <th className="p-3 text-right">Giá Vốn</th>
                      <th className="p-3 text-right">Biên Lãi</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {analysis.historicalQuotePoints.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-900">
                          {item.quoteNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          {item.date}
                        </td>
                        <td className="p-3 font-medium text-slate-800 max-w-[160px] truncate" title={item.customerName}>
                          {item.customerName}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {item.route}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {item.currency === 'USD' ? `$${item.unitPrice}` : formatVND(item.unitPrice)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500">
                          {item.currency === 'USD' ? `$${item.costPrice}` : formatVND(item.costPrice)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={item.marginPercent >= 20 ? 'text-emerald-600' : item.marginPercent >= 10 ? 'text-blue-600' : 'text-amber-600'}>
                            {item.marginPercent}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'SENT'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: ACTIONABLE PRICING TIERS */}
          {activeTab === 'PRICING_TIERS' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Cố vấn tối ưu báo giá:</strong> 3 tầng giá được hệ thống tự động tính toán dựa trên biên lợi nhuận kỳ vọng và xác suất thắng thầu lịch sử. Bạn có thể bấm chọn ngay để cập nhật trực tiếp vào danh mục hoặc nạp vào báo giá đang mở.
                </p>
              </div>

              {/* 3 Strategy Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysis.recommendedTiers.map((tier) => {
                  const isCurrent = Math.abs(tier.priceUsd - customPriceUsd) < 0.5;

                  return (
                    <div 
                      key={tier.id}
                      className={`p-4 rounded-3xl border transition-all flex flex-col justify-between shadow-2xs hover:shadow-xs relative bg-white ${
                        isCurrent 
                          ? 'border-indigo-600 ring-2 ring-indigo-500/20' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            tier.badgeColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            tier.badgeColor === 'blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {tier.badge}
                          </span>

                          <span className="text-[10px] text-slate-500 font-mono font-semibold">
                            Lãi ~{tier.estimatedMarginPercent}%
                          </span>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {tier.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {tier.subtitle}
                          </p>
                        </div>

                        {/* Price display */}
                        <div className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-0.5">
                          <div className="text-xl font-mono font-extrabold text-slate-900">
                            ${tier.priceUsd} <span className="text-xs font-normal text-slate-500">USD</span>
                          </div>
                          <div className="text-xs font-mono font-medium text-slate-500">
                            ≈ {formatVND(tier.priceVnd)}
                          </div>
                        </div>

                        {/* Rationale */}
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {tier.rationaleVi}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyStrategyTier(tier.priceUsd, tier.priceVnd, tier.title)}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Áp Dụng Vào Danh Mục</span>
                        </button>

                        {onAddSurchargeToQuote && (
                          <button
                            type="button"
                            onClick={() => handleApplyToActiveQuote(tier.priceUsd, tier.priceVnd)}
                            className="w-full py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Đưa Vào Báo Giá Đang Mở</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Fine-Tune Section */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h5 className="font-bold text-slate-900">Tùy Chỉnh Giá Thủ Công:</h5>
                  <p className="text-slate-500 text-[11px]">Điều chỉnh trực tiếp và lưu vào danh mục</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1">
                    <span className="text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="any"
                      value={customPriceUsd}
                      onChange={(e) => {
                        const usd = Number(e.target.value) || 0;
                        setCustomPriceUsd(usd);
                        setCustomPriceVnd(Math.round(usd * exchangeRate));
                        setHasPriceChanged(true);
                      }}
                      className="w-16 font-mono font-bold text-xs text-slate-900 focus:outline-none"
                    />
                    <span className="text-slate-400 text-[10px]">USD</span>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl px-2.5 py-1">
                    <input
                      type="number"
                      step="1000"
                      value={customPriceVnd}
                      onChange={(e) => {
                        const vnd = Number(e.target.value) || 0;
                        setCustomPriceVnd(vnd);
                        setCustomPriceUsd(Number((vnd / exchangeRate).toFixed(2)));
                        setHasPriceChanged(true);
                      }}
                      className="w-24 font-mono font-bold text-xs text-slate-900 focus:outline-none"
                    />
                    <span className="text-slate-400 text-[10px]">VND</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveCustomPriceToCatalog}
                    disabled={!hasPriceChanged}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed shadow-2xs"
                  >
                    Lưu Giá Mới
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span>Tỷ giá quy chuẩn: 1 USD = {exchangeRate.toLocaleString()} VND</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Đơn vị: {surcharge.unit}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
