import React, { useState } from 'react';
import { CustomerAnalyticsItem, AnalyticsLanguage } from '../../types/analytics';
import { Users, Search, ArrowUpDown, Flame, Mail, CheckCircle, Clock } from 'lucide-react';

interface CustomerAnalyticsTableProps {
  customers: CustomerAnalyticsItem[];
  language: AnalyticsLanguage;
}

export const CustomerAnalyticsTable: React.FC<CustomerAnalyticsTableProps> = ({
  customers,
  language,
}) => {
  const isVi = language === 'vi';
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'wonVal' | 'winRate' | 'engagement' | 'quotes'>('wonVal');

  const filtered = customers.filter(c => 
    c.customerName.toLowerCase().includes(search.toLowerCase())
  );

  filtered.sort((a, b) => {
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'engagement') return b.engagementScore - a.engagementScore;
    if (sortBy === 'quotes') return b.totalQuotes - a.totalQuotes;
    return (b.wonValueByCurrency?.['USD'] || 0) - (a.wonValueByCurrency?.['USD'] || 0);
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
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              {isVi ? 'Phân Tích Giá Trị Khách Hàng (Customer Analytics)' : 'Customer Value & Engagement Analytics'}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              {isVi ? '100% Đồng Bộ CRM' : '100% CRM Synced'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? `Chỉ đánh giá và phân tích ${customers.length} khách hàng đã tạo hoặc cập nhật trên hệ thống (tỷ lệ thắng, doanh số chốt, điểm tương tác).`
              : `Strictly evaluating ${customers.length} customers created or updated in the system.`}
          </p>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={isVi ? 'Tìm tên khách hàng...' : 'Search customer...'}
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
            <option value="wonVal">{isVi ? 'Doanh số chốt (USD)' : 'Won Value'}</option>
            <option value="winRate">{isVi ? 'Tỷ lệ thắng (%)' : 'Win Rate'}</option>
            <option value="engagement">{isVi ? 'Điểm tương tác' : 'Engagement Score'}</option>
            <option value="quotes">{isVi ? 'Số báo giá' : 'Quote Count'}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">{isVi ? 'Tên Khách Hàng (Company)' : 'Company Name'}</th>
              <th className="py-2.5 px-3 text-center">{isVi ? 'Số Báo Giá' : 'Quotes'}</th>
              <th className="py-2.5 px-3 text-center text-emerald-700">{isVi ? 'Thắng' : 'Won'}</th>
              <th className="py-2.5 px-3 text-center text-rose-600">{isVi ? 'Từ Chối' : 'Lost'}</th>
              <th className="py-2.5 px-4 min-w-[130px]">{isVi ? 'Tỷ Lệ Thắng' : 'Win Rate'}</th>
              <th className="py-2.5 px-4 text-right text-emerald-800">{isVi ? 'Doanh Số Chốt (Won)' : 'Won Value'}</th>
              <th className="py-2.5 px-4 text-right text-amber-700">{isVi ? 'Tiềm Năng (Pipeline)' : 'Potential'}</th>
              <th className="py-2.5 px-4 text-center">{isVi ? 'Phản Hồi (Email / Link)' : 'Interactions'}</th>
              <th className="py-2.5 px-4 text-center">{isVi ? 'Điểm Tương Tác' : 'Engagement'}</th>
              <th className="py-2.5 px-4 text-right">{isVi ? 'Báo Giá Gần Nhất' : 'Last Quote'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Users className="w-6 h-6 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-700">
                      {isVi ? 'Không có khách hàng nào để đánh giá' : 'No customers to evaluate'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-sm">
                      {isVi 
                        ? 'Hệ thống chỉ đánh giá và phân tích những khách hàng bạn đã tạo hoặc cập nhật trên hệ thống (đồng bộ 100% từ Danh Bạ CRM).' 
                        : 'The system only evaluates customers created or updated on the system.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => {
                const wonUsd = c.wonValueByCurrency['USD'] || 0;
                const wonVnd = c.wonValueByCurrency['VND'] || 0;
                const potUsd = c.potentialValueByCurrency['USD'] || 0;

                // Engagement Score Styling
                let scoreBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                if (c.engagementScore >= 70) scoreBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                else if (c.engagementScore >= 40) scoreBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                else if (c.engagementScore > 0) scoreBadge = 'bg-amber-50 text-amber-800 border-amber-200';

                return (
                  <tr key={c.customerId} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Customer Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 text-xs truncate max-w-xs">
                        {c.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.quotesPerMonthAvg} {isVi ? 'báo giá / tháng' : 'quotes/mo'}
                      </div>
                    </td>

                    {/* Total Quotes */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                      {c.totalQuotes}
                    </td>

                    {/* Won */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/30">
                      {c.wonQuotes}
                    </td>

                    {/* Lost */}
                    <td className="py-3 px-3 text-center font-mono text-rose-600">
                      {c.lostQuotes}
                    </td>

                    {/* Win Rate */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800">{c.winRate}%</span>
                          <span className="text-[10px] text-slate-400">
                            {c.wonQuotes}/{c.wonQuotes + c.lostQuotes}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${Math.min(100, c.winRate)}%` }} 
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

                    {/* Potential Value */}
                    <td className="py-3 px-4 text-right font-mono text-amber-800 font-medium">
                      ${formatVal(potUsd, 'USD')}
                    </td>

                    {/* Response Interactions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600" title={isVi ? 'Đã gửi' : 'Sent'}>
                          ✉ {c.sentCount}
                        </span>
                        <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-700" title={isVi ? 'Đã mở xem' : 'Opened'}>
                          👁 {c.openedCount}
                        </span>
                        <span className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-bold" title={isVi ? 'Chấp nhận' : 'Accepted'}>
                          ✓ {c.acceptedCount}
                        </span>
                      </div>
                    </td>

                    {/* Engagement Score */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${scoreBadge}`}>
                        <Flame className="w-3 h-3 text-amber-500" />
                        <span>{c.engagementScore}</span>
                      </span>
                    </td>

                    {/* Last Quote Date */}
                    <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                      {c.lastQuoteDate || '-'}
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
