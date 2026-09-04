import React from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { FileCheck, TrendingUp, Anchor, Plane, Truck, DollarSign, LayoutDashboard, ArrowRight } from 'lucide-react';

interface DashboardStatsProps {
  quotes: QuoteData[];
  onOpenAnalytics?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quotes, onOpenAnalytics }) => {
  const totalCount = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const totalPipelineUsd = quotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
  const totalPipelineVnd = quotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);

  const seaQuotes = quotes.filter(q => q.shipment.mode.startsWith('SEA')).length;
  const airQuotes = quotes.filter(q => q.shipment.mode === 'AIR_FREIGHT').length;
  const truckingQuotes = quotes.filter(q => q.shipment.mode === 'INLAND_TRUCKING' || q.shipment.mode === 'CUSTOMS_CLEARANCE').length;

  return (
    <div className="space-y-2 mb-6">
      {onOpenAnalytics && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng Quan Báo Giá</span>
            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full font-mono">Live Sync</span>
          </div>
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors group cursor-pointer bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-md border border-blue-200"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-blue-600" />
            <span>Mở Business Intelligence & Sales Analytics</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Quotes Card */}
        <div 
          onClick={onOpenAnalytics}
          className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4 ${onOpenAnalytics ? 'hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all' : ''}`}
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-700">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tổng Báo Giá Đã Tạo</p>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 font-mono">{totalCount}</span>
              <span className="text-xs text-emerald-600 font-semibold">({acceptedQuotes.length} đã duyệt)</span>
            </div>
          </div>
        </div>

        {/* Pipeline Total Value */}
        <div 
          onClick={onOpenAnalytics}
          className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4 ${onOpenAnalytics ? 'hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all' : ''}`}
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-700">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tổng Giá Trị Báo Giá</p>
            <div className="text-lg font-bold text-slate-900 font-mono truncate mt-0.5">{formatUSD(totalPipelineUsd)}</div>
            <p className="text-[11px] text-slate-500 font-mono truncate">~ {formatVND(totalPipelineVnd)}</p>
          </div>
        </div>

        {/* Mode Distribution */}
        <div 
          onClick={onOpenAnalytics}
          className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4 ${onOpenAnalytics ? 'hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all' : ''}`}
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-700">
            <Anchor className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phương Thức Vận Tải</p>
            <div className="flex items-center space-x-2 text-xs text-slate-700 font-semibold">
              <span className="flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Đường biển">
                <Anchor className="w-3 h-3 text-blue-600" />
                <span>{seaQuotes} SEA</span>
              </span>
              <span className="flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Đường hàng không">
                <Plane className="w-3 h-3 text-purple-600" />
                <span>{airQuotes} AIR</span>
              </span>
              <span className="flex items-center space-x-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200" title="Nội địa / Hải quan">
                <Truck className="w-3 h-3 text-amber-600" />
                <span>{truckingQuotes} TRK</span>
              </span>
            </div>
          </div>
        </div>

        {/* Average Quote Value */}
        <div 
          onClick={onOpenAnalytics}
          className={`bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4 ${onOpenAnalytics ? 'hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all' : ''}`}
        >
          <div className="p-3 bg-blue-50 rounded-lg text-blue-700">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Giá Trị Trung Bình / Đơn</p>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
              {totalCount > 0 ? formatUSD(totalPipelineUsd / totalCount) : '$0.00'}
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">Báo giá tiêu chuẩn ngành</p>
          </div>
        </div>

      </div>
    </div>
  );
};

