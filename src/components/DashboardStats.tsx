import React, { useState } from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { 
  FileCheck, 
  TrendingUp, 
  Anchor, 
  Plane, 
  Truck, 
  LayoutDashboard, 
  ChevronDown, 
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface DashboardStatsProps {
  quotes: QuoteData[];
  onOpenAnalytics?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quotes, onOpenAnalytics }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalCount = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const totalPipelineUsd = quotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
  const totalPipelineVnd = quotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);

  const seaQuotes = quotes.filter(q => q.shipment.mode.startsWith('SEA')).length;
  const airQuotes = quotes.filter(q => q.shipment.mode === 'AIR_FREIGHT').length;
  const truckingQuotes = quotes.filter(q => q.shipment.mode === 'INLAND_TRUCKING' || q.shipment.mode === 'CUSTOMS_CLEARANCE').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs transition-all">
      {/* Sleek Executive KPI Strip */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Key Metrics in Unboxed Quiet Typography */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-slate-600 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Hệ thống:</span>
            <strong className="text-slate-900 font-bold tabular-nums">{totalCount} báo giá</strong>
            <span className="text-emerald-700 font-medium">({acceptedQuotes.length} chốt)</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Pipeline:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatUSD(totalPipelineUsd)}
            </span>
            <span className="text-slate-400 font-mono text-[11px] hidden xl:inline">
              (~ {formatVND(totalPipelineVnd)})
            </span>
          </div>

          <span className="text-slate-300 hidden md:inline">·</span>

          <div className="hidden md:flex items-center gap-2 text-slate-500">
            <span className="flex items-center gap-1" title="Đường biển">
              <Anchor className="w-3 h-3 text-slate-400" />
              <span>{seaQuotes} biển</span>
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1" title="Đường bay">
              <Plane className="w-3 h-3 text-slate-400" />
              <span>{airQuotes} air</span>
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1" title="Đường bộ & hải quan">
              <Truck className="w-3 h-3 text-slate-400" />
              <span>{truckingQuotes} bộ</span>
            </span>
          </div>
        </div>

        {/* Right: Analytics & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Báo Cáo & BI</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={isExpanded ? "Thu gọn chi tiết thống kê" : "Mở rộng 3 thẻ phân tích"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Optional Expanded 3-Card Visual Breakdown */}
      {isExpanded && (
        <div className="p-4 pt-1 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
          
          <div 
            onClick={onOpenAnalytics} 
            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Tỷ lệ chốt đơn</span>
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-slate-900">{totalCount > 0 ? Math.round((acceptedQuotes.length / totalCount) * 100) : 0}%</span>
              <span className="text-xs text-emerald-700 font-medium">{acceptedQuotes.length} / {totalCount} đơn</span>
            </div>
          </div>

          <div 
            onClick={onOpenAnalytics} 
            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Quy mô chào giá</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-slate-900 truncate">{formatUSD(totalPipelineUsd)}</span>
            </div>
          </div>

          <div 
            onClick={onOpenAnalytics} 
            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Đa phương thức</span>
              <Anchor className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs font-mono font-bold text-slate-800">
              <span>{seaQuotes} FCL/LCL</span>
              <span className="text-slate-300">·</span>
              <span>{airQuotes} Air</span>
              <span className="text-slate-300">·</span>
              <span>{truckingQuotes} Truck</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
