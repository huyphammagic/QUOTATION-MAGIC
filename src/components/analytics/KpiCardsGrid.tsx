import React from 'react';
import { DashboardKpis, AnalyticsLanguage } from '../../types/analytics';
import { 
  FileText, 
  Trophy, 
  TrendingUp, 
  XCircle, 
  Calculator, 
  Clock, 
  CalendarClock, 
  Hourglass,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface KpiCardsGridProps {
  kpis: DashboardKpis;
  language: AnalyticsLanguage;
  onFilterStatus?: (status: string) => void;
}

export const KpiCardsGrid: React.FC<KpiCardsGridProps> = ({
  kpis,
  language,
  onFilterStatus,
}) => {
  const isVi = language === 'vi';

  const formatCurrencyValue = (val?: number, curr: string = 'USD') => {
    if (!val || val === 0) return '0';
    if (curr === 'VND') {
      return val.toLocaleString('vi-VN');
    }
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const wonUsd = kpis.wonValueByCurrency['USD'] || 0;
  const wonVnd = kpis.wonValueByCurrency['VND'] || 0;
  const lostUsd = kpis.lostValueByCurrency['USD'] || 0;
  const lostVnd = kpis.lostValueByCurrency['VND'] || 0;
  const totalUsd = kpis.totalValueByCurrency['USD'] || 0;
  const totalVnd = kpis.totalValueByCurrency['VND'] || 0;
  const avgUsd = kpis.avgQuoteValueByCurrency['USD'] || 0;
  const avgVnd = kpis.avgQuoteValueByCurrency['VND'] || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      
      {/* CARD 1: TOTAL QUOTATIONS */}
      <div 
        onClick={() => onFilterStatus?.('ALL')}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Tổng Số Báo Giá' : 'Total Quotations'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
            {kpis.totalQuotes}
          </span>
          <span className="text-xs font-medium text-slate-500">
            {isVi ? 'hồ sơ' : 'quotes'}
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{isVi ? 'Đang mở (Pending):' : 'Pending:'} <strong className="text-amber-700 font-mono">{kpis.pendingQuotesCount}</strong></span>
          <span>{isVi ? 'Nháp:' : 'Draft:'} <strong className="text-slate-700 font-mono">{kpis.draftQuotesCount}</strong></span>
        </div>
      </div>

      {/* CARD 2: TOTAL WON VALUE (Multi-Currency Protected) */}
      <div 
        onClick={() => onFilterStatus?.('WON')}
        className="bg-white rounded-xl border border-emerald-200/90 p-4 shadow-xs hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer group bg-gradient-to-br from-white to-emerald-50/30"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            {isVi ? 'Giá Trị Chốt Thắng (Won)' : 'Total Won Value'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Trophy className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1 text-emerald-950 font-bold font-mono text-xl sm:text-2xl">
            <span>$</span>
            <span>{formatCurrencyValue(wonUsd, 'USD')}</span>
          </div>
          {wonVnd > 0 && (
            <div className="text-xs font-mono font-semibold text-emerald-800 mt-0.5">
              + {formatCurrencyValue(wonVnd, 'VND')} ₫
            </div>
          )}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-700 font-medium">
          <span>{isVi ? 'Chốt thành công:' : 'Successful:'}</span>
          <span className="font-mono font-bold">{kpis.wonQuotesCount} {isVi ? 'báo giá' : 'quotes'}</span>
        </div>
      </div>

      {/* CARD 3: WIN RATE % (WON / (WON + LOST)) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Tỷ Lệ Thắng (Win Rate)' : 'Win Rate'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-900 font-mono">
            {kpis.winRatePercent}%
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            (Won / Decided)
          </span>
        </div>
        {/* Win Rate Visual Bar */}
        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 h-full transition-all duration-500" 
            style={{ width: `${Math.min(100, kpis.winRatePercent)}%` }}
            title={`Win: ${kpis.winRatePercent}%`}
          />
          <div 
            className="bg-rose-400 h-full transition-all duration-500" 
            style={{ width: `${Math.max(0, 100 - kpis.winRatePercent)}%` }}
            title={`Lost: ${100 - kpis.winRatePercent}%`}
          />
        </div>
        <div className="mt-2 text-[10px] text-slate-500 flex justify-between">
          <span className="text-emerald-700 font-bold">{kpis.wonQuotesCount} Won</span>
          <span className="text-rose-600 font-bold">{kpis.lostQuotesCount} Lost</span>
        </div>
      </div>

      {/* CARD 4: TOTAL LOST VALUE */}
      <div 
        onClick={() => onFilterStatus?.('LOST')}
        className="bg-white rounded-xl border border-rose-200/90 p-4 shadow-xs hover:border-rose-400 hover:shadow-sm transition-all cursor-pointer group bg-gradient-to-br from-white to-rose-50/20"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
            {isVi ? 'Giá Trị Thất Bại (Lost)' : 'Total Lost Value'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1 text-rose-950 font-bold font-mono text-xl sm:text-2xl">
            <span>$</span>
            <span>{formatCurrencyValue(lostUsd, 'USD')}</span>
          </div>
          {lostVnd > 0 && (
            <div className="text-xs font-mono font-semibold text-rose-800 mt-0.5">
              + {formatCurrencyValue(lostVnd, 'VND')} ₫
            </div>
          )}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-rose-100 flex items-center justify-between text-[11px] text-rose-700 font-medium">
          <span>{isVi ? 'Số báo giá từ chối:' : 'Rejected Quotes:'}</span>
          <span className="font-mono font-bold">{kpis.lostQuotesCount} {isVi ? 'báo giá' : 'quotes'}</span>
        </div>
      </div>

      {/* CARD 5: AVERAGE QUOTATION VALUE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Giá Trị Báo Giá TB' : 'Avg Quote Value'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-baseline gap-1 text-slate-900 font-bold font-mono text-xl sm:text-2xl">
            <span>$</span>
            <span>{formatCurrencyValue(avgUsd, 'USD')}</span>
          </div>
          {avgVnd > 0 && (
            <div className="text-xs font-mono text-slate-600 mt-0.5">
              ≈ {formatCurrencyValue(avgVnd, 'VND')} ₫
            </div>
          )}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>{isVi ? 'Tổng giá trị chào:' : 'Total Offered:'}</span>
          <span className="font-mono font-bold text-slate-800">${formatCurrencyValue(totalUsd, 'USD')}</span>
        </div>
      </div>

      {/* CARD 6: AVERAGE RESPONSE TIME */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'TG Phản Hồi Trung Bình' : 'Avg Response Time'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          {kpis.avgResponseTimeHours !== null ? (
            <>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {kpis.avgResponseTimeHours}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {isVi ? 'giờ' : 'hrs'}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400 italic">
              {isVi ? 'Chưa đủ dữ liệu' : 'No data yet'}
            </span>
          )}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{isVi ? 'Từ lúc gửi email' : 'From email sent'}</span>
          <span className="text-amber-700 font-medium">{isVi ? 'Đo lường thời gian thực' : 'Real-time measured'}</span>
        </div>
      </div>

      {/* CARD 7: AVERAGE SALES CYCLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Chu Kỳ Bán Hàng TB' : 'Avg Sales Cycle'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <CalendarClock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          {kpis.avgSalesCycleDays !== null ? (
            <>
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {kpis.avgSalesCycleDays}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {isVi ? 'ngày' : 'days'}
              </span>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400 italic">
              {isVi ? 'Chưa đủ dữ liệu' : 'No data yet'}
            </span>
          )}
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{isVi ? 'Tạo → Chốt đơn' : 'Created → Accepted'}</span>
          <span className="text-sky-700 font-semibold">{isVi ? 'Tốc độ chốt' : 'Velocity'}</span>
        </div>
      </div>

      {/* CARD 8: PIPELINE IN PROGRESS */}
      <div 
        onClick={() => onFilterStatus?.('PENDING')}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Cơ Hội Chờ Phản Hồi' : 'Open Pipeline'}
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
            <Hourglass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-900 font-mono">
            {kpis.pendingQuotesCount}
          </span>
          <span className="text-xs font-medium text-amber-700">
            {isVi ? 'đang mở' : 'active'}
          </span>
        </div>
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>{isVi ? 'Hết hạn (Expired):' : 'Expired:'} <strong className="text-rose-600 font-mono">{kpis.expiredQuotesCount}</strong></span>
          <span className="text-amber-700 font-medium flex items-center gap-0.5">
            {isVi ? 'Xem chi tiết' : 'Review'} <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

    </div>
  );
};
