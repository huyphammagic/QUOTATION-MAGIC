import React from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { FileDown, FileSpreadsheet, Save, Eye, Calculator, RefreshCw } from 'lucide-react';

interface SummaryCardProps {
  quote: QuoteData;
  onExchangeRateChange: (rate: number) => void;
  onSaveQuote: () => void;
  onExportPdf: () => void;
  onExportExcel: () => void;
  onOpenPreview: () => void;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  quote,
  onExchangeRateChange,
  onSaveQuote,
  onExportPdf,
  onExportExcel,
  onOpenPreview
}) => {
  return (
    <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg border border-slate-800 space-y-5 sticky top-20">
      
      {/* Title & Exchange Rate */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest">
          <Calculator className="w-4 h-4" />
          <span>TỔNG CỘNG CHI PHÍ</span>
        </div>
        
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-mono">
          <RefreshCw className="w-3 h-3 text-blue-400" />
          <span>Rate:</span>
          <input
            type="number"
            value={quote.exchangeRate}
            onChange={(e) => onExchangeRateChange(Number(e.target.value) || 25400)}
            className="w-20 bg-slate-950 text-blue-300 font-mono font-bold text-right px-1.5 py-0.5 rounded border border-slate-700 text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Subtotal & VAT Breakdown */}
      <div className="space-y-2 text-xs border-b border-slate-800 pb-4">
        <div className="flex justify-between items-center text-slate-400">
          <span>Tiền cước & Phụ phí (Subtotal):</span>
          <div className="text-right font-mono">
            <div className="font-bold text-slate-200">{formatUSD(quote.subtotalUsd)}</div>
            <div className="text-[11px] text-slate-500">{formatVND(quote.subtotalVnd)}</div>
          </div>
        </div>

        <div className="flex justify-between items-center text-slate-400">
          <span>Thuế VAT tổng hợp (VAT):</span>
          <div className="text-right font-mono">
            <div className="font-bold text-slate-200">{formatUSD(quote.vatTotalUsd)}</div>
            <div className="text-[11px] text-slate-500">{formatVND(quote.vatTotalVnd)}</div>
          </div>
        </div>
      </div>

      {/* Grand Total Highlights */}
      <div className="bg-slate-950 p-4 rounded-lg border border-blue-900/60 space-y-1">
        <div className="text-[10px] uppercase tracking-widest font-bold text-blue-400">
          TỔNG THANH TOÁN DỰ KIẾN (GRAND TOTAL)
        </div>
        <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
          {formatUSD(quote.grandTotalUsd)}
        </div>
        <div className="text-xs font-bold text-emerald-400 font-mono">
          ≈ {formatVND(quote.grandTotalVnd)}
        </div>
      </div>

      {/* Actions Grid */}
      <div className="space-y-2 pt-1">
        
        {/* Save Quote Primary */}
        <button
          onClick={onSaveQuote}
          className="w-full flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-lg shadow-2xs transition-colors"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Báo Giá Về Hệ Thống</span>
        </button>

        {/* Preview A4 */}
        <button
          onClick={onOpenPreview}
          className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs py-2 px-3 rounded-lg border border-slate-700 transition-colors"
        >
          <Eye className="w-4 h-4 text-blue-400" />
          <span>Xem Trước Form A4 Chuẩn In / PDF</span>
        </button>

        {/* File Exports Row */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onExportPdf}
            className="flex items-center justify-center space-x-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold py-2 px-2.5 rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Xuất PDF</span>
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center justify-center space-x-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-2.5 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>

      </div>

    </div>
  );
};

