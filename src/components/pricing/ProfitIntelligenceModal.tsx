import React, { useState, useMemo } from 'react';
import { QuoteData, LineItem, Currency, QuoteCurrency } from '../../types/logistics';
import { 
  ProfitMarginSummary, 
  PricingPolicyItem, 
  WhatIfAdjustmentMode, 
  WhatIfScenarioRequest, 
  WhatIfScenarioResult,
  UserProfitPermissions
} from '../../types/pricingIntelligence';
import { 
  calculateCompleteProfitSummary, 
  simulateWhatIfPricing 
} from '../../services/pricing/profitIntelligenceEngine';
import { roundCurrency } from '../../services/pricing/currencyCalculator';
import { formatUSD, formatVND, formatPercent } from '../../utils/formatters';
import { 
  TrendingUp, 
  Calculator, 
  Sliders, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  Sparkles, 
  RotateCcw, 
  FileCheck, 
  Layers, 
  X, 
  Info,
  DollarSign,
  Percent,
  Lock,
  FileSpreadsheet
} from 'lucide-react';

interface ProfitIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteData;
  activePolicy: PricingPolicyItem;
  allPolicies: PricingPolicyItem[];
  onSelectPolicy: (policy: PricingPolicyItem) => void;
  onApplyWhatIfToQuote: (newItems: LineItem[], appliedReason?: string) => void;
  onOpenPolicyManagement: () => void;
  userPermissions?: UserProfitPermissions;
}

