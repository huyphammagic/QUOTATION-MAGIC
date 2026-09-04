import React, { useMemo } from 'react';
import { 
  Clock, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  GitBranch, 
  Building, 
  ShieldAlert,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { RateMasterItem } from '../../types/masterRate';
import { calculateRateAnalytics } from '../../services/masterRate/rateAnalyticsService';
import { formatUSD, formatVND } from '../../utils/formatters';

interface RateExpiringTabProps {
  rates: RateMasterItem[];
  onRenewRate: (rate: RateMasterItem) => void;
  onEditRate: (rate: RateMasterItem) => void;
}

export const RateExpiringTab: React.FC<RateExpiringTabProps> = ({
  rates,
  onRenewRate,
  onEditRate,
}) => {
  const analytics = useMemo(() => {
    return calculateRateAnalytics(rates);
  }, [rates]);

  const {
    summary,
    expiringIn7DaysRates,
    expiringIn14DaysRates,
    expiringIn30DaysRates,
    expiredRates,
    dataQualityIssues,
  } = analytics;

  return (
    <div className="space-y-6">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expired */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-rose-700 uppercase tracking-wider">ĐÃ HẾT HẠN (EXPIRED)</div>
            <div className="text-2xl font-black text-rose-900 mt-1">{summary.expiredCount}</div>
            <div className="text-[11px] text-rose-600 mt-0.5">Cần cập nhật hoặc hủy bỏ</div>
          </div>
          <div className="p-3 bg-rose-200/50 rounded-xl text-rose-700">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring <= 7 Days */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">HẾT HẠN TRONG 7 NGÀY</div>
            <div className="text-2xl font-black text-amber-900 mt-1">{summary.expiringIn7Days}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">Khẩn cấp cần gia hạn</div>
          </div>
          <div className="p-3 bg-amber-200/50 rounded-xl text-amber-700">
            <Flame className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring 8-14 Days */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">HẾT HẠN TRONG 14 NGÀY</div>
            <div className="text-2xl font-black text-blue-900 mt-1">{summary.expiringIn14Days}</div>
            <div className="text-[11px] text-blue-600 mt-0.5">Cần liên hệ hãng xin cước</div>
          </div>
          <div className="p-3 bg-blue-200/50 rounded-xl text-blue-700">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Expiring 15-30 Days */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">HẾT HẠN TRONG 30 NGÀY</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{summary.expiringIn30Days}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">Kế hoạch gia hạn định kỳ</div>
          </div>
          <div className="p-3 bg-slate-200/50 rounded-xl text-slate-700">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Urgent Renewal Table (<= 7 Days & Expired) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <Flame className="w-4 h-4 text-amber-600" />
            Bảng Giá Cần Gia Hạn Ngay (Urgent Expiration & Expired)
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Tổng cộng: {expiringIn7DaysRates.length + expiredRates.length} bảng giá
          </span>
        </div>

        <div className="overflow-x-auto max-h-[360px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/75 text-slate-700 font-semibold sticky top-0 border-b border-slate-200">
              <tr>
                <th className="p-3">Mã Bảng Giá</th>
                <th className="p-3">Tuyến Vận Chuyển</th>
                <th className="p-3">Hãng / NCC</th>
                <th className="p-3 text-right">Giá Bán</th>
                <th className="p-3 text-center">Hạn Hiệu Lực</th>
                <th className="p-3 text-center">Tình Trạng</th>
                <th className="p-3 text-center w-36">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...expiringIn7DaysRates, ...expiredRates].length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                    Không có bảng giá nào hết hạn hoặc sắp hết hạn trong 7 ngày tới.
                  </td>
                </tr>
              ) : (
                [...expiringIn7DaysRates, ...expiredRates].map((r) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isExp = today > r.effectiveTo;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-mono font-bold text-blue-700">{r.rateCode}</div>
                        <div className="text-slate-600 truncate max-w-[200px]">{r.rateName}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <span>{r.origin}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{r.destination}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{r.transportMode} • {r.containerType || r.unit}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800">{r.carrier || 'N/A'}</div>
                        {r.supplierName && <div className="text-[11px] text-slate-500">{r.supplierName}</div>}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        {r.sellingCurrency === 'USD' ? formatUSD(r.sellingAmount) : formatVND(r.sellingAmount)}
                      </td>

                      <td className="p-3 text-center font-mono text-[11px]">
                        <span className={isExp ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>
                          {r.effectiveTo}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        {isExp ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Đã Hết Hạn
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Sắp Hết Hạn
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => onRenewRate(r)}
                          className="flex items-center gap-1 mx-auto px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-2xs"
                        >
                          <GitBranch className="w-3 h-3" /> Gia Hạn / Version Mới
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Lane Coverage & Data Quality Issues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lane Coverage */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Building className="w-4 h-4 text-blue-600" />
            Độ Phủ Tuyến Đường Hàng Đầu (Top Lane Coverage)
          </h4>
          <div className="space-y-2">
            {summary.topLanes.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">Chưa có dữ liệu tuyến đường</div>
            ) : (
              summary.topLanes.map((l, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                  <span className="font-semibold text-slate-700">{l.lane}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    {l.count} bảng giá
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Data Quality Hygiene */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Chất Lượng Dữ Liệu Bảng Giá (Data Hygiene - {dataQualityIssues.length} vấn đề)
          </h4>

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {dataQualityIssues.length === 0 ? (
              <div className="text-xs text-emerald-600 text-center py-6 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-500" />
                Dữ liệu bảng giá hoàn hảo! Không phát hiện lỗi thiếu cost, thiếu validity hoặc trùng lặp.
              </div>
            ) : (
              dataQualityIssues.map((issue, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/70 text-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <span className="font-mono text-blue-700">{issue.rate.rateCode}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold">
                        {issue.issueType}
                      </span>
                    </div>
                    <div className="text-rose-700 text-[11px] mt-0.5">{issue.descriptionVi}</div>
                  </div>

                  <button
                    onClick={() => onEditRate(issue.rate)}
                    className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded"
                  >
                    Sửa
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
