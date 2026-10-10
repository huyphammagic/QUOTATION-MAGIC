import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  Sparkles, 
  Calculator, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  X, 
  Ship, 
  Plane, 
  Layers, 
  Zap, 
  ChevronRight, 
  Info, 
  Copy, 
  Check, 
  RefreshCw,
  Award,
  Users,
  Compass,
  FileSpreadsheet
} from 'lucide-react';
import { 
  TradeLaneBenchmark, 
  ContainerEquipmentType, 
  TransportModeType, 
  PricingStrategyScenario,
  AiMarketBenchmarkAnalysis
} from '../../types/rateBenchmarking';
import { 
  GLOBAL_FREIGHT_MARKET_INDICES, 
  MASTER_TRADE_LANE_BENCHMARKS 
} from '../../data/marketFreightBenchmarks';
import { 
  auditQuotationVsMarket, 
  calculateWinProbability, 
  getAiFreightRateBenchmarkAnalysis 
} from '../../services/pricing/freightRateBenchmarkService';
import { QuoteData, LineItem } from '../../types/logistics';

interface FreightRateBenchmarkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuote?: Partial<QuoteData>;
  onApplyBenchmarkRate?: (newRate: number, strategyName: string, equipmentType?: string) => void;
}

export const FreightRateBenchmarkingModal: React.FC<FreightRateBenchmarkingModalProps> = ({
  isOpen,
  onClose,
  activeQuote,
  onApplyBenchmarkRate,
}) => {
  // Lane selection
  const [selectedLaneId, setSelectedLaneId] = useState<string>(() => {
    return MASTER_TRADE_LANE_BENCHMARKS[0].id;
  });

  // What-if simulator slider value
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);
  const [volumeConts, setVolumeConts] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<AiMarketBenchmarkAnalysis | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [appliedStrategy, setAppliedStrategy] = useState<string | null>(null);

  // Find active lane
  const activeLane = useMemo(() => {
    return MASTER_TRADE_LANE_BENCHMARKS.find(l => l.id === selectedLaneId) || MASTER_TRADE_LANE_BENCHMARKS[0];
  }, [selectedLaneId]);

  // Sync initial lane from active quote when modal opens
  useEffect(() => {
    if (isOpen && activeQuote) {
      const audit = auditQuotationVsMarket(activeQuote);
      if (audit && audit.lane) {
        setSelectedLaneId(audit.lane.id);
        setSimulatedPrice(audit.currentQuoteSellingRate || audit.lane.marketMedianRate);
      }
    }
  }, [isOpen, activeQuote]);

  // Re-run audit whenever activeLane changes
  const auditResult = useMemo(() => {
    return auditQuotationVsMarket(activeQuote || {}, activeLane);
  }, [activeQuote, activeLane]);

  // Sync simulated price when lane changes
  useEffect(() => {
    if (auditResult) {
      setSimulatedPrice(auditResult.currentQuoteSellingRate || auditResult.lane.marketMedianRate);
    }
  }, [auditResult.lane.id]);

  // Run AI reasoning on initial load or lane change
  useEffect(() => {
    let isCancelled = false;
    async function fetchAi() {
      if (!isOpen) return;
      setIsAiLoading(true);
      try {
        const result = await getAiFreightRateBenchmarkAnalysis(
          auditResult, 
          activeQuote?.customer?.companyName || activeQuote?.customer?.customerName || 'Doanh nghiệp XNK'
        );
        if (!isCancelled) {
          setAiAnalysis(result);
        }
      } catch (e) {
        console.error('Failed to get AI benchmark:', e);
      } finally {
        if (!isCancelled) setIsAiLoading(false);
      }
    }

    fetchAi();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, auditResult.lane.id]);

  // What-if simulation calculated metrics
  const simWinRate = useMemo(() => {
    return calculateWinProbability(simulatedPrice, auditResult.lane);
  }, [simulatedPrice, auditResult.lane]);

  const simMarginAmount = useMemo(() => {
    return simulatedPrice - auditResult.currentQuoteBuyRate;
  }, [simulatedPrice, auditResult.currentQuoteBuyRate]);

  const simMarginPercent = useMemo(() => {
    if (simulatedPrice <= 0) return 0;
    return Number(((simMarginAmount / simulatedPrice) * 100).toFixed(1));
  }, [simMarginAmount, simulatedPrice]);

  const simExpectedProfitPerCont = useMemo(() => {
    return Math.round((simWinRate / 100) * simMarginAmount);
  }, [simWinRate, simMarginAmount]);

  const simTotalExpectedProfit = useMemo(() => {
    return simExpectedProfitPerCont * volumeConts;
  }, [simExpectedProfitPerCont, volumeConts]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyStrategy = (strategy: PricingStrategyScenario) => {
    setSimulatedPrice(strategy.proposedSellingPrice);
    setAppliedStrategy(strategy.id);
    if (onApplyBenchmarkRate) {
      onApplyBenchmarkRate(
        strategy.proposedSellingPrice, 
        strategy.nameVi, 
        auditResult.lane.equipmentType
      );
    }
  };

  const handleApplySimulatedRate = () => {
    setAppliedStrategy('CUSTOM');
    if (onApplyBenchmarkRate) {
      onApplyBenchmarkRate(
        simulatedPrice, 
        `Mức giá đối soát ($${simulatedPrice})`, 
        auditResult.lane.equipmentType
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-2 ring-white/10">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 text-xs font-bold bg-blue-500/30 text-blue-300 rounded-full border border-blue-400/30">
                  Phase 72
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                  Live Market Radar
                </span>
                <span className="text-xs text-slate-400">
                  SCFI • Drewry • Xeneta • Platts Spot Benchmark
                </span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Đối Soát Giá Thị Trường & Tối Ưu Hóa Biên Lợi Nhuận Thông Minh
              </h2>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Freight Indices Bar */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-2.5 overflow-x-auto text-xs flex items-center space-x-6 text-slate-300 scrollbar-none">
          <div className="flex items-center space-x-1.5 font-bold text-indigo-400 whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>CHỈ SỐ TOÀN CẦU:</span>
          </div>
          {GLOBAL_FREIGHT_MARKET_INDICES.map(idx => (
            <div key={idx.code} className="flex items-center space-x-2 whitespace-nowrap bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="font-semibold text-slate-200">{idx.code}:</span>
              <span className="font-bold text-white">{idx.latestValue.toLocaleString()} {idx.unit}</span>
              <span className={`flex items-center font-bold ${idx.changeRateWoW >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {idx.changeRateWoW >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {idx.changeRateWoW >= 0 ? `+${idx.changeRateWoW}%` : `${idx.changeRateWoW}%`}
              </span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {/* Corridor & Equipment Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Tuyến vận tải đối soát (Trade Lane Corridor):
              </label>
              <div className="flex items-center space-x-2">
                <select
                  value={selectedLaneId}
                  onChange={(e) => setSelectedLaneId(e.target.value)}
                  className="w-full bg-slate-100 hover:bg-slate-50 font-bold text-slate-800 text-sm rounded-lg px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                >
                  {MASTER_TRADE_LANE_BENCHMARKS.map(lane => (
                    <option key={lane.id} value={lane.id}>
                      {lane.transportMode === 'AIR_FREIGHT' ? '✈️ [AIR] ' : '🚢 [SEA] '} 
                      {lane.originPort} ➔ {lane.destinationPort} ({lane.equipmentType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lane Market Intelligence Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Xu hướng: <strong>{auditResult.lane.marketTrend === 'surging' ? 'Tăng nhiệt (+3.5%)' : 'Ổn định'}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                <Ship className="w-3.5 h-3.5 text-blue-600" />
                <span>Khoang tải: <strong>{auditResult.lane.spaceTightness === 'tight' ? 'Chặt (Tight)' : 'Đầy đủ'}</strong></span>
              </div>
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Hủy chuyến: <strong>{auditResult.lane.blankSailingRatePercent}% Blank sailings</strong></span>
              </div>
            </div>
          </div>

          {/* SECTION 1: Market Spectrum & Rate Positioning Visual Gauge */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span>Dải Cước Thị Trường & Vị Thế Báo Giá Hiện Tại</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đối soát cước của bạn với dải giá P10 (Sàn) - P50 (Trung bình chuẩn) - P90 (Trần) trên tuyến {auditResult.lane.originCode} ➔ {auditResult.lane.destinationCode}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  auditResult.marketPositioning === 'COMPETITIVE_SWEET_SPOT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : auditResult.marketPositioning === 'OVERPRICED_RISK'
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-blue-50 text-blue-700 border-blue-300'
                }`}>
                  {auditResult.marketPositioningLabelVi}
                </span>
              </div>
            </div>

            {/* Visual Gradient Gauge Bar */}
            <div className="pt-6 pb-4 px-2">
              <div className="relative">
                {/* Horizontal Bar */}
                <div className="h-4 w-full rounded-full bg-gradient-to-r from-emerald-400 via-blue-500 to-rose-500 shadow-inner relative" />

                {/* Markers on Bar */}
                {/* 1. Low Spot Rate (P10) */}
                <div className="absolute top-0 left-[5%] -translate-x-1/2 flex flex-col items-center">
                  <div className="w-1 h-6 bg-slate-600 rounded-full" />
                  <span className="text-[11px] font-bold text-slate-600 mt-1 whitespace-nowrap">
                    P10 Sàn: ${auditResult.lane.lowSpotRate}
                  </span>
                </div>

                {/* 2. Market Median (P50) */}
                <div className="absolute top-0 left-[50%] -translate-x-1/2 flex flex-col items-center">
                  <div className="w-1.5 h-7 bg-slate-900 rounded-full shadow" />
                  <span className="text-xs font-black text-slate-900 mt-1 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    P50 Median: ${auditResult.lane.marketMedianRate}
                  </span>
                </div>

                {/* 3. High Spot Rate (P90) */}
                <div className="absolute top-0 left-[95%] -translate-x-1/2 flex flex-col items-center">
                  <div className="w-1 h-6 bg-slate-600 rounded-full" />
                  <span className="text-[11px] font-bold text-slate-600 mt-1 whitespace-nowrap">
                    P90 Trần: ${auditResult.lane.highSpotRate}
                  </span>
                </div>

                {/* Current Quote Selling Rate Pin */}
                {(() => {
                  const min = auditResult.lane.lowSpotRate * 0.9;
                  const max = auditResult.lane.highSpotRate * 1.1;
                  const rawPercent = ((auditResult.currentQuoteSellingRate - min) / (max - min)) * 100;
                  const clampedPercent = Math.min(95, Math.max(5, rawPercent));
                  return (
                    <div 
                      className="absolute -top-10 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-300"
                      style={{ left: `${clampedPercent}%` }}
                    >
                      <div className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg shadow-lg flex items-center space-x-1 border border-indigo-400">
                        <span>Giá Chào: ${auditResult.currentQuoteSellingRate}</span>
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-indigo-600" />
                    </div>
                  );
                })()}

                {/* Buy Rate Pin */}
                {(() => {
                  const min = auditResult.lane.lowSpotRate * 0.9;
                  const max = auditResult.lane.highSpotRate * 1.1;
                  const rawPercent = ((auditResult.currentQuoteBuyRate - min) / (max - min)) * 100;
                  const clampedPercent = Math.min(95, Math.max(5, rawPercent));
                  return (
                    <div 
                      className="absolute top-8 -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-300"
                      style={{ left: `${clampedPercent}%` }}
                    >
                      <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[6px] border-b-slate-700" />
                      <div className="bg-slate-800 text-slate-200 font-bold text-[10px] px-2 py-0.5 rounded shadow">
                        Giá Vốn Hãng: ${auditResult.currentQuoteBuyRate}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 4 Scorecard KPI Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Giá chào / Giá vốn:</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-lg font-black text-slate-900">${auditResult.currentQuoteSellingRate}</span>
                  <span className="text-xs text-slate-400">/ ${auditResult.currentQuoteBuyRate}</span>
                </div>
                <span className="text-[11px] text-slate-500">Đơn vị: {auditResult.lane.equipmentType}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Biên Lợi Nhuận Gộp:</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className={`text-lg font-black ${auditResult.currentMarginAmount >= 200 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    +${auditResult.currentMarginAmount}
                  </span>
                  <span className="text-xs font-bold text-slate-600">({auditResult.currentMarginPercent}%)</span>
                </div>
                <span className="text-[11px] text-slate-500">Gross Profit / Container</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Xác Suất Thắng Thầu (AI):</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className={`text-lg font-black ${
                    auditResult.currentWinProbability >= 70 ? 'text-emerald-600' : auditResult.currentWinProbability >= 45 ? 'text-blue-600' : 'text-rose-600'
                  }`}>
                    {auditResult.currentWinProbability}%
                  </span>
                  <span className="text-xs text-slate-400">Win Rate</span>
                </div>
                <span className="text-[11px] text-slate-500">Dựa trên phân phối thị trường</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Lợi Nhuận Kỳ Vọng:</span>
                <div className="flex items-baseline space-x-1.5 mt-0.5">
                  <span className="text-lg font-black text-indigo-600">${auditResult.currentExpectedProfit}</span>
                  <span className="text-xs text-slate-400">/ cont</span>
                </div>
                <span className="text-[11px] text-slate-500">Expected Value (Win% * Margin)</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: 3 Intelligent Pricing Strategies Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>3 Chiến Lược Chào Giá Tối Ưu Hóa Biên Lợi Nhuận</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Lựa chọn chiến lược thích hợp với mục tiêu kinh doanh của lô hàng hiện tại
                </p>
              </div>

              {appliedStrategy && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Đã áp dụng vào báo giá!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* 1. AGGRESSIVE STRATEGY */}
              <div className="bg-white rounded-2xl border-2 border-emerald-200 hover:border-emerald-400 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      ⚡ Thâu Tóm Khách Mới
                    </span>
                    <span className="text-xs font-bold text-slate-400">P10 Sàn</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mb-1">
                    {auditResult.strategies.aggressive.nameVi}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {auditResult.strategies.aggressive.taglineVi}
                  </p>

                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Giá chào đề xuất:</span>
                      <span className="text-base font-black text-emerald-700">${auditResult.strategies.aggressive.proposedSellingPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Lãi gộp (Margin):</span>
                      <span className="font-bold text-slate-800">+${auditResult.strategies.aggressive.grossMarginAmount} ({auditResult.strategies.aggressive.grossMarginPercent}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Xác suất thắng thầu:</span>
                      <span className="font-extrabold text-emerald-600">{auditResult.strategies.aggressive.winProbabilityPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-emerald-200">
                      <span className="text-slate-600 font-medium">Lợi nhuận kỳ vọng:</span>
                      <span className="font-black text-slate-900">${auditResult.strategies.aggressive.expectedGrossMargin} / cont</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-bold text-slate-700 uppercase block">Ưu thế tác chiến:</span>
                    {auditResult.strategies.aggressive.tacticalAdvantageVi.map((adv, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleApplyStrategy(auditResult.strategies.aggressive)}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-1.5"
                >
                  <span>Áp Dụng Chiến Lược Này</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* 2. BALANCED (AI SWEET SPOT - RECOMMENDED) */}
              <div className="bg-white rounded-2xl border-2 border-blue-500 hover:border-blue-600 p-5 shadow-lg relative flex flex-col justify-between ring-4 ring-blue-500/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[11px] px-3.5 py-0.5 rounded-full shadow-md uppercase tracking-wide flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>AI Đề Xuất (Sweet Spot)</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 mt-1">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      🎯 Tối Ưu Lợi Nhuận Kỳ Vọng
                    </span>
                    <span className="text-xs font-bold text-blue-600">P45-P50</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mb-1">
                    {auditResult.strategies.balanced.nameVi}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {auditResult.strategies.balanced.taglineVi}
                  </p>

                  <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Giá chào đề xuất:</span>
                      <span className="text-base font-black text-blue-700">${auditResult.strategies.balanced.proposedSellingPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Lãi gộp (Margin):</span>
                      <span className="font-bold text-slate-800">+${auditResult.strategies.balanced.grossMarginAmount} ({auditResult.strategies.balanced.grossMarginPercent}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Xác suất thắng thầu:</span>
                      <span className="font-extrabold text-blue-600">{auditResult.strategies.balanced.winProbabilityPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-blue-200">
                      <span className="text-slate-600 font-bold">Lợi nhuận kỳ vọng:</span>
                      <span className="font-black text-blue-800 text-sm">${auditResult.strategies.balanced.expectedGrossMargin} / cont</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-bold text-slate-700 uppercase block">Ưu thế tác chiến:</span>
                    {auditResult.strategies.balanced.tacticalAdvantageVi.map((adv, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleApplyStrategy(auditResult.strategies.balanced)}
                  className="w-full py-2.5 px-4 rounded-xl font-black text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Áp Dụng Khuyến Nghị Này (AI)</span>
                </button>
              </div>

              {/* 3. PREMIUM STRATEGY */}
              <div className="bg-white rounded-2xl border-2 border-purple-200 hover:border-purple-400 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                      💎 VIP & Cam Kết Chỗ
                    </span>
                    <span className="text-xs font-bold text-slate-400">P75 Trần</span>
                  </div>
                  <h4 className="text-base font-black text-slate-900 mb-1">
                    {auditResult.strategies.premium.nameVi}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">
                    {auditResult.strategies.premium.taglineVi}
                  </p>

                  <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 space-y-1.5 mb-4">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Giá chào đề xuất:</span>
                      <span className="text-base font-black text-purple-700">${auditResult.strategies.premium.proposedSellingPrice}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Lãi gộp (Margin):</span>
                      <span className="font-bold text-slate-800">+${auditResult.strategies.premium.grossMarginAmount} ({auditResult.strategies.premium.grossMarginPercent}%)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600">Xác suất thắng thầu:</span>
                      <span className="font-extrabold text-purple-600">{auditResult.strategies.premium.winProbabilityPercent}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-purple-200">
                      <span className="text-slate-600 font-medium">Lợi nhuận kỳ vọng:</span>
                      <span className="font-black text-slate-900">${auditResult.strategies.premium.expectedGrossMargin} / cont</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-bold text-slate-700 uppercase block">Ưu thế tác chiến:</span>
                    {auditResult.strategies.premium.tacticalAdvantageVi.map((adv, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{adv}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleApplyStrategy(auditResult.strategies.premium)}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-600/20 transition flex items-center justify-center space-x-1.5"
                >
                  <span>Áp Dụng Chiến Lược Này</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>

          {/* SECTION 3: Interactive What-If Simulator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <span>Bộ Mô Phỏng Giá Bán & Lợi Nhuận Kỳ Vọng (What-If Simulator)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Kéo thanh trượt để thử nghiệm các mức giá chào khác nhau và xem phản ứng tức thì của tỷ lệ chốt đơn (Win Rate)
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-slate-500">Số lượng container:</span>
                <select
                  value={volumeConts}
                  onChange={(e) => setVolumeConts(Number(e.target.value))}
                  className="bg-slate-100 font-bold text-slate-800 text-xs rounded-lg px-2.5 py-1 border border-slate-300"
                >
                  {[1, 2, 5, 10, 20, 50].map(v => (
                    <option key={v} value={v}>{v} container</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Slider Control */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">Giá chào bán mô phỏng:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black text-indigo-700">${simulatedPrice}</span>
                  <span className="text-xs text-slate-500">USD/{auditResult.lane.equipmentType}</span>
                </div>
              </div>

              <input
                type="range"
                min={Math.round(auditResult.lane.lowSpotRate * 0.9)}
                max={Math.round(auditResult.lane.highSpotRate * 1.15)}
                step={10}
                value={simulatedPrice}
                onChange={(e) => setSimulatedPrice(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />

              <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                <span>Min: ${Math.round(auditResult.lane.lowSpotRate * 0.9)}</span>
                <span className="text-emerald-600">Sàn P10: ${auditResult.lane.lowSpotRate}</span>
                <span className="text-blue-600 font-bold">Trung bình P50: ${auditResult.lane.marketMedianRate}</span>
                <span className="text-purple-600">Trần P90: ${auditResult.lane.highSpotRate}</span>
                <span>Max: ${Math.round(auditResult.lane.highSpotRate * 1.15)}</span>
              </div>
            </div>

            {/* Live Reaction Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
              <div>
                <span className="text-[11px] text-slate-500 block">Tỷ lệ chốt đơn (Win Rate):</span>
                <span className={`text-xl font-black ${
                  simWinRate >= 70 ? 'text-emerald-600' : simWinRate >= 45 ? 'text-blue-600' : 'text-rose-600'
                }`}>
                  {simWinRate}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Xác suất khách duyệt giá</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Lãi gộp 1 container:</span>
                <span className={`text-xl font-black ${simMarginAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {simMarginAmount >= 0 ? `+$${simMarginAmount}` : `-$${Math.abs(simMarginAmount)}`}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Biên lãi: {simMarginPercent}%</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Tổng lãi đơn hàng ({volumeConts} cont):</span>
                <span className="text-xl font-black text-indigo-900">
                  ${(simMarginAmount * volumeConts).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Nếu trúng thầu 100%</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 block">Tổng Lợi Nhuận Kỳ Vọng:</span>
                <span className="text-xl font-black text-indigo-700">
                  ${simTotalExpectedProfit.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Win% * Tổng lãi</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleApplySimulatedRate}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center space-x-1.5 shadow"
              >
                <span>Áp Dụng Mức Giá Mô Phỏng Này (${simulatedPrice})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* SECTION 4: Competitor Landscape & 12-Week Historical Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Competitor Benchmark Table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span>Bản Đồ Đối Thủ Cạnh Tranh Trên Tuyến</span>
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-2.5">Đối thủ</th>
                      <th className="py-2 px-2">Giá ước tính</th>
                      <th className="py-2 px-2">Transit</th>
                      <th className="py-2 px-2">Giữ chỗ</th>
                      <th className="py-2 px-2">Free DEM</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditResult.lane.competitors.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2.5 font-bold text-slate-800">
                          <div>{comp.competitorName}</div>
                          <span className="text-[10px] text-slate-400 block">{comp.notesVi}</span>
                        </td>
                        <td className="py-2 px-2 font-black text-slate-900">
                          ${comp.estimatedRate}
                        </td>
                        <td className="py-2 px-2 text-slate-600">
                          {comp.transitDays} ngày
                        </td>
                        <td className="py-2 px-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            comp.spaceGuarantee === 'GUARANTEED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {comp.spaceGuarantee === 'GUARANTEED' ? 'Cam kết' : 'Thường'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-600 font-medium">
                          {comp.freeDemDetDays} ngày
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 12-Week Historical Trend Visual Chart */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Diễn Biến Cước 12 Tuần Gần Nhất (Trend)</span>
                </h3>
                <span className="text-[11px] text-slate-400">Đơn vị: USD / Spot</span>
              </div>

              {/* Simple Responsive SVG Trend Chart */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <svg viewBox="0 0 500 150" className="w-full h-36">
                  {/* Grid Lines */}
                  <line x1="40" y1="20" x2="490" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="40" y1="70" x2="490" y2="70" stroke="#e2e8f0" strokeDasharray="3,3" />
                  <line x1="40" y1="120" x2="490" y2="120" stroke="#e2e8f0" strokeDasharray="3,3" />

                  {/* Y-Axis Labels */}
                  <text x="35" y="24" fontSize="9" fill="#94a3b8" textAnchor="end">
                    ${auditResult.lane.highSpotRate}
                  </text>
                  <text x="35" y="74" fontSize="9" fill="#94a3b8" textAnchor="end">
                    ${auditResult.lane.marketMedianRate}
                  </text>
                  <text x="35" y="124" fontSize="9" fill="#94a3b8" textAnchor="end">
                    ${auditResult.lane.lowSpotRate}
                  </text>

                  {/* Trend Area & Line */}
                  {(() => {
                    const points = auditResult.lane.historicalTrend;
                    if (points.length < 2) return null;
                    const min = auditResult.lane.lowSpotRate * 0.85;
                    const max = auditResult.lane.highSpotRate * 1.05;
                    const getY = (val: number) => 130 - ((val - min) / (max - min)) * 105;
                    const getX = (idx: number) => 50 + (idx / (points.length - 1)) * 430;

                    const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.marketMedianSpot)}`).join(' ');
                    const areaStr = `${pathStr} L ${getX(points.length - 1)} 130 L ${getX(0)} 130 Z`;

                    return (
                      <>
                        <path d={areaStr} fill="rgba(59, 130, 246, 0.1)" />
                        <path d={pathStr} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                        {points.map((p, i) => (
                          <g key={i}>
                            <circle cx={getX(i)} cy={getY(p.marketMedianSpot)} r="3" fill="#1e40af" />
                            {i % 3 === 0 || i === points.length - 1 ? (
                              <text x={getX(i)} y="145" fontSize="8" fill="#64748b" textAnchor="middle">
                                {p.weekLabel}
                              </text>
                            ) : null}
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Đường xanh: Giá bình quân Spot Rate thị trường</span>
                <span className="font-bold text-slate-700">Xu hướng 3 tháng: +18.4%</span>
              </div>
            </div>

          </div>

          {/* SECTION 5: AI Strategic Market Insights (Gemini Powered) */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl shadow-xl space-y-4 border border-indigo-800/50">
            <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <span>Phân Tích Chiến Lược Thị Trường AI (Gemini Flash Intelligence)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                      Độ tin cậy: {aiAnalysis?.confidenceScore || 94}%
                    </span>
                  </h3>
                  <p className="text-xs text-indigo-200/80">
                    Chiến thuật đấu thầu, xử lý từ chối và vũ khí chốt đơn cho đội ngũ Sales
                  </p>
                </div>
              </div>

              {isAiLoading && (
                <div className="flex items-center space-x-2 text-xs text-indigo-300">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>AI đang phân tích...</span>
                </div>
              )}
            </div>

            {aiAnalysis ? (
              <div className="space-y-4 text-xs">
                {/* Macro Summary */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <span className="font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                    Bức tranh vĩ mô & Chu kỳ biến động:
                  </span>
                  <p className="text-indigo-100 leading-relaxed">
                    {aiAnalysis.macroMarketSummaryVi}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Space & DEM/DET */}
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <div>
                      <span className="font-bold text-amber-300 block mb-0.5">
                        Khuyến nghị giữ chỗ hãng tàu (Space):
                      </span>
                      <p className="text-indigo-100">
                        {aiAnalysis.carrierSpaceAdviceVi}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <span className="font-bold text-emerald-300 block mb-0.5">
                        Đòn bẩy thời gian Free DEM/DET:
                      </span>
                      <p className="text-indigo-100">
                        {aiAnalysis.demDetNegotiationAdviceVi}
                      </p>
                    </div>
                  </div>

                  {/* Sales Battlecards */}
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2">
                    <span className="font-bold text-amber-300 block">
                      3 Luận Điểm Vàng Giúp Sales Bảo Vệ Giá Chào:
                    </span>
                    <div className="space-y-1.5">
                      {aiAnalysis.salesPitchTalkingPointsVi.map((pt, i) => (
                        <div key={i} className="flex items-start space-x-2 text-indigo-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="italic">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Competitor Countermeasures */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <span className="font-bold text-rose-300 uppercase tracking-wider block mb-1.5">
                    Chiến thuật khắc chế đối thủ trực diện:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {aiAnalysis.competitorCountermeasuresVi.map((cm, idx) => (
                      <div key={idx} className="bg-slate-900/60 p-2.5 rounded-lg border border-white/10 text-slate-200">
                        {cm}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* SECTION 6: Profit Leakages Warnings */}
          {auditResult.profitLeakages.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-4 space-y-2">
              <h4 className="text-sm font-bold text-amber-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Cảnh Báo Thất Thoát Lợi Nhuận & Phụ Phí Còn Thiếu ({auditResult.profitLeakages.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {auditResult.profitLeakages.map((leak, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 text-xs text-slate-700 shadow-sm">
                    <div className="font-bold text-amber-950 flex items-center space-x-1.5 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{leak.titleVi}</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{leak.descriptionVi}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-blue-500" />
            <span>
              Giá chào đề xuất: <strong className="text-slate-800">${simulatedPrice}</strong> | Biên lãi: <strong className="text-emerald-700">+{simMarginPercent}%</strong> | Tỷ lệ chốt đơn: <strong className="text-blue-700">{simWinRate}%</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
            >
              Đóng
            </button>

            <button
              onClick={handleApplySimulatedRate}
              className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Áp Dụng Vào Báo Giá (${simulatedPrice})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
