import React from 'react';
import { QuoteData, QuoteCurrency } from '../types/logistics';
import { formatUSD, formatVND, formatPercent } from '../utils/formatters';
import { 
  FileDown, 
  FileSpreadsheet, 
  Save, 
  Eye, 
  Calculator, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  Coins, 
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  AlertOctagon,
  Percent,
  Lock
} from 'lucide-react';

interface SummaryCardProps {
  quote: QuoteData;
  onExchangeRateChange: (rate: number) => void;
  onCurrencyChange?: (currency: QuoteCurrency) => void;
  onSaveQuote: () => void;
  onExportPdf: (currency?: QuoteCurrency) => void;
  onExportExcel: (currency?: QuoteCurrency) => void;
  onOpenPreview: () => void;
  onOpenGeneratePdf?: () => void;
  onOpenSendModal?: () => void;
  onOpenProfitIntelligence?: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  quote,
  onExchangeRateChange,
  onCurrencyChange,
  onSaveQuote,
  onExportPdf,
  onExportExcel,
  onOpenPreview,
  onOpenGeneratePdf,
  onOpenSendModal,
  onOpenProfitIntelligence,
}) => {
  const margin = quote.overallMarginPercent || 0;
  const markup = quote.markupPercent || 0;
  const targetMargin = quote.targetMarginPercent || 20;
  const minMargin = quote.minimumMarginPercent || 15;
  const activeCurrency: QuoteCurrency = quote.quoteCurrency || 'USD';
  const isVnd = activeCurrency === 'VND';

  const isBelowMinimum = margin < minMargin;
  const isBelowTarget = margin < targetMargin;
  const isAboveTarget = margin >= targetMargin;

  // Phase 28: Minimum Safe Selling Price Floor
  const exchangeRate = Number(quote.exchangeRate) > 0 ? Number(quote.exchangeRate) : 25400;
  const minSafeSellPrice = isVnd 
    ? (quote.minimumSafeSellPriceVnd || (quote.minimumSellPriceUsd ? quote.minimumSellPriceUsd * exchangeRate : 0))
    : (quote.minimumSafeSellPriceUsd || quote.minimumSellPriceUsd || 0);

  const currentSellingPrice = isVnd ? (quote.subtotalVnd || 0) : (quote.subtotalUsd || 0);
  const isBelowSafeFloor = minSafeSellPrice > 0 && currentSellingPrice < minSafeSellPrice;

  // Phase 28: Risk Level
  const riskLevel = quote.priceRiskLevel || (
    (quote.totalProfitUsd && quote.totalProfitUsd < 0)
      ? 'LOSS' 
      : isBelowMinimum 
      ? 'LOW_MARGIN' 
      : isBelowTarget 
      ? 'NORMAL' 
      : 'SAFE'
  );
  const warningsCount = Array.isArray(quote.pricingWarnings) ? quote.pricingWarnings.length : 0;

  const renderRiskBadge = () => {
    switch (riskLevel) {
      case 'SAFE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            AN TOÀN (SAFE)
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            CHUẨN (NORMAL)
          </span>
        );
      case 'HIGH_RISK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            RỦI RO CAO (HIGH RISK)
          </span>
        );
      case 'LOW_MARGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-950 text-orange-300 border border-orange-700 animate-pulse">
            <ShieldAlert className="w-3 h-3 text-orange-400" />
            LÃI THẤP (LOW MARGIN)
          </span>
        );
      case 'LOSS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-600 animate-bounce">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            LỖ GỘP (GROSS LOSS)
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
            <Lock className="w-3 h-3 text-red-400" />
            BỊ CHẶN (BLOCKED)
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div id="summary-card" className="bg-slate-900 text-white p-5 lg:p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
      
      {/* Top Header Row: Title, Currency Switcher & Rate */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center flex-wrap gap-2 text-cyan-400 font-bold text-xs uppercase tracking-widest">
          <div className="flex items-center space-x-1.5">
            <Calculator className="w-4 h-4" />
            <span>TỔNG HỢP CHI PHÍ & LỢI NHUẬN (PRICING BREAKDOWN)</span>
          </div>
          {renderRiskBadge()}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* File Currency Presentation Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <Coins className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-semibold text-slate-400">Đồng tiền file báo giá:</span>
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
              <button
                type="button"
                onClick={() => onCurrencyChange?.('USD')}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                  !isVnd
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Báo giá sẽ hiển thị đơn vị chính là USD"
              >
                $ USD
              </button>
              <button
                type="button"
                onClick={() => onCurrencyChange?.('VND')}
                className={`px-2.5 py-0.5 rounded text-xs font-bold transition-all ${
                  isVnd
                    ? 'bg-emerald-500 text-slate-950 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Báo giá sẽ hiển thị đơn vị chính là VNĐ"
              >
                ₫ VNĐ
              </button>
            </div>
          </div>

          {/* Exchange Rate Input */}
          <div className="flex items-center space-x-2 text-xs text-slate-300 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tỷ giá (USD/VND):</span>
            <input
              type="number"
              value={quote.exchangeRate}
              onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
              className="w-28 bg-slate-900 text-cyan-300 font-mono font-bold text-right px-2 py-0.5 rounded border border-slate-700 text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Breakdown Metrics + Grand Total Card + Action Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        
        {/* Left 5 Cols: Financial Metrics Matrix */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2.5 text-xs">
          
          {/* 1. Doanh thu (Subtotal) + Giá sàn an toàn */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 font-medium text-[11px] block">Doanh Thu (Subtotal):</span>
            <div className="font-bold text-slate-100 text-sm font-mono mt-0.5">
              {isVnd ? formatVND(quote.subtotalVnd) : formatUSD(quote.subtotalUsd)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {isVnd ? `~ ${formatUSD(quote.subtotalUsd)}` : `~ ${formatVND(quote.subtotalVnd)}`}
            </div>
            {/* Minimum Safe Floor Price */}
            {minSafeSellPrice > 0 && (
              <div className={`mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono flex items-center justify-between ${
                isBelowSafeFloor ? 'text-rose-400 font-bold' : 'text-slate-400'
              }`}>
                <span>Giá sàn an toàn:</span>
                <span>{isVnd ? formatVND(minSafeSellPrice) : formatUSD(minSafeSellPrice)}</span>
              </div>
            )}
          </div>

          {/* 2. Giá vốn (Cost) */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <span className="text-amber-400/90 font-medium text-[11px] block">Giá Vốn (Total Cost):</span>
            <div className="font-bold text-amber-200 text-sm font-mono mt-0.5">
              {isVnd ? formatVND(quote.totalCostVnd || 0) : formatUSD(quote.totalCostUsd || 0)}
            </div>
            <div className="text-[10px] text-amber-400/70 font-mono">
              {isVnd ? `~ ${formatUSD(quote.totalCostUsd || 0)}` : `~ ${formatVND(quote.totalCostVnd || 0)}`}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Đề xuất:</span>
              <span className="text-cyan-300 font-semibold">
                {isVnd 
                  ? formatVND(quote.recommendedSellPriceVnd || (quote.recommendedSellPriceUsd ? quote.recommendedSellPriceUsd * exchangeRate : 0)) 
                  : formatUSD(quote.recommendedSellPriceUsd || 0)}
              </span>
            </div>
          </div>

          {/* 3. Lợi Nhuận Gộp (Profit) */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-medium text-[11px]">Lợi Nhuận (Profit):</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className={`font-bold text-sm font-mono mt-0.5 ${
              (quote.totalProfitUsd || 0) < 0 ? 'text-rose-400' : 'text-emerald-300'
            }`}>
              {(quote.totalProfitUsd || 0) >= 0 ? '+' : ''}
              {isVnd ? formatVND(quote.totalProfitVnd || 0) : formatUSD(quote.totalProfitUsd || 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Markup: <span className="text-indigo-300 font-bold">{formatPercent(markup, 1)}</span></span>
              <span>{isVnd ? `~ +${formatUSD(quote.totalProfitUsd || 0)}` : `~ +${formatVND(quote.totalProfitVnd || 0)}`}</span>
            </div>
          </div>

          {/* 4. Margin % & VAT */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-[11px]">Biên Lãi / Sàn:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                isBelowMinimum 
                  ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse' 
                  : isBelowTarget 
                  ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              }`}>
                {isBelowMinimum ? <ShieldAlert className="w-3 h-3" /> : isBelowTarget ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {formatPercent(margin, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-400">
              <span>Mục tiêu: {targetMargin}%</span>
              <span>VAT: <span className="font-bold text-slate-300">{isVnd ? formatVND(quote.vatTotalVnd) : formatUSD(quote.vatTotalUsd)}</span></span>
            </div>
          </div>

        </div>

        {/* Center 4 Cols: Grand Total Highlight Card */}
        <div className={`lg:col-span-4 p-5 rounded-2xl border flex flex-col justify-center space-y-1.5 text-center shadow-lg transition-all ${
          isVnd 
            ? 'bg-gradient-to-br from-slate-950 to-emerald-950/60 border-emerald-700/60' 
            : 'bg-gradient-to-br from-slate-950 to-cyan-950/60 border-cyan-800/60'
        }`}>
          <div className={`text-[11px] uppercase tracking-widest font-bold flex items-center justify-center space-x-1.5 ${
            isVnd ? 'text-emerald-400' : 'text-cyan-400'
          }`}>
            <ShieldCheck className="w-4 h-4" />
            <span>TỔNG CỘNG ({isVnd ? 'VNĐ' : 'USD'})</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
            {isVnd ? formatVND(quote.grandTotalVnd) : formatUSD(quote.grandTotalUsd)}
          </div>
          <div className={`text-xs font-bold font-mono ${isVnd ? 'text-cyan-400' : 'text-emerald-400'}`}>
            ≈ {isVnd ? formatUSD(quote.grandTotalUsd) : formatVND(quote.grandTotalVnd)}
          </div>
          {isBelowSafeFloor && (
            <div className="mt-1 inline-flex items-center justify-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-full border border-rose-800 animate-pulse">
              <AlertOctagon className="w-3 h-3" />
              <span>Giá bán dưới mức sàn an toàn</span>
            </div>
          )}
        </div>

        {/* Right 3 Cols: Actions */}
        <div className="lg:col-span-3 flex flex-col gap-2 shrink-0">
          {onOpenProfitIntelligence && (
            <button
              onClick={onOpenProfitIntelligence}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm py-2 px-3 rounded-xl shadow-md transition-all active:scale-[0.99]"
              title="Mở bảng phân tích lợi nhuận & công cụ What-If Pricing"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <div className="flex items-center gap-1.5">
                <span>Phân Tích & What-If Pricing</span>
                {warningsCount > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {warningsCount}
                  </span>
                )}
              </div>
            </button>
          )}

          {onOpenSendModal && (
            <button
              onClick={onOpenSendModal}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.99] border border-blue-400/40"
            >
              <Send className="w-4 h-4 text-blue-200" />
              <span>Gửi Email Khách Hàng (Send Quote)</span>
            </button>
          )}

          <button
            onClick={onSaveQuote}
            className="w-full flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-md transition-all active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Báo Giá Về Hệ Thống</span>
          </button>

          <button
            onClick={onOpenPreview}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-xl border border-slate-700 transition-colors"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Xem Trước Form ({activeCurrency})</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenGeneratePdf ? onOpenGeneratePdf() : onExportPdf(activeCurrency)}
              className="flex items-center justify-center space-x-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold py-2 px-2 rounded-xl transition-colors shadow-xs"
              title={`Phát hành PDF Snapshot với đồng tiền ${activeCurrency}`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Xuất PDF ({activeCurrency})</span>
            </button>

            <button
              onClick={() => onExportExcel(activeCurrency)}
              className="flex items-center justify-center space-x-1.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-2 rounded-xl transition-colors shadow-xs"
              title={`Xuất file Excel với đồng tiền ${activeCurrency}`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel ({activeCurrency})</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