export const ProfitIntelligenceModal: React.FC<ProfitIntelligenceModalProps> = ({
  isOpen,
  onClose,
  quote,
  activePolicy,
  allPolicies,
  onSelectPolicy,
  onApplyWhatIfToQuote,
  onOpenPolicyManagement,
  userPermissions = {
    canViewCost: true,
    canViewProfit: true,
    canEditPricing: true,
    canApplyWhatIf: true,
    canOverrideMargin: true,
    canApproveLowMargin: true,
  },
}) => {
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'WHAT_IF' | 'POLICIES'>('ANALYSIS');
  const [currency, setCurrency] = useState<QuoteCurrency>(quote.quoteCurrency || 'USD');
  const isVnd = currency === 'VND';
  const exchangeRate = Number(quote.exchangeRate) > 0 ? Number(quote.exchangeRate) : 25400;

  // 1. Current Profit Summary (O(n) memoized)
  const currentSummary = useMemo(() => {
    return calculateCompleteProfitSummary(quote, activePolicy, currency);
  }, [quote, activePolicy, currency]);

  // 2. What-If Local State
  const [whatIfMode, setWhatIfMode] = useState<WhatIfAdjustmentMode>('TARGET_MARGIN');
  const [targetMarginInput, setTargetMarginInput] = useState<number>(activePolicy.targetMarginPercent);
  const [targetSellInput, setTargetSellInput] = useState<number>(
    isVnd ? currentSummary.totalSellVnd : currentSummary.totalSellUsd
  );
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(5);
  const [targetProfitInput, setTargetProfitInput] = useState<number>(
    isVnd ? currentSummary.grossProfitVnd : currentSummary.grossProfitUsd
  );
  const [allocationStrategy, setAllocationStrategy] = useState<'PROPORTIONAL' | 'FREIGHT_ONLY'>('PROPORTIONAL');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [overrideReasonCategory, setOverrideReasonCategory] = useState<string>('STRATEGIC_CUSTOMER');

  // 3. Local What-If Simulation (100% Client-Side, Zero Network Calls)
  const whatIfScenarioRequest: WhatIfScenarioRequest = useMemo(() => {
    return {
      mode: whatIfMode,
      targetMarginPercent: targetMarginInput,
      targetSellPrice: targetSellInput,
      discountPercent: discountPercentInput,
      targetProfitAmount: targetProfitInput,
      currency,
    };
  }, [whatIfMode, targetMarginInput, targetSellInput, discountPercentInput, targetProfitInput, currency]);

  const whatIfResult: WhatIfScenarioResult = useMemo(() => {
    return simulateWhatIfPricing(quote, whatIfScenarioRequest, activePolicy);
  }, [quote, whatIfScenarioRequest, activePolicy]);

  if (!isOpen) return null;

  // Format currency helpers
  const formatMoney = (valUsd: number, valVnd: number) => {
    return isVnd ? formatVND(valVnd) : formatUSD(valUsd);
  };

  // Status Badge Helper
  const renderStatusBadge = (summary: ProfitMarginSummary) => {
    switch (summary.marginStatus) {
      case 'ABOVE_TARGET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            VƯỢT MỤC TIÊU ({formatPercent(summary.grossMarginPercent, 1)})
          </span>
        );
      case 'AT_TARGET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            ĐẠT MỤC TIÊU ({formatPercent(summary.grossMarginPercent, 1)})
          </span>
        );
      case 'BELOW_TARGET':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            DƯỚI MỤC TIÊU ({formatPercent(summary.grossMarginPercent, 1)})
          </span>
        );
      case 'BELOW_MINIMUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            DƯỚI MỨC TỐI THIỂU ({formatPercent(summary.grossMarginPercent, 1)})
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/50">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            BỊ CHẶN (CRITICAL)
          </span>
        );
      case 'NO_COST':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            CHƯA CÓ GIÁ VỐN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
            {summary.marginStatus}
          </span>
        );
    }
  };

  // Approval Level Badge
  const renderApprovalLevelBadge = (level: string) => {
    switch (level) {
      case 'AUTO_ELIGIBLE':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            Tự động đủ điều kiện (Auto-Eligible)
          </span>
        );
      case 'SALES_MANAGER':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800">
            Cần Trưởng phòng kinh doanh duyệt
          </span>
        );
      case 'MANAGEMENT':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800">
            Cần Ban Giám Đốc phê duyệt
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-950 text-red-300 border border-red-800">
            Không đủ điều kiện bán (Blocked)
          </span>
        );
      default:
        return <span>{level}</span>;
    }
  };

  // Handler to Apply What-If Simulation to Quotation Line Items
  const handleApplyWhatIf = () => {
    const simSellUsd = whatIfResult.simulatedSummary.totalSellUsd;
    const origSellUsd = currentSummary.totalSellUsd;
    if (origSellUsd <= 0 || simSellUsd <= 0) return;

    const scale = simSellUsd / origSellUsd;

    let updatedItems: LineItem[] = [];

    if (allocationStrategy === 'FREIGHT_ONLY') {
      // Keep local charges intact, only adjust freight lines
      const nonFreightSellUsd = (quote.items || [])
        .filter(i => i.category !== 'FREIGHT')
        .reduce((sum, i) => sum + (Number(i.amountUsd) || 0), 0);
      
      const targetFreightSellUsd = Math.max(0, simSellUsd - nonFreightSellUsd);
      const origFreightSellUsd = (quote.items || [])
        .filter(i => i.category === 'FREIGHT')
        .reduce((sum, i) => sum + (Number(i.amountUsd) || 0), 0);

      const freightScale = origFreightSellUsd > 0 ? targetFreightSellUsd / origFreightSellUsd : 1;

      updatedItems = (quote.items || []).map(item => {
        if (item.category === 'FREIGHT') {
          const newUnitPrice = (Number(item.unitPrice) || 0) * freightScale;
          return {
            ...item,
            unitPrice: roundCurrency(newUnitPrice, item.currency),
            isOverridden: true,
            overrideReason: overrideReason || `What-If Simulation (${whatIfMode})`,
          };
        }
        return item;
      });
    } else {
      // Proportional distribution across all lines
      updatedItems = (quote.items || []).map(item => {
        const newUnitPrice = (Number(item.unitPrice) || 0) * scale;
        return {
          ...item,
          unitPrice: roundCurrency(newUnitPrice, item.currency),
          isOverridden: true,
          overrideReason: overrideReason || `What-If Simulation (${whatIfMode})`,
        };
      });
    }

    const finalReason = overrideReason.trim() 
      ? `[${overrideReasonCategory}] ${overrideReason.trim()}`
      : `Điều chỉnh giá theo What-If Calculator (${whatIfMode})`;

    onApplyWhatIfToQuote(updatedItems, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div 
        id="profit-intelligence-modal"
        className="bg-slate-900 text-slate-100 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Profit & Margin Intelligence
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  SMART PRICING ENGINE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Báo giá: <span className="font-mono font-bold text-slate-200">{quote.quoteNumber}</span> | Khách hàng: <span className="font-medium text-slate-200">{quote.customer.companyName || 'Khách vãng lai'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Currency toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  !isVnd ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setCurrency('VND')}
                className={`px-2 py-0.5 rounded font-bold transition-all ${
                  isVnd ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                VND
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/40 text-xs font-bold gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('ANALYSIS')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'ANALYSIS'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>1. Phân Tích Lợi Nhuận & Biên Lãi (Profit Analysis)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WHAT_IF')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'WHAT_IF'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>2. What-If Pricing Calculator (Mô Phỏng Giá)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('POLICIES')}
            className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
              activeTab === 'POLICIES'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Chính Sách Định Giá & Ngưỡng Duyệt ({activePolicy.policyCode})</span>
          </button>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================= TAB 1: PROFIT ANALYSIS ================= */}
          {activeTab === 'ANALYSIS' && (
            <div className="space-y-6">
              
              {/* Top KPI Metrics Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* 1. Buy Cost */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>TỔNG GIÁ VỐN (BUY)</span>
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-amber-300 mt-1">
                    {userPermissions.canViewCost 
                      ? formatMoney(currentSummary.totalBuyCostUsd, currentSummary.totalBuyCostVnd)
                      : '••••••'
                    }
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">100% Giá vốn các chặng</span>
                </div>

                {/* 2. Total Sell */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>DOANH THU (SELL)</span>
                    <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-cyan-300 mt-1">
                    {formatMoney(currentSummary.totalSellUsd, currentSummary.totalSellVnd)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Chưa gồm thuế VAT</span>
                </div>

                {/* 3. Gross Profit */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>LỢI NHUẬN GỘP</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-emerald-400 mt-1">
                    {userPermissions.canViewProfit
                      ? `+${formatMoney(currentSummary.grossProfitUsd, currentSummary.grossProfitVnd)}`
                      : '••••••'
                    }
                  </div>
                  <span className="text-[10px] text-emerald-400/80 font-mono">SELL - BUY COST</span>
                </div>

                {/* 4. Gross Margin % */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>BIÊN LÃI (MARGIN)</span>
                    <Percent className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className={`text-base sm:text-lg font-black font-mono mt-1 ${
                    currentSummary.grossMarginPercent >= activePolicy.targetMarginPercent
                      ? 'text-emerald-400'
                      : currentSummary.grossMarginPercent >= activePolicy.minimumMarginPercent
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}>
                    {formatPercent(currentSummary.grossMarginPercent, 2)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Profit / Sell × 100</span>
                </div>

                {/* 5. Markup % */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>TỶ LỆ MARKUP</span>
                    <Percent className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <div className="text-base sm:text-lg font-black font-mono text-indigo-300 mt-1">
                    {formatPercent(currentSummary.markupPercent, 2)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Profit / Buy Cost × 100</span>
                </div>

                {/* 6. Target vs Floor */}
                <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>TARGET / MIN MARGIN</span>
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-200 mt-1 space-y-0.5">
                    <div>Mục tiêu: <span className="text-emerald-400">{activePolicy.targetMarginPercent}%</span></div>
                    <div>Tối thiểu: <span className="text-rose-400">{activePolicy.minimumMarginPercent}%</span></div>
                  </div>
                </div>
              </div>

              {/* Status Explanation Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    {renderStatusBadge(currentSummary)}
                    <span className="text-xs text-slate-400 font-medium">| Cấp độ duyệt:</span>
                    {renderApprovalLevelBadge(currentSummary.approvalLevel)}
                  </div>
                  <div className="text-xs font-mono text-cyan-400">
                    Chính sách: <span className="font-bold underline cursor-pointer" onClick={() => setActiveTab('POLICIES')}>{activePolicy.policyName} ({activePolicy.policyCode})</span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  💡 {currentSummary.statusExplanationVi}
                </p>
                <p className="text-[11px] text-slate-400 italic">
                  {currentSummary.statusExplanationEn}
                </p>
              </div>

              {/* Price Recommendations & Thresholds Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Recommended Price */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-emerald-950/30 border border-emerald-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      GIÁ BÁN ĐỀ XUẤT (RECOMMENDED SELL)
                    </span>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {formatMoney(currentSummary.recommendedSellPriceUsd, currentSummary.recommendedSellPriceVnd)}
                  </div>
                  <p className="text-[11px] text-emerald-300/80">
                    Đảm bảo đạt đúng biên lãi mục tiêu {activePolicy.targetMarginPercent}%.
                  </p>
                </div>

                {/* Minimum Sell Price (Price Floor) */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-rose-950/30 border border-rose-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                      GIÁ SÀN TỐI THIỂU (PRICE FLOOR)
                    </span>
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {formatMoney(currentSummary.minimumSellPriceUsd, currentSummary.minimumSellPriceVnd)}
                  </div>
                  <p className="text-[11px] text-rose-300/80">
                    Bán dưới mức này đòi hỏi Trưởng phòng hoặc Ban Giám Đốc duyệt.
                  </p>
                </div>

                {/* Maximum Discount */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 to-cyan-950/30 border border-cyan-800/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                      CHIẾT KHẤU TỐI ĐA (MAX DISCOUNT)
                    </span>
                    <Percent className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-xl font-black font-mono text-white">
                    {formatMoney(currentSummary.maximumDiscountUsd, currentSummary.maximumDiscountUsd * exchangeRate)}
                    <span className="text-xs font-bold text-cyan-400 ml-2">
                      ({formatPercent(currentSummary.maximumDiscountPercent, 1)})
                    </span>
                  </div>
                  <p className="text-[11px] text-cyan-300/80">
                    Mức giảm tối đa vẫn đảm bảo không vi phạm biên lãi sàn.
                  </p>
                </div>
              </div>

              {/* Line-by-Line Profitability Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Chi Tiết Lợi Nhuận Từng Dòng Phí (Line-by-Line Breakdown)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {currentSummary.lineDetails.length} khoản phí
                  </span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-x-auto bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Khoản Phí</th>
                        <th className="p-2.5 text-center">SL / ĐVT</th>
                        <th className="p-2.5 text-right">Giá Vốn (Buy)</th>
                        <th className="p-2.5 text-right">Giá Bán (Sell)</th>
                        <th className="p-2.5 text-right">Lợi Nhuận</th>
                        <th className="p-2.5 text-right">Margin %</th>
                        <th className="p-2.5 text-right">Markup %</th>
                        <th className="p-2.5">Nguồn Cước</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {currentSummary.lineDetails.map((line) => {
                        const isLineProfitPositive = (isVnd ? line.profitVnd : line.profitUsd) >= 0;
                        return (
                          <tr key={line.itemId} className="hover:bg-slate-900/40">
                            <td className="p-2.5">
                              <div className="font-bold text-slate-200">{line.code}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{line.description}</div>
                            </td>
                            <td className="p-2.5 text-center font-mono text-slate-300">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="p-2.5 text-right font-mono text-amber-300">
                              {userPermissions.canViewCost 
                                ? formatMoney(line.totalCostUsd, line.totalCostVnd)
                                : '••••'
                              }
                            </td>
                            <td className="p-2.5 text-right font-mono text-cyan-300 font-bold">
                              {formatMoney(line.totalSellUsd, line.totalSellVnd)}
                            </td>
                            <td className={`p-2.5 text-right font-mono font-bold ${
                              isLineProfitPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {userPermissions.canViewProfit 
                                ? `${isLineProfitPositive ? '+' : ''}${formatMoney(line.profitUsd, line.profitVnd)}`
                                : '••••'
                              }
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                line.marginPercent >= activePolicy.targetMarginPercent
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : line.marginPercent >= activePolicy.minimumMarginPercent
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}>
                                {formatPercent(line.marginPercent, 1)}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-indigo-300 text-[11px]">
                              {formatPercent(line.markupPercent, 1)}
                            </td>
                            <td className="p-2.5">
                              {line.priceSource ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                  {line.priceSource}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Thủ công</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: WHAT-IF PRICING CALCULATOR ================= */}
          {activeTab === 'WHAT_IF' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-white">What-If Pricing Calculator (Mô Phỏng Giá Tức Thì)</h4>
                  <p className="text-slate-400 leading-relaxed">
                    Công cụ chạy hoàn toàn in-memory trên trình duyệt của bạn (Zero Firebase queries). Bạn có thể thử nghiệm các kịch bản giảm giá hoặc điều chỉnh biên lãi, kiểm tra trước tác động lợi nhuận và hạn mức phê duyệt trước khi quyết định áp dụng vào báo giá.
                  </p>
                </div>
              </div>

              {/* Mode Selectors */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setWhatIfMode('TARGET_MARGIN')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    whatIfMode === 'TARGET_MARGIN'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">1. Theo Biên Lãi %</div>
                  <div className="text-[10px] text-slate-400 mt-1">Target Margin Slider</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatIfMode('DISCOUNT_PERCENT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    whatIfMode === 'DISCOUNT_PERCENT'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">2. Theo Chiết Khấu %</div>
                  <div className="text-[10px] text-slate-400 mt-1">Discount Simulation</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatIfMode('DIRECT_SELL')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    whatIfMode === 'DIRECT_SELL'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">3. Đặt Giá Bán Trực Tiếp</div>
                  <div className="text-[10px] text-slate-400 mt-1">Target Total Sell</div>
                </button>

                <button
                  type="button"
                  onClick={() => setWhatIfMode('TARGET_PROFIT')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    whatIfMode === 'TARGET_PROFIT'
                      ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="font-bold text-xs">4. Theo Lợi Nhuận Gộp</div>
                  <div className="text-[10px] text-slate-400 mt-1">Target Gross Profit</div>
                </button>
              </div>

              {/* Interactive Controllers Box */}
              <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                {whatIfMode === 'TARGET_MARGIN' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Biên Lợi Nhuận Mục Tiêu (Target Margin %):</span>
                      <span className="text-base font-black font-mono text-cyan-400">{targetMarginInput}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="0.5"
                      value={targetMarginInput}
                      onChange={(e) => setTargetMarginInput(Number(e.target.value))}
                      className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>5% (Thấp)</span>
                      <span>15% (Sàn Min)</span>
                      <span>20% (Mục Tiêu Chuẩn)</span>
                      <span>35%+ (Cao)</span>
                    </div>
                  </div>
                )}

                {whatIfMode === 'DISCOUNT_PERCENT' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Mức Chiết Khấu / Giảm Giá (Discount %):</span>
                      <span className="text-base font-black font-mono text-amber-400">-{discountPercentInput}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="35"
                      step="0.5"
                      value={discountPercentInput}
                      onChange={(e) => setDiscountPercentInput(Number(e.target.value))}
                      className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0% (Không giảm)</span>
                      <span>{formatPercent(currentSummary.maximumDiscountPercent, 1)} (Max Discount an toàn)</span>
                      <span>30%+ (Nguy cơ lỗ)</span>
                    </div>
                  </div>
                )}

                {whatIfMode === 'DIRECT_SELL' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Tổng Giá Bán Mong Muốn ({currency}):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={targetSellInput}
                        onChange={(e) => setTargetSellInput(Number(e.target.value))}
                        className="w-full bg-slate-900 text-white font-mono font-bold px-4 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="Nhập giá bán mong muốn..."
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                        {currency}
                      </span>
                    </div>
                  </div>
                )}

                {whatIfMode === 'TARGET_PROFIT' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300">
                      Mức Lợi Nhuận Gộp Mong Muốn ({currency}):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={targetProfitInput}
                        onChange={(e) => setTargetProfitInput(Number(e.target.value))}
                        className="w-full bg-slate-900 text-white font-mono font-bold px-4 py-2.5 rounded-xl border border-slate-700 text-sm focus:outline-none focus:border-cyan-500"
                        placeholder="Nhập mức lợi nhuận mong muốn..."
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">
                        {currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Before vs After Comparison Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* BEFORE */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">HIỆN TẠI (BEFORE)</span>
                    {renderStatusBadge(whatIfResult.originalSummary)}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Doanh thu bán:</span>
                      <span className="font-mono font-bold text-slate-200">
                        {formatMoney(whatIfResult.originalSummary.totalSellUsd, whatIfResult.originalSummary.totalSellVnd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Giá vốn (Cost):</span>
                      <span className="font-mono text-amber-300">
                        {formatMoney(whatIfResult.originalSummary.totalBuyCostUsd, whatIfResult.originalSummary.totalBuyCostVnd)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-300 font-medium">Lợi nhuận gộp:</span>
                      <span className="font-mono font-bold text-emerald-400">
                        +{formatMoney(whatIfResult.originalSummary.grossProfitUsd, whatIfResult.originalSummary.grossProfitVnd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">Biên lãi (Margin):</span>
                      <span className="font-mono font-bold text-cyan-400">
                        {formatPercent(whatIfResult.originalSummary.grossMarginPercent, 2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AFTER */}
                <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                  whatIfResult.isPriceFloorViolated
                    ? 'bg-rose-950/20 border-rose-800/60'
                    : 'bg-emerald-950/20 border-emerald-800/60'
                }`}>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-cyan-300 uppercase">MÔ PHỎNG (AFTER SIMULATION)</span>
                    {renderStatusBadge(whatIfResult.simulatedSummary)}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Doanh thu mới:</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-white">
                          {formatMoney(whatIfResult.simulatedSummary.totalSellUsd, whatIfResult.simulatedSummary.totalSellVnd)}
                        </span>
                        <span className={`text-[10px] font-mono ml-1.5 ${
                          whatIfResult.diffSellUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          ({whatIfResult.diffSellUsd >= 0 ? '+' : ''}{formatMoney(whatIfResult.diffSellUsd, whatIfResult.diffSellVnd)})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Giá vốn (Cost):</span>
                      <span className="font-mono text-amber-300">
                        {formatMoney(whatIfResult.simulatedSummary.totalBuyCostUsd, whatIfResult.simulatedSummary.totalBuyCostVnd)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800/80 pt-1.5">
                      <span className="text-slate-200 font-medium">Lợi nhuận gộp mới:</span>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          +{formatMoney(whatIfResult.simulatedSummary.grossProfitUsd, whatIfResult.simulatedSummary.grossProfitVnd)}
                        </span>
                        <span className={`text-[10px] font-mono ml-1.5 ${
                          whatIfResult.diffProfitUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          ({whatIfResult.diffProfitUsd >= 0 ? '+' : ''}{formatMoney(whatIfResult.diffProfitUsd, whatIfResult.diffProfitVnd)})
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-200 font-medium">Biên lãi mới:</span>
                      <div className="text-right">
                        <span className="font-mono font-black text-cyan-300 text-sm">
                          {formatPercent(whatIfResult.simulatedSummary.grossMarginPercent, 2)}
                        </span>
                        <span className={`text-[10px] font-mono ml-1.5 ${
                          whatIfResult.diffMarginPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          ({whatIfResult.diffMarginPercent >= 0 ? '+' : ''}{formatPercent(whatIfResult.diffMarginPercent, 2)})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Warnings & Override Requirement if Price Floor Violated */}
              {whatIfResult.isPriceFloorViolated && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>CẢNH BÁO: MỨC GIÁ BÁN MÔ PHỎNG THẤP HƠN GIÁ SÀN (PRICE FLOOR)</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed">
                    {whatIfResult.warningMessageVi} Để áp dụng mức giá này, nhân viên kinh doanh bắt buộc phải cung cấp lý do giải trình để gửi kèm khi trình phê duyệt.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                        Nhóm lý do giải trình:
                      </label>
                      <select
                        value={overrideReasonCategory}
                        onChange={(e) => setOverrideReasonCategory(e.target.value)}
                        className="w-full bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-rose-800 focus:outline-none"
                      >
                        <option value="STRATEGIC_CUSTOMER">Khách hàng chiến lược (Strategic Account)</option>
                        <option value="MARKET_COMPETITION">Cạnh tranh gay gắt từ đối thủ (Market Competition)</option>
                        <option value="LONG_TERM_CONTRACT">Cam kết sản lượng hợp đồng dài hạn (High Volume)</option>
                        <option value="TRIAL_SHIPMENT">Lô hàng thử nghiệm mở rộng tuyến mới (Trial Shipment)</option>
                        <option value="MANAGEMENT_APPROVED">Đã thỏa thuận trước với Ban Giám Đốc</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-rose-300 mb-1">
                        Ghi chú chi tiết lý do (*):
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="VD: Giảm giá để giữ khách hàng ký HĐ năm 2026..."
                        className="w-full bg-slate-900 text-slate-200 text-xs px-3 py-2 rounded-lg border border-rose-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Allocation Strategy & Actions */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400 font-medium">Phương thức phân bổ vào dòng cước:</span>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={allocationStrategy === 'PROPORTIONAL'}
                      onChange={() => setAllocationStrategy('PROPORTIONAL')}
                      className="accent-cyan-400"
                    />
                    <span className="text-slate-200">Phân bổ tỷ lệ đều các mục</span>
                  </label>
                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="strategy"
                      checked={allocationStrategy === 'FREIGHT_ONLY'}
                      onChange={() => setAllocationStrategy('FREIGHT_ONLY')}
                      className="accent-cyan-400"
                    />
                    <span className="text-slate-200">Chỉ điều chỉnh cước chính (Freight)</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetMarginInput(activePolicy.targetMarginPercent);
                      setDiscountPercentInput(0);
                      setTargetSellInput(isVnd ? currentSummary.totalSellVnd : currentSummary.totalSellUsd);
                      setTargetProfitInput(isVnd ? currentSummary.grossProfitVnd : currentSummary.grossProfitUsd);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục mặc định</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyWhatIf}
                    disabled={!userPermissions.canApplyWhatIf || (whatIfResult.isPriceFloorViolated && !userPermissions.canOverrideMargin)}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all active:scale-[0.99] flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Áp Dụng Vào Báo Giá (Apply to Quote)</span>
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 3: PRICING POLICIES & THRESHOLDS ================= */}
          {activeTab === 'POLICIES' && (
            <div className="space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Chính Sách Biên Lợi Nhuận & Phân Tầng Phê Duyệt</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hệ thống tự động ưu tiên: Khách hàng cụ thể → Phân khúc → Phương thức vận tải → Toàn công ty.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenPolicyManagement}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Quản Lý Danh Mục Chính Sách</span>
                </button>
              </div>

              {/* Active Policy Highlight */}
              <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      ĐANG ÁP DỤNG CHO BÁO GIÁ
                    </span>
                    <h4 className="text-sm font-bold text-white">{activePolicy.policyName}</h4>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Mã: {activePolicy.policyCode} (v{activePolicy.version})</span>
                </div>

                <p className="text-xs text-slate-300">{activePolicy.notes}</p>

                {/* Policy Parameters Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Biên Lãi Mục Tiêu:</span>
                    <span className="text-base font-black font-mono text-emerald-400 mt-0.5 block">
                      {activePolicy.targetMarginPercent}%
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Biên Lãi Tối Thiểu (Sàn):</span>
                    <span className="text-base font-black font-mono text-rose-400 mt-0.5 block">
                      {activePolicy.minimumMarginPercent}%
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Chiết Khấu Tối Đa:</span>
                    <span className="text-base font-black font-mono text-amber-400 mt-0.5 block">
                      {activePolicy.maximumDiscountPercent || 20}%
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px] block">Phạm Vi Áp Dụng:</span>
                    <span className="text-xs font-bold text-cyan-300 mt-1 block">
                      {activePolicy.scope}
                    </span>
                  </div>
                </div>

                {/* Approval Thresholds Matrix */}
                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Ma Trận Phê Duyệt Tự Động (Approval Thresholds Matrix):
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60">
                      <div className="text-[10px] text-emerald-300 font-bold">1. AUTO-ELIGIBLE</div>
                      <div className="font-mono text-white text-xs mt-0.5">≥ {activePolicy.approvalThresholds.autoEligibleMargin}%</div>
                      <div className="text-[10px] text-emerald-400/80 mt-1">Tự động cho phép gửi</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60">
                      <div className="text-[10px] text-amber-300 font-bold">2. SALES MANAGER</div>
                      <div className="font-mono text-white text-xs mt-0.5">
                        {activePolicy.approvalThresholds.salesManagerApprovalMargin}% - {(activePolicy.approvalThresholds.autoEligibleMargin - 0.01).toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-amber-400/80 mt-1">Trưởng phòng duyệt</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60">
                      <div className="text-[10px] text-rose-300 font-bold">3. DIRECTOR / MANAGEMENT</div>
                      <div className="font-mono text-white text-xs mt-0.5">
                        {activePolicy.approvalThresholds.managementApprovalMargin}% - {(activePolicy.approvalThresholds.salesManagerApprovalMargin - 0.01).toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-rose-400/80 mt-1">Ban Giám Đốc duyệt</div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-800">
                      <div className="text-[10px] text-red-300 font-bold">4. BLOCKED</div>
                      <div className="font-mono text-white text-xs mt-0.5">&lt; {activePolicy.approvalThresholds.blockMargin}%</div>
                      <div className="text-[10px] text-red-400/80 mt-1">Chặn tuyệt đối</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Switchable Available Policies */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Chọn Chính Sách Khác Cho Báo Giá Này:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allPolicies.map((p) => {
                    const isCurrent = p.id === activePolicy.id;
                    return (
                      <div 
                        key={p.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                          isCurrent 
                            ? 'bg-slate-900 border-cyan-500/80 shadow-xs' 
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-xs text-white">{p.policyName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: <span className="text-emerald-400 font-bold">{p.targetMarginPercent}%</span> | Sàn: <span className="text-rose-400 font-bold">{p.minimumMarginPercent}%</span> | {p.scope}
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Đang chọn
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectPolicy(p)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                          >
                            Áp dụng
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Thuật toán tất định (Deterministic Pricing Engine) tuân thủ bảo mật RBAC.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
