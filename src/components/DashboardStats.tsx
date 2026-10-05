import React, { useState } from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { FileCheck, TrendingUp, Anchor, Plane, Truck, LayoutDashboard, ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardStatsProps {
  quotes: QuoteData[];
  onOpenAnalytics?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quotes, onOpenAnalytics }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const totalCount = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const totalPipelineUsd = quotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
  const totalPipelineVnd = quotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);

  const seaQuotes = quotes.filter(q => q.shipment.mode.startsWith('SEA')).length;
  const airQuotes = quotes.filter(q => q.shipment.mode === 'AIR_FREIGHT').length;
  const truckingQuotes = quotes.filter(q => q.shipment.mode === 'INLAND_TRUCKING' || q.shipment.mode === 'CUSTOMS_CLEARANCE').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Tổng quan hoạt động</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">{totalCount} báo giá trên hệ thống</span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 btn-tactile"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
              <span>Phân tích chuyên sâu</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer btn-tactile"
            title={isCollapsed ? "Mở rộng thống kê" : "Thu gọn thống kê"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* Total Quotes Card */}
          <div 
            onClick={onOpenAnalytics}
            className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center space-x-3.5 card-hover-lift ${
              onOpenAnalytics ? 'cursor-pointer' : ''
            }`}
          >
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Số lượng báo giá</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{totalCount}</span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">({acceptedQuotes.length} đã chốt)</span>
              </div>
            </div>
          </div>

          {/* Pipeline Total Value */}
          <div 
            onClick={onOpenAnalytics}
            className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center space-x-3.5 card-hover-lift ${
              onOpenAnalytics ? 'cursor-pointer' : ''
            }`}
          >
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tổng giá trị Pipeline</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums truncate">{formatUSD(totalPipelineUsd)}</span>
                <span className="text-[11px] text-slate-400 tabular-nums truncate hidden xl:inline">~ {formatVND(totalPipelineVnd)}</span>
              </div>
            </div>
          </div>

          {/* Mode Distribution */}
          <div 
            onClick={onOpenAnalytics}
            className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs flex items-center space-x-3.5 card-hover-lift ${
              onOpenAnalytics ? 'cursor-pointer' : ''
            }`}
          >
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 rounded-xl shrink-0">
              <Anchor className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Phân bổ phương thức</p>
              <div className="flex items-center space-x-2.5 text-xs text-slate-700 dark:text-slate-300 font-medium tabular-nums">
                <span className="flex items-center space-x-1" title="Đường biển">
                  <Anchor className="w-3.5 h-3.5 text-slate-400" />
                  <span>{seaQuotes} biển</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="flex items-center space-x-1" title="Đường hàng không">
                  <Plane className="w-3.5 h-3.5 text-slate-400" />
                  <span>{airQuotes} air</span>
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="flex items-center space-x-1" title="Trucking / Hải quan">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{truckingQuotes} bộ</span>
                </span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
