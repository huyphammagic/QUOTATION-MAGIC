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
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-700">Tổng quan hoạt động</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-mono">{totalCount} báo giá</span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenAnalytics && (
            <button
              type="button"
              onClick={onOpenAnalytics}
              className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Xem phân tích chi tiết</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
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
            className={`bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3.5 ${
              onOpenAnalytics ? 'hover:border-slate-300 cursor-pointer transition-all' : ''
            }`}
          >
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500">Số lượng báo giá</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-lg font-bold text-slate-900 font-mono">{totalCount}</span>
                <span className="text-xs text-emerald-600 font-medium">({acceptedQuotes.length} đã chốt)</span>
              </div>
            </div>
          </div>

          {/* Pipeline Total Value */}
          <div 
            onClick={onOpenAnalytics}
            className={`bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3.5 ${
              onOpenAnalytics ? 'hover:border-slate-300 cursor-pointer transition-all' : ''
            }`}
          >
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500">Tổng giá trị báo giá</p>
              <div className="flex items-baseline space-x-2 mt-0.5">
                <span className="text-lg font-bold text-slate-900 font-mono truncate">{formatUSD(totalPipelineUsd)}</span>
                <span className="text-[11px] text-slate-400 font-mono truncate hidden xl:inline">~ {formatVND(totalPipelineVnd)}</span>
              </div>
            </div>
          </div>

          {/* Mode Distribution */}
          <div 
            onClick={onOpenAnalytics}
            className={`bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center space-x-3.5 ${
              onOpenAnalytics ? 'hover:border-slate-300 cursor-pointer transition-all' : ''
            }`}
          >
            <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700 shrink-0">
              <Anchor className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-slate-500 mb-0.5">Phân bổ phương thức</p>
              <div className="flex items-center space-x-2 text-xs text-slate-700 font-medium">
                <span className="flex items-center space-x-1" title="Đường biển">
                  <Anchor className="w-3 h-3 text-slate-500" />
                  <span>{seaQuotes} biển</span>
                </span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center space-x-1" title="Đường hàng không">
                  <Plane className="w-3 h-3 text-slate-500" />
                  <span>{airQuotes} air</span>
                </span>
                <span className="text-slate-300">·</span>
                <span className="flex items-center space-x-1" title="Trucking / Hải quan">
                  <Truck className="w-3 h-3 text-slate-500" />
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
