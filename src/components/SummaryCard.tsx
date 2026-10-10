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
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  AlertOctagon,
  Lock,
  BarChart3
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
  onOpenFreightRateBenchmarking?: () => void;
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
  onOpenFreightRateBenchmarking,
}) => {
  const margin = quote.overallMarginPercent || 0;
  const markup = quote.markupPercent || 0;
  const targetMargin = quote.targetMarginPercent || 20;
  const minMargin = quote.minimumMarginPercent || 15;
  const activeCurrency: QuoteCurrency = quote.quoteCurrency || 'USD';
  const isVnd = activeCurrency === 'VND';

  const isBelowMinimum = margin < minMargin;
  const isBelowTarget = margin < targetMargin;

  const exchangeRate = Number(quote.exchangeRate) > 0 ? Number(quote.exchangeRate) : 25400;
  const minSafeSellPrice = isVnd 
    ? (quote.minimumSafeSellPriceVnd || (quote.minimumSellPriceUsd ? quote.minimumSellPriceUsd * exchangeRate : 0))
    : (quote.minimumSafeSellPriceUsd || quote.minimumSellPriceUsd || 0);

  const currentSellingPrice = isVnd ? (quote.subtotalVnd || 0) : (quote.subtotalUsd || 0);
  const isBelowSafeFloor = minSafeSellPrice > 0 && currentSellingPrice < minSafeSellPrice;

  const riskLevel = quote.priceRiskLevel || (
    (quote.totalProfitUsd && quote.totalProfitUsd < 0)
      ? 'LOSS' 
      : isBelowMinimum 
      ? 'LOW_MARGIN' 
      : isBelowTarget 
      ? 'NORMAL' 
      : 'SAFE'
  );

  const renderRiskBadge = () => {
    switch (riskLevel) {
      case 'SAFE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            An toàn
          </span>
        );
      case 'LOW_MARGIN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-950/80 text-orange-300 border border-orange-800">
            <ShieldAlert className="w-3 h-3 text-orange-400" />
            Lãi thấp
          </span>
        );
      case 'LOSS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            <AlertOctagon className="w-3 h-3 text-rose-400" />
            Lỗ gộp
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <CheckCircle2 className="w-3 h-3 text-slate-400" />
            Bình thường
          </span>
        );
    }
  };

  return (
    <div id="summary-card" className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
      
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-white tracking-tight">
                Tổng Hợp Doanh Thu & Lợi Nhuận
              </h3>
              <span className="text-slate-600">·</span>
              {renderRiskBadge()}
            </div>
            <span className="text-[11px] text-slate-400">
              Tỷ giá quy đổi: 1 USD = {exchangeRate.toLocaleString()} VND
            </span>
          </div>
        </div>
        
        {/* Currency Switcher & Rate */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => onCurrencyChange?.('USD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                !isVnd
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              $ USD
            </button>
            <button
              type="button"
              onClick={() => onCurrencyChange?.('VND')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isVnd
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ₫ VND
            </button>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[11px]">Tỷ giá:</span>
            <input
              type="number"
              value={quote.exchangeRate}
              onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
              className="w-16 bg-slate-900 text-slate-200 font-mono font-bold text-right px-1 py-0.5 rounded border border-slate-700 text-xs focus:outline-none"
            />
            <span className="text-[10px] text-slate-500">₫</span>
          </div>
        </div>
      </div>

      {/* Main Grid: 4 Metric Cards (Left) + Grand Total (Center) + Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* Left 5 Cols: Financial Metrics */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2 text-xs">
          
          {/* 1. Doanh thu bán (Subtotal) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 text-[11px] block">Doanh thu bán:</span>
              <div className="font-bold text-white text-sm font-mono mt-0.5">
                {isVnd ? formatVND(quote.subtotalVnd) : formatUSD(quote.subtotalUsd)}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {isVnd ? `~ ${formatUSD(quote.subtotalUsd)}` : `~ ${formatVND(quote.subtotalVnd)}`}
            </div>
          </div>

          {/* 2. Giá vốn (Cost) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 text-[11px] block">Giá vốn (Cost):</span>
              <div className="font-bold text-slate-300 text-sm font-mono mt-0.5">
                {isVnd ? formatVND(quote.totalCostVnd || 0) : formatUSD(quote.totalCostUsd || 0)}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              {isVnd ? `~ ${formatUSD(quote.totalCostUsd || 0)}` : `~ ${formatVND(quote.totalCostVnd || 0)}`}
            </div>
          </div>

          {/* 3. Lợi Nhuận Gộp (Profit) */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Lợi nhuận gộp:</span>
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            </div>
            <div className={`font-bold text-sm font-mono mt-0.5 ${
              (quote.totalProfitUsd || 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {(quote.totalProfitUsd || 0) >= 0 ? '+' : ''}
              {isVnd ? formatVND(quote.totalProfitVnd || 0) : formatUSD(quote.totalProfitUsd || 0)}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-1">
              Markup: {formatPercent(markup, 1)}
            </div>
          </div>

          {/* 4. Margin % & VAT */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Biên lãi:</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                isBelowMinimum 
                  ? 'bg-rose-950 text-rose-300' 
                  : isBelowTarget 
                  ? 'bg-amber-950 text-amber-300' 
                  : 'bg-emerald-950 text-emerald-300'
              }`}>
                {formatPercent(margin, 1)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono mt-1 text-slate-500">
              <span>VAT: {isVnd ? formatVND(quote.vatTotalVnd) : formatUSD(quote.vatTotalUsd)}</span>
            </div>
          </div>

        </div>

        {/* Center 4 Cols: Grand Total Card */}
        <div className="lg:col-span-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-center items-center text-center space-y-1">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tổng thanh toán ({isVnd ? 'VNĐ' : 'USD'})
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
            {isVnd ? formatVND(quote.grandTotalVnd) : formatUSD(quote.grandTotalUsd)}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ≈ {isVnd ? formatUSD(quote.grandTotalUsd) : formatVND(quote.grandTotalVnd)}
          </div>
          {isBelowSafeFloor && (
            <div className="mt-1 text-[11px] font-semibold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
              Dưới mức giá sàn an toàn
            </div>
          )}
        </div>

        {/* Right 3 Cols: Primary Actions */}
        <div className="lg:col-span-3 flex flex-col justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onSaveQuote}
            className="w-full flex items-center justify-center space-x-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs py-2 px-3 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-900" />
            <span>Lưu Báo Giá Lên Cloud</span>
          </button>

          {onOpenFreightRateBenchmarking && (
            <button
              type="button"
              onClick={onOpenFreightRateBenchmarking}
              className="w-full flex items-center justify-center space-x-1.5 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 font-bold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
              title="Đối soát cước thị trường & Tối ưu tỷ lệ chốt đơn (Phase 72)"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đối Soát Cước & Tối Ưu Lãi (P.72)</span>
            </button>
          )}

          {onOpenSendModal && (
            <button
              type="button"
              onClick={onOpenSendModal}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs py-2 px-3 rounded-xl transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Khách Hàng (Email & Link)</span>
            </button>
          )}

          {/* Quick Preview & Export buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={onOpenPreview}
              className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 px-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Xem trước A4"
            >
              <Eye className="w-3 h-3" />
              <span>Xem</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenGeneratePdf ? onOpenGeneratePdf() : onExportPdf(activeCurrency)}
              className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 px-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title={`Xuất file PDF (${activeCurrency})`}
            >
              <FileDown className="w-3 h-3 text-indigo-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onExportExcel(activeCurrency)}
              className="flex items-center justify-center space-x-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1.5 px-2 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title={`Xuất Excel (${activeCurrency})`}
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>Excel</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
