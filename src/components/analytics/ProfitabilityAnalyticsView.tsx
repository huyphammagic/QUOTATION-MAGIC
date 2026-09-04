import React, { useState } from 'react';
import { ProfitabilityItem, AnalyticsLanguage, UserRole, ROLE_PERMISSIONS } from '../../types/analytics';
import { 
  ShieldAlert, 
  Lock, 
  DollarSign, 
  Percent, 
  AlertTriangle, 
  Search, 
  ArrowUpDown, 
  CheckCircle,
  TrendingDown,
  Info
} from 'lucide-react';

interface ProfitabilityAnalyticsViewProps {
  items: ProfitabilityItem[];
  userRole: UserRole;
  language: AnalyticsLanguage;
}

export const ProfitabilityAnalyticsView: React.FC<ProfitabilityAnalyticsViewProps> = ({
  items,
  userRole,
  language,
}) => {
  const isVi = language === 'vi';
  const [search, setSearch] = useState('');
  const [onlyLowMargin, setOnlyLowMargin] = useState(false);
  const [sortBy, setSortBy] = useState<'margin' | 'profit' | 'selling'>('profit');

  // RBAC Permission Check
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  const canViewProfitability = permissions.includes('profitability.view');

  if (!canViewProfitability) {
    return (
      <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-base font-bold text-slate-900">
            {isVi ? 'Truy Cập Dữ Liệu Bị Giới Hạn (RBAC Security Restricted)' : 'Access Restricted - Role-Based Access Control'}
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isVi
              ? 'Dữ liệu giá vốn mua (Buy Cost), lợi nhuận gộp (Gross Profit) và biên lợi nhuận (Margin %) được bảo mật nội bộ. Quyền này chỉ được cấp cho Ban Quản Trị (Admin), Giám Đốc Kinh Doanh (Sales Manager) hoặc Chuyên Viên Định Giá (Pricing Specialist).'
              : 'Internal buy costs, gross profit, and margin percentages are protected sensitive data. Access is granted strictly to Admins, Sales Managers, and Pricing Specialists.'}
          </p>
          <div className="pt-2 text-[11px] font-mono text-slate-400">
            Current Active Role: <strong className="text-slate-700">{userRole}</strong>
          </div>
        </div>
      </div>
    );
  }

  // Aggregate Totals
  let totalProfitUsd = 0;
  let totalProfitVnd = 0;
  let totalSellingUsd = 0;
  let totalCostUsd = 0;
  let lowMarginCount = 0;

  items.forEach(item => {
    totalProfitUsd += item.grossProfitByCurrency['USD'] || 0;
    totalProfitVnd += item.grossProfitByCurrency['VND'] || 0;
    totalSellingUsd += item.sellingByCurrency['USD'] || 0;
    totalCostUsd += item.costByCurrency['USD'] || 0;
    if (item.isLowMargin) lowMarginCount++;
  });

  const overallMargin = totalSellingUsd > 0
    ? Math.round((totalProfitUsd / totalSellingUsd) * 1000) / 10
    : 0;

  // Filter & Sort
  const filtered = items.filter(item => {
    if (onlyLowMargin && !item.isLowMargin) return false;
    const matchSearch = 
      item.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.customerName.toLowerCase().includes(search.toLowerCase()) ||
      item.salesRep.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'margin') return b.marginPercent - a.marginPercent;
    if (sortBy === 'selling') return (b.sellingByCurrency['USD'] || 0) - (a.sellingByCurrency['USD'] || 0);
    return (b.grossProfitByCurrency['USD'] || 0) - (a.grossProfitByCurrency['USD'] || 0);
  });

  const formatVal = (val?: number, curr: string = 'USD') => {
    if (!val || val === 0) return '0';
    if (curr === 'VND') return val.toLocaleString('vi-VN');
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  return (
    <div className="space-y-4">
      
      {/* KPI Highlight Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Gross Profit USD */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            {isVi ? 'Tổng Lợi Nhuận Gộp (USD)' : 'Total Gross Profit (USD)'}
          </span>
          <div className="mt-2 text-2xl font-extrabold text-emerald-950 font-mono">
            ${formatVal(totalProfitUsd, 'USD')}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            {isVi ? 'Doanh thu bán - Giá mua hãng tàu/đại lý' : 'Selling revenue minus buy cost'}
          </div>
        </div>

        {/* Gross Profit VND */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isVi ? 'Tổng Lợi Nhuận Gộp (VND)' : 'Total Gross Profit (VND)'}
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {formatVal(totalProfitVnd, 'VND')} ₫
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {isVi ? 'Các khoản phụ phí nội địa VND' : 'Local charges profit pool'}
          </div>
        </div>

        {/* Overall Margin % */}
        <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">
            {isVi ? 'Biên Lợi Nhuận Trung Bình' : 'Weighted Margin %'}
          </span>
          <div className="mt-2 text-2xl font-extrabold text-indigo-950 font-mono">
            {overallMargin}%
          </div>
          <div className="mt-2 text-[11px] text-indigo-700 font-medium">
            {isVi ? 'Lợi nhuận gộp / Tổng giá bán' : 'Gross profit / Total revenue'}
          </div>
        </div>

        {/* Low Margin Alert Count */}
        <div 
          onClick={() => setOnlyLowMargin(!onlyLowMargin)}
          className={`rounded-xl border p-4 shadow-xs cursor-pointer transition-all ${
            onlyLowMargin 
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400' 
              : 'bg-white border-amber-200 hover:border-amber-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              {isVi ? 'Cảnh Báo Biên Thấp (<10%)' : 'Low Margin Alerts (<10%)'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-950 font-mono">
            {lowMarginCount} {isVi ? 'báo giá' : 'quotes'}
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            {onlyLowMargin ? (isVi ? 'Đang lọc xem riêng biên thấp' : 'Filtering low margin only') : (isVi ? 'Nhấp để lọc danh sách' : 'Click to filter')}
          </div>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              {isVi ? 'Chi Tiết Giá Mua, Doanh Thu & Lợi Nhuận Báo Giá' : 'Profitability & Margin Analysis'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Kiểm toán từng đơn hàng: Giá bán khách (Selling), Giá mua gốc (Buy Cost), Lợi nhuận (Profit) và Biên độ (%)'
                : 'Audited quote financials: Customer selling price, agent/carrier buy cost, profit, and margin.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isVi ? 'Tìm số báo giá, khách...' : 'Search quote, client...'}
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
              <option value="profit">{isVi ? 'Lợi nhuận cao nhất' : 'Highest Profit'}</option>
              <option value="margin">{isVi ? 'Biên % cao nhất' : 'Highest Margin %'}</option>
              <option value="selling">{isVi ? 'Giá bán cao nhất' : 'Highest Revenue'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">{isVi ? 'Số Báo Giá' : 'Quote #'}</th>
                <th className="py-2.5 px-4">{isVi ? 'Khách Hàng' : 'Customer'}</th>
                <th className="py-2.5 px-3">{isVi ? 'Tuyến Vận Tải' : 'Lane'}</th>
                <th className="py-2.5 px-3 text-center">{isVi ? 'PT' : 'Mode'}</th>
                <th className="py-2.5 px-4 text-right">{isVi ? 'Giá Bán (Selling)' : 'Selling Price'}</th>
                <th className="py-2.5 px-4 text-right text-slate-600">{isVi ? 'Giá Mua (Buy Cost)' : 'Buy Cost'}</th>
                <th className="py-2.5 px-4 text-right text-emerald-800">{isVi ? 'Lợi Nhuận (Profit)' : 'Gross Profit'}</th>
                <th className="py-2.5 px-4 text-center">{isVi ? 'Biên Độ (Margin)' : 'Margin %'}</th>
                <th className="py-2.5 px-3 text-center">{isVi ? 'Trạng Thái' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400 italic">
                    {isVi ? 'Không có dữ liệu báo giá nào phù hợp.' : 'No profitability records found.'}
                  </td>
                </tr>
              ) : (
                filtered.map(item => {
                  const sellUsd = item.sellingByCurrency['USD'] || 0;
                  const costUsd = item.costByCurrency['USD'] || 0;
                  const profitUsd = item.grossProfitByCurrency['USD'] || 0;

                  let marginBadge = 'bg-slate-100 text-slate-700';
                  if (item.marginPercent >= 20) {
                    marginBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                  } else if (item.marginPercent >= 10) {
                    marginBadge = 'bg-blue-50 text-blue-800 border border-blue-200';
                  } else if (item.isLowMargin) {
                    marginBadge = 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse';
                  }

                  return (
                    <tr key={item.quoteId} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Quote Number */}
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {item.quoteNumber}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {item.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          Sales: {item.salesRep}
                        </div>
                      </td>

                      {/* Lane */}
                      <td className="py-3 px-3 text-[11px] text-slate-600">
                        <span className="truncate max-w-[150px] inline-block">
                          {item.origin} → {item.destination}
                        </span>
                      </td>

                      {/* Mode */}
                      <td className="py-3 px-3 text-center font-mono text-[10px]">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                          {item.mode.replace('SEA_', '')}
                        </span>
                      </td>

                      {/* Selling */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${formatVal(sellUsd, 'USD')}
                      </td>

                      {/* Cost */}
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        ${formatVal(costUsd, 'USD')}
                      </td>

                      {/* Profit */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-800">
                        ${formatVal(profitUsd, 'USD')}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-xs ${marginBadge}`}>
                          {item.marginPercent}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {item.status}
                        </span>
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
