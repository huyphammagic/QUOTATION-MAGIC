import React from 'react';
import { QuotationFunnelStage, AnalyticsLanguage } from '../../types/analytics';
import { GitCommit, ArrowDown, Users, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuotationFunnelChartProps {
  stages: QuotationFunnelStage[];
  language: AnalyticsLanguage;
}

export const QuotationFunnelChart: React.FC<QuotationFunnelChartProps> = ({
  stages,
  language,
}) => {
  const isVi = language === 'vi';
  const totalCreated = stages[0]?.count || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-blue-600" />
            {isVi ? 'Phễu Chuyển Đổi Báo Giá (Quotation Funnel)' : 'Quotation Conversion Funnel'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isVi 
              ? 'Theo dõi luồng vòng đời báo giá: Khởi tạo → Phê duyệt → Phát hành → Gửi email → Khách mở xem → Chốt thắng.'
              : 'End-to-end lifecycle conversion: Created → Approved → Issued → Dispatched → Opened → Won.'}
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="text-slate-500">{isVi ? 'Tổng tiếp nhận:' : 'Top of Funnel:'}</span>
          <strong className="text-blue-900 font-mono text-sm">{totalCreated}</strong>
        </div>
      </div>

      {totalCreated === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm italic">
          {isVi ? 'Chưa có báo giá nào trong bộ lọc hiện tại.' : 'No quotations found for current filter.'}
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {stages.map((stage, idx) => {
            const pctOfTotal = totalCreated > 0 ? Math.round((stage.count / totalCreated) * 100) : 0;
            const isLast = idx === stages.length - 1;

            // Dynamic color grading across stages
            let barColor = 'bg-blue-500';
            if (stage.id === 'STAGE_CREATED') barColor = 'bg-slate-400';
            else if (stage.id === 'STAGE_PENDING') barColor = 'bg-amber-500';
            else if (stage.id === 'STAGE_APPROVED') barColor = 'bg-sky-500';
            else if (stage.id === 'STAGE_ISSUED') barColor = 'bg-indigo-500';
            else if (stage.id === 'STAGE_SENT') barColor = 'bg-blue-600';
            else if (stage.id === 'STAGE_VIEWED') barColor = 'bg-cyan-600';
            else if (stage.id === 'STAGE_ACCEPTED') barColor = 'bg-emerald-500';

            return (
              <div key={stage.id} className="relative group">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-1.5">
                  
                  {/* Stage title */}
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 font-mono font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800">
                      {isVi ? stage.labelVi : stage.labelEn}
                    </span>
                  </div>

                  {/* Stage stats */}
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="text-slate-600">
                      {isVi ? 'Số lượng:' : 'Volume:'} <strong className="text-slate-900 font-mono text-xs">{stage.count}</strong>
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">
                      {isVi ? 'Tỷ lệ chốt/Tổng:' : 'Conv. Total:'} <strong className="text-blue-700 font-mono">{pctOfTotal}%</strong>
                    </span>
                    {idx > 0 && (
                      <>
                        <span className="text-slate-400">|</span>
                        <span className="text-slate-600">
                          {isVi ? 'So bước trước:' : 'Step Conv:'} <strong className="text-emerald-700 font-mono">{stage.conversionRateFromPrev}%</strong>
                        </span>
                      </>
                    )}
                  </div>

                </div>

                {/* Progress Visual Bar */}
                <div className="w-full bg-slate-100 h-6 rounded-lg overflow-hidden flex items-center relative p-0.5 border border-slate-200/80">
                  <div 
                    className={`h-full rounded-md ${barColor} transition-all duration-500 flex items-center justify-end pr-2 text-white font-mono font-bold text-[10px] shadow-2xs`}
                    style={{ width: `${Math.max(4, pctOfTotal)}%` }}
                  >
                    {pctOfTotal >= 8 ? `${pctOfTotal}%` : ''}
                  </div>
                  {pctOfTotal < 8 && (
                    <span className="ml-2 text-[10px] font-mono font-bold text-slate-500">
                      {pctOfTotal}%
                    </span>
                  )}
                </div>

                {/* Drop-off connector line */}
                {!isLast && stage.dropOffCount > 0 && (
                  <div className="flex items-center pl-6 py-0.5 text-[10px] text-slate-400">
                    <ArrowDown className="w-3 h-3 text-slate-300 mr-1" />
                    <span>
                      {isVi ? 'Hao hụt / Chuyển hướng:' : 'Drop-off / Incomplete:'}{' '}
                      <strong className="text-rose-500 font-mono font-semibold">{stage.dropOffCount}</strong> {isVi ? 'báo giá' : 'quotes'}
                    </span>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Footer Notes */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{isVi ? 'Dữ liệu được xác thực theo từng phiên bản mới nhất (Revision Normalized)' : 'Data calculated strictly on active revisions'}</span>
        </div>
        <span className="text-slate-400 font-mono text-[10px]">Source: Firebase Firestore</span>
      </div>

    </div>
  );
};
