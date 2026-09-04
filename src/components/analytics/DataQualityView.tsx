import React, { useState } from 'react';
import { DataQualityReport, AnalyticsLanguage } from '../../types/analytics';
import { ShieldCheck, AlertOctagon, AlertTriangle, Info, CheckCircle2, Search } from 'lucide-react';

interface DataQualityViewProps {
  report: DataQualityReport;
  language: AnalyticsLanguage;
  onSelectQuote?: (quoteId: string) => void;
}

export const DataQualityView: React.FC<DataQualityViewProps> = ({
  report,
  language,
  onSelectQuote,
}) => {
  const isVi = language === 'vi';
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredIssues = report.issues.filter(issue => {
    if (severityFilter !== 'ALL' && issue.severity !== severityFilter) return false;
    const q = search.toLowerCase();
    return (
      issue.quoteNumber.toLowerCase().includes(q) ||
      (issue.customerName || '').toLowerCase().includes(q) ||
      (issue.salesRep || '').toLowerCase().includes(q) ||
      issue.messageVi.toLowerCase().includes(q) ||
      issue.messageEn.toLowerCase().includes(q)
    );
  });

  let scoreColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  if (report.overallHealthScore < 70) scoreColor = 'text-rose-700 bg-rose-50 border-rose-300';
  else if (report.overallHealthScore < 90) scoreColor = 'text-amber-700 bg-amber-50 border-amber-300';

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: HEALTH SCORE OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        
        {/* Health Score */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {isVi ? 'Điểm Sức Khỏe Dữ Liệu' : 'Data Health Score'}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {report.overallHealthScore}%
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                report.overallHealthScore >= 90 ? 'bg-emerald-500' :
                report.overallHealthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${report.overallHealthScore}%` }}
            />
          </div>
        </div>

        {/* Clean Quotes */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase">
              {isVi ? 'Báo Giá Chuẩn Sạch' : 'Clean Quotations'}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-950 font-mono">
            {report.cleanQuotesCount} / {report.totalChecked}
          </div>
          <div className="mt-2 text-[11px] text-emerald-700 font-medium">
            {isVi ? 'Đầy đủ thông tin nghiệp vụ' : 'Fully verified logistics records'}
          </div>
        </div>

        {/* Quotes with Issues */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase">
              {isVi ? 'Có Vấn Đề Dữ Liệu' : 'Quotes with Issues'}
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-950 font-mono">
            {report.quotesWithIssuesCount}
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            {isVi ? 'Cần bổ sung hoặc chuẩn hóa' : 'Requires field enrichment'}
          </div>
        </div>

        {/* Critical Severity Issues */}
        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase">
              {isVi ? 'Lỗi Nghiêm Trọng' : 'Critical Issues'}
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-950 font-mono">
            {report.criticalIssuesCount}
          </div>
          <div className="mt-2 text-[11px] text-rose-700 font-medium">
            {isVi ? 'Thiếu cảng, giá 0, ngày âm' : 'Missing routes, zero pricing'}
          </div>
        </div>

      </div>

      {/* SECTION 2: ISSUES AUDIT LOG TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isVi ? 'Nhật Ký Kiểm Tra Chất Lượng Dữ Liệu (Data Quality Audit)' : 'Data Quality Issues Audit'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Phát hiện lỗi logic: Thiếu cảng xếp/dỡ, giá trị chào bằng 0, không có nhân viên phụ trách, hoặc ngày hiệu lực không hợp lệ.'
                : 'Automated sanity check: missing port pairs, empty prices, unassigned sales reps, or invalid date sequencing.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by severity */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setSeverityFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  severityFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                }`}
              >
                {isVi ? 'Tất cả' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('CRITICAL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  severityFilter === 'CRITICAL' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700'
                }`}
              >
                {isVi ? 'Nghiêm trọng' : 'Critical'}
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('HIGH')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  severityFilter === 'HIGH' ? 'bg-amber-500 text-white shadow-2xs' : 'text-amber-800'
                }`}
              >
                {isVi ? 'Cao' : 'High'}
              </button>
              <button
                type="button"
                onClick={() => setSeverityFilter('MEDIUM')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  severityFilter === 'MEDIUM' ? 'bg-blue-600 text-white shadow-2xs' : 'text-blue-700'
                }`}
              >
                {isVi ? 'Vừa' : 'Medium'}
              </button>
            </div>

            {/* Search */}
            <div className="relative w-40 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={isVi ? 'Tìm mã lỗi, số báo giá...' : 'Search issue...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-center w-24">{isVi ? 'Mức Độ' : 'Severity'}</th>
                <th className="py-2.5 px-4">{isVi ? 'Số Báo Giá' : 'Quote #'}</th>
                <th className="py-2.5 px-4">{isVi ? 'Khách Hàng' : 'Customer'}</th>
                <th className="py-2.5 px-3">{isVi ? 'Phụ Trách' : 'Sales Rep'}</th>
                <th className="py-2.5 px-4">{isVi ? 'Vấn Đề Phát Hiện' : 'Identified Issue'}</th>
                <th className="py-2.5 px-4 text-slate-500">{isVi ? 'Khuyến Nghị Khắc Phục' : 'Remediation'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-emerald-700 bg-emerald-50/20 font-medium">
                    ✓ {isVi ? 'Không phát hiện lỗi dữ liệu nào trong danh mục này!' : 'No data quality issues detected!'}
                  </td>
                </tr>
              ) : (
                filteredIssues.map((issue, idx) => {
                  let badge = 'bg-slate-100 text-slate-700';
                  if (issue.severity === 'CRITICAL') badge = 'bg-rose-100 text-rose-800 border border-rose-300 font-bold';
                  else if (issue.severity === 'HIGH') badge = 'bg-amber-100 text-amber-800 border border-amber-300 font-bold';
                  else if (issue.severity === 'MEDIUM') badge = 'bg-blue-100 text-blue-800 border border-blue-200';

                  return (
                    <tr 
                      key={`${issue.quoteId}_${issue.code}_${idx}`} 
                      onClick={() => onSelectQuote?.(issue.quoteId)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${badge}`}>
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {issue.quoteNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-xs">
                        {issue.customerName || '-'}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {issue.salesRep || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-medium">
                        {isVi ? issue.messageVi : issue.messageEn}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] italic">
                        {isVi ? issue.recommendationVi : issue.recommendationEn}
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
