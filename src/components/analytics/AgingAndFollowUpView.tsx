import React, { useState } from 'react';
import { AgingBucketItem, ExpiringQuoteItem, FollowUpAnalyticsSummary, AnalyticsLanguage } from '../../types/analytics';
import { Clock, AlertCircle, Calendar, CheckSquare, Hourglass, ArrowRight } from 'lucide-react';

interface AgingAndFollowUpViewProps {
  agingBuckets: AgingBucketItem[];
  expiringQuotes: ExpiringQuoteItem[];
  followUpSummary: FollowUpAnalyticsSummary;
  language: AnalyticsLanguage;
  onSelectQuote?: (quoteId: string) => void;
}

export const AgingAndFollowUpView: React.FC<AgingAndFollowUpViewProps> = ({
  agingBuckets,
  expiringQuotes,
  followUpSummary,
  language,
  onSelectQuote,
}) => {
  const isVi = language === 'vi';
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);

  const formatVal = (val?: number) => {
    if (!val || val === 0) return '0';
    return val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  };

  const selectedBucket = agingBuckets.find(b => b.bucketKey === selectedBucketKey);

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: FOLLOW-UP TASK HEALTH & AGING HIGHLIGHTS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        
        {/* Total Follow-ups */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {isVi ? 'Tổng Việc Cần Làm' : 'Total Follow-ups'}
            </span>
            <CheckSquare className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
            {followUpSummary.totalTasks}
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            {isVi ? 'Tỷ lệ hoàn thành:' : 'Completion Rate:'} <strong className="text-blue-700 font-mono">{followUpSummary.completionRate}%</strong>
          </div>
        </div>

        {/* Due Today */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase">
              {isVi ? 'Hạn Hôm Nay' : 'Due Today'}
            </span>
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-950 font-mono">
            {followUpSummary.dueTodayTasks}
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            {isVi ? 'Cần xử lý và liên hệ khách ngay' : 'Immediate client action needed'}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase">
              {isVi ? 'Quá Hạn (Overdue)' : 'Overdue Tasks'}
            </span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-950 font-mono">
            {followUpSummary.overdueTasks}
          </div>
          <div className="mt-2 text-[11px] text-rose-700 font-medium">
            {isVi ? 'Nguy cơ mất khách hàng' : 'High churn risk'}
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase">
              {isVi ? 'Đã Hoàn Thành' : 'Completed'}
            </span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-950 font-mono">
            {followUpSummary.completedTasks}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            {isVi ? 'Nỗ lực chăm sóc tốt' : 'Customer nurturing executed'}
          </div>
        </div>

      </div>

      {/* SECTION 2: QUOTATION AGING BUCKETS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Hourglass className="w-5 h-5 text-indigo-600" />
              {isVi ? 'Phân Bổ Báo Giá Theo Độ Tuổi (Quotation Aging Buckets)' : 'Quotation Aging Distribution'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Độ tuổi tính từ ngày tạo đến hiện tại (hoặc ngày chốt). Nhấp vào nhóm để xem danh sách báo giá.'
                : 'Elapsed days from creation. Select a bucket to drill down into corresponding quotations.'}
            </p>
          </div>

          {selectedBucketKey && (
            <button
              type="button"
              onClick={() => setSelectedBucketKey(null)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {isVi ? '✕ Bỏ chọn nhóm' : '✕ Clear selection'}
            </button>
          )}
        </div>

        {/* Aging Buckets Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {agingBuckets.map(b => {
            const isSelected = selectedBucketKey === b.bucketKey;
            const usdVal = b.totalValueByCurrency['USD'] || 0;

            let colorScheme = 'border-slate-200 hover:border-blue-300';
            if (b.bucketKey === '60_plus' || b.bucketKey === '31_60') {
              colorScheme = 'border-rose-200 bg-rose-50/20 hover:border-rose-400';
            } else if (b.bucketKey === '15_30') {
              colorScheme = 'border-amber-200 bg-amber-50/20 hover:border-amber-400';
            }

            return (
              <div
                key={b.bucketKey}
                onClick={() => setSelectedBucketKey(isSelected ? null : b.bucketKey)}
                className={`rounded-xl border p-3.5 transition-all cursor-pointer ${colorScheme} ${
                  isSelected ? 'ring-2 ring-blue-600 bg-blue-50/40 border-blue-500 shadow-sm' : ''
                }`}
              >
                <div className="text-[11px] font-bold text-slate-700 truncate">
                  {isVi ? b.labelVi : b.labelEn}
                </div>
                <div className="mt-2 text-xl font-extrabold text-slate-900 font-mono">
                  {b.count}
                </div>
                <div className="mt-1 text-[10px] text-slate-500 truncate">
                  ${formatVal(usdVal)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Drill down drawer if bucket selected */}
        {selectedBucket && selectedBucket.quotes.length > 0 && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>
                {isVi ? 'Danh sách báo giá trong nhóm:' : 'Quotations in bucket:'}{' '}
                <strong className="text-blue-700">{isVi ? selectedBucket.labelVi : selectedBucket.labelEn}</strong>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {selectedBucket.quotes.length} {isVi ? 'báo giá' : 'quotes'}
              </span>
            </div>

            <div className="divide-y divide-slate-200 max-h-48 overflow-y-auto">
              {selectedBucket.quotes.map(q => (
                <div 
                  key={q.quoteId} 
                  onClick={() => onSelectQuote?.(q.quoteId)}
                  className="py-2 flex items-center justify-between text-xs hover:bg-white px-2 rounded cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-blue-700">{q.quoteNumber}</span>
                    <span className="text-slate-700 font-medium truncate max-w-xs">{q.customerName}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500">
                    <span>{q.salesRep}</span>
                    <span className="font-mono font-bold text-slate-800">{q.daysOld} {isVi ? 'ngày' : 'days'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* SECTION 3: EXPIRING SOON & EXPIRED QUOTES */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            {isVi ? 'Cảnh Báo Báo Giá Sắp Hết Hạn & Đã Hết Hạn' : 'Expiring Soon & Expired Quotations'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi
              ? 'Các báo giá sắp hết hiệu lực trong vòng 7 ngày hoặc đã quá hạn, cần sales gia hạn hoặc chốt gấp.'
              : 'Quotes expiring within 7 days or already expired, requiring immediate pricing renewal or closeout.'}
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">{isVi ? 'Số Báo Giá' : 'Quote #'}</th>
                <th className="py-2.5 px-4">{isVi ? 'Khách Hàng' : 'Customer'}</th>
                <th className="py-2.5 px-3">{isVi ? 'Phụ Trách' : 'Sales Rep'}</th>
                <th className="py-2.5 px-3">{isVi ? 'Ngày Hết Hạn' : 'Valid Until'}</th>
                <th className="py-2.5 px-4 text-center">{isVi ? 'Tình Trạng Hạn' : 'Urgency'}</th>
                <th className="py-2.5 px-4 text-right">{isVi ? 'Giá Trị' : 'Value'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiringQuotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                    {isVi ? 'Không có báo giá nào sắp hết hạn.' : 'No expiring quotations.'}
                  </td>
                </tr>
              ) : (
                expiringQuotes.map(eq => {
                  let urgencyBadge = 'bg-amber-50 text-amber-800 border-amber-300';
                  let urgencyText = `${eq.daysRemaining} ${isVi ? 'ngày nữa' : 'days left'}`;

                  if (eq.isExpired) {
                    urgencyBadge = 'bg-rose-50 text-rose-800 border-rose-300';
                    urgencyText = isVi ? `Đã hết hạn (${Math.abs(eq.daysRemaining)} ngày)` : `Expired (${Math.abs(eq.daysRemaining)}d ago)`;
                  } else if (eq.daysRemaining === 0) {
                    urgencyBadge = 'bg-red-50 text-red-800 border-red-300 font-bold';
                    urgencyText = isVi ? 'Hết hạn hôm nay!' : 'Expires Today!';
                  }

                  return (
                    <tr 
                      key={eq.quoteId} 
                      onClick={() => onSelectQuote?.(eq.quoteId)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {eq.quoteNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-xs">
                        {eq.customerName}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {eq.salesRep}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {eq.validUntil}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono border ${urgencyBadge}`}>
                          {urgencyText}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ${formatVal(eq.totalValueByCurrency['USD'])}
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
