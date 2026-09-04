import React from 'react';
import { LaneAnalyticsItem, ServiceAnalyticsItem, AnalyticsLanguage } from '../../types/analytics';
import { Navigation, Ship, Package, Anchor, ArrowRight, TrendingUp } from 'lucide-react';

interface LaneAndServiceAnalyticsViewProps {
  lanes: LaneAnalyticsItem[];
  services: ServiceAnalyticsItem[];
  language: AnalyticsLanguage;
}

export const LaneAndServiceAnalyticsView: React.FC<LaneAndServiceAnalyticsViewProps> = ({
  lanes,
  services,
  language,
}) => {
  const isVi = language === 'vi';

  const formatVal = (val?: number, curr: string = 'USD') => {
    if (!val || val === 0) return '0';
    if (curr === 'VND') return val.toLocaleString('vi-VN');
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: SERVICE TYPE DISTRIBUTION */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Ship className="w-5 h-5 text-blue-600" />
            {isVi ? 'Phân Bổ Theo Phương Thức & Dịch Vụ Vận Tải' : 'Freight Service & Transport Mode Breakdown'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Tỷ trọng cơ cấu dịch vụ (FCL, LCL, Air, Trucking, Hải quan) và tỷ lệ thắng thầu tương ứng.'
              : 'Service volume share (FCL, LCL, Air, Trucking, Customs) and comparative win rates.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
          {services.map(s => {
            const valUsd = s.totalValueByCurrency['USD'] || 0;
            const valVnd = s.totalValueByCurrency['VND'] || 0;

            return (
              <div key={s.serviceKey} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 hover:bg-white hover:border-blue-400 transition-all shadow-2xs">
                
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 truncate">
                    {s.serviceLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                    {s.percentOfTotalQuotes}% {isVi ? 'thị phần' : 'share'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">{isVi ? 'Số lượng:' : 'Quotes:'}</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {s.totalQuotes} {isVi ? 'báo giá' : 'quotes'}
                  </span>
                </div>

                {/* Progress Visual Bar */}
                <div className="mt-2 w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, s.percentOfTotalQuotes)}%` }}
                  />
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">{isVi ? 'Tỷ lệ thắng:' : 'Win Rate:'}</span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {s.winRate}%
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{isVi ? 'Doanh số chào:' : 'Offered:'}</span>
                  <span className="font-mono font-bold text-slate-800">${formatVal(valUsd, 'USD')}</span>
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* SECTION 2: TOP TRADE LANES */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-600" />
            {isVi ? 'Các Tuyến Đường Trọng Điểm (Top Trade Lanes)' : 'Key Trade Lanes & Port Pairs'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Thống kê sản lượng container (TEU), trọng lượng (KG), thể tích (CBM) và tỷ lệ thắng theo từng tuyến.'
              : 'Container equipment volume, tonnage, cubic volume, and conversion performance per trade corridor.'}
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">{isVi ? 'Cảng Đi (POL)' : 'Origin (POL)'}</th>
                <th className="py-2.5 px-3 text-center">→</th>
                <th className="py-2.5 px-4">{isVi ? 'Cảng Đến (POD)' : 'Destination (POD)'}</th>
                <th className="py-2.5 px-3 text-center">{isVi ? 'PT' : 'Mode'}</th>
                <th className="py-2.5 px-3 text-center">{isVi ? 'Báo Giá' : 'Quotes'}</th>
                <th className="py-2.5 px-3 text-center text-emerald-700">{isVi ? 'Thắng' : 'Won'}</th>
                <th className="py-2.5 px-4 min-w-[130px]">{isVi ? 'Tỷ Lệ Thắng' : 'Win Rate'}</th>
                <th className="py-2.5 px-4 text-right">{isVi ? 'Sản Lượng (Cont / CBM)' : 'Volume'}</th>
                <th className="py-2.5 px-4 text-right text-emerald-800">{isVi ? 'Tổng Giá Trị' : 'Total Value'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lanes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    {isVi ? 'Chưa có dữ liệu tuyến đường phù hợp.' : 'No trade lanes found.'}
                  </td>
                </tr>
              ) : (
                lanes.map((l, idx) => {
                  const valUsd = l.totalValueByCurrency['USD'] || 0;

                  return (
                    <tr key={l.laneKey} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Origin */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {l.origin}
                      </td>

                      <td className="py-3 px-2 text-center text-slate-400 font-bold">
                        →
                      </td>

                      {/* Destination */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {l.destination}
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3 text-center font-mono text-[10px]">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {l.mode.replace('SEA_', '')}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {l.totalQuotes}
                      </td>

                      {/* Won */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                        {l.wonQuotes}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-800">{l.winRate}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                            <div 
                              className="bg-emerald-500 h-full" 
                              style={{ width: `${Math.min(100, l.winRate)}%` }} 
                            />
                          </div>
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        <div>{l.containerCount} cont / {l.volumeCbm} m³</div>
                        <div className="text-[10px] text-slate-400">{l.grossWeightKg.toLocaleString()} kg</div>
                      </td>

                      {/* Total Value */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${formatVal(valUsd, 'USD')}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
