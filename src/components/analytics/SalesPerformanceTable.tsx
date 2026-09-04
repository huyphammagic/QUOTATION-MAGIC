import React, { useState } from 'react';
import { SalesPerformanceItem, AnalyticsLanguage } from '../../types/analytics';
import { Trophy, Medal, Award, User, Target, ArrowUpDown, Search } from 'lucide-react';

interface SalesPerformanceTableProps {
  salesList: SalesPerformanceItem[];
  language: AnalyticsLanguage;
}

export const SalesPerformanceTable: React.FC<SalesPerformanceTableProps> = ({
  salesList,
  language,
}) => {
  const isVi = language === 'vi';
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'wonVal' | 'winRate' | 'quotes'>('wonVal');

  const filtered = salesList.filter(s => 
    s.salesRep.toLowerCase().includes(search.toLowerCase())
  );

  filtered.sort((a, b) => {
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'quotes') return b.totalQuotes - a.totalQuotes;
    return (b.wonValueByCurrency['USD'] || 0) - (a.wonValueByCurrency['USD'] || 0);
  });

  const formatVal = (val?: number, curr: string = 'USD') => {
    if (!val || val === 0) return '0';
    if (curr === 'VND') return val.toLocaleString('vi-VN');
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {isVi ? 'Bảng Xếp Hạng & Hiệu Suất Sales (Sales Performance)' : 'Sales Leaderboard & Performance'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? 'Xếp hạng nhân viên kinh doanh theo doanh số chốt, tỷ lệ thắng và số lượng khách hàng quản lý.'
              : 'Sales rep ranking by won revenue, conversion rate, and customer portfolio.'}
          </p>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isVi ? 'Tìm tên sales...' : 'Search sales...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium"
          >
            <option value="wonVal">{isVi ? 'Chốt thắng (USD)' : 'Won Value'}</option>
            <option value="winRate">{isVi ? 'Tỷ lệ thắng (%)' : 'Win Rate'}</option>
            <option value="quotes">{isVi ? 'Số báo giá' : 'Quote Count'}</option>
          </select>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 text-center w-12">{isVi ? 'Hạng' : 'Rank'}</th>
              <th className="py-2.5 px-4">{isVi ? 'Nhân viên kinh doanh' : 'Sales Representative'}</th>
              <th className="py-2.5 px-3 text-center">{isVi ? 'Số Báo Giá' : 'Quotes'}</th>
              <th className="py-2.5 px-3 text-center text-emerald-700">{isVi ? 'Thắng' : 'Won'}</th>
              <th className="py-2.5 px-3 text-center text-rose-600">{isVi ? 'Thua' : 'Lost'}</th>
              <th className="py-2.5 px-4 min-w-[140px]">{isVi ? 'Tỷ Lệ Thắng' : 'Win Rate'}</th>
              <th className="py-2.5 px-4 text-right text-emerald-800">{isVi ? 'Doanh Số Chốt (Won)' : 'Won Value'}</th>
              <th className="py-2.5 px-4 text-right">{isVi ? 'Giá Trị TB / Báo Giá' : 'Avg Value'}</th>
              <th className="py-2.5 px-3 text-center">{isVi ? 'Khách Hàng' : 'Clients'}</th>
              <th className="py-2.5 px-4 text-center">{isVi ? 'Chỉ Tiêu (Target)' : 'Target'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                  {isVi ? 'Không tìm thấy nhân viên nào.' : 'No sales representatives found.'}
                </td>
              </tr>
            ) : (
              filtered.map((s, index) => {
                const wonUsd = s.wonValueByCurrency['USD'] || 0;
                const wonVnd = s.wonValueByCurrency['VND'] || 0;
                const avgUsd = s.avgQuoteValueByCurrency['USD'] || 0;

                // Rank Badges
                let rankBadge = (
                  <span className="font-mono text-slate-400 font-bold text-xs">
                    #{index + 1}
                  </span>
                );

                if (index === 0) {
                  rankBadge = (
                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] flex items-center justify-center mx-auto shadow-2xs">
                      🥇
                    </div>
                  );
                } else if (index === 1) {
                  rankBadge = (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-bold text-[11px] flex items-center justify-center mx-auto shadow-2xs">
                      🥈
                    </div>
                  );
                } else if (index === 2) {
                  rankBadge = (
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-bold text-[11px] flex items-center justify-center mx-auto shadow-2xs">
                      🥉
                    </div>
                  );
                }

                return (
                  <tr key={s.salesRep} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Rank */}
                    <td className="py-3 px-3 text-center">
                      {rankBadge}
                    </td>

                    {/* Sales Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                          {s.salesRep.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{s.salesRep}</div>
                          <div className="text-[10px] text-slate-400">Logistics Sales Executive</div>
                        </div>
                      </div>
                    </td>

                    {/* Total Quotes */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {s.totalQuotes}
                    </td>

                    {/* Won */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                      {s.wonQuotes}
                    </td>

                    {/* Lost */}
                    <td className="py-3 px-3 text-center font-mono text-rose-600">
                      {s.lostQuotes}
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800">{s.winRate}%</span>
                          <span className="text-[10px] text-slate-400">
                            {s.wonQuotes}/{s.wonQuotes + s.lostQuotes}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${Math.min(100, s.winRate)}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Won Value */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">
                      <div>${formatVal(wonUsd, 'USD')}</div>
                      {wonVnd > 0 && (
                        <div className="text-[10px] text-emerald-700 font-medium">
                          +{formatVal(wonVnd, 'VND')} ₫
                        </div>
                      )}
                    </td>

                    {/* Avg Value */}
                    <td className="py-3 px-4 text-right font-mono text-slate-800">
                      ${formatVal(avgUsd, 'USD')}
                    </td>

                    {/* Client Count */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {s.customerCount}
                    </td>

                    {/* Sales Target */}
                    <td className="py-3 px-4 text-center">
                      {s.targetQuotationCount ? (
                        <div className="space-y-1">
                          <div className="text-[10px] font-mono text-slate-600">
                            {s.totalQuotes}/{s.targetQuotationCount} quotes
                          </div>
                          <div className="w-16 mx-auto bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-blue-600 h-full" 
                              style={{ width: `${Math.min(100, (s.totalQuotes / s.targetQuotationCount) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="inline-block text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                          {isVi ? 'Chưa đặt chỉ tiêu' : 'Not configured'}
                        </span>
                      )}
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
