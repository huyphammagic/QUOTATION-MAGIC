import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  Target, 
  Swords, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Percent, 
  Info, 
  X, 
  Check, 
  ChevronRight, 
  Ship, 
  Award, 
  Clock, 
  Search,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Layers
} from 'lucide-react';
import { 
  LaneMarketBenchmark, 
  CompetitorProfile, 
  WinProbabilityResult, 
  PriceCompetitivenessRating, 
  WinLossFeedbackRecord 
} from '../../types/competitorIntelligence';
import { QuoteData } from '../../types/logistics';
import { 
  STANDARD_LANE_BENCHMARKS, 
  STANDARD_COMPETITORS, 
  findLaneBenchmark, 
  analyzeWinProbability,
  recordWinLossFeedback,
  getLocalWinLossRecords
} from '../../services/competitor/competitorIntelligenceService';

interface CompetitorIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuote?: QuoteData | null;
  onApplySweetSpotPrice?: (newSellPrice: number) => void;
}

type ActiveTab = 'SIMULATOR' | 'BENCHMARKS' | 'BATTLECARDS' | 'WIN_LOSS_LOG';

export const CompetitorIntelligenceModal: React.FC<CompetitorIntelligenceModalProps> = ({
  isOpen,
  onClose,
  currentQuote,
  onApplySweetSpotPrice
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('SIMULATOR');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>(STANDARD_LANE_BENCHMARKS[0].id);
  const [copiedState, setCopiedState] = useState<string | null>(null);

  // Initial pricing from current quote if available
  const quoteFreightItem = currentQuote?.items.find(i => i.category === 'FREIGHT');
  const initialProposedPrice = quoteFreightItem?.unitPrice || 1850;
  const initialCostPrice = quoteFreightItem?.costPrice || 1500;

  const [proposedPrice, setProposedPrice] = useState<number>(initialProposedPrice);
  const [costPrice, setCostPrice] = useState<number>(initialCostPrice);

  // Selected benchmark
  const activeBenchmark = useMemo(() => {
    if (currentQuote?.shipment) {
      return findLaneBenchmark(
        currentQuote.shipment.pol,
        currentQuote.shipment.pod,
        currentQuote.shipment.mode,
        currentQuote.shipment.containerType
      );
    }
    return STANDARD_LANE_BENCHMARKS.find(b => b.id === selectedBenchmarkId) || STANDARD_LANE_BENCHMARKS[0];
  }, [currentQuote, selectedBenchmarkId]);

  // Win probability calculation
  const winProbResult: WinProbabilityResult = useMemo(() => {
    return analyzeWinProbability({
      proposedPrice,
      costPrice,
      benchmark: activeBenchmark,
      currency: activeBenchmark.currency
    });
  }, [proposedPrice, costPrice, activeBenchmark]);

  // Win/Loss logger state
  const [wlOutcome, setWlOutcome] = useState<'WON' | 'LOST'>('WON');
  const [wlCompetitor, setWlCompetitor] = useState<string>('Maersk Spot Direct');
  const [wlReason, setWlReason] = useState<WinLossFeedbackRecord['primaryReason']>('PRICE');
  const [wlWinningPrice, setWlWinningPrice] = useState<number>(proposedPrice);
  const [wlNotes, setWlNotes] = useState<string>('');
  const [isSavingWl, setIsSavingWl] = useState(false);
  const [wlSavedSuccess, setWlSavedSuccess] = useState(false);

  // Color styles based on rating
  const ratingBadgeStyles = useMemo(() => {
    switch (winProbResult.rating) {
      case 'AGGRESSIVE_HIGH_WIN':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
          labelVi: 'Giá Rất Cạnh Tranh (Xác Suất Thắng Cao)',
          textColor: 'text-emerald-600',
          barColor: 'bg-emerald-500'
        };
      case 'OPTIMAL_SWEET_SPOT':
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-300',
          labelVi: 'Điểm Ngọt Tối Ưu (Sweet Spot Vàng)',
          textColor: 'text-indigo-600',
          barColor: 'bg-indigo-600'
        };
      case 'MODERATE_CHANCE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-300',
          labelVi: 'Giá Trung Bình Thị Trường',
          textColor: 'text-amber-600',
          barColor: 'bg-amber-500'
        };
      case 'OVERPRICED_HIGH_RISK':
      default:
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-300',
          labelVi: 'Giá Cao Nguy Cơ Mất Khách',
          textColor: 'text-rose-600',
          barColor: 'bg-rose-500'
        };
    }
  }, [winProbResult.rating]);

  const handleSaveWinLoss = async () => {
    setIsSavingWl(true);
    const record: WinLossFeedbackRecord = {
      id: `wl_${Date.now()}`,
      companyId: currentQuote?.companyId || 'company_profile',
      quotationId: currentQuote?.id || 'quote_sample',
      quoteNumber: currentQuote?.quoteNumber || 'LOG-2026-MOCK',
      customerName: currentQuote?.customer.customerName || 'Khách hàng thử nghiệm',
      lane: `${activeBenchmark.pol} -> ${activeBenchmark.pod}`,
      outcome: wlOutcome,
      quotedPrice: proposedPrice,
      winningPrice: wlWinningPrice,
      competitorWon: wlOutcome === 'LOST' ? wlCompetitor : undefined,
      primaryReason: wlReason,
      feedbackNotes: wlNotes,
      recordedBy: 'Sales Representative',
      recordedAt: new Date().toISOString()
    };
    await recordWinLossFeedback(record);
    setIsSavingWl(false);
    setWlSavedSuccess(true);
    setTimeout(() => setWlSavedSuccess(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 rounded-xl">
              <Swords className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Radar Giá Thị Trường & So Sánh Đối Thủ (Competitor Intel)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full">
                  Phase 57 • Lựa Chọn 1
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dự báo xác suất trúng thầu (Win-Rate), tìm điểm ngọt Sweet-Spot và vũ khí khắc chế đối thủ cạnh tranh
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1">
            <button
              type="button"
              onClick={() => setActiveTab('SIMULATOR')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'SIMULATOR'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Target className="w-4 h-4 text-indigo-600" />
              <span>Dự Báo Thắng Thầu & Sweet-Spot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BENCHMARKS')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'BENCHMARKS'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Biểu Cước Thị Trường Theo Tuyến</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BATTLECARDS')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'BATTLECARDS'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Swords className="w-4 h-4 text-rose-600" />
              <span>Hồ Sơ Đối Thủ & Chiến Thuật</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('WIN_LOSS_LOG')}
              className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'WIN_LOSS_LOG'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span>Ghi Nhận Thắng / Thua Deal</span>
            </button>
          </div>

          {/* Current Lane Indicator */}
          <div className="hidden lg:flex items-center space-x-2 text-xs text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-md">
            <Ship className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-800">{activeBenchmark.pol}</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-800">{activeBenchmark.pod}</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded">
              {activeBenchmark.containerType}
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ========================================================================= */}
          {/* TAB 1: DỰ BÁO XÁC SUẤT THẮNG THẦU & SWEET-SPOT SIMULATOR                  */}
          {/* ========================================================================= */}
          {activeTab === 'SIMULATOR' && (
            <div className="space-y-6">
              
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Win Probability Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Xác Suất Trúng Thầu</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${ratingBadgeStyles.bg}`}>
                      {ratingBadgeStyles.labelVi}
                    </span>
                  </div>
                  <div className="mt-3 flex items-baseline space-x-2">
                    <span className={`text-4xl font-extrabold tracking-tight ${ratingBadgeStyles.textColor}`}>
                      {winProbResult.winProbabilityPercent}%
                    </span>
                    <span className="text-xs text-slate-500 font-medium">cơ hội thắng khách</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-2.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 rounded-full ${ratingBadgeStyles.barColor}`} 
                      style={{ width: `${winProbResult.winProbabilityPercent}%` }}
                    />
                  </div>
                </div>

                {/* Proposed Margin Card */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lợi Nhuận Dự Kiến</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-slate-900">
                      ${winProbResult.expectedProfitProposed.toLocaleString()}
                      <span className="text-xs font-normal text-slate-500 ml-1.5">/ container</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Biên Lợi Nhuận: {winProbResult.marginPercentAtProposed}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Giá bán: ${proposedPrice} • Giá vốn hãng tàu: ${costPrice}
                  </p>
                </div>

                {/* Recommended Sweet Spot Card */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      Điểm Ngọt (Sweet-Spot)
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Tối Ưu Kỳ Vọng LN
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="text-2xl font-black text-amber-900">
                      ${winProbResult.sweetSpotPrice.toLocaleString()}
                      <span className="text-xs font-normal text-amber-700 ml-1.5">USD</span>
                    </div>
                    <div className="text-xs text-amber-800 font-medium mt-1">
                      Tỷ lệ thắng: <span className="font-bold">{winProbResult.sweetSpotWinProbability}%</span> • Biên LN: <span className="font-bold">{winProbResult.marginPercentAtSweetSpot}%</span>
                    </div>
                  </div>
                  {onApplySweetSpotPrice && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplySweetSpotPrice(winProbResult.sweetSpotPrice);
                        setProposedPrice(winProbResult.sweetSpotPrice);
                      }}
                      className="mt-3 w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Áp Dụng Giá Này Vào Báo Giá</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Interactive Price Slider & Market Spectrum */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      Bàn Điều Chỉnh Giá Bán So Với Phổ Cước Thị Trường
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kéo thanh trượt để thử nghiệm tác động của giá bán tới tỷ lệ thắng và biên lợi nhuận
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 font-medium">Giá bán dự kiến:</span>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                      <input 
                        type="number" 
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(Number(e.target.value) || 0)}
                        className="w-28 pl-6 pr-2 py-1 text-sm font-extrabold text-indigo-900 border border-indigo-300 rounded-lg text-right focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Range Slider */}
                <div className="pt-2">
                  <input
                    type="range"
                    min={Math.round(costPrice * 0.95)}
                    max={Math.round(activeBenchmark.p90HighPrice * 1.25)}
                    step={10}
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* Market Benchmark Spectrum Bar */}
                <div className="pt-2">
                  <div className="relative w-full h-8 bg-gradient-to-r from-emerald-100 via-amber-100 to-rose-100 rounded-lg border border-slate-300 overflow-hidden flex items-center px-4">
                    {/* Tick Marks */}
                    <div className="absolute left-[15%] text-[10px] font-bold text-emerald-800 flex flex-col items-center">
                      <span>P10: ${activeBenchmark.p10LowPrice}</span>
                      <span className="text-[9px] font-normal text-emerald-600">(Giá Sàn/Spot)</span>
                    </div>
                    <div className="absolute left-[50%] -translate-x-1/2 text-[10px] font-bold text-slate-800 flex flex-col items-center">
                      <span>P50: ${activeBenchmark.p50MedianPrice}</span>
                      <span className="text-[9px] font-normal text-slate-500">(Chuẩn Thị Trường)</span>
                    </div>
                    <div className="absolute right-[15%] text-[10px] font-bold text-rose-800 flex flex-col items-center">
                      <span>P90: ${activeBenchmark.p90HighPrice}</span>
                      <span className="text-[9px] font-normal text-rose-600">(Giá Cao Cấp)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 px-1">
                    <span>Vùng giá rẻ (Cơ hội thắng 85-95%)</span>
                    <span>Vùng tối ưu cân bằng (Sweet Spot)</span>
                    <span>Vùng giá cao (Nguy cơ rớt deal &gt; 65%)</span>
                  </div>
                </div>

                {/* Strategic Analysis Callout */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>Nhận định thị trường:</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {winProbResult.analysisSummaryVi}
                  </p>
                  <p className="text-indigo-800 font-medium pt-1">
                    👉 <span className="font-bold">Hành động khuyến nghị:</span> {winProbResult.suggestedActionVi}
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: BIỂU CƯỚC THỊ TRƯỜNG THEO TUYẾN (BENCHMARKS)                       */}
          {/* ========================================================================= */}
          {activeTab === 'BENCHMARKS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Bản Đồ Cước Thị Trường Tuyến Chính (Lane Market Radar)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dữ liệu khảo sát từ các hãng tàu quốc tế và báo giá thực tế trên thị trường
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STANDARD_LANE_BENCHMARKS.map((bm) => (
                  <div 
                    key={bm.id}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedBenchmarkId === bm.id
                        ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{bm.pol} ➔ {bm.pod}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {bm.containerType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Khảo sát: {bm.sampleQuotesCount} báo giá • Cập nhật: {bm.lastUpdated}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        bm.trend === 'RISING' ? 'bg-rose-100 text-rose-700' :
                        bm.trend === 'FALLING' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        Xu hướng: {bm.trend === 'RISING' ? 'Tăng' : bm.trend === 'FALLING' ? 'Giảm' : 'Ổn định'}
                      </span>
                    </div>

                    {/* Percentile Stats */}
                    <div className="grid grid-cols-3 gap-2 my-3 p-2 bg-slate-50 rounded-lg text-center">
                      <div>
                        <div className="text-[10px] text-slate-500">P10 (Giá thấp)</div>
                        <div className="text-sm font-bold text-emerald-600">${bm.p10LowPrice}</div>
                      </div>
                      <div className="border-x border-slate-200">
                        <div className="text-[10px] text-slate-500">P50 (Trung bình)</div>
                        <div className="text-sm font-extrabold text-slate-900">${bm.p50MedianPrice}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">P90 (Giá cao)</div>
                        <div className="text-sm font-bold text-rose-600">${bm.p90HighPrice}</div>
                      </div>
                    </div>

                    {/* Carrier Breakdown */}
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div className="font-semibold text-slate-700">Bình quân theo Hãng tàu:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(bm.carrierAverages).map(([carrier, avgPrice]) => (
                          <span key={carrier} className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                            {carrier}: <strong className="text-slate-900">${avgPrice}</strong>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {bm.notesVi && (
                      <p className="text-[11px] text-slate-500 italic mt-2.5 pt-2 border-t border-slate-100">
                        💡 {bm.notesVi}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBenchmarkId(bm.id);
                          setProposedPrice(bm.p50MedianPrice);
                          setActiveTab('SIMULATOR');
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Mô phỏng giá tuyến này</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: HỒ SƠ ĐỐI THỦ CẠNH TRANH & CHIẾN THUẬT (BATTLECARDS)              */}
          {/* ========================================================================= */}
          {activeTab === 'BATTLECARDS' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Thư Viện Đối Thủ Cạnh Tranh & Vũ Khí Khắc Chế (Competitor Battlecards)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nắm bắt điểm yếu chết người của từng đối thủ để bẻ gãy chiêu bài ép giá của khách hàng
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STANDARD_COMPETITORS.map((comp) => (
                  <div key={comp.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{comp.name}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {comp.tier}
                        </span>
                      </div>
                      <span className={`text-xs font-bold ${comp.typicalDiscountPercent < 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                        {comp.typicalDiscountPercent < 0 
                          ? `Thường rẻ hơn ${Math.abs(comp.typicalDiscountPercent)}%` 
                          : `Cao hơn thị trường +${comp.typicalDiscountPercent}%`}
                      </span>
                    </div>

                    {/* Weaknesses (Điểm yếu của họ) */}
                    <div className="p-2.5 bg-rose-50/50 rounded-lg border border-rose-100 text-xs">
                      <div className="font-bold text-rose-800 flex items-center gap-1.5 mb-1">
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />
                        <span>Điểm yếu tử huyệt của họ:</span>
                      </div>
                      <ul className="list-disc list-inside text-rose-900 space-y-0.5 pl-1 text-[11px]">
                        {comp.weaknesses.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Winning Counter Tactics (Vũ khí khắc chế) */}
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg border border-emerald-100 text-xs">
                      <div className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cách Sales chúng ta phản đòn & chốt khách:</span>
                      </div>
                      <ul className="list-disc list-inside text-emerald-900 space-y-0.5 pl-1 text-[11px]">
                        {comp.winningCounterTactics.map((t, idx) => (
                          <li key={idx} className="font-medium">{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: GHI NHẬN KẾT QUẢ THẮNG / THUA DEAL (WIN/LOSS LOGGER)              */}
          {/* ========================================================================= */}
          {activeTab === 'WIN_LOSS_LOG' && (
            <div className="max-w-2xl mx-auto space-y-5">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Ghi Nhận Kết Quả Đàm Phán Thực Tế (Win / Loss Feedback)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dữ liệu ghi nhận sẽ tự động hiệu chỉnh độ chính xác của mô hình dự báo Win-Rate theo thời gian
                </p>
              </div>

              {wlSavedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Đã ghi nhận kết quả thành công! Mô hình đã được cập nhật dữ liệu.</span>
                </div>
              )}

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 text-xs">
                
                {/* Won / Lost Selector */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Kết quả thương lượng:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setWlOutcome('WON')}
                      className={`py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        wlOutcome === 'WON'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>THẮNG DEAL (WON)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWlOutcome('LOST')}
                      className={`py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        wlOutcome === 'LOST'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>THUA DEAL (LOST)</span>
                    </button>
                  </div>
                </div>

                {/* Primary Reason */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Lý do cốt lõi dẫn đến kết quả:</label>
                  <select
                    value={wlReason}
                    onChange={(e) => setWlReason(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="PRICE">Giá cước (Bị đối thủ chào rẻ hơn hoặc chấp nhận giá tốt)</option>
                    <option value="TRANSIT_TIME">Thời gian vận chuyển (Tàu chạy nhanh hơn / Chạy thẳng)</option>
                    <option value="FREE_TIME">Free Time DEM/DET (Cần nhiều ngày lưu bãi cảng đến)</option>
                    <option value="SPACE_AVAILABILITY">Độ chắc chắn có chỗ trên tàu (Space Guarantee)</option>
                    <option value="PAYMENT_TERMS">Điều khoản công nợ (Cho nợ 30-45 ngày)</option>
                    <option value="CUSTOMER_RELATIONSHIP">Mối quan hệ thân thiết từ trước</option>
                    <option value="OTHER">Lý do khác</option>
                  </select>
                </div>

                {/* If Lost: Competitor */}
                {wlOutcome === 'LOST' && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">Mất khách vào tay đối thủ nào (nếu biết)?</label>
                    <input
                      type="text"
                      value={wlCompetitor}
                      onChange={(e) => setWlCompetitor(e.target.value)}
                      placeholder="Ví dụ: Maersk Spot, Bee Logistics, Kuehne+Nagel..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {/* Winning Price */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Mức giá chốt thực tế ($ USD):</label>
                  <input
                    type="number"
                    value={wlWinningPrice}
                    onChange={(e) => setWlWinningPrice(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5">Ghi chú phản hồi của khách hàng:</label>
                  <textarea
                    rows={2}
                    value={wlNotes}
                    onChange={(e) => setWlNotes(e.target.value)}
                    placeholder="Khách nói bên B bao trọn local charges hoặc hãng tàu cắt giá cước sâu..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSavingWl}
                  onClick={handleSaveWinLoss}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingWl ? 'Đang lưu...' : 'Lưu Kết Quả Vào Kho Tri Thức Sales'}</span>
                </button>

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Mô hình học máy dự báo theo phân vị cước P10 - P50 - P90</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
