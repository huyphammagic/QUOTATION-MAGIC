import React from 'react';
import { QuoteData } from '../types/logistics';
import { formatUSD, formatVND } from '../utils/formatters';
import { FileCheck, TrendingUp, Anchor, Plane, Truck, DollarSign } from 'lucide-react';

interface DashboardStatsProps {
  quotes: QuoteData[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ quotes }) => {
  const totalCount = quotes.length;
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const totalPipelineUsd = quotes.reduce((acc, q) => acc + (q.grandTotalUsd || 0), 0);
  const totalPipelineVnd = quotes.reduce((acc, q) => acc + (q.grandTotalVnd || 0), 0);

  const seaQuotes = quotes.filter(q => q.shipment.mode.startsWith('SEA')).length;
  const airQuotes = quotes.filter(q => q.shipment.mode === 'AIR_FREIGHT').length;
  const truckingQuotes = quotes.filter(q => q.shipment.mode === 'INLAND_TRUCKING' || q.shipment.mode === 'CUSTOMS_CLEARANCE').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Total Quotes Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-4">
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
  );
};

