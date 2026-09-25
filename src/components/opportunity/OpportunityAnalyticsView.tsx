import React from 'react';
import { BusinessOpportunity, OpportunityRadarMetrics, BusinessOpportunityType } from '../../types/opportunity';
import { 
  TrendingUp, 
  ShieldAlert, 
  RotateCcw, 
  DollarSign, 
  Layers, 
  Compass, 
  CheckCircle2, 
  FileText, 
  PackageCheck, 
  Sparkles,
  BarChart3,
  Users,
  Target,
  ArrowUpRight
} from 'lucide-react';

interface OpportunityAnalyticsViewProps {
  opportunities: BusinessOpportunity[];
  metrics: OpportunityRadarMetrics;
}

export const OpportunityAnalyticsView: React.FC<OpportunityAnalyticsViewProps> = ({
  opportunities,
  metrics
}) => {
  // Aggregate by lane
  const laneCounts = new Map<string, number>();
  opportunities.forEach(o => {
    if (o.lane) {
      laneCounts.set(o.lane, (laneCounts.get(o.lane) || 0) + 1);
    }
  });
  const topLanes = Array.from(laneCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Aggregate by owner
  const ownerCounts = new Map<string, { name: string; count: number; critical: number }>();
  opportunities.forEach(o => {
    const ownerKey = o.ownerId || 'unassigned';
    const curr = ownerCounts.get(ownerKey) || { name: o.ownerName || 'Chưa gán', count: 0, critical: 0 };
    curr.count++;
    if (o.priority === 'CRITICAL' || o.priority === 'HIGH') curr.critical++;
    ownerCounts.set(ownerKey, curr);
  });
  const topOwners = Array.from(ownerCounts.values()).sort((a, b) => b.count - a.count);

  const typeLabels: Record<BusinessOpportunityType, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
    CUSTOMER_GROWTH: { label: 'Tăng Trưởng Khách Hàng', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    CUSTOMER_RETENTION: { label: 'Nguy Cơ Giảm Giao Dịch', icon: ShieldAlert, color: 'text-rose-600 bg-rose-50' },
    RE_QUOTATION: { label: 'Báo Giá Lại (Re-Quote)', icon: RotateCcw, color: 'text-indigo-600 bg-indigo-50' },
    RATE_RENEWAL: { label: 'Rà Soát Cước Định Kỳ', icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
    CROSS_SERVICE: { label: 'Bán Chéo Dịch Vụ', icon: Layers, color: 'text-purple-600 bg-purple-50' },
    LANE_OPPORTUNITY: { label: 'Tuyến Trọng Điểm', icon: Compass, color: 'text-blue-600 bg-blue-50' },
    QUOTATION_CONVERSION: { label: 'Thúc Đẩy Chốt Báo Giá', icon: CheckCircle2, color: 'text-cyan-600 bg-cyan-50' },
    CONTRACT_RENEWAL: { label: 'Gia Hạn Hợp Đồng', icon: FileText, color: 'text-teal-600 bg-teal-50' },
    SHIPMENT_FOLLOW_UP: { label: 'Chăm Sóc Sau Giao Hàng', icon: PackageCheck, color: 'text-sky-600 bg-sky-50' },
    REACTIVATION: { label: 'Tái Kích Hoạt Khách Cũ', icon: Sparkles, color: 'text-fuchsia-600 bg-fuchsia-50' }
  };

  return (
    <div className="space-y-6">
      {/* High-level Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Tổng Cơ Hội Đang Mở</span>
          <p className="text-2xl font-extrabold text-indigo-950 mt-1">{metrics.totalActive}</p>
          <span className="text-[11px] text-indigo-600">Phát hiện từ dữ liệu thực tế hệ thống</span>
        </div>

        <div className="p-4 rounded-2xl bg-red-50/60 border border-red-100">
          <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">Mức Độ Khẩn Cấp / Cao</span>
          <p className="text-2xl font-extrabold text-red-950 mt-1">{metrics.criticalPriority + metrics.highPriority}</p>
          <span className="text-[11px] text-red-600">{metrics.criticalPriority} khẩn cấp &bull; {metrics.highPriority} ưu tiên cao</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Đã Chốt Thành Công</span>
          <p className="text-2xl font-extrabold text-emerald-950 mt-1">{metrics.converted}</p>
          <span className="text-[11px] text-emerald-600">Khách hàng xác nhận thực hiện</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Dữ Liệu Đầy Đủ Đối Chứng</span>
          <p className="text-2xl font-extrabold text-amber-950 mt-1">{metrics.bySufficiency.SUFFICIENT_DATA}</p>
          <span className="text-[11px] text-amber-600">Có từ 2+ giao dịch kiểm chứng</span>
        </div>
      </div>

      {/* Grid: 10 Types Breakdown & Lanes/Owners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by 10 Opportunity Types */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Phân Bổ 10 Danh Mục Cơ Hội</span>
            </h4>
            <span className="text-xs text-slate-500">Toàn công ty</span>
          </div>

          <div className="space-y-2.5">
            {(Object.keys(typeLabels) as BusinessOpportunityType[]).map(typeKey => {
              const cfg = typeLabels[typeKey];
              const count = metrics.byType[typeKey] || 0;
              const percent = metrics.totalActive > 0 ? Math.round((count / metrics.totalActive) * 100) : 0;
              const Icon = cfg.icon;

              return (
                <div key={typeKey} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`p-1.5 rounded-lg ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {cfg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-100 rounded-full h-1.5 hidden sm:block">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, percent)}%` }} />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-900 w-8 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Lanes & Manager Overview */}
        <div className="space-y-6">
          {/* Top Lanes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Compass className="w-4 h-4 text-blue-600" />
              <span>Tuyến Vận Chuyển Tập Trung Cơ Hội</span>
            </h4>

            {topLanes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Chưa có dữ liệu tuyến cụ thể</p>
            ) : (
              <div className="space-y-2">
                {topLanes.map(([lane, count]) => (
                  <div key={lane} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-mono text-xs font-bold text-slate-800">{lane}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                      {count} cơ hội
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Salesperson Distribution */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Phân Bổ Theo Sales Phụ Trách</span>
            </h4>

            {topOwners.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">Chưa có dữ liệu phụ trách</p>
            ) : (
              <div className="space-y-2">
                {topOwners.slice(0, 4).map((owner, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div>
                      <span className="text-xs font-semibold text-slate-800">{owner.name}</span>
                      {owner.critical > 0 && (
                        <span className="ml-2 text-[10px] text-red-600 font-bold">
                          ({owner.critical} khẩn cấp)
                        </span>
                      )}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold font-mono">
                      {owner.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
