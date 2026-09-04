import React, { useState } from 'react';
import { WinLossDimensionItem, AnalyticsLanguage } from '../../types/analytics';
import { 
  Trophy, 
  XCircle, 
  TrendingUp, 
  User, 
  Users, 
  Ship, 
  Navigation,
  Search,
  ArrowUpDown
} from 'lucide-react';

interface WinLossAnalyticsViewProps {
  bySales: WinLossDimensionItem[];
  byCustomer: WinLossDimensionItem[];
  byService: WinLossDimensionItem[];
  byLane: WinLossDimensionItem[];
  language: AnalyticsLanguage;
}

export const WinLossAnalyticsView: React.FC<WinLossAnalyticsViewProps> = ({
  bySales,
  byCustomer,
  byService,
  byLane,
  language,
}) => {
  const isVi = language === 'vi';
  const [selectedDimension, setSelectedDimension] = useState<'sales' | 'customer' | 'service' | 'lane'>('sales');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'winRate' | 'wonVal' | 'total'>('wonVal');

  const dimensionListMap = {
    sales: bySales,
    customer: byCustomer,
    service: byService,
    lane: byLane,
  };

  const currentList = dimensionListMap[selectedDimension] || [];

  const filteredList = currentList.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  filteredList.sort((a, b) => {
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'total') return b.totalQuotes - a.totalQuotes;
    return (b.wonValueByCurrency['USD'] || 0) - (a.wonValueByCurrency['USD'] || 0);
  });

  const formatVal = (val?: number, curr: string = 'USD') => {
    if (!val || val === 0) return '0';
    if (curr === 'VND') return val.toLocaleString('vi-VN');
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
      
      {/* Header & Dimension Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            {isVi ? 'Phân Tích Thắng / Thua Đa Chiều (Win / Loss Analytics)' : 'Multidimensional Win / Loss Analysis'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? 'Tỷ lệ thắng = Won / (Won + Lost). Độc lập theo từng chiều quản trị: Sales, Khách hàng, Dịch vụ, Tuyến đường.' 
              : 'Strict Win Rate = Won / (Won + Lost). Analyzed across Sales, Customer, Service, and Trade Lanes.'}
          </p>
        </div>

        {/* Dimension Switcher */}
        <div className="flex items-center flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => { setSelectedDimension('sales'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDimension === 'sales'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-600" />
            <span>{isVi ? 'Nhân viên (Sales)' : 'Sales Rep'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedDimension('customer'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDimension === 'customer'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>{isVi ? 'Khách hàng' : 'Customer'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedDimension('service'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDimension === 'service'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ship className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isVi ? 'Dịch vụ' : 'Service'}</span>
          </button>

          <button
            type="button"
            onClick={() => { setSelectedDimension('lane'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedDimension === 'lane'
                ? 'bg-white text-indigo-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isVi ? 'Tuyến đường' : 'Trade Lane'}</span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar: Search & Sort */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
        
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={isVi ? 'Tìm kiếm danh mục...' : 'Search item...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end text-xs">
          <span className="text-slate-400 flex items-center gap-1">
            <ArrowUpDown className="w-3 h-3" />
            {isVi ? 'Sắp xếp theo:' : 'Sort by:'}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium"
          >
            <option value="wonVal">{isVi ? 'Giá trị thắng (USD)' : 'Won Value (USD)'}</option>
            <option value="winRate">{isVi ? 'Tỷ lệ thắng (%)' : 'Win Rate (%)'}</option>
            <option value="total">{isVi ? 'Số lượng báo giá' : 'Total Quotes'}</option>
          </select>
        </div>

      </div>

      {/* Data Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">
                {selectedDimension === 'sales' && (isVi ? 'Nhân viên (Sales Rep)' : 'Sales Rep')}
                {selectedDimension === 'customer' && (isVi ? 'Khách hàng' : 'Customer Name')}
                {selectedDimension === 'service' && (isVi ? 'Dịch vụ / Phương thức' : 'Service Mode')}
                {selectedDimension === 'lane' && (isVi ? 'Tuyến Vận Tải (POL → POD)' : 'Trade Lane')}
              </th>
              <th className="py-2.5 px-3 text-center">{isVi ? 'Tổng' : 'Total'}</th>
              <th className="py-2.5 px-3 text-center text-emerald-700">{isVi ? 'Thắng (Won)' : 'Won'}</th>
              <th className="py-2.5 px-3 text-center text-rose-600">{isVi ? 'Từ chối (Lost)' : 'Lost'}</th>
              <th className="py-2.5 px-3 text-center text-amber-600">{isVi ? 'Chờ (Open)' : 'Open'}</th>
              <th className="py-2.5 px-4 min-w-[150px]">{isVi ? 'Tỷ lệ thắng (Win Rate)' : 'Win Rate'}</th>
              <th className="py-2.5 px-4 text-right text-emerald-800">{isVi ? 'Giá trị thắng (Won Value)' : 'Won Value'}</th>
              <th className="py-2.5 px-4 text-right text-rose-700">{isVi ? 'Giá trị mất (Lost Value)' : 'Lost Value'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  {isVi ? 'Không có dữ liệu phù hợp.' : 'No matching data.'}
                </td>
              </tr>
            ) : (
              filteredList.map((row, idx) => {
                const wonUsd = row.wonValueByCurrency['USD'] || 0;
                const wonVnd = row.wonValueByCurrency['VND'] || 0;
                const lostUsd = row.lostValueByCurrency['USD'] || 0;
                const lostVnd = row.lostValueByCurrency['VND'] || 0;

                let rateColor = 'text-slate-600 bg-slate-100';
                if (row.winRate >= 60) rateColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
                else if (row.winRate >= 35) rateColor = 'text-blue-800 bg-blue-50 border-blue-200';
                else if (row.winRate > 0) rateColor = 'text-amber-800 bg-amber-50 border-amber-200';

                return (
                  <tr key={row.key} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Dimension Label */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400 font-mono w-4">{idx + 1}.</span>
                        <span className="truncate max-w-xs">{row.label}</span>
                      </div>
                    </td>

                    {/* Total Quotes */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {row.totalQuotes}
                    </td>

                    {/* Won */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      {row.wonQuotes}
                    </td>

                    {/* Lost */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-rose-600">
                      {row.lostQuotes}
                    </td>

                    {/* Pending */}
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {row.pendingQuotes}
                    </td>

                    {/* Win Rate with Mini Bar */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] border ${rateColor}`}>
                            {row.winRate}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {row.wonQuotes}/{row.wonQuotes + row.lostQuotes}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${Math.min(100, row.winRate)}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Won Value (Multi-currency safe) */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-950">
                      <div>${formatVal(wonUsd, 'USD')}</div>
                      {wonVnd > 0 && (
                        <div className="text-[10px] text-emerald-700 font-medium">
                          +{formatVal(wonVnd, 'VND')} ₫
                        </div>
                      )}
                    </td>

                    {/* Lost Value */}
                    <td className="py-3 px-4 text-right font-mono text-rose-800">
                      <div>${formatVal(lostUsd, 'USD')}</div>
                      {lostVnd > 0 && (
                        <div className="text-[10px] text-rose-600 font-medium">
                          +{formatVal(lostVnd, 'VND')} ₫
                        </div>
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
