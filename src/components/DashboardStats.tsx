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
      <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Key Metrics in Unboxed Quiet Typography */}
        <div className="flex items-center flex-wrap gap-x-3.5 gap-y-1.5 text-slate-600 min-w-0">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Hệ thống:</span>
            <strong className="text-slate-900 font-bold font-mono tabular-nums">{totalCount} báo giá</strong>
            <span className="text-emerald-700 font-mono text-[11px] font-semibold">({acceptedQuotes.length} chốt)</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] uppercase tracking-wider font-medium">Pipeline:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatUSD(totalPipelineUsd)}
            </span>
            <span className="text-slate-400 font-mono text-[11px] hidden xl:inline">
              (~ {formatVND(totalPipelineVnd)})
            </span>
          </div>

          <span className="text-slate-300 hidden md:inline">·</span>

          <div className="hidden md:flex items-center gap-2.5 text-slate-500">
            <span className="flex items-center gap-1 text-[11px]" title="Đường biển">
              <Anchor className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{seaQuotes}</span> biển
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-[11px]" title="Đường bay">
              <Plane className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{airQuotes}</span> air
            </span>
            <span className="text-slate-300">/</span>
            <span className="flex items-center gap-1 text-[11px]" title="Đường bộ & hải quan">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-medium text-slate-700">{truckingQuotes}</span> bộ
            </span>
          </div>
        </div>

        {/* Right: Analytics & Expand Toggle */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="press-physics-subtle inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Báo Cáo & BI</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="press-physics-subtle p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            title={isExpanded ? "Thu gọn chi tiết thống kê" : "Mở rộng 3 thẻ phân tích"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Optional Expanded 3-Card Visual Breakdown */}
      {isExpanded && (
        <div className="p-5 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-in fade-in duration-150">
          
          <div 
            onClick={onOpenAnalytics} 
            className="press-physics-subtle card-hover-lift cosmic-card-sheen p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 hover:border-emerald-300 hover:shadow-xs transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                Tỷ lệ chốt đơn
              </span>
              <FileCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
                {totalCount > 0 ? Math.round((acceptedQuotes.length / totalCount) * 100) : 0}%
              </span>
              <span className="text-xs text-emerald-700 font-mono font-medium">
                {acceptedQuotes.length} / {totalCount} đơn
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Dựa trên toàn bộ báo giá đã lưu
            </div>
          </div>

          <div 
            onClick={onOpenAnalytics} 
            className="press-physics-subtle card-hover-lift cosmic-card-sheen p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 hover:border-indigo-300 hover:shadow-xs transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                Quy mô Pipeline
              </span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums truncate">
                {formatUSD(totalPipelineUsd)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
              ≈ {formatVND(totalPipelineVnd)}
            </div>
          </div>

          <div 
            onClick={onOpenAnalytics} 
            className="press-physics-subtle card-hover-lift cosmic-card-sheen p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 cursor-pointer hover:bg-slate-100/80 hover:border-sky-300 hover:shadow-xs transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                Phương thức vận tải
              </span>
              <Anchor className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-2 flex items-center gap-2.5 text-xs font-mono font-bold text-slate-800">
              <span className="tabular-nums">{seaQuotes} Sea</span>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">{airQuotes} Air</span>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">{truckingQuotes} Inland</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Bao gồm FCL, LCL, Air Cargo & Kê khai HQ
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
